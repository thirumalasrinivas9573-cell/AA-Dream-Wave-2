const mongoose = require('mongoose')

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'moderator', 'owner'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const learningGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    topic: { type: String, default: '', trim: true, maxlength: 80 },
    skills: [{ type: String, trim: true, maxlength: 60 }],
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC', index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [memberSchema],
    memberCount: { type: Number, default: 1 },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true },
)

learningGroupSchema.index({ name: 'text', description: 'text', topic: 'text' })
learningGroupSchema.index({ topic: 1, visibility: 1, createdAt: -1 })

module.exports = mongoose.model('LearningGroup', learningGroupSchema)
