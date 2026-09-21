const mongoose = require('mongoose');

/** Catalog of job categories for filtering and company posting. */
const jobCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('JobCategory', jobCategorySchema);
