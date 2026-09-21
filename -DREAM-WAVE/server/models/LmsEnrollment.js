const mongoose = require('mongoose');
const crypto = require('crypto');

const lmsEnrollmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      default: null,
      index: true,
    },
    role: { type: String, enum: ['student', 'instructor'], default: 'student', index: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'dropped'],
      default: 'active',
      index: true,
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    timeSpentMinutes: { type: Number, default: 0, min: 0 },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

lmsEnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });
lmsEnrollmentSchema.index({ user: 1, status: 1 });
lmsEnrollmentSchema.index({ organizationId: 1, course: 1, status: 1 });

const lmsCertificateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsEnrollment',
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 240 },
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `DW-CERT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
    },
    metadata: {
      version: { type: Number, default: 1 },
      category: { type: String, default: '' },
      instructorNames: [{ type: String }],
      completionPercent: { type: Number, default: 100 },
      issuedBy: { type: String, default: 'Dream Wave LMS' },
    },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

lmsCertificateSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = {
  LmsEnrollment: mongoose.model('LmsEnrollment', lmsEnrollmentSchema),
  LmsCertificate: mongoose.model('LmsCertificate', lmsCertificateSchema),
};
