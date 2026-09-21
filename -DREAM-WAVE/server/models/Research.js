const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, default: '' },
  authors: { type: String, default: '' },
  year: { type: String, default: '' },
  url: { type: String, default: '' },
  department: { type: String, default: '' },
  status: { type: String, enum: ['active', 'completed', 'draft'], default: 'active' },
}, { timestamps: true });

researchSchema.index({ title: 'text', summary: 'text' });

module.exports = mongoose.model('Research', researchSchema);
