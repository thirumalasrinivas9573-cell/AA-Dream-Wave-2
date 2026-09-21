const mongoose = require('mongoose')
const { GROUP_POST_TYPES } = require('../constants/institutionAlumniExtended')

const commentSchema = new mongoose.Schema(
  {
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, required: true },
    createdAt: { type: Date, default: Date.now },
    isModerated: { type: Boolean, default: false },
  },
  { _id: true },
)

const institutionAlumniGroupPostSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumniGroup',
      required: true,
      index: true,
    },
    postType: { type: String, enum: GROUP_POST_TYPES, default: 'question', index: true },
    title: { type: String, trim: true, required: true },
    body: { type: String, trim: true, default: '' },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true, default: '' },
    authorAlumniId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni', default: null },
    comments: [commentSchema],
    isPinned: { type: Boolean, default: false },
    isModerated: { type: Boolean, default: false },
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

institutionAlumniGroupPostSchema.index({ institutionId: 1, groupId: 1, createdAt: -1 })
institutionAlumniGroupPostSchema.index({ title: 'text', body: 'text' })

module.exports = mongoose.model('InstitutionAlumniGroupPost', institutionAlumniGroupPostSchema)
