const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireTrustedOrigin } = require('../middleware/requestSecurity');
const {
  signup,
  login,
  aaidLogin,
  getMe,
  getProfile,
  forgotPassword,
  resendOtp,
  resendVerification,
  verifyOtp,
  verifyEmail,
  changeEmail,
  resetPassword,
  completeOnboarding,
  sendPhoneOtp,
  verifyPhoneOtp,
  registerVerified,
  portalInit,
  portalSendPhone,
  portalVerifyPhone,
  portalComplete,
  portalResendPhone,
  verifyLoginEmailOtp,
  refresh,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  revokeAllSessions,
  listLoginHistory,
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/register', signup);
router.post('/register-verified', registerVerified);
router.post('/login', login);
router.post('/aaid-login', aaidLogin);
router.get('/me', auth, getMe);
router.get('/profile', auth, getProfile);
router.post('/forgot-password', forgotPassword);
router.post('/resend-otp', resendOtp);
router.post('/resend-verification', resendVerification);
router.post('/verify-otp', verifyOtp);
router.post('/verify-email-otp', verifyOtp);
router.post('/verify-email', verifyEmail);
router.post('/change-email', changeEmail);
router.post('/reset-password', resetPassword);
router.post('/onboarding', auth, completeOnboarding);

router.post('/send-phone-otp', sendPhoneOtp);
router.post('/verify-phone-otp', verifyPhoneOtp);
router.post('/verify-mobile-otp', verifyPhoneOtp);

router.post('/portal/init', portalInit);
router.post('/portal/send-phone', portalSendPhone);
router.post('/portal/verify-phone', portalVerifyPhone);
router.post('/portal/complete', portalComplete);
router.post('/portal/resend-phone', portalResendPhone);
router.post('/verify-login-email-otp', verifyLoginEmailOtp);
router.post('/refresh', requireTrustedOrigin, refresh);
router.post('/logout', requireTrustedOrigin, logout);
router.post('/logout-all', requireTrustedOrigin, auth, logoutAll);
router.get('/sessions', auth, listSessions);
router.delete('/sessions/:id', auth, revokeSession);
router.delete('/sessions', auth, revokeAllSessions);
router.get('/login-history', auth, listLoginHistory);

module.exports = router;
