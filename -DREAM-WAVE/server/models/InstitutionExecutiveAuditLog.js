const mongoose = require('mongoose')
const { EXECUTIVE_AUDIT_ACTIONS } = require('../constants/institutionCommandCenter')

const institutionExecutiveAuditLogSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    action: { type: String, enum: EXECUTIVE_AUDIT_ACTIONS, required: true, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

institutionExecutiveAuditLogSchema.index({ institutionId: 1, createdAt: -1 })
institutionExecutiveAuditLogSchema.index({ institutionId: 1, action: 1, createdAt: -1 })

module.exports = mongoose.model('InstitutionExecutiveAuditLog', institutionExecutiveAuditLogSchema)
