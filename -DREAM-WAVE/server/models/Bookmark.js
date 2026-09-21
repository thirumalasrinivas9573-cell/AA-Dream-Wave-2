const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['institution', 'company', 'job', 'internship', 'book', 'promotion', 'post', 'project', 'group'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

bookmarkSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
