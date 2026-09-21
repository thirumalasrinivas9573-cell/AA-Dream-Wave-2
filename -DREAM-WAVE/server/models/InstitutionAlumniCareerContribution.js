const mongoose = require('mongoose')
const {
  CAREER_CONTRIBUTION_TYPES,
  CAREER_CONTRIBUTION_STATUSES,
} = require('../constants/institutionAlumni')

const institutionAlumniCareerContributionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      required: true,
      index: true,
    },
    contributionType: {
      type: String,
      enum: CAREER_CONTRIBUTION_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    applicationUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: CAREER_CONTRIBUTION_STATUSES, default: 'open', index: true },
    participantCount: { type: Number, default: 0 },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionAlumniCareerContributionSchema.index({ title: 'text', description: 'text', company: 'text' })

module.exports = mongoose.model(
  'InstitutionAlumniCareerContribution',
  institutionAlumniCareerContributionSchema,
)
