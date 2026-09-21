const mongoose = require('mongoose')

const strategyItemSchema = new mongoose.Schema(
  {
    action: String,
    why: String,
    relatedGoal: String,
    evidence: String,
    expectedBenefit: String,
    order: Number,
    category: { type: String, default: 'STRATEGY' },
  },
  { _id: false },
)

const milestoneSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
    dependsOn: [{ type: String }],
    order: Number,
    linkedSkill: String,
    evidence: String,
  },
  { _id: false },
)

const executionPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['DRAFT', 'PROPOSED', 'ACTIVE', 'ARCHIVED'], default: 'PROPOSED' },
    targetRole: String,
    targetOutcome: String,
    strategy: [strategyItemSchema],
    milestones: [milestoneSchema],
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionPlan' },
    changeReason: String,
    recoveryMode: { type: Boolean, default: false },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'], default: 'UNKNOWN' },
    planHash: String,
  },
  { timestamps: true },
)

executionPlanSchema.index({ userId: 1, goalId: 1, status: 1 })
executionPlanSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('ExecutionPlan', executionPlanSchema)
