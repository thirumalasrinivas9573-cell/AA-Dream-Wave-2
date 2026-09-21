const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    durationDays: { type: Number, default: 14 },
    goals: [String],
    schedule: [
      {
        day: Number,
        focus: String,
        tasks: [String],
        completed: { type: Boolean, default: false },
      },
    ],
    progress: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    horizon: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'custom',
      index: true,
    },
    lastAdjustedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studyPlanSchema.index({ user: 1, status: 1 });
studyPlanSchema.index({ organizationId: 1, user: 1 });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
