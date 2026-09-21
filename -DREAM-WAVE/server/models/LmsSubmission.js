const mongoose = require('mongoose');

const lmsSubmissionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsAssignment',
      required: true,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, default: '', maxlength: 50000 },
    fileUrl: { type: String, default: '', maxlength: 500 },
    score: { type: Number, default: null, min: 0, max: 1000 },
    feedback: { type: String, default: '', maxlength: 5000 },
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded', 'returned'],
      default: 'submitted',
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

lmsSubmissionSchema.index({ assignment: 1, user: 1 }, { unique: true });
lmsSubmissionSchema.index({ course: 1, user: 1, status: 1 });

module.exports = mongoose.model('LmsSubmission', lmsSubmissionSchema);
