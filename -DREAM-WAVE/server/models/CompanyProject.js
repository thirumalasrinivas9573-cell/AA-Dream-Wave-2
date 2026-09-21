const mongoose = require('mongoose');

const companyProjectSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  team: { type: String, default: '' },
  status: { type: String, enum: ['planned', 'active', 'completed', 'on-hold'], default: 'active' },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CompanyProject', companyProjectSchema);
