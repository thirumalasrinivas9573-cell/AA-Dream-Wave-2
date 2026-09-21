const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['institution', 'company'], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reviewerRole: { type: String, enum: ['student', 'employee', 'intern', ''], default: 'student' },
  rating: { type: Number, min: 1, max: 5, required: true },
  cultureRating: { type: Number, min: 1, max: 5 },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  interviewExperience: { type: String, default: '' },
  internshipExperience: { type: String, default: '' },
  photos: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reportCount: { type: Number, default: 0 },
  reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

reviewSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
