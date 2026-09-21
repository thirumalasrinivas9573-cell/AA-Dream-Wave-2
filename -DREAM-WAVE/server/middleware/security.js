const crypto = require('crypto');
const { AppError } = require('./errorHandler');

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 64
      ? incoming.replace(/[^\w\-.:]/g, '')
      : crypto.randomBytes(12).toString('hex');
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/** Strip Mongo operator injection keys from objects. */
function sanitizeObject(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeObject(v, depth + 1));
  if (typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    out[key] = sanitizeObject(val, depth + 1);
  }
  return out;
}

function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query);
  if (req.params && typeof req.params === 'object') req.params = sanitizeObject(req.params);
  next();
}

/**
 * Origin/Referer gate for cookie-authenticated mutating auth routes (CSRF hardening).
 * Bearer-only API clients without cookies are unaffected.
 */
function requireTrustedOrigin(req, _res, next) {
  const hasRefreshCookie = Boolean(req.cookies?.dw_refresh);
  if (!hasRefreshCookie) return next();
  if (process.env.NODE_ENV === 'test') return next();

  const allowed = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.includes('*')) {
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError('Untrusted origin', 403));
    }
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const candidate = origin || (referer ? new URL(referer).origin : '');

  if (!candidate) {
    // Same-site navigations may omit Origin; allow only safe methods here.
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return next(new AppError('Missing Origin for cookie session', 403));
  }

  if (!allowed.includes(candidate)) {
    return next(new AppError('Untrusted origin', 403));
  }
  return next();
}

module.exports = {
  requestId,
  sanitizeInput,
  sanitizeObject,
  requireTrustedOrigin,
};
