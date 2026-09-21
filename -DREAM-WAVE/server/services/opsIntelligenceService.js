const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const AiUsage = require('../models/AiUsage');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const OpsSnapshot = require('../models/OpsSnapshot');
const LearningProgress = require('../models/LearningProgress');
const StudyPlan = require('../models/StudyPlan');
const CareerProfile = require('../models/CareerProfile');
const InterviewSession = require('../models/InterviewSession');
const Post = require('../models/Post');
const Discussion = require('../models/Discussion');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const RecommendationEvent = require('../models/RecommendationEvent');
const { getMetricsSnapshot, recordAuthFailure, recordAuthSuccess, recordRateLimited } = require('../utils/metrics');
const analyticsService = require('./analyticsService');
const logger = require('../utils/logger');

const uploadsDir = path.join(__dirname, '..', 'uploads');

async function recordSecurityEvent(payload) {
  try {
    const event = await SecurityEvent.create({
      type: payload.type,
      severity: payload.severity || 'low',
      user: payload.user || null,
      organizationId: payload.organizationId || null,
      email: payload.email || '',
      ip: payload.ip || '',
      path: payload.path || '',
      meta: payload.meta || {},
      requestId: payload.requestId || '',
    });
    if (payload.type === 'login_failed') recordAuthFailure();
    if (payload.type === 'login_success') recordAuthSuccess();
    if (payload.type === 'rate_limited') recordRateLimited();
    return event;
  } catch (err) {
    logger.warn('SecurityEvent write failed', { error: err.message });
    return null;
  }
}

async function detectSuspiciousActivity({ email, ip, windowMinutes = 15 } = {}) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const filter = { type: 'login_failed', createdAt: { $gte: since } };
  if (email) filter.email = String(email).toLowerCase();
  if (ip) filter.ip = ip;
  const count = await SecurityEvent.countDocuments(filter);
  if (count >= 5) {
    await recordSecurityEvent({
      type: 'suspicious_activity',
      severity: count >= 10 ? 'high' : 'medium',
      email: email || '',
      ip: ip || '',
      meta: { failedLogins: count, windowMinutes },
    });
    return { suspicious: true, failedLogins: count };
  }
  return { suspicious: false, failedLogins: count };
}

/** Temporary lock after repeated failures (email or IP). */
async function isLoginLocked({ email, ip, windowMinutes = 15, threshold = 10 } = {}) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const or = [];
  if (email) or.push({ email: String(email).toLowerCase() });
  if (ip) or.push({ ip });
  if (!or.length) return { locked: false, failedLogins: 0 };
  const count = await SecurityEvent.countDocuments({
    type: 'login_failed',
    createdAt: { $gte: since },
    $or: or,
  });
  if (count >= threshold) {
    return {
      locked: true,
      failedLogins: count,
      until: new Date(since.getTime() + windowMinutes * 60 * 1000).toISOString(),
    };
  }
  return { locked: false, failedLogins: count };
}

function storageHealth() {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return { status: 'degraded', path: uploadsDir, exists: false };
    }
    const stat = fs.statSync(uploadsDir);
    let fileCount = 0;
    let fileCountCapped = false;
    try {
      const cap = Math.max(50, Number(process.env.STORAGE_HEALTH_FILE_CAP) || 500);
      const dir = fs.opendirSync(uploadsDir);
      try {
        let entry = dir.readSync();
        while (entry !== null) {
          fileCount += 1;
          if (fileCount >= cap) {
            fileCountCapped = true;
            break;
          }
          entry = dir.readSync();
        }
      } finally {
        dir.closeSync();
      }
    } catch {
      fileCount = -1;
    }
    return {
      status: 'up',
      path: uploadsDir,
      exists: true,
      writable: Boolean(stat),
      fileCount,
      ...(fileCountCapped ? { fileCountCapped: true } : {}),
    };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

function databaseHealth() {
  const state = mongoose.connection.readyState;
  const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    status: state === 1 ? 'up' : state === 2 ? 'connecting' : 'down',
    readyState: state,
    label: map[state] || 'unknown',
    host: mongoose.connection.host || '',
    name: mongoose.connection.name || '',
  };
}

function queueHealth() {
  const { getJobStatus } = require('./jobRunner');
  const jobs = getJobStatus();
  return {
    status: jobs.disabled ? 'disabled' : jobs.running ? 'busy' : jobs.scheduled ? 'up' : 'idle',
    jobs,
  };
}

async function systemHealthDashboard() {
  const metrics = getMetricsSnapshot();
  const db = databaseHealth();
  const storage = storageHealth();
  const queue = queueHealth();
  const api = {
    status: metrics.errors5xx > metrics.requests * 0.05 && metrics.requests > 20 ? 'degraded' : 'up',
    avgLatencyMs: metrics.avgLatencyMs,
    slowRequests: metrics.slowRequests,
    errors5xx: metrics.errors5xx,
    errors4xx: metrics.errors4xx,
  };

  const overall =
    db.status !== 'up'
      ? 'down'
      : api.status === 'degraded' || storage.status === 'degraded'
        ? 'degraded'
        : 'ok';

  return {
    status: overall,
    time: new Date().toISOString(),
    api,
    database: db,
    storage,
    queue,
    memory: metrics.memory,
    cpu: metrics.cpu,
    uptimeSec: metrics.uptimeSec,
  };
}

async function aiOperationsAnalytics({ days = 7 } = {}) {
  const since = new Date(Date.now() - Math.min(90, Math.max(1, days)) * 864e5);
  const match = { createdAt: { $gte: since } };

  const [totals, byMode, byModel, failures, latency, daily, recAgg, fallbackAgg] = await Promise.all([
    AiUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          successes: { $sum: { $cond: ['$success', 1, 0] } },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          credits: { $sum: '$creditsUsed' },
          tokensIn: { $sum: '$tokensIn' },
          tokensOut: { $sum: '$tokensOut' },
          costUsd: { $sum: '$estimatedCostUsd' },
          avgLatencyMs: { $avg: '$latencyMs' },
          maxLatencyMs: { $max: '$latencyMs' },
        },
      },
    ]),
    AiUsage.aggregate([
      { $match: match },
      { $group: { _id: '$mode', count: { $sum: 1 }, avgLatencyMs: { $avg: '$latencyMs' }, costUsd: { $sum: '$estimatedCostUsd' } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    AiUsage.aggregate([
      { $match: match },
      { $group: { _id: '$model', count: { $sum: 1 }, costUsd: { $sum: '$estimatedCostUsd' } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    AiUsage.aggregate([
      { $match: { ...match, success: false } },
      { $group: { _id: { failureClass: '$failureClass', errorCode: '$errorCode' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    AiUsage.aggregate([
      { $match: { ...match, latencyMs: { $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$latencyMs',
          boundaries: [0, 200, 500, 1000, 2000, 5000, 15000, 60000],
          default: 'slow',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    AiUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          requests: { $sum: 1 },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          costUsd: { $sum: '$estimatedCostUsd' },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    RecommendationEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          shown: { $sum: 1 },
          engaged: { $sum: { $cond: ['$engaged', 1, 0] } },
          dismissed: { $sum: { $cond: ['$dismissed', 1, 0] } },
        },
      },
    ]).catch(() => []),
    AiUsage.aggregate([
      {
        $match: {
          ...match,
          $or: [{ errorCode: 'local_fallback' }, { failureClass: 'local_fallback' }, { model: 'fallback' }],
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]).catch(() => []),
  ]);

  const t = totals[0] || {
    requests: 0,
    successes: 0,
    failures: 0,
    credits: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0,
  };

  const r = recAgg[0] || { shown: 0, engaged: 0, dismissed: 0 };
  const feedback = (r.engaged || 0) + (r.dismissed || 0);
  const fallbackCount = fallbackAgg[0]?.count || 0;

  return {
    rangeDays: days,
    from: since,
    summary: {
      requests: t.requests,
      successes: t.successes,
      failures: t.failures,
      successRate: t.requests ? Math.round((t.successes / t.requests) * 100) : 100,
      fallbackCount,
      fallbackRate: t.requests ? Math.round((fallbackCount / t.requests) * 100) : 0,
      liveResponseRate: t.requests
        ? Math.round(((t.requests - fallbackCount) / t.requests) * 100)
        : 100,
      credits: t.credits,
      tokensIn: t.tokensIn,
      tokensOut: t.tokensOut,
      estimatedCostUsd: Math.round((t.costUsd || 0) * 1e4) / 1e4,
      avgLatencyMs: Math.round(t.avgLatencyMs || 0),
      maxLatencyMs: Math.round(t.maxLatencyMs || 0),
    },
    recommendations: {
      shown: r.shown || 0,
      engaged: r.engaged || 0,
      dismissed: r.dismissed || 0,
      acceptanceRate: feedback ? Math.round(((r.engaged || 0) / feedback) * 100) : null,
      impressionEngagement: r.shown
        ? Math.round(((r.engaged || 0) / r.shown) * 100)
        : null,
    },
    byMode,
    byModel,
    failures,
    latencyBuckets: latency,
    daily,
  };
}

async function securityMonitoring({ days = 7 } = {}) {
  const since = new Date(Date.now() - Math.min(90, days) * 864e5);
  const [byType, topIps, recent, auditFails] = await Promise.all([
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since }, type: 'login_failed', ip: { $ne: '' } } },
      { $group: { _id: '$ip', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    SecurityEvent.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    AuditLog.countDocuments({ action: 'auth.login_failed', createdAt: { $gte: since } }),
  ]);

  const metrics = getMetricsSnapshot();
  return {
    rangeDays: days,
    byType,
    topFailedIps: topIps,
    recent,
    auditLoginFailures: auditFails,
    live: {
      authFailures: metrics.authFailures,
      authSuccess: metrics.authSuccess,
      rateLimited: metrics.rateLimited,
    },
  };
}

async function enterpriseTrends({ days = 30 } = {}) {
  const since = new Date(Date.now() - Math.min(180, days) * 864e5);
  const [
    usersTotal,
    usersNew,
    orgsTotal,
    orgsNew,
    aiTrend,
    learningPlans,
    learningProgress,
    careerProfiles,
    interviews,
    posts,
    discussions,
    goalsDone,
    tasksDone,
    baseAdmin,
    snapshots,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    Organization.countDocuments(),
    Organization.countDocuments({ createdAt: { $gte: since } }),
    AiUsage.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          requests: { $sum: 1 },
          credits: { $sum: '$creditsUsed' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    StudyPlan.countDocuments({ createdAt: { $gte: since } }),
    LearningProgress.countDocuments({ updatedAt: { $gte: since } }),
    CareerProfile.countDocuments({ createdAt: { $gte: since } }),
    InterviewSession.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    Post.countDocuments({ createdAt: { $gte: since } }),
    Discussion.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    Goal.countDocuments({ status: 'completed', updatedAt: { $gte: since } }),
    Task.countDocuments({ status: 'done', completedAt: { $gte: since } }),
    analyticsService.getAdminAnalytics(),
    OpsSnapshot.find({ period: 'daily', bucketStart: { $gte: since } })
      .sort({ bucketStart: 1 })
      .limit(60)
      .lean(),
  ]);

  return {
    rangeDays: days,
    userGrowth: { total: usersTotal, new: usersNew },
    organizationGrowth: { total: orgsTotal, new: orgsNew },
    aiUsageTrends: aiTrend,
    learningTrends: { studyPlans: learningPlans, progressUpdates: learningProgress, goalsCompleted: goalsDone },
    careerTrends: { profiles: careerProfiles, interviews },
    communityActivity: { posts, discussions },
    productivity: { tasksDone },
    catalog: baseAdmin,
    snapshots,
  };
}

async function applicationPerformance() {
  const metrics = getMetricsSnapshot();
  const mem = metrics.memory || {};
  return {
    api: {
      requests: metrics.requests,
      avgLatencyMs: metrics.avgLatencyMs,
      slowRequests: metrics.slowRequests,
      slowThresholdMs: metrics.slowThresholdMs,
      errors4xx: metrics.errors4xx,
      errors5xx: metrics.errors5xx,
      byMethod: metrics.byMethod,
      byStatus: metrics.byStatus,
      byErrorClass: metrics.byErrorClass,
    },
    slowEndpoints: metrics.slowEndpoints,
    topRoutes: metrics.topRoutes,
    memory: {
      ...mem,
      heapUsedMb: mem.heapUsed != null ? Math.round(mem.heapUsed / 1024 / 1024) : null,
      rssMb: mem.rss != null ? Math.round(mem.rss / 1024 / 1024) : null,
    },
    cpu: metrics.cpu,
    uptimeSec: metrics.uptimeSec,
    database: databaseHealth(),
    bottlenecks: {
      slowEndpoints: metrics.slowEndpoints,
      dbOperations: metrics.dbOperations,
      highErrorClasses: Object.entries(metrics.byErrorClass || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([cls, count]) => ({ class: cls, count })),
    },
  };
}

async function aggregateOpsSnapshot(period = 'daily') {
  const now = new Date();
  let bucketStart;
  if (period === 'hourly') {
    bucketStart = new Date(now);
    bucketStart.setMinutes(0, 0, 0);
  } else {
    bucketStart = new Date(now);
    bucketStart.setHours(0, 0, 0, 0);
  }
  const since =
    period === 'hourly'
      ? new Date(bucketStart.getTime() - 60 * 60 * 1000)
      : new Date(bucketStart.getTime() - 24 * 60 * 60 * 1000);

  const [
    usersTotal,
    usersNew,
    orgsTotal,
    orgsNew,
    aiAgg,
    studyPlans,
    progressEvents,
    careerProfiles,
    interviews,
    posts,
    discussions,
    loginFailures,
    suspicious,
    rateLimited,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    Organization.countDocuments(),
    Organization.countDocuments({ createdAt: { $gte: since } }),
    AiUsage.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          credits: { $sum: '$creditsUsed' },
          avgLatencyMs: { $avg: '$latencyMs' },
          estimatedCostUsd: { $sum: '$estimatedCostUsd' },
        },
      },
    ]),
    StudyPlan.countDocuments({ createdAt: { $gte: since } }),
    LearningProgress.countDocuments({ updatedAt: { $gte: since } }),
    CareerProfile.countDocuments({ createdAt: { $gte: since } }),
    InterviewSession.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    Post.countDocuments({ createdAt: { $gte: since } }),
    Discussion.countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
    SecurityEvent.countDocuments({ type: 'login_failed', createdAt: { $gte: since } }),
    SecurityEvent.countDocuments({ type: 'suspicious_activity', createdAt: { $gte: since } }),
    SecurityEvent.countDocuments({ type: 'rate_limited', createdAt: { $gte: since } }),
  ]);

  const ai = aiAgg[0] || {};
  const doc = await OpsSnapshot.findOneAndUpdate(
    { period, bucketStart },
    {
      $set: {
        users: { total: usersTotal, new: usersNew, activeApprox: usersNew },
        orgs: { total: orgsTotal, new: orgsNew },
        ai: {
          requests: ai.requests || 0,
          failures: ai.failures || 0,
          credits: ai.credits || 0,
          avgLatencyMs: Math.round(ai.avgLatencyMs || 0),
          estimatedCostUsd: ai.estimatedCostUsd || 0,
        },
        learning: { studyPlans, progressEvents },
        career: { profiles: careerProfiles, interviews },
        community: { posts, discussions },
        security: { loginFailures, suspicious, rateLimited },
      },
    },
    { upsert: true, new: true }
  );
  return doc;
}

async function refreshRecommendationsForActiveUsers(limit = 25) {
  let personalization;
  try {
    personalization = require('./personalizationIntelligenceService');
  } catch {
    return { refreshed: 0 };
  }
  const users = await User.find({ isActive: { $ne: false } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('_id organizationId targetCareer preferences')
    .lean();
  let refreshed = 0;
  const concurrency = 5;
  for (let i = 0; i < users.length; i += concurrency) {
    const chunk = users.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (user) => {
        try {
          await personalization.refreshUnifiedProfile(user, { force: false });
          return 1;
        } catch {
          return 0;
        }
      })
    );
    refreshed += results.reduce((s, n) => s + n, 0);
  }
  return { refreshed, users: users.length };
}

async function processNotificationBacklog() {
  const stale = await Notification.countDocuments({
    read: false,
    createdAt: { $lte: new Date(Date.now() - 14 * 864e5) },
  });
  return { unreadOlderThan14d: stale };
}

async function listAuditLogs({ action, limit = 50, page = 1 } = {}) {
  const { paginationMeta } = require('../utils/pagination');
  const filter = {};
  if (action) filter.action = action;
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, pagination: paginationMeta(safePage, safeLimit, total) };
}

module.exports = {
  recordSecurityEvent,
  detectSuspiciousActivity,
  isLoginLocked,
  systemHealthDashboard,
  aiOperationsAnalytics,
  securityMonitoring,
  enterpriseTrends,
  applicationPerformance,
  aggregateOpsSnapshot,
  refreshRecommendationsForActiveUsers,
  processNotificationBacklog,
  listAuditLogs,
  databaseHealth,
  storageHealth,
  queueHealth,
};
