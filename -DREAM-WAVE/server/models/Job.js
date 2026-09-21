const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', index: true },
  department: { type: String, default: '' },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite', index: true },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'remote', 'graduate', 'apprenticeship', 'campus'],
    default: 'full-time',
    index: true,
  },
  experience: { type: String, default: '' },
  education: { type: String, default: '' },
  responsibilities: { type: String, default: '' },
  benefits: { type: String, default: '' },
  hiringProcess: { type: String, default: '' },
  salaryMin: { type: Number, default: 0 },
  salaryMax: { type: Number, default: 0 },
  skills: [{ type: String }],
  openings: { type: Number, default: 1 },
  applicationsCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'open', 'closed', 'filled'], default: 'open', index: true },
  deadline: { type: Date },
}, { timestamps: true });

jobSchema.index({ title: 'text', description: 'text', category: 'text', skills: 'text' });
jobSchema.index({ companyId: 1, status: 1, createdAt: -1 });
jobSchema.index({ status: 1, workMode: 1, type: 1 });

module.exports = mongoose.model('Job', jobSchema);
