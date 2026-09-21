const mongoose = require('mongoose')

const opportunitySnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    snapshotHash: { type: String, default: '' },
    fields: {
      title: String,
      requiredSkills: [String],
      preferredSkills: [String],
      deadline: Date,
      status: String,
      description: String,
    },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

opportunitySnapshotSchema.index({ userId: 1, source: 1, sourceId: 1 }, { unique: true })

module.exports = mongoose.model('OpportunitySnapshot', opportunitySnapshotSchema)
