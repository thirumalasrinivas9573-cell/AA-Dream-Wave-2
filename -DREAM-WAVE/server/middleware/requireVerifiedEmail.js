/**
 * Email verification gate — disabled.
 * Kept as a no-op so existing route mounts stay valid.
 */
function requireVerifiedEmail(_req, _res, next) {
  return next();
}

module.exports = { requireVerifiedEmail };
