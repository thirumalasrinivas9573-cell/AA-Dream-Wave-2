const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  package: { type: Number, default: 0 },
  studentsPlaced: { type: Number, default: 0 },
  year: { type: String, default: '' },
  recruiterLogo: { type: String, default: '' },
  galleryUrl: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['upcoming', 'completed', 'ongoing'], default: 'completed' },
}, { timestamps: true });

module.exports = mongoose.model('Placement', placementSchema);
