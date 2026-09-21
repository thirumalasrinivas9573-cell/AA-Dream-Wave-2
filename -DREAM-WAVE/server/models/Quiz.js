const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    questions: [
      {
        question: String,
        options: [String],
        answer: String,
        explanation: String,
      },
    ],
    attempts: [
      {
        score: Number,
        total: Number,
        answers: [String],
        takenAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

quizSchema.index({ user: 1, createdAt: -1 });
quizSchema.index({ organizationId: 1, user: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
