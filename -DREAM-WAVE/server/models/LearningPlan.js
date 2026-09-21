const mongoose = require('mongoose')
const { PLAN_STATUSES } = require('../constants/adaptiveLearning')

const planItemSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 0 },
    skillId: { type: String, default: '' },
    skillName: { type: String, default: '' },
    topic: { type: String, default: '' },
    objective: { type: String, default: '' },
    resourceRef: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    practiceType: { type: String, enum: ['learn', 'quiz', 'practice', 'revise', 'project'], default: 'learn' },
    estimatedMinutes: { type: Number, default: 30 },
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    reason: { type: String, default: '' },
  },
  { _id: true },
)

const planVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    changeSummary: { type: String, default: '' },
    itemsSnapshot: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const learningPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Adaptive Study Plan' },
    goal: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    status: { type: String, enum: PLAN_STATUSES, default: 'ACTIVE' },
    version: { type: Number, default: 1 },
    deadline: { type: Date, default: null },
    availableMinutesPerDay: { type: Number, default: null },
    items: [planItemSchema],
    versions: [planVersionSchema],
    todayFocus: [{ type: String }],
    nextFocus: [{ type: String }],
    generatedBy: { type: String, default: 'LEARNING_AGENT' },
  },
  { timestamps: true },
)

learningPlanSchema.index({ userId: 1, status: 1, updatedAt: -1 })

module.exports = mongoose.model('LearningPlan', learningPlanSchema)
