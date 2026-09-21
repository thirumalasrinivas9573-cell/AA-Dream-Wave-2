const mongoose = require('mongoose')
const { RECOMMENDATION_CATEGORIES } = require('../constants/contextPersonalization')

const dismissedSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: { type: String, default: '' },
    dismissedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const tempContextSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, default: '' },
    source: { type: String, default: 'EXPLICIT_USER' },
    expiresAt: { type: Date, required: true },
  },
  { _id: true },
)

const personalizationPreferenceSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    recommendationCategories: {
      type: Map,
      of: Boolean,
      default: () =>
        Object.fromEntries(RECOMMENDATION_CATEGORIES.map((c) => [c, true])),
    },
    dismissedRecommendations: [dismissedSchema],
    sessionContext: {
      page: { type: String, default: '' },
      entityType: { type: String, default: '' },
      entityId: { type: String, default: '' },
      task: { type: String, default: '' },
      currentInstruction: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
    },
    temporaryContext: [tempContextSchema],
    explicitPreferences: [{
      key: { type: String, required: true },
      value: { type: String, default: '' },
      source: { type: String, default: 'EXPLICIT_USER' },
      updatedAt: { type: Date, default: Date.now },
    }],
    dashboardMode: { type: String, default: 'DEFAULT' },
    lastRefreshedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('PersonalizationPreference', personalizationPreferenceSchema)
