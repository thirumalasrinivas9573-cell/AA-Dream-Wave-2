/**
 * Password policy for Dream Wave AI.
 */
const MIN_LENGTH = 8;
const HISTORY_SIZE = 5;

function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_LENGTH} characters` };
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { ok: false, message: 'Password must include at least one letter and one number' };
  }
  return { ok: true };
}

module.exports = {
  MIN_LENGTH,
  HISTORY_SIZE,
  validatePasswordStrength,
};
