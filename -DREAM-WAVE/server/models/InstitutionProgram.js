const mongoose = require('mongoose')
const {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  PROGRAM_LINK_TYPES,
} = require('../constants/institutionPrograms')

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

const linkedEntitySchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: PROGRAM_LINK_TYPES, required: true },
    entityId: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: true },
)

const milestoneSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    dueDate: { type: Date, default: null },
    linkedEntityType: { type: String, enum: [...PROGRAM_LINK_TYPES, null], default: null },
    linkedEntityId: { type: String, trim: true, default: '' },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
)

const institutionProgramSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
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
      index: true,
    },
    ownerRole: {
      type: String,
      enum: ['institution', 'company'],
      required: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    objectives: { type: String, trim: true, default: '' },
    programType: { type: String, enum: PROGRAM_TYPES, required: true, index: true },
    status: { type: String, enum: PROGRAM_STATUSES, default: 'draft', index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    registrationOpensAt: { type: Date, default: null },
    registrationClosesAt: { type: Date, default: null },
    capacity: { type: Number, default: null, min: 0 },
    eligibilityRules: { type: eligibilityRulesSchema, default: () => ({}) },
    cohortIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionCohort' }],
    academicProgramKeys: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    linkedEntities: [linkedEntitySchema],
    milestones: [milestoneSchema],
    location: { type: String, trim: true, default: '' },
    visibility: {
      type: String,
      enum: ['draft', 'internal', 'published'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true },
)

institutionProgramSchema.index({ institutionId: 1, status: 1 })
institutionProgramSchema.index({ companyId: 1, status: 1 })
institutionProgramSchema.index({ title: 'text', description: 'text', objectives: 'text' })

module.exports = mongoose.model('InstitutionProgram', institutionProgramSchema)
