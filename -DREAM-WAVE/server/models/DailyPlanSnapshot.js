const mongoose = require('mongoose')

const planItemSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    title: String,
    type: String,
    priority: String,
    why: String,
    whyNow: String,
    supports: String,
    estimatedEffort: String,
    order: Number,
    proposed: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    milestoneKey: String,
    focusBlockStart: String,
    focusBlockEnd: String,
  },
  { _id: false },
)

const blockerSchema = new mongoose.Schema(
  {
    type: String,
    blocker: String,
    whyItMatters: String,
    recommendedAction: String,
  },
  { _id: false },
)

const dailyPlanSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', index: true },
    executionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionPlan' },
    planDate: { type: String, required: true, index: true },
    topPriority: { type: mongoose.Schema.Types.Mixed },
    items: [planItemSchema],
    blockers: [blockerSchema],
    focusBlocks: [{ start: String, end: String, label: String, taskId: mongoose.Schema.Types.ObjectId }],
    version: { type: Number, default: 1 },
    changeReason: String,
    previousSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPlanSnapshot' },
  },
  { timestamps: true },
)

dailyPlanSnapshotSchema.index({ userId: 1, planDate: 1 }, { unique: true })

module.exports = mongoose.model('DailyPlanSnapshot', dailyPlanSnapshotSchema)
