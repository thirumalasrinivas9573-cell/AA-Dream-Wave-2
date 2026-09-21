const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true, trim: true },
  code: { type: String, default: '' },
  duration: { type: String, default: '' },
  level: { type: String, enum: ['UG', 'PG', 'Diploma', 'Certificate', 'Other'], default: 'UG' },
  seats: { type: Number, default: 0 },
  enrolled: { type: Number, default: 0 },
  fees: { type: Number, default: 0 },
  eligibility: { type: String, default: '' },
  curriculum: { type: String, default: '' },
  brochureUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  skills: [{ type: String }],
  careerPaths: [{ type: String }],
  industryDemand: { type: String, default: '' },
  futureScope: { type: String, default: '' },
  competitionLevel: { type: String, default: '' },
  avgSalary: { type: Number, default: 0 },
  aiInsights: {
    popularity: { type: Number, default: 0 },
    salaryRank: { type: Number, default: 0 },
    demandScore: { type: Number, default: 0 },
    summary: { type: String, default: '' },
  },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
}, { timestamps: true });

courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ institutionId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
