const auth = require('./auth');

const requireRole = (...roles) => (req, res, next) => {
  const authorize = () => {
    const role = req.user?.role;
    if (!role || (!roles.includes(role) && role !== 'admin')) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_FORBIDDEN',
        message: 'Access denied for this portal.',
      });
    }
    next();
  };
  if (req.user) return authorize();
  return auth(req, res, authorize);
};

const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const { isSessionFamilyActive } = require('../utils/tokenService');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'dream-wave-api',
      audience: 'dream-wave-client',
    });
    if (decoded.type !== 'access' || !decoded.sid) return next();
    if (!await isSessionFamilyActive(decoded.id, decoded.sid)) return next();
    const user = await User.findById(decoded.id).select('-password');
    if (user && !user.suspended) req.user = user;
  } catch { /* anonymous */ }
  return next();
};

module.exports = { requireRole, optionalAuth };
