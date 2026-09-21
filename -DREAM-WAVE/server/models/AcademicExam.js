const mongoose = require('mongoose')

const EXAM_TYPES = ['internal', 'midterm', 'semester', 'unit_test', 'practical', 'lab', 'competitive', 'custom']

const academicExamSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSubject', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  examType: { type: String, enum: EXAM_TYPES, default: 'custom' },
  scheduledAt: { type: Date, required: true, index: true },
  coveredUnitIds: [{ type: mongoose.Schema.Types.ObjectId }],
  coveredTopicIds: [{ type: mongoose.Schema.Types.ObjectId }],
  preparationState: { type: String, enum: ['not_started', 'planning', 'in_progress', 'ready'], default: 'not_started' },
  source: { type: String, enum: ['student', 'institution', 'imported'], default: 'student' },
  studyPlanAppliedAt: Date,
}, { timestamps: true })

academicExamSchema.index({ studentId: 1, scheduledAt: 1 })

module.exports = mongoose.model('AcademicExam', academicExamSchema)
module.exports.EXAM_TYPES = EXAM_TYPES
