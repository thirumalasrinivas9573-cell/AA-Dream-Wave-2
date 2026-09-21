const mongoose = require('mongoose');
const { CANONICAL_CATEGORIES } = require('./LibraryBook');

const libraryCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

libraryCategorySchema.statics.ensureCanonical = async function ensureCanonical() {
  for (const name of CANONICAL_CATEGORIES) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await this.updateOne({ slug }, { name, slug, active: true }, { upsert: true });
  }
};

module.exports = mongoose.model('LibraryCategory', libraryCategorySchema);
