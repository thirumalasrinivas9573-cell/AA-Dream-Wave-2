const mongoose = require('mongoose')

/** Saved filter configuration only — never duplicates student records */
const institutionSavedFilterSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    filterConfig: { type: mongoose.Schema.Types.Mixed, required: true },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionSavedFilterSchema.index({ institutionId: 1, name: 1 })

module.exports = mongoose.model('InstitutionSavedFilter', institutionSavedFilterSchema)
