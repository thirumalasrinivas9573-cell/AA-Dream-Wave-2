const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: '' },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
