const mongoose = require('mongoose')
const { REPORT_REASONS } = require('../constants/community')

const communityReportSchema = new mongoose.Schema(
  {
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    detail: { type: String, trim: true, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true },
)

communityReportSchema.index({ reporterUserId: 1, postId: 1 }, { unique: true })

module.exports = mongoose.model('CommunityReport', communityReportSchema)
