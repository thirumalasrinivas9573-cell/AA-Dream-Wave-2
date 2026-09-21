const mongoose = require('mongoose')

/**
 * Lightweight audit for memory lifecycle (no sensitive content payloads).
 */
const memoryAuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  memoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentMemory',
    index: true,
  },
  action: {
    type: String,
    enum: [
      'created', 'updated', 'archived', 'deleted', 'superseded', 'restored', 'expired',
      'confirmed', 'proposed', 'used', 'outdated',
    ],
    required: true,
  },
  type: { type: String, trim: true, maxlength: 40 },
  source: { type: String, trim: true, maxlength: 40 },
  // Content hash only — never store full memory text in logs
  contentHash: { type: String, maxlength: 64 },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: { createdAt: true, updatedAt: false } })

memoryAuditLogSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('MemoryAuditLog', memoryAuditLogSchema)
