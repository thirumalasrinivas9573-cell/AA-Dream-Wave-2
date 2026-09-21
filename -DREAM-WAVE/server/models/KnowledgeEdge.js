const mongoose = require('mongoose');

const knowledgeEdgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, maxlength: 200, index: true },
    to: { type: String, required: true, maxlength: 200, index: true },
    type: {
      type: String,
      enum: ['related', 'requires', 'leads_to', 'teaches', 'part_of', 'uses', 'prepares_for'],
      default: 'related',
      index: true,
    },
    weight: { type: Number, default: 1, min: 0, max: 10 },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

knowledgeEdgeSchema.index({ from: 1, to: 1, type: 1, organizationId: 1 }, { unique: true });
knowledgeEdgeSchema.index({ to: 1, type: 1 });
knowledgeEdgeSchema.index({ from: 1, type: 1, weight: -1 });

module.exports = mongoose.model('KnowledgeEdge', knowledgeEdgeSchema);
