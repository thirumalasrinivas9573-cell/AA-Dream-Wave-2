const mongoose = require('mongoose')
const { MINIMUM_PASSING_PERCENTAGE } = require('../config/progression')

const submittedAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedIndex: { type: Number, min: 0, max: 3, default: null },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
)

const examAttemptSchema = new mongoose.Schema(
  {
    attemptNumber: { type: Number, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    passed: { type: Boolean, required: true },
    submittedAnswers: [submittedAnswerSchema],
    startedAt: { type: Date, default: Date.now },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

/**
 * SECURITY NOTE:
 * correctIndex and explanation have select: false so they are NEVER leaked to
 * the client during exam delivery. They must be explicitly selected server-side
 * via .select('+questions.correctIndex +questions.explanation') during grading.
 */
const examQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: [
        (val) => Array.isArray(val) && val.length === 4,
        'Question must have exactly 4 options.',
      ],
      required: true,
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      select: false,
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
  },
  { _id: false },
)

/**
 * EXAM LIFECYCLE & RETAKE RULE:
 * Retakes must REGENERATE or SHUFFLE questions so students cannot memorize answers.
 * When an attempt fails and reverts to learning, a subsequent exam start must produce
 * a fresh or shuffled question bank before reactivation.
 */
const taskExamSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'HARD',
    },
    passingPercentage: {
      type: Number,
      min: 1,
      max: 100,
      default: MINIMUM_PASSING_PERCENTAGE,
    },
    questions: [examQuestionSchema],
    status: {
      type: String,
      enum: ['active', 'submitted', 'abandoned'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    attempts: [examAttemptSchema],
  },
  { timestamps: true },
)

taskExamSchema.index({ taskId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('TaskExam', taskExamSchema)
