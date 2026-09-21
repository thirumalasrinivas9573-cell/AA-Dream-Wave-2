const mongoose = require('mongoose')

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    index: true,
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endedAt: Date,
  pausedAt: Date,
  pausedDurationSeconds: {
    type: Number,
    min: 0,
    default: 0,
  },
  durationSeconds: {
    type: Number,
    min: 0,
    default: 0,
  },
  plannedDurationMinutes: {
    type: Number,
    min: 0,
    max: 24 * 60,
    default: 0,
  },
  timerMode: {
    type: String,
    enum: ['custom', '25', '45', '60'],
    default: 'custom',
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  distractionNote: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  status: {
    type: String,
    enum: ['ready', 'active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },
}, { timestamps: true })

focusSessionSchema.index({ userId: 1, startedAt: -1 })
focusSessionSchema.index(
  { userId: 1, taskId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
)

module.exports = mongoose.model('FocusSession', focusSessionSchema)
