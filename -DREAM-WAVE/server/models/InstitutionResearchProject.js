const mongoose = require('mongoose')
const {
  RESEARCH_CATEGORIES,
  RESEARCH_DOMAINS,
  RESEARCH_PROJECT_STATUSES,
  RESEARCH_MEMBER_TYPES,
  RESEARCH_MEMBER_ROLES,
  OUTCOME_TYPES,
} = require('../constants/institutionResearch')

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, default: '' },
    memberType: { type: String, enum: RESEARCH_MEMBER_TYPES, required: true },
    role: { type: String, enum: RESEARCH_MEMBER_ROLES, default: 'collaborator' },
    responsibilities: { type: String, trim: true, default: '' },
    joinedAt: { type: Date, default: Date.now },
    contributions: [
      {
        date: { type: Date, default: Date.now },
        description: { type: String, trim: true, default: '' },
      },
    ],
  },
  { _id: true },
)

const historySchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, default: '' },
    previousState: { type: String, trim: true, default: '' },
    newState: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
)

const outcomeSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    outcomeType: { type: String, enum: OUTCOME_TYPES, default: 'publication' },
    description: { type: String, trim: true, default: '' },
    achievedAt: { type: Date, default: null },
    url: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const institutionResearchProjectSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    abstract: { type: String, trim: true, default: '' },
    researchArea: { type: String, trim: true, default: '', index: true },
    category: { type: String, enum: RESEARCH_CATEGORIES, default: 'applied', index: true },
    domain: { type: String, enum: RESEARCH_DOMAINS, default: 'other', index: true },
    principalInvestigator: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      department: { type: String, trim: true, default: '' },
    },
    members: [memberSchema],
    objectives: [{ type: String, trim: true }],
    timeline: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    budget: { type: Number, default: 0 },
    fundingSource: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: RESEARCH_PROJECT_STATUSES,
      default: 'proposed',
      index: true,
    },
    expectedOutcomes: [{ type: String, trim: true }],
    outcomes: [outcomeSchema],
    tags: [{ type: String, trim: true }],
    isConfidential: { type: Boolean, default: false },
    history: [historySchema],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionResearchProjectSchema.index({ institutionId: 1, status: 1 })
institutionResearchProjectSchema.index({ institutionId: 1, 'principalInvestigator.userId': 1 })
institutionResearchProjectSchema.index({ title: 'text', abstract: 'text', researchArea: 'text' })

module.exports = mongoose.model('InstitutionResearchProject', institutionResearchProjectSchema)
