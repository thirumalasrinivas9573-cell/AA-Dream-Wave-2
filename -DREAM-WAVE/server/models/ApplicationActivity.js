const mongoose = require('mongoose')
const { ACTIVITY_TYPES } = require('../constants/recruitment')

const applicationActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentApplication',
      required: true,
      index: true,
    },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    previousState: { type: String, default: null },
    newState: { type: String, default: null },
    isInternal: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

applicationActivitySchema.index({ applicationId: 1, createdAt: -1 })

module.exports = mongoose.model('ApplicationActivity', applicationActivitySchema)
