const mongoose = require('mongoose');

/** Per-company public engagement / hiring funnel events. */
const hiringAnalyticsSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  eventType: {
    type: String,
    enum: [
      'profile_view', 'website_click', 'job_view', 'internship_view',
      'apply_click', 'follow', 'share', 'gallery', 'interest',
    ],
    required: true,
    index: true,
  },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  meta: { type: mongoose.Schema.Types.Mixed },
  visitorKey: { type: String, default: '' },
}, { timestamps: true });

hiringAnalyticsSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('HiringAnalytics', hiringAnalyticsSchema);
