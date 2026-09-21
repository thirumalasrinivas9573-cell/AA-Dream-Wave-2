const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'login_failed',
        'login_success',
        'login_locked',
        'suspicious_activity',
        'rate_limited',
        'token_invalid',
        'token_reuse',
        'account_disabled_attempt',
        'privilege_probe',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    email: { type: String, default: '', maxlength: 160, index: true },
    ip: { type: String, default: '', maxlength: 60, index: true },
    path: { type: String, default: '', maxlength: 200 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestId: { type: String, default: '', maxlength: 64 },
  },
  { timestamps: true }
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ip: 1, createdAt: -1 });
securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ organizationId: 1, createdAt: -1 });
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
