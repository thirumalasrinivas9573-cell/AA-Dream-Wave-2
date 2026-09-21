const mongoose = require('mongoose');

const companyTrainingSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  audience: { type: String, default: '' },
  duration: { type: String, default: '' },
  startDate: { type: Date },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
}, { timestamps: true });

module.exports = mongoose.model('CompanyTraining', companyTrainingSchema);
