/**
 * MJ Permission Middleware (architecture only — future RBAC/JWT)
 * @module mj/gateway/middleware/permission
 */

const { MJLogger } = require('../../logger')

/**
 * Builds permission context from canonical Dream Wave authentication.
 */
function permissionMiddleware(req, res, next) {
  req.mjPermissions = {
    authenticated: Boolean(req.user),
    userId: req.user ? String(req.user._id || req.user.id) : null,
    roles: req.user?.role ? [req.user.role] : [],
    capabilities: [],
    jwtReady: Boolean(req.user),
    rbacReady: true,
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required.',
    })
  }

  // Never trust a caller-supplied identity. Normalize all supported locations
  // to the authenticated account before gateway handlers resolve user scope.
  if (req.body && typeof req.body === 'object') req.body.userId = req.mjPermissions.userId
  if (req.query && typeof req.query === 'object') req.query.userId = req.mjPermissions.userId
  req.headers['x-user-id'] = req.mjPermissions.userId

  MJLogger.child('Gateway:Permission').debug('Permission context attached', {
    requestId: req.mjRequestId,
    userId: req.mjPermissions.userId,
  })

  next()
}

module.exports = { permissionMiddleware }
