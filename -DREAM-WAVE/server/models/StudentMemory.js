const mongoose = require('mongoose')

const MEMORY_TYPES = [
  'PREFERENCE',
  'GOAL_CONTEXT',
  'PROJECT_CONTEXT',
  'LEARNING_CONTEXT',
  'CAREER_CONTEXT',
  'WORKFLOW_PREFERENCE',
  'COMMUNICATION_STYLE',
  'DECISION',
  'IMPORTANT_CONTEXT',
  'TEMPORARY_CONTEXT',
  'PERSONALIZATION',
]

const MEMORY_SOURCES = [
  'USER_EXPLICIT',
  'USER_CONFIRMED',
  'SYSTEM_VERIFIED',
  'AI_DERIVED',
  'PROFILE',
  'GOAL',
  'PROJECT',
  'LEARNING',
  'RESEARCH',
  'SYSTEM',
  'CONVERSATION',
]

const MEMORY_CONFIDENCE = ['EXPLICIT', 'HIGH', 'MEDIUM', 'LOW']
const MEMORY_IMPORTANCE = ['CRITICAL', 'IMPORTANT', 'USEFUL', 'LOW_VALUE']
const MEMORY_STATUS = ['ACTIVE', 'OUTDATED', 'ARCHIVED', 'DELETED', 'PENDING_CONFIRMATION']

const studentMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: MEMORY_TYPES,
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: MEMORY_SOURCES,
    required: true,
    default: 'USER_EXPLICIT',
  },
  confidence: {
    type: String,
    enum: MEMORY_CONFIDENCE,
    default: 'EXPLICIT',
    index: true,
  },
  // V4 Prompt 7 — Memory 2.0
  importance: {
    type: String,
    enum: MEMORY_IMPORTANCE,
    default: 'USEFUL',
    index: true,
  },
  status: {
    type: String,
    enum: MEMORY_STATUS,
    default: 'ACTIVE',
    index: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
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
  fingerprint: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
  lastUsedAt: {
    type: Date,
    default: null,
    index: true,
  },
  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentMemory',
    default: null,
  },
  // Prior value when updated (temporal memory) — not treated as current
  previousContent: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  archivedAt: Date,
  deletedAt: Date,
}, { timestamps: true })

studentMemorySchema.index({ userId: 1, status: 1, updatedAt: -1 })
studentMemorySchema.index({ userId: 1, type: 1, status: 1 })
studentMemorySchema.index({ userId: 1, fingerprint: 1 }, { unique: true })
studentMemorySchema.index({ userId: 1, source: 1, createdAt: -1 })
studentMemorySchema.index({ userId: 1, entityType: 1, entityId: 1 })
studentMemorySchema.index({ userId: 1, importance: 1, status: 1 })

module.exports = mongoose.model('StudentMemory', studentMemorySchema)
module.exports.MEMORY_TYPES = MEMORY_TYPES
module.exports.MEMORY_SOURCES = MEMORY_SOURCES
module.exports.MEMORY_CONFIDENCE = MEMORY_CONFIDENCE
module.exports.MEMORY_IMPORTANCE = MEMORY_IMPORTANCE
module.exports.MEMORY_STATUS = MEMORY_STATUS
