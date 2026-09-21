const mongoose = require('mongoose');

/**
 * Periodic aggregated ops snapshot for enterprise analytics (background jobs).
 */
const opsSnapshotSchema = new mongoose.Schema(
  {
    period: { type: String, enum: ['hourly', 'daily'], required: true, index: true },
    bucketStart: { type: Date, required: true, index: true },
    users: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
      activeApprox: { type: Number, default: 0 },
    },
    orgs: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
    },
    ai: {
      requests: { type: Number, default: 0 },
      failures: { type: Number, default: 0 },
      credits: { type: Number, default: 0 },
      avgLatencyMs: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0 },
    },
    learning: {
      studyPlans: { type: Number, default: 0 },
      progressEvents: { type: Number, default: 0 },
    },
    career: {
      profiles: { type: Number, default: 0 },
      interviews: { type: Number, default: 0 },
    },
    community: {
      posts: { type: Number, default: 0 },
      discussions: { type: Number, default: 0 },
    },
    security: {
      loginFailures: { type: Number, default: 0 },
      suspicious: { type: Number, default: 0 },
      rateLimited: { type: Number, default: 0 },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

opsSnapshotSchema.index({ period: 1, bucketStart: -1 }, { unique: true });
opsSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model('OpsSnapshot', opsSnapshotSchema);
