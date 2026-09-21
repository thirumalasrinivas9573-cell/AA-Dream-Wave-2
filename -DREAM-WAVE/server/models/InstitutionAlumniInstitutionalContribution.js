const mongoose = require('mongoose')
const {
  INSTITUTIONAL_CONTRIBUTION_TYPES,
  CONTRIBUTION_APPROVAL_STATUSES,
} = require('../constants/institutionAlumniExtended')

const institutionAlumniInstitutionalContributionSchema = new mongoose.Schema(
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
      enum: INSTITUTIONAL_CONTRIBUTION_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: 'INR' },
    beneficiaries: { type: String, trim: true, default: '' },
    approvalStatus: {
      type: String,
      enum: CONTRIBUTION_APPROVAL_STATUSES,
      default: 'proposed',
      index: true,
    },
    impactSummary: { type: String, trim: true, default: '' },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

institutionAlumniInstitutionalContributionSchema.index({ title: 'text', description: 'text' })

module.exports = mongoose.model(
  'InstitutionAlumniInstitutionalContribution',
  institutionAlumniInstitutionalContributionSchema,
)
