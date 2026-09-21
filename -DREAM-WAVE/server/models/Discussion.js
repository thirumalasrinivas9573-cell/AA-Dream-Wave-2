const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, default: '👍', maxlength: 16 },
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 5000 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [reactionSchema], default: [] },
    parentReply: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

const discussionSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 240 },
    body: { type: String, required: true, maxlength: 20000 },
    tags: [{ type: String, maxlength: 40 }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [reactionSchema], default: [] },
    replies: { type: [replySchema], default: [] },
    replyCount: { type: Number, default: 0, min: 0 },
    pinned: { type: Boolean, default: false, index: true },
    bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    aiSummary: { type: String, default: '', maxlength: 8000 },
    status: { type: String, enum: ['open', 'closed', 'archived'], default: 'open', index: true },
  },
  { timestamps: true }
);

discussionSchema.index({ community: 1, pinned: -1, updatedAt: -1 });
discussionSchema.index({ title: 'text', body: 'text', tags: 'text' });
discussionSchema.index({ author: 1, createdAt: -1 });
discussionSchema.index({ tags: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);
