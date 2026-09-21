const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../utils/sendEmail');
const { publicUser } = require('./authController');
const { cascadeDeleteUserData } = require('../services/userCascadeService');
const { writeAudit, clientIp } = require('../utils/audit');

exports.getSettings = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      preferences: req.user.preferences,
      profile: {
        name: req.user.name,
        email: req.user.email,
        bio: req.user.bio,
        profileImage: req.user.profileImage,
        targetCareer: req.user.targetCareer,
        plan: req.user.plan,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
      },
    },
  });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const { theme, language, notifications, emailUpdates, name, bio, targetCareer } = req.body;
  if (theme) req.user.preferences.theme = theme;
  if (language) req.user.preferences.language = language;
  if (notifications !== undefined) req.user.preferences.notifications = notifications;
  if (emailUpdates !== undefined) req.user.preferences.emailUpdates = emailUpdates;
  if (name) req.user.name = name;
  if (bio !== undefined) req.user.bio = bio;
  if (targetCareer !== undefined) req.user.targetCareer = String(targetCareer).slice(0, 120);
  await req.user.save();
  res.json({
    success: true,
    data: { preferences: req.user.preferences, user: publicUser(req.user) },
  });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!password || !(await user.comparePassword(password))) {
    throw new AppError('Password confirmation failed', 400);
  }
  const userId = user._id;
  const email = user.email;
  await cascadeDeleteUserData(userId);
  await user.deleteOne();
  await writeAudit({
    actor: null,
    action: 'account.deleted',
    resource: 'user',
    resourceId: userId,
    meta: { email },
    ip: clientIp(req),
    requestId: req.requestId,
  });
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('dw_refresh', {
    path: '/api/auth',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Account deleted' });
});

exports.contact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) throw new AppError('Name, email, and message are required', 400);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new AppError('Contact inbox is not configured', 503);
  }
  await sendEmail({
    to: adminEmail,
    subject: `Contact form — ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
  res.json({ success: true, message: 'Message sent. We will get back to you soon.' });
});
