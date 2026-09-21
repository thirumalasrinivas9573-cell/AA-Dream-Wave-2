const mongoose = require('mongoose');

const learningProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'],
      default: 'mixed',
      index: true,
    },
    styleScores: {
      visual: { type: Number, default: 25, min: 0, max: 100 },
      auditory: { type: Number, default: 25, min: 0, max: 100 },
      reading: { type: Number, default: 25, min: 0, max: 100 },
      kinesthetic: { type: Number, default: 25, min: 0, max: 100 },
    },
    preferredPace: {
      type: String,
      enum: ['slow', 'moderate', 'fast'],
      default: 'moderate',
    },
    strengths: [
      {
        skill: { type: String, maxlength: 120 },
        score: { type: Number, min: 0, max: 100, default: 0 },
        evidence: { type: String, maxlength: 400, default: '' },
      },
    ],
    weaknesses: [
      {
        skill: { type: String, maxlength: 120 },
        score: { type: Number, min: 0, max: 100, default: 0 },
        evidence: { type: String, maxlength: 400, default: '' },
      },
    ],
    focusAreas: [{ type: String, maxlength: 120 }],
    careerGoal: { type: String, default: '', maxlength: 160 },
    assessmentHistory: [
      {
        type: { type: String, maxlength: 40 },
        score: { type: Number, min: 0, max: 100, default: 0 },
        summary: { type: String, maxlength: 1000, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    lastAssessedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

learningProfileSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('LearningProfile', learningProfileSchema);
