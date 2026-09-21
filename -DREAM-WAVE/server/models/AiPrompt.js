const mongoose = require('mongoose');

const aiPromptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    mode: { type: String, default: 'mentor', index: true },
    body: { type: String, required: true, maxlength: 8000 },
    description: { type: String, default: '', maxlength: 400 },
    isFavorite: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiPromptSchema.index({ user: 1, updatedAt: -1 });
aiPromptSchema.index({ user: 1, mode: 1, name: 1 });

module.exports = mongoose.model('AiPrompt', aiPromptSchema);
