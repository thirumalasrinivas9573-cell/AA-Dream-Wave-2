const mongoose = require('mongoose');

// Rich roadmap schema that stores the full AI-generated specialist report
const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true,
    index: true,
  },
  // The full rich AI roadmap object (currentStage, overview, nextSteps, skills,
  // courses, colleges, exams, timeline, milestones, salaryProgression, tips,
  // careerPaths, certifications)
  data: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
  },
  version: {
    type: Number,
    min: 1,
    default: 1,
  },
  architecture: {
    schemaVersion: { type: String, default: 'learning-roadmap-v1' },
    source: { type: String, enum: ['manual', 'ai', 'fallback'], default: 'manual' },
    generatedAt: Date,
    estimatedCompletion: Date,
  },
  learningStages: [{
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    order: { type: Number, min: 1 },
    status: {
      type: String,
      enum: ['locked', 'available', 'in-progress', 'completed'],
      default: 'available',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    skills: [{ type: String, trim: true, maxlength: 100 }],
    targetDate: Date,
    libraryBookIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook' }],
  }],
  weeklyPlans: [{
    week: { type: Number, min: 1 },
    focus: { type: String, trim: true, maxlength: 200 },
    outcomes: [{ type: String, trim: true, maxlength: 300 }],
    studyHours: { type: Number, min: 0, max: 168, default: 0 },
    completed: { type: Boolean, default: false },
  }],
  monthlyPlans: [{
    month: { type: Number, min: 1 },
    focus: { type: String, trim: true, maxlength: 200 },
    outcomes: [{ type: String, trim: true, maxlength: 300 }],
    completed: { type: Boolean, default: false },
  }],
  learningResources: [{
    type: { type: String, enum: ['book', 'course', 'article', 'video', 'other'], default: 'other' },
    title: { type: String, trim: true, maxlength: 200 },
    url: { type: String, trim: true, maxlength: 1000, default: '' },
  }],
  practiceProjects: [{
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['planned', 'in-progress', 'completed'], default: 'planned' },
  }],
  revisionSessions: [{
    title: { type: String, trim: true, maxlength: 200 },
    scheduledAt: Date,
    completed: { type: Boolean, default: false },
  }],
  assessmentPoints: [{
    title: { type: String, trim: true, maxlength: 200 },
    scheduledAt: Date,
    score: { type: Number, min: 0, max: 100 },
    completed: { type: Boolean, default: false },
  }],
  progress: {
    percent: { type: Number, min: 0, max: 100, default: 0 },
    completedSteps: { type: Number, min: 0, default: 0 },
    totalSteps: { type: Number, min: 0, default: 0 },
    lastUpdatedAt: Date,
  },
  changeHistory: [{
    version: { type: Number, default: 1 },
    summary: { type: String, default: '', maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
    snapshot: { type: Object },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', roadmapSchema);
