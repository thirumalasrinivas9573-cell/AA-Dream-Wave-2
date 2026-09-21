const mongoose = require('mongoose')
const { INNOVATION_EVENT_TYPES, EVENT_STATUSES } = require('../constants/institutionIncubation')

const hackathonDetailsSchema = new mongoose.Schema(
  {
    teamSizeMin: { type: Number, default: 1, min: 1 },
    teamSizeMax: { type: Number, default: 4, min: 1 },
    submissionDeadline: { type: Date, default: null },
    problemStatements: [{ title: String, description: String }],
    themes: [{ type: String, trim: true }],
    tracks: [{ type: String, trim: true }],
    rules: { type: String, trim: true, default: '' },
    judgingCriteria: [{ name: String, weight: Number }],
    prizes: [{ label: String, description: String }],
    website: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const registrationSchema = new mongoose.Schema(
  {
    registrantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    registrantName: { type: String, trim: true, required: true },
    registrantEmail: { type: String, trim: true, default: '' },
    registrantType: { type: String, trim: true, default: 'student' },
    status: { type: String, enum: ['registered', 'attended', 'no_show', 'cancelled'], default: 'registered' },
    registeredAt: { type: Date, default: Date.now },
    outcomeNotes: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const institutionInnovationEventSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    eventType: { type: String, enum: INNOVATION_EVENT_TYPES, required: true, index: true },
    venue: { type: String, trim: true, default: '' },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
    meetingLink: { type: String, trim: true, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    registrationDeadline: { type: Date, default: null },
    capacity: { type: Number, default: null },
    status: { type: String, enum: EVENT_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    registrations: [registrationSchema],
    outcomes: { type: String, trim: true, default: '' },
    linkedStartupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionStartup' }],
    hackathonDetails: { type: hackathonDetailsSchema, default: null },
    requiredSkills: [{ type: String, trim: true }],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionInnovationEventSchema.index({ institutionId: 1, status: 1 })
institutionInnovationEventSchema.index({ startDate: 1 })
institutionInnovationEventSchema.index({ title: 'text', description: 'text' })

module.exports = mongoose.model('InstitutionInnovationEvent', institutionInnovationEventSchema)
