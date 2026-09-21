const mongoose = require('mongoose')
const { FOLLOW_TARGET_TYPES } = require('../constants/community')

const communityFollowSchema = new mongoose.Schema(
  {
    followerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: FOLLOW_TARGET_TYPES,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
)

communityFollowSchema.index({ followerUserId: 1, targetType: 1, targetId: 1 }, { unique: true })
communityFollowSchema.index({ targetType: 1, targetId: 1 })

module.exports = mongoose.model('CommunityFollow', communityFollowSchema)
