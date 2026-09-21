const mongoose = require('mongoose')

const researchSourceChunkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource', required: true, index: true },
  order: { type: Number, min: 0, default: 0 },
  text: { type: String, required: true, maxlength: 2000 },
  contentHash: { type: String, trim: true, maxlength: 64 },
  wordCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true })

researchSourceChunkSchema.index({ sourceId: 1, order: 1 })
researchSourceChunkSchema.index({ projectId: 1, sourceId: 1 })

module.exports = mongoose.model('ResearchSourceChunk', researchSourceChunkSchema)
