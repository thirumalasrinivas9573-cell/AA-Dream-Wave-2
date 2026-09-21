/**
 * MJ Express Middleware (future integration stub)
 * Does NOT modify existing Dream Wave middleware.
 * @module mj/middleware/MJMiddleware
 */

const { MJLogger } = require('../logger')

/**
 * Future Express middleware for MJ API routes.
 * @param {Object} [options]
 * @returns {Function}
 */
function createMJMiddleware(options = {}) {
  const logger = MJLogger.child('Middleware')

  return (req, res, next) => {
    req.mj = req.mj || {}
    req.mj.correlationId = req.headers['x-mj-correlation-id'] || `req_${Date.now()}`
    req.mj.options = options

    logger.debug('MJ middleware (stub)', {
      path: req.path,
      correlationId: req.mj.correlationId,
    })

    next()
  }
}

module.exports = { createMJMiddleware }
