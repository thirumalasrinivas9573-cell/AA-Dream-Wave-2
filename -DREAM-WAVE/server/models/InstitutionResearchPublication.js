const mongoose = require('mongoose')
const { PUBLICATION_TYPES } = require('../constants/institutionResearch')

const institutionResearchPublicationSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionResearchProject',
      default: null,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    publicationType: { type: String, enum: PUBLICATION_TYPES, default: 'journal', index: true },
    authors: [{ type: String, trim: true }],
    journalOrVenue: { type: String, trim: true, default: '' },
    year: { type: Number, default: null },
    doi: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    abstract: { type: String, trim: true, default: '' },
    isConfidential: { type: Boolean, default: false },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionResearchPublicationSchema.index({ institutionId: 1, publicationType: 1 })
institutionResearchPublicationSchema.index({ title: 'text', abstract: 'text' })

module.exports = mongoose.model('InstitutionResearchPublication', institutionResearchPublicationSchema)
