const mongoose = require('mongoose')
const { MENTORSHIP_STATUSES } = require('../constants/institutionAlumni')

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, trim: true, default: '' },
    fromRole: { type: String, enum: ['student', 'alumni', 'institution'], default: 'student' },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const institutionAlumniMentorshipSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      required: true,
      index: true,
    },
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentName: { type: String, trim: true, default: '' },
    studentDepartment: { type: String, trim: true, default: '' },
    goals: [{ type: String, trim: true }],
    status: { type: String, enum: MENTORSHIP_STATUSES, default: 'requested', index: true },
    requestMessage: { type: String, trim: true, default: '' },
    matchedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    feedback: [feedbackSchema],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionAlumniMentorshipSchema.index({ institutionId: 1, alumniId: 1, studentUserId: 1, status: 1 })

module.exports = mongoose.model('InstitutionAlumniMentorship', institutionAlumniMentorshipSchema)
