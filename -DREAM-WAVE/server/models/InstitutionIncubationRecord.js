const mongoose = require('mongoose')
const { INCUBATION_STAGES } = require('../constants/institutionIncubation')

const historySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: INCUBATION_STAGES, required: true },
    action: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true },
)

const institutionIncubationRecordSchema = new mongoose.Schema(
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
      required: true,
      unique: true,
      index: true,
    },
    currentStage: {
      type: String,
      enum: INCUBATION_STAGES,
      default: 'idea_evaluation',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    graduatedAt: { type: Date, default: null },
    assignedMentorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionMentor' }],
    notes: { type: String, trim: true, default: '' },
    history: [historySchema],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionIncubationRecordSchema.index({ institutionId: 1, currentStage: 1 })

module.exports = mongoose.model('InstitutionIncubationRecord', institutionIncubationRecordSchema)
