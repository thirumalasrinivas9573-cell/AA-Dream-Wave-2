const mongoose = require('mongoose')
const { ALUMNI_AUDIT_ACTIONS } = require('../constants/institutionAlumniExtended')

const institutionAlumniAuditLogSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      default: null,
      index: true,
    },
    action: { type: String, enum: ALUMNI_AUDIT_ACTIONS, required: true, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

institutionAlumniAuditLogSchema.index({ institutionId: 1, createdAt: -1 })

module.exports = mongoose.model('InstitutionAlumniAuditLog', institutionAlumniAuditLogSchema)
