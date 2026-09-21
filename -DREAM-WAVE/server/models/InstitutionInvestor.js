const mongoose = require('mongoose')
const { INVESTOR_TYPES, INVESTOR_STATUSES } = require('../constants/institutionIncubation')

const institutionInvestorSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    investorType: { type: String, enum: INVESTOR_TYPES, required: true, index: true },
    organization: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    preferredSectors: [{ type: String, trim: true }],
    preferredStages: [{ type: String, trim: true }],
    investmentInterests: { type: String, trim: true, default: '' },
    minTicketSize: { type: Number, default: null },
    maxTicketSize: { type: Number, default: null },
    connectedStartupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionStartup' }],
    status: { type: String, enum: INVESTOR_STATUSES, default: 'active', index: true },
    notes: { type: String, trim: true, default: '' },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionInvestorSchema.index({ institutionId: 1, name: 1 })
institutionInvestorSchema.index({ name: 'text', organization: 'text' })

module.exports = mongoose.model('InstitutionInvestor', institutionInvestorSchema)
