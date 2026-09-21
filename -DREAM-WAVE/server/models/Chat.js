const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  ts:      { type: Date, default: Date.now },
  metadata: {
    action: { type: String, default: '' },
    mentorMode: { type: String, default: '' },
  },
})

const chatSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  session:  { type: String, default: 'default', trim: true, maxlength: 120 },
  title:    { type: String, default: '', trim: true, maxlength: 160 },
  pinned:   { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  mentorMode: { type: String, default: 'general', trim: true },
  faithMode:  { type: String, default: 'general', trim: true },
  explanationDepth: {
    type: String,
    enum: ['quick', 'simple', 'standard', 'detailed', 'deep'],
    default: 'standard',
  },
  summary: { type: String, default: '' },
  messages: [messageSchema],
}, { timestamps: true })

chatSchema.index({ userId: 1, session: 1 })
chatSchema.index({ userId: 1, updatedAt: -1 })
chatSchema.index({ userId: 1, pinned: -1, updatedAt: -1 })

chatSchema.pre('save', function capStoredHistory(next) {
  if (this.isModified('messages') && this.messages.length > 200) {
    this.messages = this.messages.slice(-200)
  }
  next()
})

module.exports = mongoose.model('Chat', chatSchema)
