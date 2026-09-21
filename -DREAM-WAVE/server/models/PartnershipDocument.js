const mongoose = require('mongoose')
const { DOCUMENT_TYPES, DOCUMENT_STATUSES } = require('../constants/partnership')

const partnershipDocumentSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['institution', 'company'],
      required: true,
    },
    fileUrl: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    expiryDate: { type: Date, default: null },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: 'active',
    },
    isPrivate: { type: Boolean, default: true },
  },
  { timestamps: true },
)

partnershipDocumentSchema.index({ partnershipId: 1, type: 1 })

module.exports = mongoose.model('PartnershipDocument', partnershipDocumentSchema)
