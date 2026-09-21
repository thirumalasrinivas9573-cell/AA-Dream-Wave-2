const mongoose = require('mongoose')

const searchQuerySchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, required: true },
    intent: { type: String, default: 'GENERAL_KNOWLEDGE' },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    saved: { type: Boolean, default: false },
    resultCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

searchQuerySchema.index({ ownerUserId: 1, saved: 1, createdAt: -1 })
searchQuerySchema.index({ ownerUserId: 1, createdAt: -1 })

module.exports = mongoose.model('SearchQuery', searchQuerySchema)
