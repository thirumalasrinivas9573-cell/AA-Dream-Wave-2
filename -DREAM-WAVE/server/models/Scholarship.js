const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  title: { type: String, required: true, trim: true },
  amount: { type: String, default: '' },
  eligibility: { type: String, default: '' },
  deadline: { type: Date },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed', 'draft'], default: 'open' },
}, { timestamps: true });

scholarshipSchema.index({ title: 'text', description: 'text', eligibility: 'text' });

module.exports = mongoose.model('Scholarship', scholarshipSchema);
