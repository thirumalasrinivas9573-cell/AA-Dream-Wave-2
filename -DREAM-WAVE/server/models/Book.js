const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    order: { type: Number, default: 1 },
    startPage: { type: Number, default: 0 },
    endPage: { type: Number, default: 0 },
    content: { type: String, default: '', maxlength: 50000 },
    summary: { type: String, default: '', maxlength: 5000 },
    keyConcepts: [{ type: String, maxlength: 200 }],
  },
  { _id: true }
);

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    chapterOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240, index: true },
    author: { type: String, required: true, trim: true, maxlength: 160, index: true },
    category: { type: String, required: true, index: true, maxlength: 80 },
    subject: { type: String, default: '', maxlength: 120, index: true },
    publisher: { type: String, default: '', maxlength: 160 },
    isbn: { type: String, default: '', maxlength: 32, index: true },
    version: { type: String, default: '1.0', maxlength: 40 },
    description: { type: String, default: '', maxlength: 5000 },
    coverUrl: { type: String, default: '' },
    pages: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, maxlength: 40 }],
    scope: {
      type: String,
      enum: ['public', 'personal', 'institution', 'company'],
      default: 'public',
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
      default: null,
      index: true,
    },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    extractedText: { type: String, default: '', maxlength: 200000 },
    searchIndex: { type: String, default: '', maxlength: 50000 },
    chapters: [chapterSchema],
    topics: [topicSchema],
    relatedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    processingStatus: {
      type: String,
      enum: ['none', 'processing', 'ready', 'failed'],
      default: 'none',
      index: true,
    },
    aiPrepared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', description: 'text', searchIndex: 'text', tags: 'text' });
bookSchema.index({ scope: 1, organizationId: 1, category: 1 });
bookSchema.index({ scope: 1, uploadedBy: 1 });
bookSchema.index({ createdAt: -1 });

const highlightSchema = new mongoose.Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId, default: null },
    text: { type: String, required: true, maxlength: 2000 },
    color: { type: String, default: 'yellow', maxlength: 20 },
    page: { type: Number, default: 0 },
    note: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

const noteSchema = new mongoose.Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId, default: null },
    body: { type: String, required: true, maxlength: 4000 },
    page: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const userBookSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    bookmarked: { type: Boolean, default: true },
    favorite: { type: Boolean, default: false, index: true },
    readingProgress: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['want', 'reading', 'done'], default: 'want' },
    currentChapter: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null, index: true },
    highlights: [highlightSchema],
    notes: [noteSchema],
  },
  { timestamps: true }
);

userBookSchema.index({ user: 1, book: 1 }, { unique: true });
userBookSchema.index({ user: 1, favorite: 1, updatedAt: -1 });
userBookSchema.index({ user: 1, lastViewedAt: -1 });

module.exports = {
  Book: mongoose.model('Book', bookSchema),
  UserBook: mongoose.model('UserBook', userBookSchema),
};
