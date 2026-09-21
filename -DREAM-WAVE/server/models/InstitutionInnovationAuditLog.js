const mongoose = require('mongoose')
const { INNOVATION_AUDIT_ACTIONS } = require('../constants/institutionResearch')

const institutionInnovationAuditLogSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    action: { type: String, enum: INNOVATION_AUDIT_ACTIONS, required: true, index: true },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

institutionInnovationAuditLogSchema.index({ institutionId: 1, createdAt: -1 })

module.exports = mongoose.model('InstitutionInnovationAuditLog', institutionInnovationAuditLogSchema)
