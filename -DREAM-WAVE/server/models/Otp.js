const mongoose = require('mongoose');

/**
 * Secure OTP records — hashed codes only, never plaintext.
 * purpose: verification | login | reset
 */
const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, index: true },
  purpose: {
    type: String,
    enum: ['verification', 'login', 'reset'],
    required: true,
    index: true,
  },
  channel: { type: String, enum: ['email', 'sms'], default: 'email' },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  consumedAt: { type: Date, default: null },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1, consumedAt: 1 });

module.exports = mongoose.model('Otp', otpSchema);
