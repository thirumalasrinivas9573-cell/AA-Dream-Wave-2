const mongoose = require('mongoose')

const searchIndexEntrySchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    tenantRole: { type: String, enum: ['student', 'institution', 'company', 'system'], default: 'student' },
    sourceType: { type: String, required: true, index: true },
    sourceId: { type: String, default: '', index: true },
    title: { type: String, default: '' },
    chunkText: { type: String, required: true },
    section: { type: String, default: '' },
    page: { type: Number, default: null },
    visibility: { type: String, enum: ['public', 'private', 'institution'], default: 'private', index: true },
    authority: { type: Number, default: 60 },
    embedding: { type: [Number], default: null, select: false },
    indexVersion: { type: Number, default: 1 },
    keywords: [{ type: String }],
  },
  { timestamps: true },
)

searchIndexEntrySchema.index({ ownerUserId: 1, sourceType: 1, sourceId: 1 })
searchIndexEntrySchema.index({ chunkText: 'text', title: 'text' })

module.exports = mongoose.model('SearchIndexEntry', searchIndexEntrySchema)
