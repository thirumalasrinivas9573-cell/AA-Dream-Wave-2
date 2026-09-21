const mongoose = require('mongoose')
const { INSTITUTION_ROLES } = require('../constants/institutionPermissions')

const institutionMemberSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: INSTITUTION_ROLES,
      default: 'VIEWER',
    },
    active: { type: Boolean, default: true },
    invitedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

institutionMemberSchema.index({ institutionId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('InstitutionMember', institutionMemberSchema)
