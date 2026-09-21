const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['system', 'email', 'push', 'in-app', 'approval', 'report', 'job', 'internship', 'follow', 'library', 'book', 'discovery', 'goal', 'milestone', 'roadmap', 'task', 'reminder', 'certificate', 'academic', 'career', 'ai'],
    default: 'in-app',
  },
  channel: { type: String, enum: ['in-app', 'email', 'push'], default: 'in-app' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false, index: true },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true,
  },
  pinnedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null, index: true },
  expiresAt: { type: Date, default: null },
  source: { type: String, trim: true, maxlength: 100, default: '' },
  dedupeKey: { type: String, trim: true, maxlength: 200, default: '' },
  emailStatus: { type: String, enum: ['pending', 'sent', 'skipped', 'failed'], default: 'skipped' },
  pushStatus: { type: String, enum: ['pending', 'sent', 'skipped', 'failed'], default: 'skipped' },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, archivedAt: 1, pinnedAt: -1, createdAt: -1 });
notificationSchema.index({ userId: 1, archivedAt: 1, read: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string', $gt: '' } } },
);

module.exports = mongoose.model('Notification', notificationSchema);
