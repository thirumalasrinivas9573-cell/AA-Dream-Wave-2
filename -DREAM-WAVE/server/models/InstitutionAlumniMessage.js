const mongoose = require('mongoose')

const institutionAlumniMessageSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumniConversation',
      required: true,
      index: true,
    },
    senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, required: true },
    readByUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

institutionAlumniMessageSchema.index({ conversationId: 1, createdAt: 1 })

module.exports = mongoose.model('InstitutionAlumniMessage', institutionAlumniMessageSchema)
