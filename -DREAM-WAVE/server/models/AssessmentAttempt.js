const mongoose = require('mongoose')
const { QUIZ_TYPES } = require('../constants/adaptiveLearning')

const answerSchema = new mongoose.Schema(
  {
    questionId: String,
    questionText: String,
    userAnswer: String,
    correctAnswer: String,
    result: { type: String, enum: ['correct', 'partial', 'incorrect', 'ungraded'], default: 'ungraded' },
    explanation: String,
    conceptGap: String,
  },
  { _id: false },
)

const assessmentAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudySession', default: null },
    skillId: { type: String, default: '' },
    skillName: { type: String, default: '' },
    topic: { type: String, default: '' },
    quizType: { type: String, enum: QUIZ_TYPES, default: 'MCQ' },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    score: { type: Number, default: null, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    answers: [answerSchema],
    weakAreas: [{ skill: String, topic: String, errorType: String }],
    errorAnalysis: [{ type: String }],
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

assessmentAttemptSchema.index({ userId: 1, skillId: 1, completedAt: -1 })

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema)
