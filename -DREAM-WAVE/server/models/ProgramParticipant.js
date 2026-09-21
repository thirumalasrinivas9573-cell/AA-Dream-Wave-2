const mongoose = require('mongoose')
const { PARTICIPANT_STATUSES } = require('../constants/institutionPrograms')

const programParticipantSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionProgram',
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    institutionStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      default: null,
    },
    status: {
      type: String,
      enum: PARTICIPANT_STATUSES,
      default: 'registered',
      index: true,
    },
    eligibilitySnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    registeredAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    droppedAt: { type: Date, default: null },
    reviewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewMessage: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

programParticipantSchema.index({ programId: 1, studentUserId: 1 }, { unique: true })

module.exports = mongoose.model('ProgramParticipant', programParticipantSchema)
