const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 4000, required: true },
  marks: { type: Number, min: 0 },
  questionType: { type: String, trim: true, maxlength: 40, default: 'unknown' },
  section: { type: String, trim: true, maxlength: 80, default: '' },
  topicHints: [{ type: String, trim: true, maxlength: 120 }],
  conceptIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicConcept' }],
  mappingConfidence: { type: String, enum: ['high', 'medium', 'low', 'uncertain'], default: 'uncertain' },
}, { _id: true })

const questionPaperSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSubject', required: true, index: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicExam' },
  title: { type: String, trim: true, maxlength: 200, default: 'Question Paper' },
  yearLabel: { type: String, trim: true, maxlength: 20, default: '' },
  fileUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  fileHash: { type: String, trim: true, maxlength: 128, index: true },
  rawText: { type: String, maxlength: 200000, default: '' },
  questions: [questionSchema],
  analysis: {
    topicFrequency: { type: mongoose.Schema.Types.Mixed, default: {} },
    conceptFrequency: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedAt: Date,
  },
  extractionStatus: { type: String, enum: ['pending', 'parsed', 'failed'], default: 'pending' },
}, { timestamps: true })

questionPaperSchema.index({ studentId: 1, subjectId: 1, updatedAt: -1 })

module.exports = mongoose.model('QuestionPaper', questionPaperSchema)
