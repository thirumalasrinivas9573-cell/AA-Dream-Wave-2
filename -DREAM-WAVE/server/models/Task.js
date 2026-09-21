const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    index: true,
  },
  roadmapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    index: true,
  },
  source: {
    type: String,
    enum: ['manual', 'ai', 'duplicate', 'roadmap'],
    default: 'manual',
    index: true,
  },
  duplicatedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  day: {
    type: Number,
  },
  type: {
    type: String,
    enum: ['learn', 'quiz', 'practice', 'revise'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  estimatedTime: {
    type: String,
    trim: true,
  },
  estimatedMinutes: {
    type: Number,
    min: 0,
    max: 24 * 60,
    default: 0,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'paused', 'completed', 'archived'],
    default: 'todo',
    index: true,
  },
  startDate: Date,
  dueDate: {
    type: Date,
    index: true,
  },
  reminderAt: Date,
  reminder: {
    enabled: { type: Boolean, default: false },
    daily: { type: Boolean, default: false },
    dueSoon: { type: Boolean, default: true },
    overdue: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: true },
    sentAt: Date,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 40,
  }],
  subtasks: [{
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
  checklist: [{
    text: { type: String, required: true, trim: true, maxlength: 300 },
    done: { type: Boolean, default: false },
    doneAt: Date,
  }],
  notes: [{
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  }],
  attachments: [{
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    mime: { type: String, trim: true, maxlength: 100, default: '' },
    size: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  actualMinutes: {
    type: Number,
    min: 0,
    default: 0,
  },
  countsTowardGoalProgress: {
    type: Boolean,
    default: true,
  },
  pausedAt: Date,
  archivedAt: Date,
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  proposed: {
    type: Boolean,
    default: false,
  },
  snoozedUntil: {
    type: Date,
  },
  failed: {
    type: Boolean,
    default: false,
  },
  milestoneKey: {
    type: String,
    trim: true,
  },
  executionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExecutionPlan',
    index: true,
  },
}, { timestamps: true })

taskSchema.index({ userId: 1, status: 1, dueDate: 1 })
taskSchema.index({ userId: 1, goalId: 1, status: 1 })
taskSchema.index({ userId: 1, roadmapId: 1, day: 1 })
taskSchema.index({ userId: 1, completed: 1, completedAt: -1 })
taskSchema.index({ userId: 1, tags: 1 })

module.exports = mongoose.model('Task', taskSchema)
