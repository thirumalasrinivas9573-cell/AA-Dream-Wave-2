const mongoose = require('mongoose')
const { GROUP_MEMBERSHIP_STATUSES } = require('../constants/institutionAlumniExtended')

const institutionAlumniGroupMembershipRequestSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumniGroup',
      required: true,
      index: true,
    },
    alumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni', default: null },
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    status: { type: String, enum: GROUP_MEMBERSHIP_STATUSES, default: 'pending', index: true },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

institutionAlumniGroupMembershipRequestSchema.index({ groupId: 1, requesterUserId: 1 }, { unique: true })

module.exports = mongoose.model(
  'InstitutionAlumniGroupMembershipRequest',
  institutionAlumniGroupMembershipRequestSchema,
)
