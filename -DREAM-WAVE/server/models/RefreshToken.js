const mongoose = require('mongoose');

/**
 * Active refresh sessions (device sessions).
 * Alias conceptually as Session — one document per refresh token.
 */
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  device: { type: String, default: 'Unknown device' },
  browser: { type: String, default: 'Unknown browser' },
  remember: { type: Boolean, default: true },
  loginAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null, index: true },
  replacedByHash: { type: String, default: null },
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, familyId: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
// Session is the same collection — export alias for clarity
module.exports.Session = module.exports;
