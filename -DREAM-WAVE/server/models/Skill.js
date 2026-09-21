const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    name: { type: String, required: true },
    category: { type: String, default: 'general' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
    mastery: { type: Number, min: 0, max: 100, default: 0 },
    targetMastery: { type: Number, default: 80 },
    lastPracticed: Date,
    revisionDue: Date,
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

skillSchema.index({ user: 1, name: 1 }, { unique: true });
skillSchema.index({ user: 1, mastery: 1 });
skillSchema.index({ organizationId: 1, user: 1 });

module.exports = mongoose.model('Skill', skillSchema);
