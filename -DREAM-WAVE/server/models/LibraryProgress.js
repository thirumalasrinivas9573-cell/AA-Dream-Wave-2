const mongoose = require('mongoose');

const libraryProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true, index: true },
  currentPage: { type: Number, min: 1, default: 1 },
  totalPages: { type: Number, min: 0, default: 0 },
  percent: { type: Number, min: 0, max: 100, default: 0 },
  readingMinutes: { type: Number, min: 0, default: 0 },
  streakDays: { type: Number, min: 0, default: 0 },
  lastStreakDate: { type: String, default: '' },
  dailyGoalPages: { type: Number, min: 1, max: 500, default: 10 },
  pagesReadToday: { type: Number, min: 0, default: 0 },
  completedAt: Date,
  favorite: { type: Boolean, default: false },
  readingStatus: {
    type: String,
    enum: ['saved', 'reading', 'completed', 'archived'],
    default: 'saved',
    index: true,
  },
  offline: {
    status: { type: String, enum: ['not-requested', 'requested', 'ready', 'expired', 'removed'], default: 'not-requested' },
    requestedAt: Date,
    expiresAt: Date,
  },
  bookmarks: [{ page: Number, label: String, createdAt: { type: Date, default: Date.now } }],
  highlights: [{
    page: Number,
    text: String,
    color: { type: String, default: 'yellow' },
    style: { type: String, enum: ['highlight', 'underline'], default: 'highlight' },
    createdAt: { type: Date, default: Date.now },
  }],
  notes: [{
    page: Number,
    content: String,
    sticky: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  aiSummary: { type: String, default: '' },
  lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });

libraryProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });
libraryProgressSchema.index({ userId: 1, lastReadAt: -1 });
libraryProgressSchema.index({ userId: 1, favorite: 1 });

module.exports = mongoose.model('LibraryProgress', libraryProgressSchema);
