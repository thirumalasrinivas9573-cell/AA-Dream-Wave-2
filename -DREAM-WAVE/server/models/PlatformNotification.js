const mongoose = require('mongoose')
const { NOTIFICATION_TYPES } = require('../constants/partnership')

const platformNotificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['institution', 'company', 'student'],
      required: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: '' },
    read: { type: Boolean, default: false, index: true },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionCompanyPartnership',
      default: null,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

platformNotificationSchema.index({ recipientUserId: 1, createdAt: -1 })
platformNotificationSchema.index({ recipientUserId: 1, read: 1 })
platformNotificationSchema.index({ recipientUserId: 1, type: 1 })
platformNotificationSchema.index({ 'metadata.idempotencyKey': 1 }, { sparse: true })

module.exports = mongoose.model('PlatformNotification', platformNotificationSchema)
