const mongoose = require('mongoose')

const TOPIC_STATUSES = ['NOT_STARTED', 'LEARNING', 'PRACTICING', 'COMPLETED', 'NEEDS_REVISION']

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  order: { type: Number, min: 1, default: 1 },
  status: { type: String, enum: TOPIC_STATUSES, default: 'NOT_STARTED' },
  conceptIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicConcept' }],
}, { _id: true })

const unitSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  order: { type: Number, min: 1, default: 1 },
  topics: [topicSchema],
}, { _id: true })

const academicSubjectSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  periodId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  code: { type: String, trim: true, maxlength: 40, default: '' },
  credits: { type: Number, min: 0, max: 30 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  syllabusSource: { type: String, enum: ['manual', 'upload', 'institution', 'ai_proposed'], default: 'manual' },
  syllabusDocumentHash: { type: String, trim: true, maxlength: 128 },
  units: [unitSchema],
}, { timestamps: true })

academicSubjectSchema.index({ studentId: 1, status: 1, updatedAt: -1 })
academicSubjectSchema.index({ studentId: 1, name: 1 })

module.exports = mongoose.model('AcademicSubject', academicSubjectSchema)
module.exports.TOPIC_STATUSES = TOPIC_STATUSES
