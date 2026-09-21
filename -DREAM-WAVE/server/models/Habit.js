const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    targetPerWeek: { type: Number, default: 7 },
    color: { type: String, default: '#0d9488' },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    completions: [{ date: { type: String }, completed: { type: Boolean, default: true } }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, active: 1 });
habitSchema.index({ organizationId: 1, user: 1 });
habitSchema.index({ organizationId: 1, active: 1 });

module.exports = mongoose.model('Habit', habitSchema);
