const mongoose = require('mongoose')
const { FUNDING_TYPES, FUNDING_STATUSES } = require('../constants/institutionIncubation')

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const institutionFundingRecordSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStartup',
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchProject',
      default: null,
    },
    fundingType: { type: String, enum: FUNDING_TYPES, required: true, index: true },
    fundingSource: { type: String, trim: true, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: 'INR' },
    status: { type: String, enum: FUNDING_STATUSES, default: 'proposed', index: true },
    purpose: { type: String, trim: true, default: '' },
    fundingDate: { type: Date, default: null },
    documents: [documentSchema],
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionInvestor',
      default: null,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionFundingRecordSchema.index({ institutionId: 1, status: 1 })

module.exports = mongoose.model('InstitutionFundingRecord', institutionFundingRecordSchema)
