/**
 * Secure OTP helpers — never return plaintext OTP to clients.
 */
const crypto = require('crypto');

const OTP_TTL_MS = 10 * 60 * 1000;      // 10 minutes (student pilot email verification)
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 seconds
const MAX_ATTEMPTS = 5;

/** Basic RFC-like email syntax — any provider, no allowlist. */
function isValidEmailFormat(email) {
  const value = String(email || '').trim();
  if (!value || value.length > 254) return false;
  // Reject obvious junk; allow college/custom domains
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    && !value.includes('..')
    && !value.startsWith('.')
    && !value.endsWith('.')
    && !value.endsWith('@')
    && !value.startsWith('@');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function isOtpValid(storedHash, expiresAt, otp) {
  if (!storedHash || !expiresAt) return false;
  if (new Date(expiresAt).getTime() < Date.now()) return false;
  const a = Buffer.from(String(storedHash));
  const b = Buffer.from(hashOtp(otp));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function canResend(lastSentAt) {
  if (!lastSentAt) return { ok: true, waitMs: 0 };
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed >= RESEND_COOLDOWN_MS) return { ok: true, waitMs: 0 };
  return { ok: false, waitMs: RESEND_COOLDOWN_MS - elapsed };
}

function assertAttempts(attempts) {
  if ((attempts || 0) >= MAX_ATTEMPTS) {
    const err = new Error('Too many verification attempts. Request a new code.');
    err.statusCode = 429;
    throw err;
  }
}

module.exports = {
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  isOtpValid,
  canResend,
  assertAttempts,
  isValidEmailFormat,
};
