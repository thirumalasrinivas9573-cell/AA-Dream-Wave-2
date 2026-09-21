const mongoose = require('mongoose');

const libraryCollectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true, index: true },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  type: {
    type: String,
    enum: ['career', 'course', 'research', 'featured', 'editors', 'learning-path', 'institution', 'company', 'custom'],
    default: 'custom',
    index: true,
  },
  ownerType: { type: String, enum: ['platform', 'institution', 'company', 'admin'], default: 'platform', index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', index: true },
  bookIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook' }],
  tags: [{ type: String }],
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['published', 'draft'], default: 'published', index: true },
}, { timestamps: true });

module.exports = mongoose.model('LibraryCollection', libraryCollectionSchema);
