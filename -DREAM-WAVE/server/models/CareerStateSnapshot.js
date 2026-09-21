const mongoose = require('mongoose')

const careerStateSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stateHash: { type: String, default: '' },
    snapshot: {
      targetRole: String,
      careerGoal: String,
      skillCount: Number,
      gapCount: Number,
      projectCount: Number,
      applicationCount: Number,
      interviewCount: Number,
    },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

careerStateSnapshotSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('CareerStateSnapshot', careerStateSnapshotSchema)
