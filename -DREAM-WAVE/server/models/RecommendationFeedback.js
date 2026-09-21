const mongoose = require('mongoose')
const { FEEDBACK_TYPES } = require('../constants/contextPersonalization')

const recommendationFeedbackSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recommendationKey: { type: String, required: true, index: true },
    recommendationType: { type: String, default: '' },
    feedback: { type: String, enum: FEEDBACK_TYPES, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

recommendationFeedbackSchema.index({ ownerUserId: 1, recommendationKey: 1, createdAt: -1 })

module.exports = mongoose.model('RecommendationFeedback', recommendationFeedbackSchema)
