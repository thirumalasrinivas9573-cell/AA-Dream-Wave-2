const mongoose = require('mongoose')

const intelligenceRecommendationStateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fingerprint: { type: String, required: true, trim: true, maxlength: 128 },
  dismissedAt: { type: Date, default: null },
  feedback: { type: String, enum: ['helpful', 'not_relevant', null], default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true })

intelligenceRecommendationStateSchema.index({ studentId: 1, fingerprint: 1 }, { unique: true })
intelligenceRecommendationStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('IntelligenceRecommendationState', intelligenceRecommendationStateSchema)
