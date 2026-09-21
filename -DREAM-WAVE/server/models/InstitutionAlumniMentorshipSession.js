const mongoose = require('mongoose')
const { MENTORSHIP_SESSION_STATUSES } = require('../constants/institutionAlumni')

const institutionAlumniMentorshipSessionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    mentorshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumniMentorship',
      required: true,
      index: true,
    },
    alumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      required: true,
      index: true,
    },
    scheduledDate: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60 },
    status: { type: String, enum: MENTORSHIP_SESSION_STATUSES, default: 'scheduled', index: true },
    goals: [{ type: String, trim: true }],
    notes: { type: String, trim: true, default: '' },
    feedback: { type: String, trim: true, default: '' },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('InstitutionAlumniMentorshipSession', institutionAlumniMentorshipSessionSchema)
