const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  role: { type: String, default: '' },
  team: { type: String, default: '' },
  attendancePercent: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'on-leave', 'terminated'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
