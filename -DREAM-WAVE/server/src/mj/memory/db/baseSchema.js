/**
 * Shared memory document fields for MJ collections
 * @module mj/memory/db/baseSchema
 */

const { EXPIRATION_POLICIES } = require('../constants')

function memoryScoreFields() {
  return {
    importanceScore: { type: Number, default: 0.5, min: 0, max: 1 },
    recencyScore: { type: Number, default: 1, min: 0, max: 1 },
    accessCount: { type: Number, default: 0, min: 0 },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
  }
}

function memoryMetaFields() {
  return {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, index: true, default: null },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [], index: true },
    expirationPolicy: {
      type: String,
      enum: Object.values(EXPIRATION_POLICIES),
      default: EXPIRATION_POLICIES.NEVER,
    },
    expiresAt: { type: Date, default: null, index: true },
    archived: { type: Boolean, default: false, index: true },
    encrypted: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
  }
}

module.exports = { memoryScoreFields, memoryMetaFields }
