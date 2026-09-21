const mongoose = require('mongoose');

const researchNoteSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    title: { type: String, required: true, maxlength: 240, trim: true },
    body: { type: String, default: '', maxlength: 50000 },
    tags: [{ type: String, maxlength: 40 }],
    folderPath: { type: String, default: '/', maxlength: 240 },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchCollection',
      default: null,
    },
  },
  { timestamps: true }
);

researchNoteSchema.index({ user: 1, project: 1, updatedAt: -1 });
researchNoteSchema.index({ title: 'text', body: 'text', tags: 'text' });

module.exports = mongoose.model('ResearchNote', researchNoteSchema);
