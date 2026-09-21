const mongoose = require('mongoose');

const plannerEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: [
        'task',
        'study',
        'meeting',
        'focus',
        'habit',
        'assignment',
        'interview',
        'reminder',
        'other',
      ],
      default: 'task',
    },
    start: { type: Date, required: true },
    end: { type: Date },
    allDay: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed: { type: Boolean, default: false },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    relatedGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
    reminderAt: { type: Date },
    reminderSent: { type: Boolean, default: false },
    recurrence: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
      },
      interval: { type: Number, min: 1, max: 30, default: 1 },
    },
  },
  { timestamps: true }
);

plannerEventSchema.index({ user: 1, start: 1 });
plannerEventSchema.index({ user: 1, start: 1, end: 1 });
plannerEventSchema.index({ user: 1, type: 1, start: 1 });
plannerEventSchema.index({ user: 1, reminderAt: 1, reminderSent: 1 });
plannerEventSchema.index({ organizationId: 1, user: 1, start: 1 });

module.exports = mongoose.model('PlannerEvent', plannerEventSchema);
