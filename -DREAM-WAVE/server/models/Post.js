const mongoose = require('mongoose')
const {
  POST_TYPES,
  VISIBILITY,
  REACTION_TYPES,
  LINKED_ENTITY_TYPES,
} = require('../constants/community')

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  content: { type: String, required: true, maxlength: 500, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
})

const linkedEntitySchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: LINKED_ENTITY_TYPES, required: true },
    entityId: { type: String, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: { type: String, required: true },
    authorInitials: { type: String, required: true },
    authorRole: {
      type: String,
      enum: ['student', 'institution', 'company', 'admin'],
      default: 'student',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    title: { type: String, trim: true, default: '', maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    tag: {
      type: String,
      enum: ['Achievement', 'Books', 'Goals', 'Habits', 'General'],
      default: 'General',
    },
    postType: {
      type: String,
      enum: POST_TYPES,
      default: 'GENERAL',
      index: true,
    },
    visibility: {
      type: String,
      enum: VISIBILITY,
      default: 'public',
      index: true,
    },
    linkedEntity: { type: linkedEntitySchema, default: null },
    likes: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    reactions: {
      insight: { type: [mongoose.Schema.Types.ObjectId], default: [] },
      helpful: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    },
    bookmarkedBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    comments: [commentSchema],
    aiClassification: { type: String, default: '' },
    relevanceTags: [{ type: String, trim: true }],
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

postSchema.index({ createdAt: -1 })
postSchema.index({ postType: 1, createdAt: -1 })
postSchema.index({ visibility: 1, createdAt: -1 })
postSchema.index({ 'linkedEntity.entityType': 1, 'linkedEntity.entityId': 1 })

module.exports = mongoose.model('Post', postSchema)
module.exports.POST_TYPES = POST_TYPES
module.exports.VISIBILITY = VISIBILITY
module.exports.REACTION_TYPES = REACTION_TYPES
module.exports.TAG_TO_TYPE = {
  General: 'GENERAL',
  Achievement: 'ACHIEVEMENT',
  Question: 'QUESTION',
  Resource: 'RESOURCE',
  Project: 'PROJECT',
}
