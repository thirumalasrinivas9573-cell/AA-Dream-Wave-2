const mongoose = require('mongoose');

const recommendationEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    itemType: {
      type: String,
      enum: [
        'book',
        'course',
        'video',
        'animation',
        'lesson',
        'project',
        'certification',
        'career',
        'topic',
        'skill',
        'roadmap',
      ],
      required: true,
      index: true,
    },
    itemId: { type: String, default: '', maxlength: 120 },
    itemKey: { type: String, default: '', maxlength: 200 },
    score: { type: Number, default: 0, min: 0, max: 100 },
    reason: { type: String, default: '', maxlength: 400 },
    engaged: { type: Boolean, default: false, index: true },
    dismissed: { type: Boolean, default: false },
    source: { type: String, default: 'graph', maxlength: 40 },
  },
  { timestamps: true }
);

recommendationEventSchema.index({ user: 1, createdAt: -1 });
recommendationEventSchema.index({ user: 1, itemType: 1, createdAt: -1 });

module.exports = mongoose.model('RecommendationEvent', recommendationEventSchema);
