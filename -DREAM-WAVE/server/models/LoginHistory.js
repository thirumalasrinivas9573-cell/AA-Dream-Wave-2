const mongoose = require('mongoose');

/**
 * Audit trail for authentication events.
 */
const loginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, default: '', lowercase: true, trim: true, index: true },
  phone: { type: String, default: '' },
  role: { type: String, default: '' },
  portal: { type: String, default: '' },
  success: { type: Boolean, required: true, index: true },
  reason: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  device: { type: String, default: '' },
  browser: { type: String, default: '' },
  identifier: { type: String, default: '' },
}, { timestamps: true });

loginHistorySchema.index({ createdAt: -1 });
loginHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
