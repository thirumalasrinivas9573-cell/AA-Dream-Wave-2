const startedAt = Date.now();

const counters = {
  requests: 0,
  errors4xx: 0,
  errors5xx: 0,
  authFailures: 0,
  authSuccess: 0,
  rateLimited: 0,
  byMethod: Object.create(null),
  byRoute: Object.create(null),
  byStatus: Object.create(null),
  byErrorClass: Object.create(null),
  latencySumMs: 0,
  latencyCount: 0,
  slowRequests: 0,
};

/** route -> { count, totalMs, maxMs, slow } */
const routeLatency = Object.create(null);
/** name -> { count, totalMs, maxMs } */
const dbOps = Object.create(null);
const SLOW_MS = Math.max(200, Number(process.env.SLOW_REQUEST_MS) || 1200);
const MAX_ROUTE_KEYS = 400;
const MAX_DB_KEYS = 200;

function recordDbOp(name, elapsedMs) {
  const key = String(name || 'db').slice(0, 80);
  if (!dbOps[key] && Object.keys(dbOps).length >= MAX_DB_KEYS) return;
  const bucket = dbOps[key] || { count: 0, totalMs: 0, maxMs: 0 };
  bucket.count += 1;
  bucket.totalMs += elapsedMs;
  bucket.maxMs = Math.max(bucket.maxMs, elapsedMs);
  dbOps[key] = bucket;
}

async function timedDb(name, work) {
  const t0 = process.hrtime.bigint();
  try {
    return await work();
  } finally {
    recordDbOp(name, Number(process.hrtime.bigint() - t0) / 1e6);
  }
}

function metricsMiddleware(req, res, next) {
  if (req.path === '/api/metrics' || req.path === '/api/health' || req.path === '/api/ready') {
    return next();
  }
  const t0 = process.hrtime.bigint();
  counters.requests += 1;
  const method = req.method || 'GET';
  counters.byMethod[method] = (counters.byMethod[method] || 0) + 1;

  res.on('finish', () => {
    const code = res.statusCode || 0;
    counters.byStatus[String(code)] = (counters.byStatus[String(code)] || 0) + 1;
    if (code >= 500) counters.errors5xx += 1;
    else if (code >= 400) counters.errors4xx += 1;

    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
    counters.latencySumMs += elapsedMs;
    counters.latencyCount += 1;
    if (elapsedMs >= SLOW_MS) counters.slowRequests += 1;

    const route = (req.route && req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.path) || 'unknown';
    const key = `${method} ${route}`.slice(0, 120);
    counters.byRoute[key] = (counters.byRoute[key] || 0) + 1;

    if (!routeLatency[key] && Object.keys(routeLatency).length >= MAX_ROUTE_KEYS) {
      /* drop new keys when saturated */
    } else {
      const bucket = routeLatency[key] || { count: 0, totalMs: 0, maxMs: 0, slow: 0 };
      bucket.count += 1;
      bucket.totalMs += elapsedMs;
      bucket.maxMs = Math.max(bucket.maxMs, elapsedMs);
      if (elapsedMs >= SLOW_MS) bucket.slow += 1;
      routeLatency[key] = bucket;
    }
  });
  next();
}

function recordAuthFailure() {
  counters.authFailures += 1;
}

function recordAuthSuccess() {
  counters.authSuccess += 1;
}

function recordRateLimited() {
  counters.rateLimited += 1;
}

function recordErrorClass(cls) {
  const key = String(cls || 'unknown').slice(0, 60);
  counters.byErrorClass[key] = (counters.byErrorClass[key] || 0) + 1;
}

function cpuUsageSnapshot() {
  try {
    const u = process.cpuUsage();
    return { userMicros: u.user, systemMicros: u.system };
  } catch {
    return { userMicros: 0, systemMicros: 0 };
  }
}

function getMetricsSnapshot() {
  const topRoutes = Object.entries(counters.byRoute)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([route, count]) => ({ route, count }));

  const slowEndpoints = Object.entries(routeLatency)
    .map(([route, b]) => ({
      route,
      count: b.count,
      avgMs: Math.round(b.totalMs / Math.max(1, b.count)),
      maxMs: Math.round(b.maxMs),
      slow: b.slow,
    }))
    .filter((r) => r.slow > 0 || r.avgMs >= SLOW_MS * 0.75)
    .sort((a, b) => b.maxMs - a.maxMs)
    .slice(0, 15);

  const dbOperations = Object.entries(dbOps)
    .map(([name, b]) => ({
      name,
      count: b.count,
      avgMs: Math.round(b.totalMs / Math.max(1, b.count)),
      maxMs: Math.round(b.maxMs),
    }))
    .sort((a, b) => b.maxMs - a.maxMs)
    .slice(0, 20);

  const mem = process.memoryUsage();
  const avgLatencyMs =
    counters.latencyCount > 0 ? Math.round(counters.latencySumMs / counters.latencyCount) : 0;

  return {
    uptimeSec: Math.round(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    cpu: cpuUsageSnapshot(),
    requests: counters.requests,
    errors4xx: counters.errors4xx,
    errors5xx: counters.errors5xx,
    authFailures: counters.authFailures,
    authSuccess: counters.authSuccess,
    rateLimited: counters.rateLimited,
    avgLatencyMs,
    slowRequests: counters.slowRequests,
    slowThresholdMs: SLOW_MS,
    byMethod: { ...counters.byMethod },
    byStatus: { ...counters.byStatus },
    byErrorClass: { ...counters.byErrorClass },
    topRoutes,
    slowEndpoints,
    dbOperations,
  };
}

function resetMetricsForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  counters.requests = 0;
  counters.errors4xx = 0;
  counters.errors5xx = 0;
  counters.authFailures = 0;
  counters.authSuccess = 0;
  counters.rateLimited = 0;
  counters.latencySumMs = 0;
  counters.latencyCount = 0;
  counters.slowRequests = 0;
  for (const k of Object.keys(counters.byMethod)) delete counters.byMethod[k];
  for (const k of Object.keys(counters.byRoute)) delete counters.byRoute[k];
  for (const k of Object.keys(counters.byStatus)) delete counters.byStatus[k];
  for (const k of Object.keys(counters.byErrorClass)) delete counters.byErrorClass[k];
  for (const k of Object.keys(routeLatency)) delete routeLatency[k];
  for (const k of Object.keys(dbOps)) delete dbOps[k];
}

module.exports = {
  metricsMiddleware,
  getMetricsSnapshot,
  recordAuthFailure,
  recordAuthSuccess,
  recordRateLimited,
  recordErrorClass,
  recordDbOp,
  timedDb,
  resetMetricsForTests,
  SLOW_MS,
};
