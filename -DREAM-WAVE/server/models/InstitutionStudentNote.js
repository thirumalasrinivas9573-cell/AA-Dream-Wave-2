const mongoose = require('mongoose')
const { NOTE_TYPES } = require('../constants/institutionPermissions')

/** Institution-only notes — never exposed to student or company APIs */
const institutionStudentNoteSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      required: true,
      index: true,
    },
    content: { type: String, trim: true, required: true, maxlength: 5000 },
    type: { type: String, enum: NOTE_TYPES, default: 'internal' },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('InstitutionStudentNote', institutionStudentNoteSchema)
