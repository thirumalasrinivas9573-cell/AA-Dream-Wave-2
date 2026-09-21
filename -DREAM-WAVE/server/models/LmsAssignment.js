const mongoose = require('mongoose');

const lmsAssignmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsModule', default: null },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsLesson', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 10000 },
    dueAt: { type: Date, default: null, index: true },
    maxScore: { type: Number, default: 100, min: 0, max: 1000 },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

lmsAssignmentSchema.index({ course: 1, status: 1, dueAt: 1 });

module.exports = mongoose.model('LmsAssignment', lmsAssignmentSchema);
