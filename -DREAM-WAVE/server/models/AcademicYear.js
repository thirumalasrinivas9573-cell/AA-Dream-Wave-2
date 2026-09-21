const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

academicYearSchema.index({ organizationId: 1, name: 1 }, { unique: true });
academicYearSchema.index({ organizationId: 1, isCurrent: 1 });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
