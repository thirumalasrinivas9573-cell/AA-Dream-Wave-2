const mongoose = require('mongoose')
const { COLLABORATION_TYPES, TASK_STATUSES } = require('../constants/institutionIncubation')

const institutionIncubationCollaborationSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStartup',
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchProject',
      default: null,
      index: true,
    },
    collaborationType: { type: String, enum: COLLABORATION_TYPES, required: true, index: true },
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, default: '' },
    fileUrl: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    taskStatus: { type: String, enum: TASK_STATUSES, default: 'open' },
    assigneeName: { type: String, trim: true, default: '' },
    assigneeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: { type: String, trim: true, default: '' },
    participants: [{ type: String, trim: true }],
    isConfidential: { type: Boolean, default: false },
  },
  { timestamps: true },
)

institutionIncubationCollaborationSchema.index({ institutionId: 1, createdAt: -1 })

module.exports = mongoose.model(
  'InstitutionIncubationCollaboration',
  institutionIncubationCollaborationSchema,
)
