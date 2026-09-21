const mongoose = require('mongoose')
const { FEEDBACK_ACTIONS } = require('../constants/opportunityMatching')

const opportunityMatchFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, required: true, trim: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, enum: FEEDBACK_ACTIONS, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

opportunityMatchFeedbackSchema.index({ userId: 1, source: 1, sourceId: 1, action: 1 })

module.exports = mongoose.model('OpportunityMatchFeedback', opportunityMatchFeedbackSchema)
