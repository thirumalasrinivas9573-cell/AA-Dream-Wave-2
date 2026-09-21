const mongoose = require('mongoose')
const {
  ALUMNI_EVENT_TYPES,
  ALUMNI_EVENT_STATUSES,
  EVENT_REGISTRATION_STATUSES,
} = require('../constants/institutionAlumniExtended')

const speakerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, default: '' },
    alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni', default: null },
  },
  { _id: true },
)

const agendaItemSchema = new mongoose.Schema(
  {
    time: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    speaker: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const registrationSchema = new mongoose.Schema(
  {
    registrantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    registrantAlumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni', default: null },
    registrantName: { type: String, trim: true, required: true },
    registrantEmail: { type: String, trim: true, default: '' },
    registrantType: { type: String, trim: true, default: 'alumni' },
    status: { type: String, enum: EVENT_REGISTRATION_STATUSES, default: 'registered' },
    registeredAt: { type: Date, default: Date.now },
    attendanceNotes: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const institutionAlumniEventSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    eventType: { type: String, enum: ALUMNI_EVENT_TYPES, required: true, index: true },
    organizer: { type: String, trim: true, default: '' },
    organizerAlumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni', default: null },
    venue: { type: String, trim: true, default: '' },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
    onlinePlatform: { type: String, trim: true, default: '' },
    meetingLink: { type: String, trim: true, default: '' },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    registrationDeadline: { type: Date, default: null },
    capacity: { type: Number, default: null },
    status: { type: String, enum: ALUMNI_EVENT_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    speakers: [speakerSchema],
    agenda: [agendaItemSchema],
    registrations: [registrationSchema],
    linkedGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumniGroup', default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

institutionAlumniEventSchema.index({ institutionId: 1, status: 1, startDate: 1 })
institutionAlumniEventSchema.index({ title: 'text', description: 'text' })

module.exports = mongoose.model('InstitutionAlumniEvent', institutionAlumniEventSchema)
