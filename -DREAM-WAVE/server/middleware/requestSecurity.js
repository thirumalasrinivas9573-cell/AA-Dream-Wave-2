const crypto = require('crypto')

function requestId(req, res, next) {
  req.id = req.header('x-request-id') || crypto.randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
}

function rejectMongoOperators(req, res, next) {
  const unsafe = (value) => {
    if (!value || typeof value !== 'object') return false
    if (Buffer.isBuffer(value)) return false
    if (Array.isArray(value)) return value.some(unsafe)
    return Object.entries(value).some(([key, nested]) => (
      key.startsWith('$') || key.includes('.') || unsafe(nested)
    ))
  }
  if (unsafe(req.body) || unsafe(req.query) || unsafe(req.params)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_INPUT',
      message: 'Request contains unsupported field names.',
    })
  }
  next()
}

function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin')
  if (!origin) return next() // native/server clients
  const allowed = [
    process.env.CLIENT_URL,
    ...String(process.env.EXTRA_CORS_ORIGINS || '').split(',').map((item) => item.trim()),
  ].filter(Boolean)
  if (process.env.NODE_ENV !== 'production') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /\.trycloudflare\.com$/.test(origin)) return next()
  }
  if (allowed.includes(origin)) return next()
  return res.status(403).json({
    success: false,
    code: 'UNTRUSTED_ORIGIN',
    message: 'Request origin is not allowed.',
  })
}

module.exports = { requestId, rejectMongoOperators, requireTrustedOrigin }
