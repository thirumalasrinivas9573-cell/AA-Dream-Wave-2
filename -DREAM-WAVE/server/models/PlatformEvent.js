const mongoose = require('mongoose');

const EVENT_TYPES = [
  'learning_completed',
  'goal_achieved',
  'book_finished',
  'animation_completed',
  'community_activity',
  'career_milestone',
  'task_completed',
  'focus_completed',
  'research_progress',
  'recommendation_engaged',
  'recommendation_dismissed',
  'profile_refreshed',
  'consent_updated',
  'module_opened',
  'document_uploaded',
  'report_generated',
  'habit_milestone',
];

const platformEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    type: { type: String, enum: EVENT_TYPES, required: true, index: true },
    module: {
      type: String,
      enum: [
        'learning',
        'career',
        'research',
        'books',
        'media',
        'community',
        'productivity',
        'mentor',
        'adaptive',
        'graph',
        'system',
        'reports',
        'documents',
      ],
      default: 'system',
      index: true,
    },
    title: { type: String, default: '', maxlength: 200 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    refType: { type: String, default: '', maxlength: 60 },
    refId: { type: String, default: '', maxlength: 64 },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

platformEventSchema.index({ user: 1, createdAt: -1 });
platformEventSchema.index({ user: 1, type: 1, createdAt: -1 });
platformEventSchema.index({ organizationId: 1, createdAt: -1 });
platformEventSchema.index({ processed: 1, createdAt: 1 });
platformEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('PlatformEvent', platformEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
