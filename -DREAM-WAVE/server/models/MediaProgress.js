const mongoose = require('mongoose');

const mediaProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    media: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaItem', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    positionSec: { type: Number, default: 0, min: 0 },
    durationSec: { type: Number, default: 0, min: 0 },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    favorite: { type: Boolean, default: false, index: true },
    watchCount: { type: Number, default: 0, min: 0 },
    watchTimeSec: { type: Number, default: 0, min: 0 },
    lastWatchedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

mediaProgressSchema.index({ user: 1, media: 1 }, { unique: true });
mediaProgressSchema.index({ user: 1, lastWatchedAt: -1 });
mediaProgressSchema.index({ user: 1, favorite: 1, updatedAt: -1 });
mediaProgressSchema.index({ user: 1, completed: 1 });
mediaProgressSchema.index({ organizationId: 1, lastWatchedAt: -1 });

module.exports = mongoose.model('MediaProgress', mediaProgressSchema);
