const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', index: true },
  description: { type: String, default: '' },
  duration: { type: String, default: '' },
  stipend: { type: Number, default: 0 },
  eligibility: { type: String, default: '' },
  location: { type: String, default: '' },
  workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
  skills: [{ type: String }],
  projects: { type: String, default: '' },
  certificate: { type: Boolean, default: true },
  conversionOpportunity: { type: Boolean, default: false },
  openings: { type: Number, default: 1 },
  applicationsCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'open', 'closed'], default: 'open', index: true },
  deadline: { type: Date },
}, { timestamps: true });

internshipSchema.index({ title: 'text', description: 'text', skills: 'text' });
internshipSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Internship', internshipSchema);
