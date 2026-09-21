const mongoose = require('mongoose');

/** Moderation / abuse reports (distinct from career AI Report model). */
const contentReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: {
    type: String,
    enum: ['institution', 'company', 'book', 'job', 'internship', 'review', 'profile', 'promotion', 'event', 'post', 'comment', 'project', 'group', 'media', 'other'],
    required: true,
    index: true,
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true, trim: true },
  details: { type: String, default: '' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  resolution: { type: String, default: '' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: true });

contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ reporterId: 1, createdAt: -1 });
contentReportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ContentReport', contentReportSchema);
