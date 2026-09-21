const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  applicantName: { type: String, required: true, trim: true },
  applicantEmail: { type: String, required: true, trim: true },
  applicantPhone: { type: String, default: '' },
  studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'reviewing', 'accepted', 'rejected'], default: 'pending' },
  documents: [{ name: String, url: String }],
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Admission', admissionSchema);
