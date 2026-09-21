const mongoose = require('mongoose')

/**
 * Processed intelligence events — idempotency + cascade tracking.
 * Not a second notification system.
 */
const EVENT_TYPES = [
  'GOAL_CREATED', 'GOAL_UPDATED',
  'TASK_CREATED', 'TASK_COMPLETED',
  'LEARNING_STARTED', 'LEARNING_COMPLETED',
  'SKILL_UPDATED',
  'PROJECT_CREATED', 'PROJECT_COMPLETED',
  'EVIDENCE_ADDED',
  'BOOK_COMPLETED',
  'OPPORTUNITY_FOUND',
  'APPLICATION_CREATED', 'APPLICATION_SUBMITTED',
  'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED',
  'MEMORY_UPDATED',
  'WORKFLOW_COMPLETED',
  'COMMAND_EXECUTED',
  'DECISION_OVERRIDDEN',
]

const intelligenceEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
    index: true,
  },
  source: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'system',
  },
  entityType: {
    type: String,
    trim: true,
    maxlength: 40,
    default: '',
  },
  entityId: {
    type: String,
    trim: true,
    maxlength: 64,
    default: '',
  },
  idempotencyKey: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  depth: { type: Number, default: 0, min: 0, max: 10 },
  status: {
    type: String,
    enum: ['RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED'],
    default: 'RECEIVED',
    index: true,
  },
  impact: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  processedAt: Date,
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
}, { timestamps: { createdAt: true, updatedAt: true } })

intelligenceEventSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true })
intelligenceEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 })
intelligenceEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('IntelligenceEvent', intelligenceEventSchema)
module.exports.EVENT_TYPES = EVENT_TYPES
