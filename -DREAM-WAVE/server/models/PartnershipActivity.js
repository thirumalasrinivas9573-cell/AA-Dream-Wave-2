const mongoose = require('mongoose')
const { ACTIVITY_TYPES } = require('../constants/partnership')

const partnershipActivitySchema = new mongoose.Schema(
  {
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionCompanyPartnership',
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
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
    actorRole: {
      type: String,
      enum: ['institution', 'company', 'system'],
      default: 'system',
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

partnershipActivitySchema.index({ partnershipId: 1, createdAt: -1 })

module.exports = mongoose.model('PartnershipActivity', partnershipActivitySchema)
