const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  isOtpValid,
  canResend,
  assertAttempts,
  isValidEmailFormat,
} = require('../utils/otp');
const { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { sendOTP: twilioSendOTP, verifyOTP: twilioVerifyOTP } = require('../services/twilioVerify');
const { issueSession, rotateRefreshToken, revokeRefreshToken, revokeAllForUser, setRefreshCookie, clearRefreshCookie, readRefreshFromReq, listSessions, revokeSessionById, ACCESS_TTL } = require('../utils/tokenService');
const { bootstrapPortalProfile } = require('../utils/portalBootstrap');
const {
  PORTAL_ROLES,
  AUTH_ROLES,
  portalAlreadyExistsMessage,
  wrongPortalPayload,
  findByEmailAndPortal,
  findUserByIdentifier: findPortalUser,
  findSiblingRoles,
  findOrphanByEmail,
  claimOrphanAccount,
} = require('../utils/portalAccounts');
const {
  assertE164,
  maskPhone,
  isPhoneVerified,
  consumeVerified,
  markVerified,
} = require('../utils/phoneOtpGuard');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const { clientIp } = require('../utils/userAgent');
const {
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
} = require('../utils/authSecurity');

const CHALLENGE_TTL = '5m';
const CHALLENGE_SECRET = process.env.AUTH_CHALLENGE_SECRET || process.env.JWT_SECRET;
const CHALLENGE_VERIFY = { issuer: 'dream-wave-api', audience: 'dream-wave-auth' };

async function completeLoginSession(req, res, user, options = {}) {
  // Portal from OTP challenge / login body must match this account's role.
  // Multi-portal: each (email, role) is a separate User — never rewrite role across portals.
  const portal = options.portal || req.body?.portal || null
  const portalRole = AUTH_ROLES.includes(portal) ? portal : null

  if (portalRole) {
    if (!user.role) {
      user.role = portalRole
      await user.save()
    } else if (user.role !== portalRole) {
      return res.status(403).json(wrongPortalPayload(portalRole, [user.role]))
    }
  } else if (!user.role) {
    return res.status(403).json({
      success: false,
      message: 'Account has no portal role. Sign in from Student, Institution, or Company login.',
      code: 'ROLE_REQUIRED',
    })
  }

  if (user.accountStatus === 'DISABLED' || user.accountStatus === 'SUSPENDED' || user.suspended) {
    return res.status(403).json({
      success: false,
      code: user.accountStatus === 'DISABLED' ? 'ACCOUNT_DISABLED' : 'ACCOUNT_SUSPENDED',
      message: user.accountStatus === 'DISABLED'
        ? 'Account disabled. Contact support.'
        : 'Account suspended. Contact support.',
    })
  }

  await bootstrapPortalProfile(user);
  await clearLoginFailures(user);
  // Server-owned login activity — never accept client-provided lastLoginAt.
  user.lastLoginAt = new Date();
  if (!user.accountStatus || user.accountStatus === 'PENDING_VERIFICATION') {
    user.accountStatus = user.emailVerified ? 'ACTIVE' : 'PENDING_VERIFICATION';
  }
  await user.save();
  const ua = req.headers['user-agent'] || '';
  const remember = options.remember !== undefined
    ? Boolean(options.remember)
    : req.body?.remember !== false;
  const { token, refreshToken, ttl } = await issueSession(
    user._id,
    { userAgent: ua, ip: clientIp(req) },
    { remember },
  );
  setRefreshCookie(res, refreshToken, ttl);
  await recordLoginEvent(req, {
    user,
    success: true,
    portal: portalRole || user.role || '',
    identifier: options.identifier || '',
  });
  return res.json({
    success: true,
    message: 'Login successful',
    emailVerified: Boolean(user.emailVerified),
    token,
    accessToken: token,
    accessTokenTtl: ACCESS_TTL,
    user: publicUser(user),
    role: user.role,
  });
}

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  aaid: user.aaid,
  level: user.level,
  credits: user.credits,
  streak: user.streak,
  emailVerified: Boolean(user.emailVerified),
  emailVerifiedAt: user.emailVerifiedAt || null,
  phone: user.phone || '',
  phoneVerified: Boolean(user.phoneVerified),
  profileImage: user.profileImage,
  certificates: user.certificates,
  role: user.role || null,
  accountStatus: user.accountStatus || (user.suspended ? 'SUSPENDED' : 'ACTIVE'),
  lastLoginAt: user.lastLoginAt || null,
  institutionId: user.institutionId || null,
  onboardingCompleted: Boolean(user.onboardingCompleted),
  organizationName: user.organizationName || '',
  learningGoal: user.learningGoal || '',
  registrationComplete: user.registrationComplete !== false,
});

const fail = (res, error) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error('[auth]', error.message);
  const body = {
    success: false,
    message: error.message || 'Server error',
  };
  if (error.code) body.code = error.code;
  if (error.verified === false) body.verified = false;
  return res.status(status).json(body);
};

function issueEmailLoginChallenge(user, portal = null) {
  return jwt.sign(
    {
      purpose: 'login_email_otp',
      userId: String(user._id),
      email: user.email,
      portal: portal || null,
    },
    CHALLENGE_SECRET,
    { expiresIn: CHALLENGE_TTL, ...CHALLENGE_VERIFY },
  );
}

function readEmailLoginChallenge(token) {
  try {
    const payload = jwt.verify(token, CHALLENGE_SECRET, CHALLENGE_VERIFY);
    if (payload.purpose !== 'login_email_otp' || !payload.userId || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueLoginChallenge(user, portal = null) {
  return jwt.sign(
    {
      purpose: 'login_otp',
      userId: String(user._id),
      phone: user.phone,
      portal: portal || null,
    },
    CHALLENGE_SECRET,
    { expiresIn: CHALLENGE_TTL, ...CHALLENGE_VERIFY },
  );
}

function readLoginChallenge(token) {
  try {
    const payload = jwt.verify(token, CHALLENGE_SECRET, CHALLENGE_VERIFY);
    if (payload.purpose !== 'login_otp' || !payload.userId || !payload.phone) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueRegistrationChallenge(user, portal) {
  return jwt.sign(
    {
      purpose: 'portal_registration',
      userId: String(user._id),
      email: user.email,
      portal,
      nonce: crypto.randomBytes(16).toString('hex'),
    },
    CHALLENGE_SECRET,
    { expiresIn: '30m', ...CHALLENGE_VERIFY },
  );
}

async function readRegistrationAccount(token, expectedPortal) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, CHALLENGE_SECRET, CHALLENGE_VERIFY);
    if (
      payload.purpose !== 'portal_registration'
      || payload.portal !== expectedPortal
      || !payload.userId
    ) return null;
    const user = await User.findOne({
      _id: payload.userId,
      email: payload.email,
      role: expectedPortal,
      registrationComplete: false,
    });
    return user ? { user, payload } : null;
  } catch {
    return null;
  }
}

async function issueEmailOtp(user, purpose = 'verification') {
  await issueSecureEmailOtp({
    user,
    purpose: purpose === 'login' ? 'login' : 'verification',
    emailFn: sendOtpEmail,
  });
}

// @desc    Register student account (independent of Institution/Company for same email)
// @route   POST /api/auth/signup | /api/auth/register
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }
    const normalized = String(email).toLowerCase().trim();
    if (!isValidEmailFormat(normalized)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'Enter a valid email address.',
      });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return res.status(400).json({ success: false, message: strength.message });
    }

    const studentExists = await findByEmailAndPortal(normalized, 'student');
    if (studentExists) {
      return res.status(400).json({
        success: false,
        message: portalAlreadyExistsMessage('student'),
        code: 'PORTAL_EXISTS',
        portal: 'student',
      });
    }

    // Repair broken legacy rows created without a portal role.
    let user = await findOrphanByEmail(normalized);
    if (user) {
      user.name = String(name).trim().slice(0, 120);
      user.password = password;
      user = await claimOrphanAccount(user, 'student');
    } else {
      user = await User.create({
        name: String(name).trim().slice(0, 120),
        email: normalized,
        password,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        registrationComplete: true,
        accountStatus: 'ACTIVE',
        role: 'student',
      });
    }

    // Email/OTP verification disabled — issue session immediately after signup.
    return completeLoginSession(req, res, user, {
      remember: true,
      portal: 'student',
      identifier: normalized,
    });
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * Login — email or mobile + password for ONE portal account.
 * Email/OTP verification disabled: password success issues a session directly.
 */
exports.login = async (req, res) => {
  try {
    const { email, phone, password, portal, identifier } = req.body;
    const id = identifier || email || phone;
    if (!id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile, and password are required',
      });
    }

    const portalRole = AUTH_ROLES.includes(portal) ? portal : null;
    if (!portalRole) {
      return res.status(400).json({
        success: false,
        message: 'portal is required (student, institution, company, or admin)',
        code: 'PORTAL_REQUIRED',
      });
    }

    const user = await findPortalUser(id, portalRole);
    if (!user) {
      const siblings = await findSiblingRoles(id, portalRole);
      if (siblings.length) {
        await recordLoginEvent(req, { success: false, reason: 'wrong_portal', portal, identifier: id });
        return res.status(403).json(wrongPortalPayload(portalRole, siblings));
      }
      await recordLoginEvent(req, { success: false, reason: 'invalid_credentials', portal, identifier: id });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    try {
      assertNotLocked(user);
    } catch (lockErr) {
      await recordLoginEvent(req, { user, success: false, reason: 'locked', portal, identifier: id });
      return fail(res, lockErr);
    }

    if (user.registrationComplete === false) {
      return res.status(403).json({
        success: false,
        message: 'Please finish registration before signing in.',
        requiresRegistration: true,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordFailedLogin(user);
      await recordLoginEvent(req, { user, success: false, reason: 'bad_password', portal, identifier: id });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.accountStatus === 'DISABLED') {
      await recordLoginEvent(req, { user, success: false, reason: 'disabled', portal, identifier: id });
      return res.status(403).json({ success: false, code: 'ACCOUNT_DISABLED', message: 'Account disabled. Contact support.' });
    }
    if (user.suspended || user.accountStatus === 'SUSPENDED') {
      await recordLoginEvent(req, { user, success: false, reason: 'suspended', portal, identifier: id });
      return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended. Contact support.' });
    }

    // Auto-mark verified for legacy accounts created under the old OTP flow.
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
    }
    // Repair legacy null-role accounts after password succeeds.
    if (!user.role) {
      await claimOrphanAccount(user, portalRole);
    } else if (!user.emailVerified || user.isModified?.('emailVerified')) {
      await user.save();
    } else {
      await user.save();
    }

    return completeLoginSession(req, res, user, {
      remember: req.body?.remember !== false,
      portal: portalRole,
      identifier: id,
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.aaidLogin = async (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'AAID_LOGIN_DISABLED',
    message: 'AAID-only login is disabled. Sign in with email or mobile, password, and OTP.',
  });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Do NOT invent a role here — portal login assigns role; fabricating "student"
    // caused Institution/Company sessions to open the Student portal.
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return fail(res, error);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, portal } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const base = {
      success: true,
      message: 'If an account exists for that email, a verification code has been sent.',
    };

    const normalized = String(email).toLowerCase().trim();
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ success: false, code: 'PORTAL_REQUIRED', message: 'portal is required for password reset.' });
    }
    const user = await findByEmailAndPortal(normalized, portal);
    if (!user) return res.json(base);

    await createPasswordReset({
      user,
      req,
      emailFn: sendPasswordResetEmail,
    });

    res.json(base);
  } catch (error) {
    return fail(res, error);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, purpose, portal } = req.body;
    const resolvedPurpose = purpose === 'verification' ? 'verify' : purpose;
    if (!email || !['verify', 'reset'].includes(resolvedPurpose)) {
      return res.status(400).json({ message: 'Email and purpose (verify|reset) are required' });
    }

    const base = {
      success: true,
      message: 'If an account exists for that email, a new code has been sent.',
    };

    const normalized = String(email).toLowerCase().trim();
    if (!isValidEmailFormat(normalized)) {
      return res.json(base); // anti-enumeration
    }
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ success: false, code: 'PORTAL_REQUIRED', message: 'portal is required for OTP resend.' });
    }
    const user = await findByEmailAndPortal(normalized, portal);
    if (!user) return res.json(base);

    if (resolvedPurpose === 'verify') {
      if (user.emailVerified) {
        return res.json(base);
      }
      try {
        await issueEmailOtp(user, 'verification');
      } catch (mailErr) {
        if (mailErr.statusCode === 429) {
          return res.status(429).json({
            success: false,
            code: 'RESEND_COOLDOWN',
            message: mailErr.message || 'Please wait before requesting another code.',
            emailDelivery: false,
          });
        }
        return res.status(503).json({
          success: false,
          code: mailErr.code || 'EMAIL_DELIVERY_FAILED',
          message: 'Unable to send verification email. Please try again.',
          emailDelivery: false,
        });
      }
    } else {
      try {
        await createPasswordReset({
          user,
          req,
          emailFn: sendPasswordResetEmail,
        });
      } catch (mailErr) {
        if (mailErr.statusCode === 429) {
          return res.status(429).json({
            success: false,
            code: 'RESEND_COOLDOWN',
            message: mailErr.message || 'Please wait before requesting another code.',
            emailDelivery: false,
          });
        }
        return res.status(503).json({
          success: false,
          code: mailErr.code || 'EMAIL_DELIVERY_FAILED',
          message: 'Unable to send reset email. Please try again.',
          emailDelivery: false,
        });
      }
    }

    res.json({
      ...base,
      emailDelivery: true,
      message: 'Verification code sent.',
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      cooldownSeconds: Math.floor(require('../utils/otp').RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    return fail(res, error);
  }
};

/** Canonical alias: POST /auth/resend-verification */
exports.resendVerification = async (req, res) => {
  req.body = { ...req.body, purpose: 'verify' };
  return exports.resendOtp(req, res);
};

/**
 * Change email for an unverified account (student pilot).
 * Requires current email + password + newEmail + portal.
 */
exports.changeEmail = async (req, res) => {
  try {
    const { email, newEmail, password, portal } = req.body;
    if (!email || !newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'email, newEmail, and password are required',
      });
    }
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ success: false, code: 'PORTAL_REQUIRED', message: 'portal is required.' });
    }
    const current = String(email).toLowerCase().trim();
    const next = String(newEmail).toLowerCase().trim();
    if (!isValidEmailFormat(current) || !isValidEmailFormat(next)) {
      return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Enter a valid email address.' });
    }
    if (current === next) {
      return res.status(400).json({ success: false, message: 'New email must be different from the current email.' });
    }

    const user = await findByEmailAndPortal(current, portal);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Unable to update email for that account.' });
    }
    if (user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Verified emails cannot be changed from this flow.',
      });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const taken = await findByEmailAndPortal(next, portal);
    if (taken && String(taken._id) !== String(user._id)) {
      return res.status(400).json({
        success: false,
        code: 'PORTAL_EXISTS',
        message: portalAlreadyExistsMessage(portal),
      });
    }

    // Invalidate outstanding OTPs for old email/user
    const Otp = require('../models/Otp');
    await Otp.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );

    user.email = next;
    user.emailVerified = false;
    user.emailVerifiedAt = null;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.emailOtpAttempts = 0;
    user.emailOtpSentAt = null; // allow immediate OTP to new address
    await user.save();

    try {
      await issueEmailOtp(user, 'verification');
    } catch (mailErr) {
      console.error('[auth] change-email delivery failed:', mailErr.code || mailErr.message);
      return res.status(503).json({
        success: false,
        code: mailErr.code || 'EMAIL_DELIVERY_FAILED',
        message: 'Email updated but we could not send the verification code. Please try resend.',
        emailDelivery: false,
        requiresEmailVerification: true,
        email: user.email,
      });
    }

    return res.json({
      success: true,
      message: 'Email updated. Verification code sent to your new address.',
      emailDelivery: true,
      requiresEmailVerification: true,
      email: user.email,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    });
  } catch (error) {
    return fail(res, error);
  }
};

/** Canonical alias: POST /auth/verify-email  { email, otp, portal } */
exports.verifyEmail = async (req, res) => {
  req.body = { ...req.body, purpose: 'verify' };
  return exports.verifyOtp(req, res);
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose, portal, registrationToken } = req.body;
    if (!email || !otp || !['verify', 'reset'].includes(purpose)) {
      return res.status(400).json({
        message: 'Email, otp, and purpose (verify|reset) are required',
      });
    }

    const normalized = String(email).toLowerCase().trim();
    if (purpose === 'reset' && !PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({
        success: false,
        code: 'PORTAL_REQUIRED',
        message: 'portal is required for password reset verification.',
      });
    }

    let user = null;
    if (registrationToken && PORTAL_ROLES.includes(portal)) {
      const registration = await readRegistrationAccount(registrationToken, portal);
      user = registration?.user || null;
    } else if (PORTAL_ROLES.includes(portal)) {
      user = await findByEmailAndPortal(normalized, portal);
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    if (user.registrationComplete === false && !registrationToken) {
      return res.status(401).json({
        success: false,
        code: 'REGISTRATION_SESSION_REQUIRED',
        message: 'Registration session expired. Start again.',
      });
    }

    if (purpose === 'verify') {
      const checked = await verifySecureEmailOtp({
        email: normalized,
        purpose: 'verification',
        otp,
        userId: user._id,
      });
      if (!checked.ok) {
        // Fallback to legacy User fields (portal-scoped user doc)
        assertAttempts(user.emailOtpAttempts);
        if (!isOtpValid(user.verificationOTP, user.verificationOTPExpires, otp)) {
          user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
          await user.save();
          return res.status(400).json({ message: 'Invalid or expired verification code' });
        }
      }
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      user.emailOtpAttempts = 0;
      await user.save();

      // Invalidate any remaining verification OTPs for this account
      try {
        const Otp = require('../models/Otp');
        await Otp.updateMany(
          { userId: user._id, purpose: 'verification', consumedAt: null },
          { $set: { consumedAt: new Date() } },
        );
      } catch (_) { /* non-fatal */ }

      // Mid-signup for Institution/Company — verify only, do not issue a session yet
      if (user.registrationComplete === false) {
        return res.json({
          success: true,
          emailVerified: true,
          message: 'Email verified successfully',
          email: user.email,
          portal: user.role,
          registrationToken,
          step: 'verify-phone',
        });
      }

      // Prefer session for student pilot after verify; also include emailVerified flag
      const sessionRes = await completeLoginSession(req, res, user, {
        remember: req.body?.remember !== false,
        portal: portal || user.role,
      });
      return sessionRes;
    }

    const resetCheck = await consumePasswordReset({ userId: user._id, otp });
    if (!resetCheck.ok) {
      assertAttempts(user.emailOtpAttempts);
      if (!isOtpValid(user.resetPasswordOTP, user.resetPasswordOTPExpires, otp)) {
        user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
        await user.save();
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
    }

    return res.json({
      success: true,
      message: 'Code verified. You can reset your password.',
      resetAllowed: true,
      email: user.email,
      portal: user.role,
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password, portal } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, otp, and password are required' });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return res.status(400).json({ message: strength.message });
    }

    const normalized = String(email).toLowerCase().trim();
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ success: false, code: 'PORTAL_REQUIRED', message: 'portal is required for password reset.' });
    }
    const user = await findByEmailAndPortal(normalized, portal);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const resetCheck = await consumePasswordReset({ userId: user._id, otp });
    const legacyOk = isOtpValid(user.resetPasswordOTP, user.resetPasswordOTPExpires, otp);
    if (!resetCheck.ok && !legacyOk) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    await assertPasswordNotReused(user, password);
    await pushPasswordHistory(user);
    user.password = password;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await revokeAllForUser(user._id);

    res.json({ success: true, message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    return fail(res, error);
  }
};

const VALID_ROLES = ['student', 'institution', 'company', 'admin'];
const SELF_ASSIGNABLE_ROLES = ['student', 'institution', 'company'];

exports.completeOnboarding = async (req, res) => {
  try {
    const { role, organizationName, learningGoal } = req.body;
    if (!role || !SELF_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'A valid role is required (student, institution, company)',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role && user.role !== role) {
      return res.status(409).json({
        success: false,
        code: 'ROLE_IMMUTABLE',
        message: 'Portal role cannot be changed during onboarding. Create a separate portal account.',
      });
    }
    if (!user.role) user.role = role;
    user.onboardingCompleted = true;
    if (typeof organizationName === 'string') user.organizationName = organizationName.trim();
    if (typeof learningGoal === 'string') user.learningGoal = learningGoal.trim();
    await user.save();

    res.json({ success: true, message: 'Onboarding completed', user: publicUser(user) });
  } catch (error) {
    return fail(res, error);
  }
};

// ── Twilio Verify phone OTP endpoints ─────────────────────────────────────────

/**
 * POST /api/auth/send-phone-otp
 * Body: { phone: "+91XXXXXXXXXX" }
 */
exports.sendPhoneOtp = async (req, res) => {
  try {
    const phone = assertE164(req.body.phone);
    await twilioSendOTP(phone);
    res.json({
      success: true,
      message: 'OTP sent successfully.',
      expiresInSeconds: 600,
      phoneMasked: maskPhone(phone),
    });
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * POST /api/auth/verify-phone-otp
 * Body: { phone, code, challengeToken? }
 * With challengeToken → completes login and returns JWT.
 */
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const code = req.body.code || req.body.otp;
    if (!code) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid or expired OTP.',
      });
    }

    const challengeToken = req.body.challengeToken;
    let phone;
    if (challengeToken) {
      const challenge = readLoginChallenge(challengeToken);
      if (!challenge?.phone) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: 'Login session expired. Sign in again.',
        });
      }
      phone = assertE164(challenge.phone);
    } else {
      phone = assertE164(req.body.phone);
    }

    try {
      await twilioVerifyOTP(phone, code);
    } catch (verifyErr) {
      console.log('[TwilioVerify] OTP Failed', { phone: maskPhone(phone), code: verifyErr.code });
      return res.status(verifyErr.statusCode || 400).json({
        success: false,
        verified: false,
        message: verifyErr.message === 'OTP Expired'
          ? 'OTP Expired'
          : verifyErr.message === 'Too Many Requests'
            ? 'Too Many Requests'
            : 'Invalid or expired OTP.',
        code: verifyErr.code || 'OTP_INCORRECT',
      });
    }

    if (challengeToken) {
      const challenge = readLoginChallenge(challengeToken);
      if (!challenge || challenge.phone !== phone) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: 'Login session expired. Sign in again.',
        });
      }

      const user = await User.findById(challenge.userId);
      if (!user || user.phone !== phone) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: 'Login session expired. Sign in again.',
        });
      }

      user.phoneVerified = true;
      user.phoneOTP = null;
      user.phoneOTPExpires = null;
      await user.save();

      return completeLoginSession(req, res, user, {
        remember: req.body?.remember !== false,
        portal: challenge.portal || req.body?.portal || null,
      });
    }

    await markVerified(phone);
    return res.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    error.verified = false;
    return fail(res, error);
  }
};

/**
 * Create account only after Twilio phone verification.
 * POST /api/auth/register-verified
 */
exports.registerVerified = async (_req, res) => res.status(410).json({
  success: false,
  code: 'REGISTRATION_FLOW_RETIRED',
  message: 'Use the portal registration flow with email and mobile verification.',
});

// ── Portal registration (Twilio Verify for mobile) ────────────────────────────

exports.portalInit = async (req, res) => {
  try {
    const { name, email, portal } = req.body;
    if (!name || !email || !PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({
        message: 'Name, email, and portal (student|institution|company) are required',
      });
    }

    const normalized = String(email).toLowerCase().trim();
    const existing = await findByEmailAndPortal(normalized, portal);
    if (existing && existing.registrationComplete !== false) {
      return res.status(400).json({
        success: false,
        message: portalAlreadyExistsMessage(portal),
        code: 'PORTAL_EXISTS',
        portal,
      });
    }

    const tempPassword = crypto.randomBytes(24).toString('hex');
    let user = existing;
    if (!user) {
      // Create a NEW portal profile even if the same email already has Student/other portals
      user = new User({
        name: String(name).trim(),
        email: normalized,
        password: tempPassword,
        role: portal,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerified: true,
        registrationComplete: false,
        onboardingCompleted: false,
      });
      await user.save();
    } else {
      user.name = String(name).trim();
      user.emailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user.phoneVerified = true;
      await user.save();
    }

    // Email/OTP verification disabled — continue to password step.
    const registrationToken = issueRegistrationChallenge(user, portal);

    res.status(201).json({
      success: true,
      message: 'Continue with organization details and password.',
      email: normalized,
      portal,
      registrationToken,
      step: 'password',
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.portalSendPhone = async (req, res) => {
  try {
    const { phone, countryCode, portal, registrationToken } = req.body;
    if (!phone || !registrationToken) {
      return res.status(400).json({ message: 'Registration session and phone are required' });
    }
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ message: 'portal is required for registration' });
    }

    const registration = await readRegistrationAccount(registrationToken, portal);
    const user = registration?.user;
    if (!user) {
      return res.status(404).json({ message: 'Registration session not found. Start again.' });
    }
    let e164 = String(phone).trim();
    if (!e164.startsWith('+')) {
      const cc = String(countryCode || '+91').startsWith('+') ? countryCode : `+${countryCode || '91'}`;
      e164 = `${cc}${e164.replace(/\D/g, '').replace(/^0+/, '')}`;
    }
    e164 = assertE164(e164);

    user.phone = e164;
    user.phoneVerified = false;
    user.phoneOTP = null;
    user.phoneOTPExpires = null;
    user.phoneOtpAttempts = 0;
    user.phoneOtpSentAt = new Date();
    await user.save();

    await twilioSendOTP(e164);

    res.json({
      success: true,
      message: 'OTP sent successfully.',
      phoneMasked: maskPhone(e164),
      step: 'verify-phone',
      portal,
      resendAfterSeconds: 45,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.portalVerifyPhone = async (req, res) => {
  try {
    const { otp, code, portal, registrationToken } = req.body;
    const phoneCode = code || otp;
    if (!registrationToken || !phoneCode) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid or expired OTP.',
      });
    }
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'portal is required for registration',
      });
    }

    const registration = await readRegistrationAccount(registrationToken, portal);
    const user = registration?.user;
    if (!user || !user.phone) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid or expired OTP.',
      });
    }

    try {
      await twilioVerifyOTP(user.phone, phoneCode);
    } catch (verifyErr) {
      return res.status(verifyErr.statusCode || 400).json({
        success: false,
        verified: false,
        message: 'Invalid or expired OTP.',
      });
    }

    user.phoneVerified = true;
    user.phoneOTP = null;
    user.phoneOTPExpires = null;
    user.phoneOtpAttempts = 0;
    await user.save();
    await markVerified(user.phone);

    res.json({
      success: true,
      verified: true,
      message: 'Mobile verified successfully',
      step: 'create-password',
      portal,
      user: publicUser(user),
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.portalComplete = async (req, res) => {
  try {
    const { password, confirmPassword, organizationName, learningGoal, portal, registrationToken } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (!PORTAL_ROLES.includes(portal)) {
      return res.status(400).json({ message: 'portal is required for registration' });
    }
    if (confirmPassword != null && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return res.status(400).json({ message: strength.message });
    }

    const registration = await readRegistrationAccount(registrationToken, portal);
    const user = registration?.user;
    if (!user) return res.status(404).json({ message: 'Registration session not found' });
    user.password = password;
    user.registrationComplete = true;
    user.onboardingCompleted = true;
    if (typeof organizationName === 'string') user.organizationName = organizationName.trim();
    if (typeof learningGoal === 'string') user.learningGoal = learningGoal.trim();
    user.phoneOTP = null;
    user.phoneOTPExpires = null;
    await user.save();

    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        portal: user.role || portal,
      });
    } catch (mailErr) {
      console.error('[auth] welcome email failed:', mailErr.message);
    }

    return completeLoginSession(req, res, user, { portal });
  } catch (error) {
    return fail(res, error);
  }
};

exports.portalResendPhone = async (req, res) => {
  try {
    const { portal, registrationToken } = req.body;
    const base = { success: true, message: 'If registration is in progress, a new code was sent.' };
    if (!PORTAL_ROLES.includes(portal)) return res.json(base);

    const registration = await readRegistrationAccount(registrationToken, portal);
    const user = registration?.user;
    if (!user || !user.phone) return res.json(base);

    await twilioSendOTP(user.phone);
    user.phoneOtpSentAt = new Date();
    await user.save();

    res.json({
      ...base,
      message: 'OTP sent successfully.',
      portal,
      resendAfterSeconds: 45,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.verifyLoginEmailOtp = async (req, res) => {
  try {
    const { challengeToken, otp, code } = req.body;
    const tokenOtp = otp || code;
    if (!challengeToken || !tokenOtp) {
      return res.status(400).json({ success: false, message: 'challengeToken and otp are required' });
    }
    const challenge = readEmailLoginChallenge(challengeToken);
    if (!challenge) {
      return res.status(401).json({ success: false, message: 'Login session expired. Sign in again.' });
    }
    const user = await User.findById(challenge.userId);
    if (!user || user.email !== challenge.email) {
      return res.status(401).json({ success: false, message: 'Login session expired. Sign in again.' });
    }
    // Challenge portal must match this account — never mix Student/Institution/Company OTP
    const portal = challenge.portal || req.body?.portal || null;
    if (portal && user.role && user.role !== portal && user.role !== 'admin') {
      return res.status(403).json(wrongPortalPayload(portal, [user.role]));
    }

    const checked = await verifySecureEmailOtp({
      email: user.email,
      purpose: 'login',
      otp: tokenOtp,
      userId: user._id,
    });
    if (!checked.ok) {
      assertAttempts(user.emailOtpAttempts);
      if (!isOtpValid(user.verificationOTP, user.verificationOTPExpires, tokenOtp)) {
        user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
        await user.save();
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      }
    }
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.emailOtpAttempts = 0;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
  return completeLoginSession(req, res, user, {
      remember: req.body?.remember !== false,
      portal: portal || user.role,
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = readRefreshFromReq(req);
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }
    const rotated = await rotateRefreshToken(refreshToken, {
      userAgent: req.headers['user-agent'] || '',
      ip: clientIp(req),
    });
    if (!rotated) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    const user = await User.findById(rotated.userId).select('-password');
    if (!user || user.suspended) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session invalid' });
    }
    setRefreshCookie(res, rotated.refreshToken, rotated.ttl);
    res.json({
      success: true,
      token: rotated.accessToken,
      user: publicUser(user),
    });
  } catch (error) {
    return fail(res, error);
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = readRefreshFromReq(req);
    await revokeRefreshToken(refreshToken);
    if (req.body?.allSessions && (req.user?.id || req.user?._id)) {
      await revokeAllForUser(req.user.id || req.user._id);
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    return fail(res, error);
  }
};

exports.logoutAll = async (req, res) => {
  try {
    await revokeAllForUser(req.user.id || req.user._id);
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    return fail(res, error);
  }
};

exports.listSessions = async (req, res) => {
  try {
    const current = readRefreshFromReq(req);
    const sessions = await listSessions(req.user.id || req.user._id, current);
    res.json({ success: true, sessions });
  } catch (error) {
    return fail(res, error);
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await revokeSessionById(req.user.id || req.user._id, id);
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    return fail(res, error);
  }
};

exports.revokeAllSessions = async (req, res) => {
  try {
    await revokeAllForUser(req.user.id || req.user._id);
    clearRefreshCookie(res);
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (error) {
    return fail(res, error);
  }
};

exports.listLoginHistory = async (req, res) => {
  try {
    const rows = await LoginHistory.find({ userId: req.user.id || req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, history: rows });
  } catch (error) {
    return fail(res, error);
  }
};

/** Profile alias for /me */
exports.getProfile = exports.getMe;
exports.publicUser = publicUser;
