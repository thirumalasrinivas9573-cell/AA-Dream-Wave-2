/**
 * Soft request timeout — responds 504 if the handler has not finished.
 * Does not abort in-flight work (Node limitation without AbortSignal wiring).
 */
function requestTimeout(options = {}) {
  const timeoutMs = Math.max(
    1000,
    Number(options.timeoutMs ?? process.env.REQUEST_TIMEOUT_MS) || 30000
  );
  const skipPaths = options.skipPaths || [
    '/api/health',
    '/api/ready',
    '/api/metrics',
    '/api/billing/webhook',
  ];

  return (req, res, next) => {
    if (skipPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return next();
    }
    // Streaming / long AI endpoints get a higher budget
    const isLong =
      req.path.includes('/stream') ||
      req.path.includes('/ai/') ||
      req.path.includes('/mentor');
    const budget = isLong
      ? Math.max(timeoutMs, Number(process.env.LONG_REQUEST_TIMEOUT_MS) || 90000)
      : timeoutMs;

    const timer = setTimeout(() => {
      if (res.headersSent) return;
      res.status(504).json({
        success: false,
        message: 'Request timed out',
        failureClass: 'timeout',
        ...(req.requestId ? { requestId: req.requestId } : {}),
      });
    }, budget);
    if (typeof timer.unref === 'function') timer.unref();

    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}

module.exports = { requestTimeout };
