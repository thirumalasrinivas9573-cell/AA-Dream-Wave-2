const mongoose = require('mongoose');

const researchBookmarkSchema = new mongoose.Schema(
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
    label: { type: String, required: true, maxlength: 200, trim: true },
    position: { type: Number, default: 0, min: 0 },
    folderPath: { type: String, default: '/', maxlength: 240 },
    tags: [{ type: String, maxlength: 40 }],
  },
  { timestamps: true }
);

researchBookmarkSchema.index({ user: 1, project: 1, createdAt: -1 });

module.exports = mongoose.model('ResearchBookmark', researchBookmarkSchema);
