/**
 * MJ Gateway Rate Limiter
 * Isolated from Dream Wave rate limiters.
 * @module mj/gateway/middleware/rateLimiter
 */

let rateLimit
try {
  rateLimit = require('express-rate-limit')
} catch {
  rateLimit = null
}

function createMJRateLimiter() {
  if (!rateLimit) {
    return (_req, _res, next) => next()
  }

  return rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.MJ_RATE_LIMIT || '60', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      timestamp: Date.now(),
      requestId: null,
      executionTime: 0,
      mjState: null,
      payload: null,
      errors: [{ type: 'validation', code: 'MJ_GW_RATE_LIMIT', message: 'Too many MJ API requests. Please wait.' }],
      warnings: [],
    },
    keyGenerator: (req) => req.mjPermissions?.userId || req.ip,
  })
}

module.exports = { createMJRateLimiter }
