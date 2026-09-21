const mongoose = require('mongoose')

/**
 * Durable decision / command audit (V4 Prompt 8).
 * Does NOT replace IntelligenceRecommendationState dismiss/feedback.
 */
const intelligenceDecisionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  kind: {
    type: String,
    enum: ['DECISION', 'COMMAND', 'INSIGHT', 'OVERRIDE'],
    default: 'DECISION',
    index: true,
  },
  commandClass: {
    type: String,
    trim: true,
    maxlength: 40,
    default: '',
  },
  request: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  primaryAction: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  why: {
    type: String,
    trim: true,
    maxlength: 600,
    default: '',
  },
  confidence: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
    default: 'UNKNOWN',
  },
  requiresApproval: { type: Boolean, default: false },
  sources: [{
    type: { type: String, maxlength: 40 },
    id: { type: String, maxlength: 64 },
    title: { type: String, maxlength: 160 },
  }],
  fingerprint: {
    type: String,
    trim: true,
    maxlength: 64,
    index: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACCEPTED', 'REJECTED', 'OVERRIDDEN', 'EXPIRED'],
    default: 'ACTIVE',
    index: true,
  },
  feedback: {
    type: String,
    enum: ['helpful', 'not_helpful', 'wrong', null],
    default: null,
  },
  overrideNote: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true })

intelligenceDecisionSchema.index({ userId: 1, createdAt: -1 })
intelligenceDecisionSchema.index({ userId: 1, fingerprint: 1, createdAt: -1 })

module.exports = mongoose.model('IntelligenceDecision', intelligenceDecisionSchema)
