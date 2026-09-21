const mongoose = require('mongoose');

/** Lightweight platform analytics events for DAU/MAU/traffic. */
const platformAnalyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['page_view', 'search', 'discovery', 'login', 'signup', 'apply', 'follow', 'bookmark', 'other'],
    required: true,
    index: true,
  },
  path: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  meta: { type: mongoose.Schema.Types.Mixed },
  day: { type: String, index: true },
}, { timestamps: true });

platformAnalyticsSchema.index({ day: 1, eventType: 1 });

module.exports = mongoose.model('PlatformAnalytics', platformAnalyticsSchema);
