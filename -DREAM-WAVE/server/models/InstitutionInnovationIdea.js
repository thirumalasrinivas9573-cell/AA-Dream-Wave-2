const mongoose = require('mongoose')
const { IDEA_TYPES, IDEA_REVIEW_STATUSES } = require('../constants/institutionResearch')

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const institutionInnovationIdeaSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    submitterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submitterName: { type: String, trim: true, default: '' },
    submitterRole: { type: String, trim: true, default: 'student' },
    title: { type: String, trim: true, required: true },
    ideaType: { type: String, enum: IDEA_TYPES, required: true, index: true },
    description: { type: String, trim: true, default: '' },
    problemStatement: { type: String, trim: true, default: '' },
    proposedSolution: { type: String, trim: true, default: '' },
    attachments: [attachmentSchema],
    tags: [{ type: String, trim: true }],
    reviewStatus: {
      type: String,
      enum: IDEA_REVIEW_STATUSES,
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
    linkedProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchProject',
      default: null,
    },
  },
  { timestamps: true },
)

institutionInnovationIdeaSchema.index({ institutionId: 1, reviewStatus: 1 })
institutionInnovationIdeaSchema.index({ title: 'text', description: 'text', problemStatement: 'text' })

module.exports = mongoose.model('InstitutionInnovationIdea', institutionInnovationIdeaSchema)
