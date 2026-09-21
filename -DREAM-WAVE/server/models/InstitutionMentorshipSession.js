const mongoose = require('mongoose')
const { SESSION_STATUSES, SESSION_TYPES } = require('../constants/institutionIncubation')

const actionItemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true, required: true },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
)

const institutionMentorshipSessionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStartup',
      required: true,
      index: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionMentor',
      required: true,
      index: true,
    },
    sessionType: { type: String, enum: SESSION_TYPES, default: 'general' },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, trim: true, default: '' },
    durationMinutes: { type: Number, default: 60 },
    status: { type: String, enum: SESSION_STATUSES, default: 'scheduled', index: true },
    goals: [{ type: String, trim: true }],
    meetingNotes: { type: String, trim: true, default: '' },
    actionItems: [actionItemSchema],
    feedback: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionMentorshipSessionSchema.index({ institutionId: 1, scheduledDate: 1 })

module.exports = mongoose.model('InstitutionMentorshipSession', institutionMentorshipSessionSchema)
