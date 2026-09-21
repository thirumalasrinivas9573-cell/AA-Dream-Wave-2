const mongoose = require('mongoose')
const {
  RELATIONSHIP_TYPES,
  PARTNERSHIP_STATUSES,
  REQUEST_STATUSES,
  INITIATOR_TYPES,
} = require('../constants/partnership')

const institutionCompanyPartnershipSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: PARTNERSHIP_STATUSES,
      default: 'pending',
      index: true,
    },
    relationshipType: {
      type: String,
      enum: RELATIONSHIP_TYPES,
      required: true,
    },
    initiatedBy: {
      type: String,
      enum: INITIATOR_TYPES,
      required: true,
    },
    initiatorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestStatus: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
    },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    proposedCollaboration: { type: String, trim: true, default: '' },
    contactPerson: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      title: { type: String, trim: true, default: '' },
    },
    startDate: { type: Date, default: null },
    expectedDuration: { type: String, trim: true, default: '' },
    objectives: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    supportingDocuments: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    respondedAt: { type: Date, default: null },
    respondedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    responseMessage: { type: String, trim: true, default: '' },
    /** Foundation refs for future recruitment/internship/drive linking */
    linkedDriveIds: [{ type: String }],
    linkedJobIds: [{ type: String }],
    linkedInternshipIds: [{ type: String }],
    linkedEventIds: [{ type: String }],
    /** Explicit sharing scopes granted when partnership is active */
    sharingScopes: [{ type: String, trim: true }],
    /** Scopes requested at partnership initiation (review on accept) */
    requestedScopes: [{ type: String, trim: true }],
  },
  { timestamps: true },
)

// Prevent duplicate pending/active partnerships between same institution & company
institutionCompanyPartnershipSchema.index(
  { institutionId: 1, companyId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['invited', 'pending', 'active', 'paused'] },
    },
  },
)

institutionCompanyPartnershipSchema.index({ institutionId: 1, status: 1 })
institutionCompanyPartnershipSchema.index({ companyId: 1, status: 1 })
institutionCompanyPartnershipSchema.index({ relationshipType: 1 })

module.exports = mongoose.model(
  'InstitutionCompanyPartnership',
  institutionCompanyPartnershipSchema,
)
