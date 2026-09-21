const mongoose = require('mongoose')

const academicPeriodSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 120 },
  system: { type: String, enum: ['semester', 'year', 'term', 'custom'], default: 'semester' },
  year: { type: Number, min: 1, max: 12 },
  semester: { type: Number, min: 1, max: 12 },
  term: { type: String, trim: true, maxlength: 40 },
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true },
}, { _id: true })

const academicProfileSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  program: { type: String, trim: true, maxlength: 160, default: '' },
  branch: { type: String, trim: true, maxlength: 160, default: '' },
  academicSystem: { type: String, enum: ['semester', 'year', 'term', 'custom'], default: 'semester' },
  currentYear: { type: Number, min: 1, max: 12 },
  preferences: {
    dailyStudyMinutes: { type: Number, min: 15, max: 720, default: 120 },
    preferredStudyTimes: [{ type: String, trim: true, maxlength: 40 }],
  },
  periods: [academicPeriodSchema],
}, { timestamps: true })

module.exports = mongoose.model('AcademicProfile', academicProfileSchema)
