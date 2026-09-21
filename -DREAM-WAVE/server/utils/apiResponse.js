/**
 * Standard API response helpers for Dream Wave controllers.
 * Shape: { success, message?, code?, ...payload }
 */

function ok(res, status = 200, payload = {}) {
  return res.status(status).json({ success: true, ...payload })
}

function fail(res, status = 500, message = 'Request failed.', code = 'REQUEST_ERROR', extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra })
}

function fromError(res, err, fallbackMessage = 'Internal server error.') {
  const status = err?.statusCode || err?.status || 500
  if (status >= 500) console.error('[api]', err?.message || err)
  const body = {
    success: false,
    message: err?.message || (status >= 500 ? fallbackMessage : 'Request failed.'),
    code: err?.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
  }
  if (err?.verified === false) body.verified = false
  return res.status(status).json(body)
}

module.exports = { ok, fail, fromError }
