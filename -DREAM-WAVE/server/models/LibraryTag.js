const mongoose = require('mongoose');

const libraryTagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('LibraryTag', libraryTagSchema);
