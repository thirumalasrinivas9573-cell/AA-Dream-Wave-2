const mongoose = require('mongoose')

const RECRUITMENT_AUDIT_ACTIONS = [
  'job_created',
  'job_updated',
  'job_closed',
  'candidate_applied',
  'candidate_shortlisted',
  'interview_scheduled',
  'interview_completed',
  'offer_generated',
  'offer_accepted',
  'permission_changed',
  'report_generated',
  'report_exported',
  'team_updated',
]

const recruitmentAuditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    action: { type: String, enum: RECRUITMENT_AUDIT_ACTIONS, required: true, index: true },
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

recruitmentAuditLogSchema.index({ companyId: 1, createdAt: -1 })

module.exports = mongoose.model('RecruitmentAuditLog', recruitmentAuditLogSchema)
module.exports.RECRUITMENT_AUDIT_ACTIONS = RECRUITMENT_AUDIT_ACTIONS
