const mongoose = require('mongoose')

const recruitmentJobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'office'],
      default: 'hybrid',
    },
    salary: { type: Number, default: 0 },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    experience: { type: String, trim: true, default: '' },
    eligibility: { type: String, trim: true, default: '' },
    requiredSkills: [{ type: String, trim: true }],
    responsibilities: { type: String, trim: true, default: '' },
    qualifications: { type: String, trim: true, default: '' },
    hiringManager: { type: String, trim: true, default: '' },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
    },
    deadline: { type: Date, default: null },
    selectionProcess: [{ type: String, trim: true }],
    applicationQuestions: [
      {
        question: String,
        type: { type: String, enum: ['text', 'yes_no', 'multiple_choice', 'numeric', 'url'] },
        options: [String],
        required: Boolean,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'paused', 'closed', 'draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    openings: { type: Number, default: 1, min: 0 },
    publishedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionCompanyPartnership',
      default: null,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

recruitmentJobSchema.index({ companyId: 1, status: 1 })
recruitmentJobSchema.index({ title: 'text', department: 'text' })

module.exports = mongoose.model('RecruitmentJob', recruitmentJobSchema)
