const mongoose = require('mongoose')
const { SESSION_STATUSES, TEACHING_MODES } = require('../constants/adaptiveLearning')

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPlan', default: null },
    planItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    objective: { type: String, default: '' },
    skillId: { type: String, default: '' },
    skillName: { type: String, default: '' },
    topic: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    resourceTitle: { type: String, default: '' },
    teachingMode: { type: String, enum: TEACHING_MODES, default: 'EXPLAIN' },
    status: { type: String, enum: SESSION_STATUSES, default: 'NOT_STARTED' },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    notes: [{
      authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: { type: String },
      contentType: { type: String, enum: ['USER_NOTE', 'AI_SUMMARY', 'AI_NOTE'], default: 'USER_NOTE' },
      createdAt: { type: Date, default: Date.now },
    }],
    activities: [{
      type: { type: String },
      description: String,
      at: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true },
)

studySessionSchema.index({ userId: 1, status: 1, updatedAt: -1 })

module.exports = mongoose.model('StudySession', studySessionSchema)
