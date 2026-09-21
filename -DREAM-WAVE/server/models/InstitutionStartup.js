const mongoose = require('mongoose')
const {
  STARTUP_CATEGORIES,
  STARTUP_STAGES,
  STARTUP_STATUSES,
  normalizeStartupName,
} = require('../constants/institutionIncubation')

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    role: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true },
)

const institutionStartupSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    nameNormalized: { type: String, trim: true, required: true, index: true },
    founders: [{ type: String, trim: true }],
    coFounders: [{ type: String, trim: true }],
    category: { type: String, enum: STARTUP_CATEGORIES, default: 'technology', index: true },
    industry: { type: String, trim: true, default: '' },
    stage: { type: String, enum: STARTUP_STAGES, default: 'idea', index: true },
    description: { type: String, trim: true, default: '' },
    vision: { type: String, trim: true, default: '' },
    mission: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    contactEmail: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    teamMembers: [teamMemberSchema],
    status: { type: String, enum: STARTUP_STATUSES, default: 'draft', index: true },
    linkedIdeaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionInnovationIdea',
      default: null,
    },
    isConfidential: { type: Boolean, default: false },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionStartupSchema.pre('validate', function preValidate(next) {
  if (this.name) this.nameNormalized = normalizeStartupName(this.name)
  next()
})

institutionStartupSchema.index({ institutionId: 1, nameNormalized: 1 }, { unique: true })
institutionStartupSchema.index({ name: 'text', description: 'text' })

module.exports = mongoose.model('InstitutionStartup', institutionStartupSchema)
