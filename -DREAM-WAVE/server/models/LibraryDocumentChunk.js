const mongoose = require('mongoose')

const libraryDocumentChunkSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryBook',
    required: true,
    index: true,
  },
  page: { type: Number, min: 1, default: 1, index: true },
  section: { type: String, trim: true, maxlength: 200, default: '' },
  chapter: { type: String, trim: true, maxlength: 200, default: '' },
  order: { type: Number, min: 0, default: 0 },
  text: { type: String, required: true, maxlength: 12000 },
  wordCount: { type: Number, min: 0, default: 0 },
  contentHash: { type: String, trim: true, index: true },
}, { timestamps: true })

libraryDocumentChunkSchema.index({ bookId: 1, page: 1, order: 1 })
libraryDocumentChunkSchema.index({ bookId: 1, text: 'text' })

module.exports = mongoose.model('LibraryDocumentChunk', libraryDocumentChunkSchema)
