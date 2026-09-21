const mongoose = require('mongoose');

const knowledgeNodeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 200, index: true },
    label: { type: String, required: true, maxlength: 240 },
    kind: {
      type: String,
      enum: [
        'topic',
        'concept',
        'skill',
        'subject',
        'book',
        'course',
        'video',
        'animation',
        'lesson',
        'roadmap',
        'career',
        'project',
        'certification',
      ],
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    refType: { type: String, default: '', maxlength: 40 },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    aliases: [{ type: String, maxlength: 120 }],
    weight: { type: Number, default: 1, min: 0, max: 100 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    searchText: { type: String, default: '', maxlength: 8000 },
  },
  { timestamps: true }
);

knowledgeNodeSchema.index({ key: 1, organizationId: 1 }, { unique: true });
knowledgeNodeSchema.index({ kind: 1, weight: -1 });
knowledgeNodeSchema.index({ label: 'text', searchText: 'text', aliases: 'text' });

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
