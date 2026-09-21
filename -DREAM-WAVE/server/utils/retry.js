/**
 * Lightweight retry + timeout helpers for transient failures (AI / network / DB).
 */
async function withRetry(fn, options = {}) {
  const retries = Math.max(0, options.retries ?? 2);
  const baseDelayMs = Math.max(10, options.baseDelayMs ?? 120);
  const shouldRetry =
    options.shouldRetry ||
    ((err) => {
      const msg = String(err?.message || '').toLowerCase();
      const code = err?.code || err?.status || err?.statusCode;
      if (code === 429 || code === 503 || code === 502) return true;
      return /timeout|econnreset|econnrefused|temporar|rate limit|overloaded|network/.test(msg);
    });

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !shouldRetry(err, attempt)) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Reject if `work` does not settle within timeoutMs.
 */
async function withTimeout(work, timeoutMs = 10000, label = 'operation') {
  const ms = Math.max(50, Number(timeoutMs) || 10000);
  let timer;
  try {
    return await Promise.race([
      typeof work === 'function' ? work() : work,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out after ${ms}ms`);
          err.code = 'ETIMEDOUT';
          err.statusCode = 504;
          reject(err);
        }, ms);
        if (typeof timer.unref === 'function') timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function classifyFailure(err, statusCode) {
  const code = statusCode || err?.statusCode || 500;
  const msg = String(err?.message || '').toLowerCase();
  if (code === 401 || code === 403) return 'auth';
  if (code === 402) return 'entitlement';
  if (code === 404) return 'not_found';
  if (code === 429) return 'rate_limit';
  if (code === 400 || err?.name === 'ValidationError' || err?.name === 'CastError') return 'validation';
  if (code === 413 || err?.name === 'MulterError') return 'upload';
  if (code === 504 || /timeout|timed out|etimedout/.test(msg)) return 'timeout';
  if (/mongo|econnrefused|enotfound/.test(msg)) return 'infrastructure';
  if (/openai|ai |credit/.test(msg)) return 'ai_provider';
  if (code >= 500) return 'server';
  return 'operational';
}

module.exports = { withRetry, withTimeout, classifyFailure };
