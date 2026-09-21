const mongoose = require('mongoose');

/** Canonical taxonomy for Dream Wave Knowledge Center. */
const CANONICAL_CATEGORIES = [
  'Engineering', 'Computer Science', 'Artificial Intelligence', 'Machine Learning',
  'Cyber Security', 'Cloud Computing', 'Programming', 'Data Structures',
  'Algorithms', 'Operating Systems', 'Databases', 'Networking', 'Business',
  'Finance', 'Marketing', 'Psychology', 'Physics', 'Mathematics', 'Chemistry',
  'Biology', 'History', 'Literature', 'Self Improvement', 'UPSC', 'GATE',
  'JEE', 'NEET', 'Research Papers', 'Open Educational Resources', 'General',
];

const libraryBookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  subtitle: { type: String, default: '' },
  author: { type: String, default: '', index: true },
  authors: [{ type: String }],
  publisher: { type: String, default: '', index: true },
  edition: { type: String, default: '' },
  publicationYear: { type: Number, default: null },
  language: { type: String, default: 'en', index: true },
  isbn: { type: String, default: '', index: true },
  category: { type: String, default: 'General', index: true },
  categories: [{ type: String }],
  tags: [{ type: String }],
  subjects: [{ type: String }],
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  pdfUrl: { type: String, required: true },
  pages: { type: Number, default: 0 },
  estimatedMinutes: { type: Number, default: 0 },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', ''], default: '' },
  tableOfContents: [{ title: String, page: Number }],
  license: {
    type: {
      type: String,
      enum: ['public-domain', 'open-educational-resource', 'institution-licensed', 'external-legal-source', 'user-uploaded'],
      default: 'institution-licensed',
    },
    licenseCode: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },
    attribution: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    rightsHolder: { type: String, default: '' },
    validUntil: Date,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedAt: Date,
    externalOnly: { type: Boolean, default: false },
    allowDownload: { type: Boolean, default: false },
    allowPrint: { type: Boolean, default: false },
  },
  ownerType: { type: String, enum: ['platform', 'institution', 'company', 'admin', 'student'], default: 'platform', index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  resourceType: {
    type: String,
    enum: ['book', 'ebook', 'legal-pdf', 'article', 'document', 'note', 'course', 'video', 'reference', 'practice', 'institution-resource'],
    default: 'book',
    index: true,
  },
  processingStatus: {
    type: String,
    enum: ['uploaded', 'processing', 'ready', 'failed'],
    default: 'uploaded',
    index: true,
  },
  indexedAt: Date,
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', index: true },
  featured: { type: Boolean, default: false },
  editorsPick: { type: Boolean, default: false },
  aiPick: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  aiSummary: { type: String, default: '' },
  aiKeyPoints: [{ type: String }],
  aiFlashcards: [{ question: String, answer: String }],
  aiQuestions: [{ question: String, answer: String }],
  aiRoadmap: [{ step: String, topic: String }],
  status: { type: String, enum: ['active', 'archived', 'pending'], default: 'active', index: true },
}, { timestamps: true });

libraryBookSchema.index({
  title: 'text', subtitle: 'text', author: 'text', publisher: 'text',
  description: 'text', isbn: 'text', tags: 'text', subjects: 'text',
});
libraryBookSchema.index({ status: 1, createdAt: -1 });
libraryBookSchema.index({ status: 1, category: 1, createdAt: -1 });
libraryBookSchema.index({ status: 1, views: -1 });
libraryBookSchema.index({ ownerType: 1, ownerId: 1, status: 1 });

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
module.exports.CANONICAL_CATEGORIES = CANONICAL_CATEGORIES;
