const mongoose = require('mongoose');

const learningProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    kind: {
      type: String,
      enum: ['topic', 'chapter', 'skill', 'course', 'animation', 'lesson', 'module', 'assignment'],
      required: true,
      index: true,
    },
    key: { type: String, required: true, maxlength: 200 },
    label: { type: String, required: true, maxlength: 240 },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    refType: { type: String, default: '', maxlength: 40 },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

learningProgressSchema.index({ user: 1, kind: 1, key: 1 }, { unique: true });
learningProgressSchema.index({ user: 1, completed: 1, updatedAt: -1 });
learningProgressSchema.index({ organizationId: 1, user: 1 });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
