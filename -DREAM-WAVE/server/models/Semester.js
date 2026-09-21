const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    order: { type: Number, default: 1, min: 1, max: 12 },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

semesterSchema.index({ organizationId: 1, academicYear: 1, name: 1 }, { unique: true });
semesterSchema.index({ organizationId: 1, isCurrent: 1 });

module.exports = mongoose.model('Semester', semesterSchema);
