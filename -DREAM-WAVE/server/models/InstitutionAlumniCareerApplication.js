const mongoose = require('mongoose')
const { CAREER_APPLICATION_STATUSES } = require('../constants/institutionAlumniExtended')

const institutionAlumniCareerApplicationSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    contributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumniCareerContribution',
      required: true,
      index: true,
    },
    applicantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicantName: { type: String, trim: true, default: '' },
    applicantEmail: { type: String, trim: true, default: '' },
    coverLetter: { type: String, trim: true, default: '' },
    resumeUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: CAREER_APPLICATION_STATUSES, default: 'submitted', index: true },
    reviewNotes: { type: String, trim: true, default: '' },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

institutionAlumniCareerApplicationSchema.index({ contributionId: 1, applicantUserId: 1 }, { unique: true })

module.exports = mongoose.model('InstitutionAlumniCareerApplication', institutionAlumniCareerApplicationSchema)
