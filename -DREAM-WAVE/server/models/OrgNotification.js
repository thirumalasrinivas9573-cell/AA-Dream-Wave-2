const mongoose = require('mongoose');

const orgNotificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'system', 'academic'],
      default: 'info',
    },
    audience: {
      type: String,
      enum: ['all', 'teachers', 'students', 'staff', 'admins'],
      default: 'all',
    },
    link: { type: String, default: '', maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

orgNotificationSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('OrgNotification', orgNotificationSchema);
