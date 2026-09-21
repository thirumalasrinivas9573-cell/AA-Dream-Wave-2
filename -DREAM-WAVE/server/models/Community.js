const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 4000 },
    type: {
      type: String,
      enum: ['public', 'private', 'institution', 'company', 'course', 'subject'],
      default: 'public',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: String, default: '', maxlength: 160 },
    subject: { type: String, default: '', maxlength: 160 },
    tags: [{ type: String, maxlength: 40 }],
    members: { type: [memberSchema], default: [] },
    memberCount: { type: Number, default: 1, min: 0 },
    discussionCount: { type: Number, default: 0, min: 0 },
    isArchived: { type: Boolean, default: false, index: true },
    coverUrl: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

communitySchema.index({ slug: 1 }, { unique: true });
communitySchema.index({ type: 1, createdAt: -1 });
communitySchema.index({ name: 'text', description: 'text', tags: 'text', course: 'text', subject: 'text' });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ organizationId: 1, type: 1 });

module.exports = mongoose.model('Community', communitySchema);
