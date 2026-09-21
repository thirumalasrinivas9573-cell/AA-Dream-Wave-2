const mongoose = require('mongoose')
const { COLLABORATION_STATUSES } = require('../constants/community')

const collaborationRequestSchema = new mongoose.Schema(
  {
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    linkedEntityType: { type: String, default: '' },
    linkedEntityId: { type: String, default: '' },
    message: { type: String, trim: true, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: COLLABORATION_STATUSES,
      default: 'pending',
      index: true,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

collaborationRequestSchema.index(
  { requesterUserId: 1, targetUserId: 1, postId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
)

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema)
