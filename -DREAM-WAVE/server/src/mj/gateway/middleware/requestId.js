/**
 * Assign unique request ID to every MJ API request.
 * @module mj/gateway/middleware/requestId
 */

const { generateId } = require('../../utils')

function requestIdMiddleware(req, res, next) {
  req.mjRequestId = req.headers['x-request-id'] || generateId('req')
  res.setHeader('X-Request-Id', req.mjRequestId)
  next()
}

module.exports = { requestIdMiddleware }
