const mongoose = require('mongoose')
const { VOLUNTEER_ROLES } = require('../constants/institutionAlumniExtended')

const institutionAlumniVolunteerRecordSchema = new mongoose.Schema(
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
    volunteerRole: { type: String, enum: VOLUNTEER_ROLES, required: true, index: true },
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumniEvent', default: null },
    eventTitle: { type: String, trim: true, default: '' },
    participationDate: { type: Date, default: null, index: true },
    hoursContributed: { type: Number, default: 0 },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'completed', index: true },
    impactNotes: { type: String, trim: true, default: '' },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('InstitutionAlumniVolunteerRecord', institutionAlumniVolunteerRecordSchema)
