const mongoose = require('mongoose')
const { OFFER_STATUSES } = require('../constants/recruitment')

const recruitmentOfferSchema = new mongoose.Schema(
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
      unique: true,
      index: true,
    },
    roleTitle: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    salary: { type: Number, default: 0 },
    benefits: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    joiningDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: 'draft',
      index: true,
    },
    approvedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
    withdrawnReason: { type: String, trim: true, default: '' },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

recruitmentOfferSchema.index({ companyId: 1, status: 1 })

module.exports = mongoose.model('RecruitmentOffer', recruitmentOfferSchema)
