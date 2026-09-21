const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 400 },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const adaptiveProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'adaptive'],
      default: 'adaptive',
      index: true,
    },
    detectedDifficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging'],
      default: 'moderate',
    },
    learningSpeed: {
      type: String,
      enum: ['slow', 'moderate', 'fast'],
      default: 'moderate',
    },
    speedScore: { type: Number, default: 50, min: 0, max: 100 },
    dailyGoalMinutes: { type: Number, default: 30, min: 5, max: 480 },
    dailyGoalTopics: { type: Number, default: 1, min: 1, max: 20 },
    weeklyFocus: { type: String, default: '', maxlength: 160 },
    currentPath: [
      {
        topic: { type: String, maxlength: 160 },
        kind: { type: String, default: 'topic', maxlength: 40 },
        difficulty: { type: String, default: 'moderate', maxlength: 40 },
        order: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
      },
    ],
    lessonSequence: [
      {
        title: { type: String, maxlength: 200 },
        topic: { type: String, maxlength: 160 },
        resourceType: { type: String, maxlength: 40 },
        resourceId: { type: String, maxlength: 64 },
        order: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
      },
    ],
    streak: {
      current: { type: Number, default: 0, min: 0 },
      longest: { type: Number, default: 0, min: 0 },
      lastActiveDate: { type: String, default: '', maxlength: 16 },
    },
    achievements: { type: [achievementSchema], default: [] },
    stats: {
      topicsCompleted: { type: Number, default: 0, min: 0 },
      chaptersCompleted: { type: Number, default: 0, min: 0 },
      skillsCompleted: { type: Number, default: 0, min: 0 },
      coursesCompleted: { type: Number, default: 0, min: 0 },
      animationsCompleted: { type: Number, default: 0, min: 0 },
      quizzesTaken: { type: Number, default: 0, min: 0 },
      avgQuizScore: { type: Number, default: 0, min: 0, max: 100 },
      lastComputedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

adaptiveProfileSchema.index({ organizationId: 1, user: 1 });

module.exports = mongoose.model('AdaptiveProfile', adaptiveProfileSchema);
