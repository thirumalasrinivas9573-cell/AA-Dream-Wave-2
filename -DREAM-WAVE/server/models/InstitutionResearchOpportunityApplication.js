const mongoose = require('mongoose')
const { OPPORTUNITY_APPLICATION_STATUSES } = require('../constants/institutionResearch')

const institutionResearchOpportunityApplicationSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchOpportunity',
      required: true,
      index: true,
    },
    applicantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    institutionStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      default: null,
    },
    applicantName: { type: String, trim: true, required: true },
    applicantEmail: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    coverLetter: { type: String, trim: true, default: '' },
    resumeUrl: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: OPPORTUNITY_APPLICATION_STATUSES,
      default: 'submitted',
      index: true,
    },
    reviewNotes: { type: String, trim: true, default: '' },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

institutionResearchOpportunityApplicationSchema.index(
  { opportunityId: 1, applicantUserId: 1 },
  { unique: true, partialFilterExpression: { applicantUserId: { $type: 'objectId' } } },
)

module.exports = mongoose.model(
  'InstitutionResearchOpportunityApplication',
  institutionResearchOpportunityApplicationSchema,
)
