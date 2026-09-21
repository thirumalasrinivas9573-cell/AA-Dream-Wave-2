const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, maxlength: 2000 },
    options: [{ type: String, maxlength: 500 }],
    answer: { type: String, required: true, maxlength: 500 },
    explanation: { type: String, default: '', maxlength: 2000 },
    tags: [{ type: String, maxlength: 40 }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { _id: true }
);

const lmsQuizSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsModule', default: null },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsLesson', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    questionBank: [questionSchema],
    randomCount: { type: Number, default: 0, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 3, min: 1, max: 20 },
    passPercent: { type: Number, default: 60, min: 0, max: 100 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  },
  { timestamps: true }
);

lmsQuizSchema.index({ course: 1, status: 1 });

const lmsQuizAttemptSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsQuiz', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId }],
    answers: [{ type: String, maxlength: 500 }],
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    takenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

lmsQuizAttemptSchema.index({ quiz: 1, user: 1, takenAt: -1 });

module.exports = {
  LmsQuiz: mongoose.model('LmsQuiz', lmsQuizSchema),
  LmsQuizAttempt: mongoose.model('LmsQuizAttempt', lmsQuizAttemptSchema),
};
