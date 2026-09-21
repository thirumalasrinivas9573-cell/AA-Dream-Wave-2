const mongoose = require('mongoose')
const {
  WORKSPACE_STATUSES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  SUBMISSION_STATUSES,
  APPLICATION_HEALTH,
} = require('../constants/applicationIntelligence')

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    required: { type: Boolean, default: false },
    status: { type: String, default: 'PENDING' },
    category: { type: String, default: 'UNKNOWN' },
  },
  { _id: false },
)

const documentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true },
    type: { type: String, enum: DOCUMENT_TYPES, default: 'OTHER' },
    label: { type: String, default: '' },
    content: { type: String, default: '' },
    url: { type: String, default: '' },
    versionStatus: { type: String, enum: DOCUMENT_STATUSES, default: 'DRAFT' },
    baseDocumentId: { type: String, default: null },
    diffSummary: { type: String, default: '' },
  },
  { timestamps: true, _id: false },
)

const questionAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, default: '' },
    answerDraft: { type: String, default: '' },
    review: {
      relevance: { type: Number, min: 0, max: 100, default: null },
      clarity: { type: Number, min: 0, max: 100, default: null },
      notes: [{ type: String }],
    },
    status: { type: String, default: 'DRAFT' },
  },
  { _id: false },
)

const timelineEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    description: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const applicationWorkspaceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    opportunitySource: { type: String, required: true, index: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    opportunityTitle: { type: String, default: '' },
    organization: { type: String, default: '' },
    status: { type: String, enum: WORKSPACE_STATUSES, default: 'SAVED', index: true },
    health: { type: String, enum: APPLICATION_HEALTH, default: 'UNKNOWN' },
    recruitmentApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentApplication', default: null },
    matchState: { type: String, default: 'UNKNOWN' },
    deadline: { type: Date, default: null },
    checklist: [checklistItemSchema],
    documents: [documentSchema],
    selectedProjects: [{ projectId: String, title: String, reason: String }],
    questionAnswers: [questionAnswerSchema],
    timeline: [timelineEventSchema],
    notes: { type: String, default: '' },
    submission: {
      submittedAt: Date,
      destination: String,
      confirmationReference: String,
      status: { type: String, enum: SUBMISSION_STATUSES },
    },
    followUpDrafts: [{
      type: { type: String, default: 'inquiry' },
      subject: String,
      body: String,
      createdAt: { type: Date, default: Date.now },
    }],
    outcome: { type: String, default: '' },
    outcomeNotes: { type: String, default: '' },
  },
  { timestamps: true },
)

applicationWorkspaceSchema.index({ userId: 1, opportunitySource: 1, opportunityId: 1 }, { unique: true })
applicationWorkspaceSchema.index({ userId: 1, status: 1, updatedAt: -1 })

module.exports = mongoose.model('ApplicationWorkspace', applicationWorkspaceSchema)
