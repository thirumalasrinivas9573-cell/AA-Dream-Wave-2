const mongoose = require('mongoose')

const citationSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource' },
  sourceTitle: { type: String, trim: true, maxlength: 300, default: '' },
  excerpt: { type: String, trim: true, maxlength: 500, default: '' },
  chunkOrder: { type: Number, min: 0 },
  confidence: { type: String, enum: ['high', 'medium', 'low', 'uncertain'], default: 'uncertain' },
}, { _id: true })

const researchClaimSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['draft', 'verified', 'disputed'], default: 'draft' },
  citations: [citationSchema],
  aiSuggested: { type: Boolean, default: false },
}, { timestamps: true })

researchClaimSchema.index({ studentId: 1, projectId: 1, updatedAt: -1 })

module.exports = mongoose.model('ResearchClaim', researchClaimSchema)
