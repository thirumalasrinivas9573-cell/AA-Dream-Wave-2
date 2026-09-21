const mongoose = require('mongoose')

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    enum: [
      'Academic', 'Career', 'Certification', 'Education', 'Finance', 'Health', 'Personal', 'Skill',
      'Technical Skill', 'Soft Skill', 'Project', 'Research', 'Placement', 'Internship',
      'Entrepreneurship', 'Personal Development', 'Custom',
    ],
    default: 'Personal',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  estimatedDuration: {
    type: String,
    trim: true,
    maxlength: 80,
    default: '',
  },
  weeklyStudyHours: {
    type: Number,
    min: 0,
    max: 168,
    default: 0,
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate',
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'paused', 'completed', 'archived'],
    default: 'active',
    index: true,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  deadline: {
    type: Date,
  },
  aiPlan: [{
    type: String,
  }],
  milestones: [{
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed', 'blocked'],
      default: 'not-started',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    targetDate: Date,
    dependencies: [{ type: mongoose.Schema.Types.ObjectId }],
    completedAt: Date,
  }],
  resources: {
    books: [{
      title: { type: String, trim: true, maxlength: 200 },
      url: { type: String, trim: true, maxlength: 1000, default: '' },
      bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook' },
      source: { type: String, trim: true, maxlength: 80, default: '' },
      reason: { type: String, trim: true, maxlength: 300, default: '' },
    }],
    courses: [{
      title: { type: String, trim: true, maxlength: 200 },
      url: { type: String, trim: true, maxlength: 1000, default: '' },
    }],
    projects: [{
      title: { type: String, trim: true, maxlength: 200 },
      description: { type: String, trim: true, maxlength: 1000, default: '' },
    }],
  },
  notes: [{
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  }],
  progressHistory: [{
    date: { type: Date, default: Date.now },
    progress: { type: Number, min: 0, max: 100 },
    studyHours: { type: Number, min: 0, max: 24, default: 0 },
    note: { type: String, trim: true, maxlength: 500, default: '' },
  }],
  reminders: {
    milestoneDue: { type: Boolean, default: true },
    weeklyReview: { type: Boolean, default: true },
    monthlyReview: { type: Boolean, default: true },
  },
  completedAt: Date,
  pausedAt: Date,
  archivedAt: Date,
}, { timestamps: true })

goalSchema.index({ userId: 1, status: 1, updatedAt: -1 })
goalSchema.index({ userId: 1, category: 1 })
goalSchema.index({ userId: 1, deadline: 1 })

module.exports = mongoose.model('Goal', goalSchema)
