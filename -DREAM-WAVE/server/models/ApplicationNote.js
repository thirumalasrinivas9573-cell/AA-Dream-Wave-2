const mongoose = require('mongoose')
const { NOTE_TYPES } = require('../constants/recruitment')

/** Company-private recruiter notes — never exposed to student/institution APIs */
const applicationNoteSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentApplication',
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTE_TYPES, default: 'internal' },
    content: { type: String, required: true, trim: true },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPrivate: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('ApplicationNote', applicationNoteSchema)
