/**
 * MJ API Key Middleware
 * @module mj/gateway/middleware/apiKey
 */

const { MJLogger } = require('../../logger')

/**
 * Validates API key when MJ_API_KEY env var is set.
 * In production, MJ is disabled unless MJ_API_KEY is configured (fail closed).
 */
function apiKeyMiddleware(req, res, next) {
  const configuredKey = process.env.MJ_API_KEY
  const production = process.env.NODE_ENV === 'production'

  if (production && !configuredKey) {
    return res.status(503).json({
      success: false,
      code: 'MJ_DISABLED',
      message: 'MJ service is not enabled in this environment.',
      timestamp: Date.now(),
      requestId: req.mjRequestId,
      executionTime: 0,
      mjState: null,
      payload: null,
      errors: [{ type: 'configuration', code: 'MJ_DISABLED', message: 'MJ service is not enabled in this environment.' }],
      warnings: [],
    })
  }

  if (!configuredKey) return next()

  const providedKey = req.headers['x-mj-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')

  if (!providedKey || providedKey !== configuredKey) {
    MJLogger.child('Gateway:ApiKey').warning('Invalid API key attempt', {
      requestId: req.mjRequestId,
      ip: req.ip,
    })
    return res.status(401).json({
      success: false,
      timestamp: Date.now(),
      requestId: req.mjRequestId,
      executionTime: 0,
      mjState: null,
      payload: null,
      errors: [{ type: 'validation', code: 'MJ_GW_UNAUTHORIZED', message: 'Invalid or missing API key' }],
      warnings: [],
    })
  }

  next()
}

module.exports = { apiKeyMiddleware }
