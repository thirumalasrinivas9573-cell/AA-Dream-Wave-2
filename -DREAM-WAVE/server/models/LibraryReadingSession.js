const mongoose = require('mongoose')

const libraryReadingSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryBook',
    required: true,
    index: true,
  },
  clientEventId: { type: String, required: true, trim: true, maxlength: 120 },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  startPage: { type: Number, min: 1, default: 1 },
  endPage: { type: Number, min: 1, default: 1 },
  pagesRead: { type: Number, min: 0, default: 0 },
  durationSeconds: { type: Number, min: 0, max: 12 * 60 * 60, default: 0 },
}, { timestamps: true })

libraryReadingSessionSchema.index({ userId: 1, clientEventId: 1 }, { unique: true })
libraryReadingSessionSchema.index({ userId: 1, startedAt: -1 })
libraryReadingSessionSchema.index({ userId: 1, bookId: 1, startedAt: -1 })

module.exports = mongoose.model('LibraryReadingSession', libraryReadingSessionSchema)
