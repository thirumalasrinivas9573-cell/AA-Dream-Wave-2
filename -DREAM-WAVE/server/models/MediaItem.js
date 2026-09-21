const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, maxlength: 40 },
    fileUrl: { type: String, required: true },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    note: { type: String, default: '', maxlength: 400 },
  },
  { _id: true }
);

const mediaItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240, index: true },
    description: { type: String, default: '', maxlength: 5000 },
    type: {
      type: String,
      enum: ['animation', 'video', 'audio'],
      required: true,
      index: true,
    },
    category: { type: String, default: 'General', maxlength: 80, index: true },
    subject: { type: String, default: '', maxlength: 120, index: true },
    grade: { type: String, default: '', maxlength: 40, index: true },
    topics: [{ type: String, maxlength: 120 }],
    tags: [{ type: String, maxlength: 40 }],
    language: { type: String, default: 'en', maxlength: 16 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    scope: {
      type: String,
      enum: ['public', 'personal', 'institution', 'company'],
      default: 'personal',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0, min: 0 },
    thumbnailUrl: { type: String, default: '' },
    allowDownload: { type: Boolean, default: false },
    version: { type: String, default: '1.0', maxlength: 40 },
    versionHistory: [versionSchema],
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null, index: true },
    chapterId: { type: String, default: '', maxlength: 64 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    skills: [{ type: String, maxlength: 80 }],
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', ''],
      default: '',
    },
    learningObjectives: [{ type: String, maxlength: 240 }],
    quizTrigger: {
      enabled: { type: Boolean, default: false },
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null },
      prompt: { type: String, default: '', maxlength: 500 },
    },
    views: { type: Number, default: 0, min: 0 },
    completions: { type: Number, default: 0, min: 0 },
    totalWatchSec: { type: Number, default: 0, min: 0 },
    searchIndex: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true }
);

mediaItemSchema.index({
  title: 'text',
  description: 'text',
  searchIndex: 'text',
  category: 'text',
  subject: 'text',
  topics: 'text',
  tags: 'text',
});
mediaItemSchema.index({ scope: 1, organizationId: 1, type: 1, status: 1 });
mediaItemSchema.index({ scope: 1, uploadedBy: 1, status: 1 });
mediaItemSchema.index({ type: 1, category: 1, subject: 1, grade: 1 });
mediaItemSchema.index({ book: 1, status: 1 });
mediaItemSchema.index({ course: 1, status: 1 });
mediaItemSchema.index({ skills: 1, type: 1, status: 1 });
mediaItemSchema.index({ type: 1, difficulty: 1, status: 1 });
mediaItemSchema.index({ createdAt: -1 });
mediaItemSchema.index({ organizationId: 1, createdAt: -1 });
mediaItemSchema.index({ views: -1 });

mediaItemSchema.methods.rebuildSearchIndex = function rebuildSearchIndex() {
  this.searchIndex = [
    this.title,
    this.description,
    this.category,
    this.subject,
    this.grade,
    ...(this.topics || []),
    ...(this.tags || []),
    ...(this.skills || []),
    ...(this.learningObjectives || []),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 20000);
};

module.exports = mongoose.model('MediaItem', mediaItemSchema);
