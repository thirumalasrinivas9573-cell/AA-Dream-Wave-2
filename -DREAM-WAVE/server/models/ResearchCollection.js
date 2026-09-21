const mongoose = require('mongoose');

const researchCollectionSchema = new mongoose.Schema(
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
    name: { type: String, required: true, maxlength: 160, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    folderPath: { type: String, default: '/', maxlength: 240 },
    tags: [{ type: String, maxlength: 40 }],
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true }
);

researchCollectionSchema.index({ user: 1, project: 1, createdAt: -1 });
researchCollectionSchema.index({ organizationId: 1, project: 1 });

module.exports = mongoose.model('ResearchCollection', researchCollectionSchema);
