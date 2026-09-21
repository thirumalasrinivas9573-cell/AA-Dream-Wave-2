const mongoose = require('mongoose')
const { WORKFLOW_STATUSES, APPROVAL_POLICIES, ACTION_TYPES } = require('../constants/ecosystemAutomation')

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    action: { type: String, enum: ACTION_TYPES, required: true },
    status: {
      type: String,
      enum: ['pending', 'preview', 'approved', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    preview: { type: mongoose.Schema.Types.Mixed, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    executedAt: { type: Date, default: null },
  },
  { _id: true },
)

const approvalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
    comment: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { _id: true },
)

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: 'system' },
    result: { type: String, default: 'ok' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
)

const workflowExecutionSchema = new mongoose.Schema(
  {
    templateId: { type: String, default: 'MANUAL', index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'operations' },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    organizationRole: { type: String, enum: ['institution', 'company', 'student'], required: true },
    trigger: { type: String, default: 'MANUAL' },
    status: { type: String, enum: WORKFLOW_STATUSES, default: 'DRAFT', index: true },
    approvalPolicy: { type: String, enum: APPROVAL_POLICIES, default: 'USER_CONFIRMATION' },
    steps: [stepSchema],
    approvals: [approvalSchema],
    auditLog: [auditEntrySchema],
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    idempotencyKey: { type: String, default: null, index: true, sparse: true },
    expiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
)

workflowExecutionSchema.index({ organizationId: 1, organizationRole: 1, status: 1 })
workflowExecutionSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model('WorkflowExecution', workflowExecutionSchema)
