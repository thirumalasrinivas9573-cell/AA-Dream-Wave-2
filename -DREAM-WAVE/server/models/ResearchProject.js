const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, maxlength: 80 },
    at: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const researchProjectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true, maxlength: 240, trim: true },
    description: { type: String, default: '', maxlength: 5000 },
    category: {
      type: String,
      enum: [
        'general',
        'academic',
        'literature',
        'science',
        'technology',
        'business',
        'legal',
        'medical',
        'other',
      ],
      default: 'general',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    tags: [{ type: String, maxlength: 40 }],
    folderPath: { type: String, default: '/', maxlength: 240 },
    history: { type: [historyEntrySchema], default: [] },
    stats: {
      documentCount: { type: Number, default: 0, min: 0 },
      noteCount: { type: Number, default: 0, min: 0 },
      highlightCount: { type: Number, default: 0, min: 0 },
      bookmarkCount: { type: Number, default: 0, min: 0 },
      knowledgeNodes: { type: Number, default: 0, min: 0 },
      readingProgressAvg: { type: Number, default: 0, min: 0, max: 100 },
      lastActivityAt: { type: Date, default: Date.now },
    },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

researchProjectSchema.index({ user: 1, createdAt: -1 });
researchProjectSchema.index({ user: 1, status: 1, updatedAt: -1 });
researchProjectSchema.index({ user: 1, category: 1 });
researchProjectSchema.index({ organizationId: 1, user: 1 });
researchProjectSchema.index({ title: 'text', description: 'text', tags: 'text' });

researchProjectSchema.methods.pushHistory = function pushHistory(action, meta = {}) {
  this.history = (this.history || []).slice(-99);
  this.history.push({ action, at: new Date(), meta });
  if (this.stats) this.stats.lastActivityAt = new Date();
};

module.exports = mongoose.model('ResearchProject', researchProjectSchema);
