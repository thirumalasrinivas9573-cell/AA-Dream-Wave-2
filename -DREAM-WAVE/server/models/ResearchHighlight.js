const mongoose = require('mongoose');

const researchHighlightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchProject',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    text: { type: String, required: true, maxlength: 5000 },
    color: { type: String, default: 'yellow', maxlength: 32 },
    startOffset: { type: Number, default: 0, min: 0 },
    endOffset: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '', maxlength: 2000 },
    tags: [{ type: String, maxlength: 40 }],
  },
  { timestamps: true }
);

researchHighlightSchema.index({ user: 1, project: 1, createdAt: -1 });
researchHighlightSchema.index({ document: 1, createdAt: -1 });

module.exports = mongoose.model('ResearchHighlight', researchHighlightSchema);
