const mongoose = require('mongoose');

const lmsLessonSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsCourse', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsModule', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    order: { type: Number, default: 0, min: 0, index: true },
    type: {
      type: String,
      enum: ['video', 'reading', 'pdf', 'interactive', 'ai'],
      default: 'reading',
      index: true,
    },
    content: {
      body: { type: String, default: '', maxlength: 100000 },
      videoUrl: { type: String, default: '', maxlength: 500 },
      pdfUrl: { type: String, default: '', maxlength: 500 },
      assetId: { type: String, default: '', maxlength: 120 },
      interactiveConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
      aiPrompt: { type: String, default: '', maxlength: 4000 },
    },
    durationMinutes: { type: Number, default: 10, min: 0, max: 600 },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LmsLesson' }],
    required: { type: Boolean, default: true },
  },
  { timestamps: true }
);

lmsLessonSchema.index({ module: 1, order: 1 });
lmsLessonSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('LmsLesson', lmsLessonSchema);
