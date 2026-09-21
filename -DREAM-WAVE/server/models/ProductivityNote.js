const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 240 },
    url: { type: String, default: '', maxlength: 500 },
    mimeType: { type: String, default: '', maxlength: 120 },
    size: { type: Number, default: 0 },
  },
  { _id: true }
);

const productivityNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    content: { type: String, default: '' },
    format: { type: String, enum: ['markdown', 'plain', 'html'], default: 'markdown' },
    category: { type: String, default: 'general', maxlength: 80, index: true },
    tags: [{ type: String, maxlength: 40 }],
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    aiSummary: { type: String, default: '' },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    relatedGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', default: null },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

productivityNoteSchema.index({ user: 1, updatedAt: -1 });
productivityNoteSchema.index({ user: 1, category: 1, archived: 1 });
productivityNoteSchema.index({ user: 1, tags: 1 });
productivityNoteSchema.index({ organizationId: 1, user: 1 });
productivityNoteSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('ProductivityNote', productivityNoteSchema);
