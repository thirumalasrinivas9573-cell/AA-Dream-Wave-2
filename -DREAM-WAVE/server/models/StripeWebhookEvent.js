const mongoose = require('mongoose');

const stripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, maxlength: 200 },
    type: { type: String, default: '', maxlength: 120 },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

stripeWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('StripeWebhookEvent', stripeWebhookEventSchema);
