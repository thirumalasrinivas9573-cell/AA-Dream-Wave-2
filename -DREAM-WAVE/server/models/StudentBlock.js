const mongoose = require('mongoose')

const studentBlockSchema = new mongoose.Schema(
  {
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

studentBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true })

module.exports = mongoose.model('StudentBlock', studentBlockSchema)
