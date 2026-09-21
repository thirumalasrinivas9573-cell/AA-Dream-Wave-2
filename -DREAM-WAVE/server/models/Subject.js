const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, trim: true, uppercase: true, maxlength: 30, default: '' },
    description: { type: String, default: '', maxlength: 2000 },
    credits: { type: Number, default: 0, min: 0, max: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $gt: '' } } }
);
subjectSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
