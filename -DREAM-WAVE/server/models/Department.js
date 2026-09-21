const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['institution', 'company'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
  head: { type: String, default: '' },
  description: { type: String, default: '' },
  studentCount: { type: Number, default: 0 },
  facultyCount: { type: Number, default: 0 },
  employeeCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

departmentSchema.index({ ownerType: 1, ownerId: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
