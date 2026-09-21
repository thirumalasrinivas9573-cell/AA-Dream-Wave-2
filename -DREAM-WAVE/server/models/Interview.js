const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  candidateName: { type: String, default: '' },
  candidateEmail: { type: String, default: '' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mode: { type: String, enum: ['online', 'offline'], default: 'online' },
  scheduledAt: { type: Date, required: true },
  location: { type: String, default: '' },
  meetingUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  feedback: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
