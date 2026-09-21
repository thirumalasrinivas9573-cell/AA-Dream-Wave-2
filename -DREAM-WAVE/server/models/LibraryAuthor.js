const mongoose = require('mongoose');

/** Lightweight author registry for search / filters. */
const libraryAuthorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  bio: { type: String, default: '' },
  bookCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('LibraryAuthor', libraryAuthorSchema);
