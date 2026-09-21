const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, maxlength: 240 },
    order: { type: Number, default: 0 },
    content: { type: String, default: '', maxlength: 50000 },
    summary: { type: String, default: '', maxlength: 5000 },
    keyConcepts: [{ type: String, maxlength: 120 }],
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

const relationshipSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, maxlength: 160 },
    to: { type: String, required: true, maxlength: 160 },
    type: { type: String, default: 'related', maxlength: 40 },
    weight: { type: Number, default: 1, min: 0, max: 10 },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    researchProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchProject',
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    originalName: String,
    fileUrl: { type: String, required: true },
    mimeType: String,
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'ppt', 'pptx', 'image', 'text', 'other'],
      default: 'other',
    },
    size: Number,
    extractedText: { type: String, default: '' },
    summary: { type: String, default: '' },
    notes: { type: String, default: '' },
    keyPoints: [String],
    quizzes: [
      {
        question: String,
        options: [String],
        answer: String,
        explanation: String,
      },
    ],
    status: { type: String, enum: ['uploaded', 'processed', 'failed'], default: 'uploaded' },
    chapters: { type: [chapterSchema], default: [] },
    topics: { type: [topicSchema], default: [] },
    concepts: [{ type: String, maxlength: 120 }],
    keywords: [{ type: String, maxlength: 80 }],
    relationships: { type: [relationshipSchema], default: [] },
    knowledgeGraph: {
      nodes: [
        {
          id: String,
          label: String,
          kind: { type: String, default: 'concept' },
        },
      ],
      edges: [
        {
          from: String,
          to: String,
          type: { type: String, default: 'related' },
        },
      ],
    },
    readingProgress: {
      percent: { type: Number, default: 0, min: 0, max: 100 },
      lastPosition: { type: Number, default: 0, min: 0 },
      lastReadAt: { type: Date, default: null },
    },
    tags: [{ type: String, maxlength: 40 }],
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchCollection',
      default: null,
    },
    folderPath: { type: String, default: '/', maxlength: 240 },
    searchIndex: { type: String, default: '', maxlength: 50000 },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

documentSchema.index({ user: 1, createdAt: -1 });
documentSchema.index({ organizationId: 1, user: 1 });
documentSchema.index({ organizationId: 1, createdAt: -1 });
documentSchema.index({ researchProject: 1, createdAt: -1 });
documentSchema.index({ user: 1, researchProject: 1, createdAt: -1 });
documentSchema.index({ user: 1, tags: 1 });
documentSchema.index({ title: 'text', searchIndex: 'text', keywords: 'text', concepts: 'text' });

module.exports = mongoose.model('Document', documentSchema);
