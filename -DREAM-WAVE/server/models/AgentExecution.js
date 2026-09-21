const mongoose = require('mongoose')

const stepSchema = new mongoose.Schema({
  order: { type: Number, min: 1 },
  stepId: { type: String, trim: true, maxlength: 64, default: '' },
  tool: { type: String, trim: true, maxlength: 80 },
  // V4 P5 workflow step classification
  type: {
    type: String,
    enum: ['READ', 'ANALYZE', 'PLAN', 'RECOMMEND', 'CREATE', 'UPDATE', 'COMMUNICATE', 'EXTERNAL_ACTION', 'VERIFY', ''],
    default: '',
  },
  dependsOn: [{ type: String, maxlength: 64 }],
  agent: { type: String, trim: true, maxlength: 40, default: '' },
  approvalRequired: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['planned', 'awaiting_confirmation', 'executing', 'completed', 'failed', 'cancelled', 'skipped'],
    default: 'planned',
  },
  riskLevel: { type: String, enum: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'CRITICAL'], default: 'LOW_RISK' },
  summary: { type: String, trim: true, maxlength: 500, default: '' },
  // Safe structured args only (titles/ids). Never store secrets.
  args: { type: Object, default: undefined },
  // Safe compact output (no secrets / CoT)
  output: { type: Object, default: undefined },
  error: { type: String, trim: true, maxlength: 500, default: '' },
  verified: { type: Boolean, default: false },
  retryCount: { type: Number, min: 0, default: 0 },
  startedAt: Date,
  finishedAt: Date,
}, { _id: false })

const eventSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  type: { type: String, trim: true, maxlength: 60 },
  summary: { type: String, trim: true, maxlength: 400, default: '' },
  stepRef: { type: String, trim: true, maxlength: 64, default: '' },
}, { _id: false })

const agentExecutionSchema = new mongoose.Schema({
  executionId: { type: String, required: true, unique: true, index: true, maxlength: 64 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, trim: true, maxlength: 40, default: 'student' },
  agentType: {
    type: String,
    enum: [
      'student', 'project', 'research', 'learning', 'daily_life', 'opportunity', 'event',
      'career', 'institution', 'company', 'general', 'multi',
    ],
    default: 'student',
  },
  // V4 P5 — workflow vs classic tool plan / specialist network (same collection)
  kind: {
    type: String,
    enum: ['tool_plan', 'specialist_network', 'workflow'],
    default: 'tool_plan',
    index: true,
  },
  workflowName: { type: String, trim: true, maxlength: 120, default: '' },
  template: { type: String, trim: true, maxlength: 60, default: '' },
  scope: [{ type: String, trim: true, maxlength: 80 }],
  request: { type: String, required: true, trim: true, maxlength: 2000 },
  intent: { type: String, trim: true, maxlength: 80, default: '' },
  mode: {
    type: String,
    enum: ['READ_ONLY', 'SUGGEST', 'CONFIRM', 'EXECUTE'],
    default: 'SUGGEST',
  },
  state: {
    type: String,
    enum: [
      'IDLE', 'DRAFT', 'PLANNING', 'PLANNED', 'AWAITING_APPROVAL', 'AWAITING_CONFIRMATION',
      'APPROVED', 'EXECUTING', 'RUNNING', 'VERIFYING', 'PAUSED',
      'COMPLETED', 'FAILED', 'CANCELLED', 'CANCELLING', 'PARTIAL',
    ],
    default: 'PLANNING',
    index: true,
  },
  cancelRequested: { type: Boolean, default: false },
  steps: { type: [stepSchema], default: [] },
  // V4 P2 — specialist network steps (structured, no CoT)
  specialistSteps: [{
    stepId: { type: String, maxlength: 64 },
    agent: { type: String, maxlength: 40 },
    status: {
      type: String,
      enum: ['planned', 'running', 'completed', 'failed', 'skipped', 'cancelled', 'timeout'],
      default: 'planned',
    },
    summary: { type: String, maxlength: 500, default: '' },
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', ''], default: '' },
    latencyMs: { type: Number, min: 0, default: 0 },
    error: { type: String, maxlength: 300, default: '' },
  }],
  specialistsUsed: [{ type: String, maxlength: 40 }],
  planSummary: [{ type: String, trim: true, maxlength: 300 }],
  resultSummary: { type: String, trim: true, maxlength: 2000, default: '' },
  mergedResult: { type: Object, default: undefined },
  // Safe context refs only (ids/titles) — not full user DB
  contextSnapshot: { type: Object, default: undefined },
  planHash: { type: String, trim: true, maxlength: 64, default: '' },
  approvedPlanHash: { type: String, trim: true, maxlength: 64, default: '' },
  confirmation: {
    required: { type: Boolean, default: false },
    previewId: { type: String, trim: true, maxlength: 64, default: '' },
    confirmedAt: Date,
    expiresAt: Date,
    rejectedAt: Date,
    rejectReason: { type: String, trim: true, maxlength: 300, default: '' },
  },
  idempotencyKey: { type: String, trim: true, maxlength: 120, index: true, sparse: true },
  executionLockUntil: Date,
  pausedAt: Date,
  parentExecutionId: { type: String, trim: true, maxlength: 64, default: '' },
  depth: { type: Number, min: 0, default: 0 },
  events: { type: [eventSchema], default: [] },
  toolCallCount: { type: Number, min: 0, default: 0 },
  specialistCallCount: { type: Number, min: 0, default: 0 },
  limits: {
    maxSteps: Number,
    maxToolCalls: Number,
    maxExecutionMs: Number,
    maxSpecialists: Number,
    maxRetries: Number,
  },
  verification: {
    passed: { type: Boolean, default: false },
    summary: { type: String, trim: true, maxlength: 500, default: '' },
    checkedAt: Date,
  },
  errorCode: { type: String, trim: true, maxlength: 80, default: '' },
  finishedAt: Date,
}, { timestamps: true })

agentExecutionSchema.index({ userId: 1, createdAt: -1 })
agentExecutionSchema.index({ userId: 1, kind: 1, createdAt: -1 })
agentExecutionSchema.index({ userId: 1, idempotencyKey: 1 }, { sparse: true })

module.exports = mongoose.model('AgentExecution', agentExecutionSchema)
