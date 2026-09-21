const mongoose = require('mongoose')

const SOURCE_TYPES = ['url', 'book', 'document', 'note', 'academic', 'manual']

const PROCESSING_STATUS = ['UPLOADED', 'PROCESSING', 'READY', 'PARTIAL', 'FAILED']
const TRUST_CLASSES = ['PRIMARY', 'SECONDARY', 'USER_PROVIDED', 'SYSTEM_GENERATED']
const DOCUMENT_FORMATS = ['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'TXT', 'CSV', 'OTHER', 'UNKNOWN']

const researchSourceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  sourceType: { type: String, enum: SOURCE_TYPES, default: 'manual' },
  url: { type: String, trim: true, maxlength: 2000, default: '' },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook' },
  rawText: { type: String, maxlength: 200000, default: '' },
  fileHash: { type: String, trim: true, maxlength: 128, index: true },
  author: { type: String, trim: true, maxlength: 200, default: '' },
  excerpt: { type: String, trim: true, maxlength: 2000, default: '' },
  publication: { type: String, trim: true, maxlength: 300, default: '' },
  publishedAt: Date,
  indexedAt: Date,
  chunkCount: { type: Number, min: 0, default: 0 },
  // V4 Prompt 4 — document processing (does not replace file storage)
  processingStatus: { type: String, enum: PROCESSING_STATUS, default: 'UPLOADED', index: true },
  processingError: { type: String, trim: true, maxlength: 500, default: '' },
  documentFormat: { type: String, enum: DOCUMENT_FORMATS, default: 'UNKNOWN' },
  trustClass: { type: String, enum: TRUST_CLASSES, default: 'USER_PROVIDED' },
  topics: [{ type: String, trim: true, maxlength: 80 }],
}, { timestamps: true })

researchSourceSchema.index({ studentId: 1, projectId: 1, updatedAt: -1 })

module.exports = mongoose.model('ResearchSource', researchSourceSchema)
module.exports.SOURCE_TYPES = SOURCE_TYPES
module.exports.PROCESSING_STATUS = PROCESSING_STATUS
module.exports.TRUST_CLASSES = TRUST_CLASSES
module.exports.DOCUMENT_FORMATS = DOCUMENT_FORMATS
