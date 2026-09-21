const mongoose = require('mongoose')

const NOTE_TYPES = ['personal', 'summary', 'formula', 'revision', 'important_question', 'resource_link']

const academicNoteSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSubject', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId },
  topicId: { type: mongoose.Schema.Types.ObjectId },
  conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicConcept' },
  type: { type: String, enum: NOTE_TYPES, default: 'personal' },
  title: { type: String, trim: true, maxlength: 200, default: '' },
  content: { type: String, trim: true, maxlength: 20000, default: '' },
  lectureDate: { type: String, trim: true, maxlength: 20 },
  resourceUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  aiSummary: { type: String, trim: true, maxlength: 4000, default: '' },
}, { timestamps: true })

academicNoteSchema.index({ studentId: 1, subjectId: 1, updatedAt: -1 })

module.exports = mongoose.model('AcademicNote', academicNoteSchema)
module.exports.NOTE_TYPES = NOTE_TYPES
