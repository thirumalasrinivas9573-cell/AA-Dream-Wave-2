const mongoose = require('mongoose')

const scheduleItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
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
  milestoneKey: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  itemType: {
    type: String,
    enum: ['task', 'break', 'study', 'review', 'custom'],
    default: 'task',
  },
  scheduledDate: {
    type: String,
    required: true,
    index: true,
  },
  startTime: {
    type: String,
    trim: true,
  },
  endTime: {
    type: String,
    trim: true,
  },
  durationMinutes: {
    type: Number,
    min: 0,
    max: 24 * 60,
    default: 30,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  priorityScore: {
    type: Number,
    min: 0,
    default: 0,
  },
  priorityReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'skipped', 'cancelled'],
    default: 'scheduled',
    index: true,
  },
  source: {
    type: String,
    enum: ['manual', 'ai', 'system'],
    default: 'manual',
  },
  planBatchId: {
    type: String,
    trim: true,
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, { timestamps: true })

scheduleItemSchema.index({ userId: 1, scheduledDate: 1, status: 1 })
scheduleItemSchema.index({ userId: 1, taskId: 1, scheduledDate: 1 })

module.exports = mongoose.model('ScheduleItem', scheduleItemSchema)
