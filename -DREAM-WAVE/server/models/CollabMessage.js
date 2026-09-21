const mongoose = require('mongoose');

const collabMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollabConversation',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, default: '', maxlength: 8000 },
    attachments: [
      {
        name: { type: String, maxlength: 240 },
        url: { type: String, maxlength: 500 },
        mimeType: { type: String, maxlength: 120 },
        kind: { type: String, enum: ['file', 'image'], default: 'file' },
      },
    ],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

collabMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('CollabMessage', collabMessageSchema);
