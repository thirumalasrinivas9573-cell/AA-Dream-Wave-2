const User = require('../models/User');
const Report = require('../models/Report');
const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { escapeRegex } = require('../utils/helpers');
const { publicUser } = require('./authController');
const { getPlan, PLAN_CATALOG } = require('../config/plans');
const { cascadeDeleteUserData } = require('../services/userCascadeService');
const { auditFromRequest } = require('../utils/audit');

exports.dashboard = asyncHandler(async (_req, res) => {
  const analytics = await analyticsService.getAdminAnalytics();
  res.json({ success: true, data: { analytics } });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const q = req.query.q
    ? {
        $or: [
          { name: { $regex: escapeRegex(String(req.query.q).slice(0, 80)), $options: 'i' } },
          { email: { $regex: escapeRegex(String(req.query.q).slice(0, 80)), $options: 'i' } },
        ],
      }
    : {};
  const users = await User.find(q).select('-password').sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: { users } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { role, plan, isActive, credits } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (role === 'user' && String(user._id) === String(req.user._id)) {
    throw new AppError('Cannot demote your own admin account', 400);
  }
  if (isActive === false && String(user._id) === String(req.user._id)) {
    throw new AppError('Cannot disable your own admin account', 400);
  }
  if (role) user.role = role;
  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
    if (!isActive) user.refreshTokens = [];
  }
  if (typeof credits === 'number') user.credits = credits;
  if (plan) {
    if (!PLAN_CATALOG[plan]) throw new AppError('Invalid plan', 400);
    user.plan = plan;
    user.credits = getPlan(plan).monthlyCredits;
  }
  await user.save();
  await auditFromRequest(req, {
    action: 'admin.user.update',
    resource: 'user',
    resourceId: user._id,
    meta: { role, plan, isActive, credits },
  });
  res.json({ success: true, data: { user: publicUser(user) } });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new AppError('Cannot delete your own admin account here', 400);
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const email = user.email;
  const userId = user._id;
  await cascadeDeleteUserData(userId);
  await user.deleteOne();
  await auditFromRequest(req, {
    action: 'admin.user.delete',
    resource: 'user',
    resourceId: userId,
    meta: { email },
  });
  res.json({ success: true, message: 'User deleted' });
});

exports.reports = asyncHandler(async (_req, res) => {
  const reports = await Report.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: { reports } });
});
