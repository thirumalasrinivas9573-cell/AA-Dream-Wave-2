const mongoose = require('mongoose');

const lmsModuleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 4000 },
    order: { type: Number, default: 0, min: 0, index: true },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LmsModule' }],
    estimatedMinutes: { type: Number, default: 0, min: 0, max: 10000 },
  },
  { timestamps: true }
);

lmsModuleSchema.index({ course: 1, order: 1 });
lmsModuleSchema.index({ course: 1, title: 1 });

module.exports = mongoose.model('LmsModule', lmsModuleSchema);
