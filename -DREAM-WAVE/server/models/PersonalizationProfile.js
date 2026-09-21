const mongoose = require('mongoose');

const personalizationProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    interests: [
      {
        topic: { type: String, maxlength: 120 },
        weight: { type: Number, default: 1, min: 0, max: 100 },
        source: { type: String, default: 'inferred', maxlength: 40 },
      },
    ],
    skills: [
      {
        name: { type: String, maxlength: 120 },
        mastery: { type: Number, default: 0, min: 0, max: 100 },
        trend: { type: String, enum: ['up', 'flat', 'down'], default: 'flat' },
      },
    ],
    behaviour: {
      avgSessionMinutes: { type: Number, default: 0, min: 0 },
      preferredHour: { type: Number, default: 10, min: 0, max: 23 },
      preferredDays: [{ type: Number, min: 0, max: 6 }],
      completionRate: { type: Number, default: 0, min: 0, max: 100 },
      explorationVsFocus: {
        type: String,
        enum: ['explore', 'balanced', 'focus'],
        default: 'balanced',
      },
      lastActiveAt: { type: Date, default: null },
    },
    preferences: {
      contentTypes: [{ type: String, maxlength: 40 }],
      learningStyle: { type: String, default: 'mixed', maxlength: 40 },
      pace: { type: String, default: 'moderate', maxlength: 40 },
      difficulty: { type: String, default: 'adaptive', maxlength: 40 },
      mentorTone: {
        type: String,
        enum: ['supportive', 'direct', 'socratic', 'coach'],
        default: 'supportive',
      },
      dashboardLayout: {
        type: String,
        enum: ['balanced', 'learning', 'career', 'productivity'],
        default: 'balanced',
      },
    },
    engagement: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      streakDays: { type: Number, default: 0, min: 0 },
      modulesUsed: [{ type: String, maxlength: 40 }],
      lastModules: [{ type: String, maxlength: 40 }],
      sessions7d: { type: Number, default: 0, min: 0 },
      events7d: { type: Number, default: 0, min: 0 },
    },
    privacy: {
      personalizationEnabled: { type: Boolean, default: true },
      shareWithOrg: { type: Boolean, default: false },
      useCrossModuleData: { type: Boolean, default: true },
      useBehaviourTracking: { type: Boolean, default: true },
      allowMentorContext: { type: Boolean, default: true },
      allowRecommendations: { type: Boolean, default: true },
      consentVersion: { type: String, default: '1.0', maxlength: 20 },
      consentedAt: { type: Date, default: null },
    },
    sync: {
      learning: { type: Number, default: 0, min: 0, max: 100 },
      career: { type: Number, default: 0, min: 0, max: 100 },
      research: { type: Number, default: 0, min: 0, max: 100 },
      reading: { type: Number, default: 0, min: 0, max: 100 },
      animation: { type: Number, default: 0, min: 0, max: 100 },
      productivity: { type: Number, default: 0, min: 0, max: 100 },
      community: { type: Number, default: 0, min: 0, max: 100 },
      lastSyncedAt: { type: Date, default: null },
    },
    nextBest: {
      action: { type: String, default: '', maxlength: 240 },
      lesson: { type: String, default: '', maxlength: 200 },
      book: { type: String, default: '', maxlength: 200 },
      project: { type: String, default: '', maxlength: 200 },
      animation: { type: String, default: '', maxlength: 200 },
      careerStep: { type: String, default: '', maxlength: 200 },
      reason: { type: String, default: '', maxlength: 400 },
      confidence: { type: Number, default: 0, min: 0, max: 100 },
      computedAt: { type: Date, default: null },
    },
    lastRefreshedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

personalizationProfileSchema.index({ organizationId: 1, user: 1 });
personalizationProfileSchema.index({ 'engagement.score': -1 });
personalizationProfileSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('PersonalizationProfile', personalizationProfileSchema);
