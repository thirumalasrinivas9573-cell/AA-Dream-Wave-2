const mongoose = require('mongoose')

const libraryAnnotationSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['bookmark', 'highlight', 'underline', 'note', 'quote', 'page-tag'],
    required: true,
    index: true,
  },
  page: { type: Number, required: true, min: 1 },
  text: { type: String, trim: true, maxlength: 5000, default: '' },
  content: { type: String, trim: true, maxlength: 10000, default: '' },
  label: { type: String, trim: true, maxlength: 200, default: '' },
  color: {
    type: String,
    enum: ['yellow', 'green', 'blue', 'pink', 'purple'],
    default: 'yellow',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 40,
  }],
  anchor: {
    exact: { type: String, maxlength: 5000, default: '' },
    prefix: { type: String, maxlength: 500, default: '' },
    suffix: { type: String, maxlength: 500, default: '' },
  },
  revision: { type: Number, min: 1, default: 1 },
}, { timestamps: true })

libraryAnnotationSchema.index({ userId: 1, bookId: 1, page: 1, createdAt: -1 })
libraryAnnotationSchema.index({ userId: 1, updatedAt: -1 })

module.exports = mongoose.model('LibraryAnnotation', libraryAnnotationSchema)
