const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, default: null },
  },
  { _id: false }
);

const collabConversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], default: 'direct', index: true },
    title: { type: String, default: '', maxlength: 160 },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    participants: { type: [participantSchema], default: [] },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'CollabTeam', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'CollabProject', default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: '', maxlength: 240 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

collabConversationSchema.index({ 'participants.user': 1, lastMessageAt: -1 });

module.exports = mongoose.model('CollabConversation', collabConversationSchema);
