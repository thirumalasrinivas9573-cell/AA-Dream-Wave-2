/**
 * DW-ARCH-004 — set test env BEFORE requiring the Express app.
 * Never commit real secrets; these values are for local/CI smoke only.
 */
const TEST_SECRET = 'dream-wave-test-jwt-secret-32chars!!';

function applyTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || TEST_SECRET;
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${TEST_SECRET}-refresh`;
  process.env.JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
  process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  // MONGODB_URI is set by harness (memory server) before connect
}

module.exports = { applyTestEnv, TEST_SECRET };
