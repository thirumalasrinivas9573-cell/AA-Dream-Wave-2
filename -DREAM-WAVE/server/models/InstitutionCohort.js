const mongoose = require('mongoose')
const { COHORT_TYPES } = require('../constants/institutionStudents')

const institutionCohortSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: COHORT_TYPES, default: 'static' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionStudent' }],
    filterConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionCohortSchema.index({ institutionId: 1, name: 1 })

module.exports = mongoose.model('InstitutionCohort', institutionCohortSchema)
