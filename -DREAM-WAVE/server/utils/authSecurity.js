const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');
const PasswordReset = require('../models/PasswordReset');
const LoginHistory = require('../models/LoginHistory');
const {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  isOtpValid,
  canResend,
  assertAttempts,
  MAX_ATTEMPTS,
} = require('./otp');
const { HISTORY_SIZE } = require('./passwordPolicy');
const { parseUserAgent, clientIp } = require('./userAgent');

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

function assertNotLocked(user) {
  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    const mins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    const err = new Error(`Account temporarily locked. Try again in ${mins} minute(s).`);
    err.statusCode = 423;
    err.code = 'ACCOUNT_LOCKED';
    throw err;
  }
}

async function recordFailedLogin(user) {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
    user.lockUntil = new Date(Date.now() + LOCK_MS);
    user.failedLoginAttempts = 0;
  }
  await user.save();
}

async function clearLoginFailures(user) {
  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
}

async function recordLoginEvent(req, {
  user = null,
  success,
  reason = '',
  portal = '',
  identifier = '',
}) {
  const ua = req.headers['user-agent'] || '';
  const { device, browser } = parseUserAgent(ua);
  try {
    await LoginHistory.create({
      userId: user?._id || undefined,
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || '',
      portal,
      success: Boolean(success),
      reason: String(reason).slice(0, 200),
      ip: clientIp(req),
      userAgent: String(ua).slice(0, 500),
      device,
      browser,
      identifier: String(identifier).slice(0, 200),
    });
  } catch (err) {
    console.error('[auth] login history failed:', err.message);
  }
}

async function issueSecureEmailOtp({ user, purpose, emailFn }) {
  const gate = canResend(user.emailOtpSentAt);
  if (!gate.ok) {
    const err = new Error(`Please wait ${Math.ceil(gate.waitMs / 1000)}s before requesting another code.`);
    err.statusCode = 429;
    throw err;
  }
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Scope by userId so Student / Institution / Company OTPs never mix for the same email
  await Otp.updateMany(
    { userId: user._id, purpose, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );
  await Otp.create({
    userId: user._id,
    email: user.email,
    purpose,
    channel: 'email',
    codeHash,
    expiresAt,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    sentAt: new Date(),
  });

  // Keep legacy User fields in sync for older paths
  if (purpose === 'reset') {
    user.resetPasswordOTP = codeHash;
    user.resetPasswordOTPExpires = expiresAt;
  } else {
    user.verificationOTP = codeHash;
    user.verificationOTPExpires = expiresAt;
  }
  user.emailOtpAttempts = 0;
  user.emailOtpSentAt = new Date();
  await user.save();

  await emailFn({ to: user.email, name: user.name, otp, purpose });
  return { expiresAt };
}

async function verifySecureEmailOtp({ email, purpose, otp, userId = null }) {
  const normalized = String(email).toLowerCase().trim();
  const query = {
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };
  if (userId) query.userId = userId;
  else query.email = normalized;

  const doc = await Otp.findOne(query).sort({ createdAt: -1 });

  if (!doc) {
    return { ok: false, message: 'Invalid or expired verification code' };
  }
  if ((doc.attempts || 0) >= (doc.maxAttempts || MAX_ATTEMPTS)) {
    doc.consumedAt = new Date();
    await doc.save();
    return { ok: false, message: 'Too many verification attempts. Request a new code.', code: 'OTP_LOCKED' };
  }
  if (!isOtpValid(doc.codeHash, doc.expiresAt, otp)) {
    doc.attempts += 1;
    if (doc.attempts >= (doc.maxAttempts || MAX_ATTEMPTS)) {
      doc.consumedAt = new Date();
    }
    await doc.save();
    if (doc.consumedAt) {
      return { ok: false, message: 'Too many verification attempts. Request a new code.', code: 'OTP_LOCKED' };
    }
    return { ok: false, message: 'Invalid or expired verification code' };
  }
  doc.consumedAt = new Date();
  await doc.save();
  return { ok: true, doc };
}

async function createPasswordReset({ user, req, emailFn }) {
  const gate = canResend(user.emailOtpSentAt);
  if (!gate.ok) {
    const err = new Error(`Please wait ${Math.ceil(gate.waitMs / 1000)}s before requesting another code.`);
    err.statusCode = 429;
    throw err;
  }
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const ua = req.headers['user-agent'] || '';

  await PasswordReset.updateMany(
    { userId: user._id, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );
  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    codeHash,
    expiresAt,
    attempts: 0,
    sentAt: new Date(),
    ip: clientIp(req),
    userAgent: String(ua).slice(0, 500),
  });

  user.resetPasswordOTP = codeHash;
  user.resetPasswordOTPExpires = expiresAt;
  user.emailOtpSentAt = new Date();
  user.emailOtpAttempts = 0;
  await user.save();

  await emailFn({ to: user.email, name: user.name, otp });
}

async function consumePasswordReset({ userId, otp }) {
  if (!userId) return { ok: false };
  const doc = await PasswordReset.findOne({
    userId,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!doc) return { ok: false };
  assertAttempts(doc.attempts);
  if (!isOtpValid(doc.codeHash, doc.expiresAt, otp)) {
    await PasswordReset.updateOne(
      { _id: doc._id, consumedAt: null },
      { $inc: { attempts: 1 } },
    );
    return { ok: false };
  }
  const consumed = await PasswordReset.findOneAndUpdate(
    { _id: doc._id, userId, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  );
  return consumed ? { ok: true, doc: consumed } : { ok: false };
}

async function assertPasswordNotReused(user, newPassword) {
  const history = user.passwordHistory || [];
  for (const hash of history) {
    if (await bcrypt.compare(newPassword, hash)) {
      const err = new Error('Choose a password you have not used recently.');
      err.statusCode = 400;
      err.code = 'PASSWORD_REUSED';
      throw err;
    }
  }
  if (user.password && await bcrypt.compare(newPassword, user.password)) {
    const err = new Error('Choose a password you have not used recently.');
    err.statusCode = 400;
    err.code = 'PASSWORD_REUSED';
    throw err;
  }
}

async function pushPasswordHistory(user) {
  if (!user.password) return;
  const next = [user.password, ...(user.passwordHistory || [])].slice(0, HISTORY_SIZE);
  user.passwordHistory = next;
}

module.exports = {
  MAX_FAILED_LOGINS,
  LOCK_MS,
  assertNotLocked,
  recordFailedLogin,
  clearLoginFailures,
  recordLoginEvent,
  issueSecureEmailOtp,
  verifySecureEmailOtp,
  createPasswordReset,
  consumePasswordReset,
  assertPasswordNotReused,
  pushPasswordHistory,
};
