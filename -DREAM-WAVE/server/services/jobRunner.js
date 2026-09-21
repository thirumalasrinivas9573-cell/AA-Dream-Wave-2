const User = require('../models/User');
const Notification = require('../models/Notification');
const OrgInvite = require('../models/OrgInvite');
const AuditLog = require('../models/AuditLog');
const AiUsage = require('../models/AiUsage');
const logger = require('../utils/logger');
const { withRetry, withTimeout } = require('../utils/retry');
const { recordDbOp } = require('../utils/metrics');

let timer = null;
let bootTimer = null;
let running = false;
let lastRun = null;
let lastError = null;
let consecutiveFailures = 0;

const DELETE_BATCH = Math.max(100, Number(process.env.JOB_DELETE_BATCH) || 1000);

/** Batched delete to avoid long collection locks on large datasets. */
async function deleteManyBatched(Model, filter, { batchSize = DELETE_BATCH, maxBatches = 50 } = {}) {
  let deleted = 0;
  for (let i = 0; i < maxBatches; i += 1) {
    const ids = await Model.find(filter).select('_id').limit(batchSize).lean();
    if (!ids.length) break;
    const result = await Model.deleteMany({ _id: { $in: ids.map((d) => d._id) } });
    deleted += result.deletedCount || 0;
    if (ids.length < batchSize) break;
  }
  return deleted;
}

async function cleanupRefreshTokens() {
  const now = new Date();
  const result = await withRetry(
    () =>
      User.updateMany(
        { 'refreshTokens.expiresAt': { $lte: now } },
        { $pull: { refreshTokens: { expiresAt: { $lte: now } } } }
      ),
    { retries: 1, baseDelayMs: 200 }
  );
  return result.modifiedCount || 0;
}

async function cleanupNotifications() {
  const readCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const allCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const [readDeleted, staleDeleted] = await Promise.all([
    deleteManyBatched(Notification, { read: true, createdAt: { $lte: readCutoff } }),
    deleteManyBatched(Notification, { createdAt: { $lte: allCutoff } }),
  ]);
  return readDeleted + staleDeleted;
}

async function expireInvites() {
  const result = await OrgInvite.updateMany(
    { status: 'pending', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
  return result.modifiedCount || 0;
}

async function cleanupAuditLogs() {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  return deleteManyBatched(AuditLog, { createdAt: { $lte: cutoff } });
}

async function cleanupAiUsage() {
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  return deleteManyBatched(AiUsage, { createdAt: { $lte: cutoff } });
}

async function repairOrphans() {
  if (process.env.DISABLE_ORPHAN_REPAIR === '1') return { skipped: true };
  try {
    const { repairOrphanUserRefs } = require('./userCascadeService');
    return await repairOrphanUserRefs({ limit: 300 });
  } catch (err) {
    logger.warn('Orphan repair failed', { error: err.message });
    return { error: err.message };
  }
}

async function processProductivityJobs() {
  const productivity = require('./productivityIntelligenceService');
  const personalization = require('./personalizationIntelligenceService');
  const recent = await User.find({ isActive: { $ne: false } })
    .sort({ updatedAt: -1 })
    .limit(25)
    .select('_id organizationId preferences credits targetCareer')
    .lean();
  let recurring = 0;
  let reminders = 0;
  const concurrency = 5;
  for (let i = 0; i < recent.length; i += concurrency) {
    const chunk = recent.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (user) => {
        try {
          const created = await productivity.processRecurringTasks(user);
          const notes = await productivity.processReminders(user);
          return { recurring: created.length, reminders: notes.length };
        } catch {
          return { recurring: 0, reminders: 0 };
        }
      })
    );
    for (const r of results) {
      recurring += r.recurring;
      reminders += r.reminders;
    }
  }
  let eventsProcessed = 0;
  try {
    eventsProcessed = (await personalization.processUnprocessedEvents(50)).processed;
  } catch {
    eventsProcessed = 0;
  }
  return { users: recent.length, recurring, reminders, eventsProcessed };
}

async function processOpsJobs() {
  const ops = require('./opsIntelligenceService');
  let snapshot = null;
  let recommendations = { refreshed: 0 };
  let notifications = {};
  try {
    snapshot = await ops.aggregateOpsSnapshot('daily');
  } catch (err) {
    logger.warn('Ops snapshot failed', { error: err.message });
  }
  try {
    recommendations = await ops.refreshRecommendationsForActiveUsers(25);
  } catch (err) {
    logger.warn('Recommendation refresh failed', { error: err.message });
  }
  try {
    notifications = await ops.processNotificationBacklog();
  } catch {
    notifications = {};
  }
  return {
    snapshotId: snapshot?._id ? String(snapshot._id) : null,
    recommendations,
    notifications,
  };
}

async function safeStep(name, fn) {
  const t0 = Date.now();
  try {
    const result = await withTimeout(fn, Number(process.env.JOB_STEP_TIMEOUT_MS) || 120000, name);
    recordDbOp(`job.${name}`, Date.now() - t0);
    return { ok: true, result };
  } catch (err) {
    recordDbOp(`job.${name}`, Date.now() - t0);
    logger.warn(`Background job step failed: ${name}`, { error: err.message });
    return { ok: false, error: err.message, result: null };
  }
}

async function runCleanupJobs() {
  if (running) return null;
  running = true;
  const started = Date.now();
  try {
    // Lightweight cleanup in parallel; heavier work isolated afterward.
    const light = await Promise.all([
      safeStep('refreshTokens', cleanupRefreshTokens),
      safeStep('notifications', cleanupNotifications),
      safeStep('invites', expireInvites),
      safeStep('auditLogs', cleanupAuditLogs),
      safeStep('aiUsage', cleanupAiUsage),
    ]);

    const orphans = await safeStep('orphanRepair', repairOrphans);
    const productivity = await safeStep('productivity', processProductivityJobs);
    const opsJobs = await safeStep('ops', processOpsJobs);

    const summary = {
      expiredRefreshTokensUsers: light[0].result || 0,
      notificationsRemoved: light[1].result || 0,
      invitesExpired: light[2].result || 0,
      auditLogsRemoved: light[3].result || 0,
      aiUsageRemoved: light[4].result || 0,
      orphanRepair: orphans.result || { error: orphans.error },
      productivityJobs: productivity.result || { error: productivity.error },
      opsJobs: opsJobs.result || { error: opsJobs.error },
      stepFailures: [...light, orphans, productivity, opsJobs].filter((s) => !s.ok).length,
      latencyMs: Date.now() - started,
    };
    lastRun = { at: new Date().toISOString(), ...summary };
    lastError = null;
    consecutiveFailures = 0;
    logger.info('Background cleanup completed', summary);
    return summary;
  } catch (err) {
    consecutiveFailures += 1;
    lastError = { at: new Date().toISOString(), message: err.message };
    logger.error('Background cleanup failed', {
      error: err.message,
      consecutiveFailures,
    });
    throw err;
  } finally {
    running = false;
  }
}

function startBackgroundJobs() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.DISABLE_BACKGROUND_JOBS === '1') return;
  if (timer) return;

  const intervalMs = Math.max(
    60_000,
    Number(process.env.JOB_INTERVAL_MS) || 60 * 60 * 1000
  );

  bootTimer = setTimeout(() => {
    bootTimer = null;
    runCleanupJobs().catch((err) => {
      logger.error('Initial background cleanup failed', { error: err.message });
    });
  }, 15_000);
  if (typeof bootTimer.unref === 'function') bootTimer.unref();

  timer = setInterval(() => {
    runCleanupJobs().catch((err) => {
      logger.error('Scheduled background cleanup failed', { error: err.message });
    });
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();

  logger.info('Background jobs scheduled', { intervalMs });
}

function stopBackgroundJobs() {
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function getJobStatus() {
  return {
    scheduled: Boolean(timer),
    running,
    disabled:
      process.env.NODE_ENV === 'test' || process.env.DISABLE_BACKGROUND_JOBS === '1',
    lastRun,
    lastError,
    consecutiveFailures,
  };
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  runCleanupJobs,
  cleanupRefreshTokens,
  cleanupNotifications,
  expireInvites,
  repairOrphans,
  deleteManyBatched,
  getJobStatus,
};
