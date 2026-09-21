const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'tasks',
        'goals',
        'calendar',
        'focus',
        'notes',
        'habits',
        'analytics',
        'ai_plan',
        'reminders',
        'progress',
      ],
      required: true,
    },
    title: { type: String, default: '' },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    size: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    name: { type: String, default: 'My Workspace', maxlength: 120 },
    layout: { type: String, enum: ['grid', 'list', 'focus'], default: 'grid' },
    theme: { type: String, enum: ['system', 'light', 'dark', 'focus'], default: 'system' },
    widgets: { type: [widgetSchema], default: undefined },
    preferences: {
      defaultView: { type: String, enum: ['day', 'week', 'month'], default: 'week' },
      focusMinutes: { type: Number, min: 5, max: 120, default: 25 },
      breakMinutes: { type: Number, min: 1, max: 60, default: 5 },
      longBreakMinutes: { type: Number, min: 5, max: 60, default: 15 },
      pomodorosUntilLongBreak: { type: Number, min: 2, max: 12, default: 4 },
      workStartHour: { type: Number, min: 0, max: 23, default: 9 },
      workEndHour: { type: Number, min: 0, max: 23, default: 18 },
      quietHoursStart: { type: Number, min: 0, max: 23, default: 22 },
      quietHoursEnd: { type: Number, min: 0, max: 23, default: 7 },
      taskReminders: { type: Boolean, default: true },
      goalReminders: { type: Boolean, default: true },
      studyReminders: { type: Boolean, default: true },
      calendarNotifications: { type: Boolean, default: true },
      smartAlerts: { type: Boolean, default: true },
      weekStartsOn: { type: Number, min: 0, max: 6, default: 1 },
    },
    pinnedNoteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductivityNote' }],
    lastOpenedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

workspaceSchema.index({ organizationId: 1, user: 1 });

const DEFAULT_WIDGETS = [
  { id: 'tasks', type: 'tasks', title: 'Tasks', visible: true, order: 0, size: 'lg' },
  { id: 'goals', type: 'goals', title: 'Goals', visible: true, order: 1, size: 'md' },
  { id: 'calendar', type: 'calendar', title: 'Calendar', visible: true, order: 2, size: 'lg' },
  { id: 'focus', type: 'focus', title: 'Focus', visible: true, order: 3, size: 'md' },
  { id: 'analytics', type: 'analytics', title: 'Productivity', visible: true, order: 4, size: 'md' },
  { id: 'notes', type: 'notes', title: 'Notes', visible: true, order: 5, size: 'md' },
  { id: 'ai_plan', type: 'ai_plan', title: 'AI Plan', visible: true, order: 6, size: 'sm' },
  { id: 'reminders', type: 'reminders', title: 'Reminders', visible: true, order: 7, size: 'sm' },
];

workspaceSchema.statics.defaultWidgets = () => DEFAULT_WIDGETS.map((w) => ({ ...w }));

module.exports = mongoose.model('Workspace', workspaceSchema);
module.exports.DEFAULT_WIDGETS = DEFAULT_WIDGETS;
