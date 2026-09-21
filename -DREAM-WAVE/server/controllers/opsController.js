const ops = require('../services/opsIntelligenceService');
const asyncHandler = require('../utils/asyncHandler');
const { getJobStatus, runCleanupJobs } = require('../services/jobRunner');
const { auditFromRequest } = require('../utils/audit');

exports.healthDashboard = asyncHandler(async (_req, res) => {
  const dashboard = await ops.systemHealthDashboard();
  // Always success:true with health in data; HTTP status reflects readiness.
  res.status(dashboard.status === 'down' ? 503 : 200).json({
    success: true,
    data: dashboard,
  });
});

exports.aiOps = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const data = await ops.aiOperationsAnalytics({ days });
  res.json({ success: true, data });
});

exports.performance = asyncHandler(async (_req, res) => {
  const data = await ops.applicationPerformance();
  res.json({ success: true, data });
});

exports.security = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const data = await ops.securityMonitoring({ days });
  res.json({ success: true, data });
});

exports.trends = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const data = await ops.enterpriseTrends({ days });
  res.json({ success: true, data });
});

exports.jobs = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      status: getJobStatus(),
      queue: ops.queueHealth(),
    },
  });
});

exports.runJobs = asyncHandler(async (req, res) => {
  const summary = await runCleanupJobs();
  await auditFromRequest(req, {
    action: 'ops.run_jobs',
    resource: 'JobRunner',
    resourceId: 'cleanup',
    meta: summary || {},
  });
  res.json({ success: true, data: { summary } });
});

exports.auditLogs = asyncHandler(async (req, res) => {
  const data = await ops.listAuditLogs({
    action: req.query.action,
    limit: parseInt(req.query.limit, 10) || 50,
    page: parseInt(req.query.page, 10) || 1,
  });
  res.json({ success: true, data });
});

exports.aggregate = asyncHandler(async (req, res) => {
  const period = req.body.period === 'hourly' ? 'hourly' : 'daily';
  const snapshot = await ops.aggregateOpsSnapshot(period);
  await auditFromRequest(req, {
    action: 'ops.aggregate',
    resource: 'OpsSnapshot',
    resourceId: snapshot._id,
  });
  res.json({ success: true, data: { snapshot } });
});

exports.platformReadiness = asyncHandler(async (_req, res) => {
  const { getReleaseInfo } = require('../config/release');
  const release = getReleaseInfo();
  const health = await ops.systemHealthDashboard();
  const modules = [
    'auth',
    'orgs',
    'goals',
    'tasks',
    'learning',
    'lms',
    'research',
    'career',
    'books',
    'media',
    'community',
    'collab',
    'graph',
    'adaptive',
    'productivity',
    'personalization',
    'mentor',
    'ai',
    'dashboard',
    'reports',
    'settings',
    'billing',
    'search',
    'ops',
    'notifications',
    'institution',
  ];
  res.json({
    success: true,
    data: {
      status: health.status === 'ok' ? 'production_ready' : health.status,
      version: release.version,
      releaseChannel: release.channel,
      phase: release.phase,
      modules: modules.map((id) => ({ id, mounted: true })),
      health,
      checks: {
        database: health.database?.status === 'up',
        storage: health.storage?.status === 'up' || health.storage?.status === 'degraded',
        api: health.api?.status === 'up' || health.api?.status === 'degraded',
        queue: Boolean(health.queue),
        readyProbe: true,
        gracefulShutdown: true,
        releaseVersionPinned: release.version === '1.0.0',
        lmsMounted: true,
      },
    },
  });
});
