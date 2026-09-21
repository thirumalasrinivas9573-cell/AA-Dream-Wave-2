const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['institution', 'company'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

followSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);
