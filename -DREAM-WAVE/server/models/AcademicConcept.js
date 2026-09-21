const mongoose = require('mongoose')

const MASTERY_LEVELS = ['new', 'learning', 'practicing', 'mastered', 'needs_revision']

const academicConceptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSubject', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId },
  topicId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, trim: true, maxlength: 200 },
  prerequisiteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicConcept' }],
  mastery: {
    level: { type: String, enum: MASTERY_LEVELS, default: 'new' },
    lastReviewedAt: Date,
    practiceCount: { type: Number, min: 0, default: 0 },
    errorCount: { type: Number, min: 0, default: 0 },
    revisionDueAt: Date,
  },
}, { timestamps: true })

academicConceptSchema.index({ studentId: 1, subjectId: 1, slug: 1 }, { unique: true })
academicConceptSchema.index({ studentId: 1, 'mastery.level': 1 })

module.exports = mongoose.model('AcademicConcept', academicConceptSchema)
module.exports.MASTERY_LEVELS = MASTERY_LEVELS
