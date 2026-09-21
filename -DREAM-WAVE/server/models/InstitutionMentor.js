const mongoose = require('mongoose')
const { MENTOR_TYPES, MENTOR_STATUSES } = require('../constants/institutionIncubation')

const institutionMentorSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    mentorType: { type: String, enum: MENTOR_TYPES, required: true, index: true },
    organization: { type: String, trim: true, default: '' },
    expertise: [{ type: String, trim: true }],
    experience: { type: String, trim: true, default: '' },
    mentoringDomains: [{ type: String, trim: true }],
    availability: { type: String, trim: true, default: '' },
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedStartupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionStartup' }],
    assignedProjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionResearchProject' }],
    status: { type: String, enum: MENTOR_STATUSES, default: 'active', index: true },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionMentorSchema.index({ institutionId: 1, email: 1 })
institutionMentorSchema.index({ name: 'text', expertise: 'text' })

module.exports = mongoose.model('InstitutionMentor', institutionMentorSchema)
