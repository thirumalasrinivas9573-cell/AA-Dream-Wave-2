const mongoose = require('mongoose')
const { READINESS_DIMENSIONS } = require('../constants/careerReadiness')

const careerReadinessSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, default: '' },
    dimensions: [{
      key: { type: String, enum: READINESS_DIMENSIONS },
      score: { type: Number, min: 0, max: 100, default: null },
      label: { type: String, default: '' },
      explanation: { type: String, default: '' },
      insufficientData: { type: Boolean, default: false },
    }],
    overallLabel: { type: String, default: 'PREPARATION_SIGNALS' },
    topGaps: [{ skill: String, level: String, explanation: String }],
    nextActions: [{ order: Number, action: String, reason: String }],
    changeSummary: { type: String, default: '' },
    timeline: [{ event: String, description: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
)

careerReadinessSnapshotSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('CareerReadinessSnapshot', careerReadinessSnapshotSchema)
