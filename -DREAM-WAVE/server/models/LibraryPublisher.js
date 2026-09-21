const mongoose = require('mongoose');

const libraryPublisherSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  website: { type: String, default: '' },
  bookCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('LibraryPublisher', libraryPublisherSchema);
