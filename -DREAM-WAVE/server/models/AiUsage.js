const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    mode: { type: String, required: true, index: true },
    model: { type: String, default: '', maxlength: 80 },
    source: {
      type: String,
      enum: [
        'run',
        'quick',
        'stream',
        'mentor',
        'specialized',
        'system',
        'research',
        'career',
        'productivity',
        'adaptive',
        'books',
        'learning',
        'media',
        'report',
        'roadmap',
        'personalization',
      ],
      default: 'run',
      index: true,
    },
    creditsUsed: { type: Number, default: 1, min: 0 },
    success: { type: Boolean, default: true, index: true },
    errorCode: { type: String, default: '', maxlength: 80 },
    failureClass: {
      type: String,
      enum: [
        '',
        'auth',
        'entitlement',
        'rate_limit',
        'timeout',
        'ai_provider',
        'validation',
        'server',
        'local_fallback',
        'unknown',
      ],
      default: '',
      index: true,
    },
    latencyMs: { type: Number, default: 0, index: true },
    promptChars: { type: Number, default: 0 },
    replyChars: { type: Number, default: 0 },
    tokensIn: { type: Number, default: 0, min: 0 },
    tokensOut: { type: Number, default: 0, min: 0 },
    estimatedCostUsd: { type: Number, default: 0, min: 0 },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null,
    },
  },
  { timestamps: true }
);

aiUsageSchema.index({ user: 1, createdAt: -1 });
aiUsageSchema.index({ user: 1, mode: 1, createdAt: -1 });
aiUsageSchema.index({ organizationId: 1, createdAt: -1 });
aiUsageSchema.index({ success: 1, createdAt: -1 });
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('AiUsage', aiUsageSchema);
