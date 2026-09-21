const mongoose = require('mongoose');

const classSectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, uppercase: true, maxlength: 30, default: '' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
      index: true,
    },
    semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', default: null, index: true },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    capacity: { type: Number, default: 40, min: 1, max: 500 },
    room: { type: String, default: '', maxlength: 60 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSectionSchema.index({ organizationId: 1, name: 1 }, { unique: true });
classSectionSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $gt: '' } } }
);
classSectionSchema.index({ students: 1 });
classSectionSchema.index({ teachers: 1 });
classSectionSchema.index({ classTeacher: 1 }, { sparse: true });

module.exports = mongoose.model('ClassSection', classSectionSchema);
