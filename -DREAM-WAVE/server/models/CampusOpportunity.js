const mongoose = require('mongoose')
const {
  OPPORTUNITY_TYPES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  OPPORTUNITY_STATUSES,
  DEFAULT_DRIVE_WORKFLOW,
} = require('../constants/institutionPlacements')

const workflowStageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  },
  { _id: false },
)

const hackathonDetailsSchema = new mongoose.Schema(
  {
    teamSizeMin: { type: Number, default: 1, min: 1 },
    teamSizeMax: { type: Number, default: 4, min: 1 },
    submissionDeadline: { type: Date, default: null },
    problemStatements: [{ title: String, description: String }],
    themes: [{ type: String, trim: true }],
    tracks: [{ type: String, trim: true }],
    rules: { type: String, trim: true, default: '' },
    judgingCriteria: [{ name: String, weight: Number }],
    prizes: [{ label: String, description: String }],
    website: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const campusRegistrationSchema = new mongoose.Schema(
  {
    registrantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registrantName: { type: String, trim: true, required: true },
    registrantEmail: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const shortlistSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['draft', 'pending_approval', 'published'], default: 'draft' },
    applicationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentApplication' }],
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    mode: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  },
  { _id: false },
)

const eligibilityRulesSchema = new mongoose.Schema(
  {
    departments: [{ type: String, trim: true }],
    programs: [{ type: String, trim: true }],
    batches: [{ type: String, trim: true }],
    semesters: [{ type: String, trim: true }],
    minCgpa: { type: Number, default: null },
    maxBacklogs: { type: Number, default: null },
    graduationYear: { type: String, trim: true, default: '' },
    requiredSkills: [{ type: String, trim: true }],
    requiredCertifications: [{ type: String, trim: true }],
  },
  { _id: false },
)

const campusOpportunitySchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionCompanyPartnership',
      default: null,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionProgram',
      default: null,
      index: true,
    },
    linkedJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentJob',
      default: null,
    },
    linkedInternshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentInternship',
      default: null,
    },
    opportunityType: {
      type: String,
      enum: OPPORTUNITY_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    workMode: { type: String, enum: WORK_MODES, default: 'hybrid' },
    salary: { type: Number, default: 0 },
    stipend: { type: Number, default: 0 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'full-time' },
    deadline: { type: Date, default: null, index: true },
    requiredSkills: [{ type: String, trim: true }],
    eligibilityRules: { type: eligibilityRulesSchema, default: () => ({}) },
    selectionProcess: [{ type: String, trim: true }],
    documentsRequired: [{ type: String, trim: true }],
    venue: { type: String, trim: true, default: '' },
    onlinePlatform: { type: String, trim: true, default: '' },
    driveDate: { type: Date, default: null },
    expectedHiringCount: { type: Number, default: 1, min: 0 },
    workflowStages: { type: [workflowStageSchema], default: () => DEFAULT_DRIVE_WORKFLOW.map((s) => ({ ...s, status: 'pending' })) },
    currentWorkflowStage: { type: String, trim: true, default: 'registration_open' },
    shortlist: { type: shortlistSchema, default: () => ({}) },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: OPPORTUNITY_STATUSES,
      default: 'open',
      index: true,
    },
    openPositions: { type: Number, default: 1, min: 0 },
    capacity: { type: Number, default: null, min: 0 },
    hackathonDetails: { type: hackathonDetailsSchema, default: null },
    registrations: [campusRegistrationSchema],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

campusOpportunitySchema.index({ institutionId: 1, status: 1, deadline: 1 })
campusOpportunitySchema.index({ institutionId: 1, opportunityType: 1 })
campusOpportunitySchema.index({ institutionId: 1, companyId: 1 })
campusOpportunitySchema.index({ institutionId: 1, driveDate: 1 })
campusOpportunitySchema.index({ title: 'text', description: 'text' })

module.exports = mongoose.model('CampusOpportunity', campusOpportunitySchema)
