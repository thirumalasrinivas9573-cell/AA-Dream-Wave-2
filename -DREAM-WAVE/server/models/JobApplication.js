const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../config/constants');

const jobApplicationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: APPLICATION_STATUS,
      default: 'applied',
      index: true,
    },
    coverLetter: { type: String, default: '', maxlength: 5000 },
    resumeSnapshot: {
      headline: String,
      summary: String,
      skills: [String],
      experience: [mongoose.Schema.Types.Mixed],
      education: [mongoose.Schema.Types.Mixed],
    },
    statusHistory: [
      {
        status: { type: String, enum: APPLICATION_STATUS },
        note: { type: String, default: '', maxlength: 500 },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    interview: {
      scheduledAt: { type: Date, default: null },
      mode: { type: String, enum: ['online', 'onsite', 'phone', ''], default: '' },
      location: { type: String, default: '', maxlength: 200 },
      notes: { type: String, default: '', maxlength: 1000 },
      meetingUrl: { type: String, default: '', maxlength: 300 },
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
jobApplicationSchema.index({ applicant: 1, createdAt: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
