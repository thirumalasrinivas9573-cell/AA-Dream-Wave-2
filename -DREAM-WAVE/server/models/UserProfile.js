const mongoose = require('mongoose')

// Stores personalization data that makes AI responses adaptive per user
const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // Tone preference -- affects all AI agent responses
  tone: {
    type: String,
    enum: ['motivational', 'strict', 'calm', 'friendly'],
    default: 'calm',
  },

  // User-declared interests (used to personalize suggestions)
  interests: [{ type: String, trim: true }],

  // Career context
  currentRole:  { type: String, default: '' },
  targetRole:   { type: String, default: '' },
  skills:       [{ type: String, trim: true }],

  // AI-generated summary of the user's behavior/history (updated periodically)
  historySummary: { type: String, default: '' },

  // ── Progress tracking ─────────────────────────────────────────────────────
  consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
  focusScore:       { type: Number, default: 50, min: 0, max: 100 },
  lastActivity:     { type: Date, default: null },
  dailyStreak:      { type: Number, default: 0 },
  progressHistory:  [{
    date:             { type: Date, default: Date.now },
    consistencyScore: Number,
    focusScore:       Number,
    aiChats:          Number,
  }],

  // ── AI Analytics (self-improving system) ─────────────────────────────────
  aiAnalytics: {
    mostAskedTopics:      [{ type: String }],
    totalQuestions:       { type: Number, default: 0 },
    goalAlignedQuestions: { type: Number, default: 0 },
    lastWeekActivity:     { type: Number, default: 0 },
  },

  // ── User Intelligence ─────────────────────────────────────────────────────
  engagementLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  improvementRate: { type: Number, default: 0 },  // % improvement over time
  usage: {
    mentorChats:      { type: Number, default: 0 },
    productivityChats:{ type: Number, default: 0 },
    researchChats:    { type: Number, default: 0 },
    careerChats:      { type: Number, default: 0 },
    resumeBuilds:     { type: Number, default: 0 },
    roadmapBuilds:    { type: Number, default: 0 },
  },

  // Notification preferences (+ Personal AI Operating Layer V4 P3)
  notifications: {
    dailyNudge:    { type: Boolean, default: true },
    weeklyReport:  { type: Boolean, default: true },
    proactiveIntelligence: { type: Boolean, default: true },
    deadlineReminders: { type: Boolean, default: true },
    opportunityAlerts: { type: Boolean, default: true },
    quietHoursEnabled: { type: Boolean, default: false },
    quietHoursStart: { type: Number, min: 0, max: 23, default: 22 },
    quietHoursEnd: { type: Number, min: 0, max: 23, default: 7 },
    recommendationFrequency: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
  },

  // ── V2 Intelligence Core ────────────────────────────────────────────────────
  preferredTopics: [{ type: String, trim: true }],
  careerPreferences: {
    industries: [{ type: String, trim: true }],
    roles: [{ type: String, trim: true }],
    workMode: { type: String, default: '' },
    locations: [{ type: String, trim: true }],
  },
  learningPreferences: {
    preferredTimeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night', ''], default: '' },
    sessionLengthMinutes: { type: Number, default: 30, min: 5, max: 240 },
    focusAreas: [{ type: String, trim: true }],
  },
  // V4 Prompt 7 — Personal AI Memory 2.0 controls
  memorySettings: {
    memoryEnabled: { type: Boolean, default: true },
    personalizationEnabled: { type: Boolean, default: true },
    proactiveMemoryUse: { type: Boolean, default: true },
    allowAiDerivedProposals: { type: Boolean, default: true },
    categoryEnabled: {
      PREFERENCE: { type: Boolean, default: true },
      GOAL_CONTEXT: { type: Boolean, default: true },
      PROJECT_CONTEXT: { type: Boolean, default: true },
      LEARNING_CONTEXT: { type: Boolean, default: true },
      CAREER_CONTEXT: { type: Boolean, default: true },
      WORKFLOW_PREFERENCE: { type: Boolean, default: true },
      COMMUNICATION_STYLE: { type: Boolean, default: true },
      DECISION: { type: Boolean, default: true },
      IMPORTANT_CONTEXT: { type: Boolean, default: true },
      TEMPORARY_CONTEXT: { type: Boolean, default: true },
      PERSONALIZATION: { type: Boolean, default: true },
    },
  },
  totalLearningMinutes: { type: Number, default: 0, min: 0 },
  knowledgeMemory: {
    bookmarks: [{
      resourceType: { type: String, default: '' },
      resourceId: { type: String, default: '' },
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      savedAt: { type: Date, default: Date.now },
    }],
    savedConversations: [{
      session: { type: String, default: '' },
      snippet: { type: String, default: '' },
      savedAt: { type: Date, default: Date.now },
    }],
    favoriteResources: [{
      resourceType: { type: String, default: '' },
      resourceId: { type: String, default: '' },
      title: { type: String, default: '' },
      savedAt: { type: Date, default: Date.now },
    }],
    recentSuggestions: [{
      kind: { type: String, default: '' },
      title: { type: String, default: '' },
      payload: { type: mongoose.Schema.Types.Mixed },
      savedAt: { type: Date, default: Date.now },
    }],
  },

}, { timestamps: true })

module.exports = mongoose.model('UserProfile', userProfileSchema)
