const mongoose = require('mongoose')
const { ASSESSMENT_TYPES, ASSESSMENT_STATUSES } = require('../constants/recruitment')

const applicationAssessmentSchema = new mongoose.Schema(
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
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ASSESSMENT_TYPES, required: true },
    scheduledDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ASSESSMENT_STATUSES,
      default: 'scheduled',
    },
    score: { type: Number, default: null },
    result: { type: String, trim: true, default: '' },
    reviewerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

module.exports = mongoose.model('ApplicationAssessment', applicationAssessmentSchema)
