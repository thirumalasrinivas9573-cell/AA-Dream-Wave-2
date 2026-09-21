const mongoose = require('mongoose')
const { AUDIT_ACTIONS } = require('../constants/institutionStudents')

const institutionStudentAuditSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      default: null,
      index: true,
    },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: { type: String, trim: true, default: '' },
    previousState: { type: String, trim: true, default: '' },
    newState: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

institutionStudentAuditSchema.index({ institutionId: 1, createdAt: -1 })

module.exports = mongoose.model('InstitutionStudentAudit', institutionStudentAuditSchema)
