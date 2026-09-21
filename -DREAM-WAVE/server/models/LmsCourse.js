const mongoose = require('mongoose');

const lmsCourseSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 220 },
    description: { type: String, default: '', maxlength: 8000 },
    category: { type: String, default: 'general', maxlength: 80, index: true },
    tags: [{ type: String, maxlength: 40 }],
    version: { type: Number, default: 1, min: 1 },
    versionNotes: { type: String, default: '', maxlength: 2000 },
    visibility: {
      type: String,
      enum: ['private', 'org', 'public'],
      default: 'org',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse' }],
    estimatedHours: { type: Number, default: 0, min: 0, max: 1000 },
    thumbnailUrl: { type: String, default: '', maxlength: 500 },
    academicCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    classSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection' }],
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lmsCourseSchema.index(
  { organizationId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { organizationId: { $type: 'objectId' } } }
);
lmsCourseSchema.index(
  { createdBy: 1, slug: 1 },
  { unique: true, partialFilterExpression: { organizationId: null } }
);
lmsCourseSchema.index({ status: 1, visibility: 1, category: 1 });

module.exports = mongoose.model('LmsCourse', lmsCourseSchema);
