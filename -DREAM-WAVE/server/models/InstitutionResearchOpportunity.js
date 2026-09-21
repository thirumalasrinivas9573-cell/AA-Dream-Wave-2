const mongoose = require('mongoose')
const {
  RESEARCH_OPPORTUNITY_TYPES,
  RESEARCH_OPPORTUNITY_STATUSES,
  RESEARCH_DOMAINS,
} = require('../constants/institutionResearch')

const institutionResearchOpportunitySchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    opportunityType: {
      type: String,
      enum: RESEARCH_OPPORTUNITY_TYPES,
      required: true,
      index: true,
    },
    researchArea: { type: String, trim: true, default: '' },
    domain: { type: String, enum: RESEARCH_DOMAINS, default: 'other' },
    department: { type: String, trim: true, default: '', index: true },
    principalInvestigator: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    eligibility: {
      departments: [{ type: String, trim: true }],
      programs: [{ type: String, trim: true }],
      minCgpa: { type: Number, default: null },
      skills: [{ type: String, trim: true }],
      notes: { type: String, trim: true, default: '' },
    },
    positions: { type: Number, default: 1 },
    applicationDeadline: { type: Date, default: null },
    status: {
      type: String,
      enum: RESEARCH_OPPORTUNITY_STATUSES,
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    linkedProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchProject',
      default: null,
    },
    tags: [{ type: String, trim: true }],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionResearchOpportunitySchema.index({ institutionId: 1, status: 1 })
institutionResearchOpportunitySchema.index({ title: 'text', description: 'text' })

module.exports = mongoose.model('InstitutionResearchOpportunity', institutionResearchOpportunitySchema)
