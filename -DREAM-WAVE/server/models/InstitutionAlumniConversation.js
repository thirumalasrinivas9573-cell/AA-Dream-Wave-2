const mongoose = require('mongoose')
const { CONVERSATION_TYPES } = require('../constants/institutionAlumniExtended')

const institutionAlumniConversationSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    conversationType: { type: String, enum: CONVERSATION_TYPES, default: 'direct', index: true },
    subject: { type: String, trim: true, default: '' },
    participantUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    participantAlumniIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni' }],
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumniGroup', default: null },
    mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumniMentorship', default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, trim: true, default: '' },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('InstitutionAlumniConversation', institutionAlumniConversationSchema)
