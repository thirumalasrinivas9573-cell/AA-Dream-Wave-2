const mongoose = require('mongoose')

const recruitmentInternshipSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    mentorName: { type: String, trim: true, default: '' },
    mentorEmail: { type: String, trim: true, default: '' },
    mentorTitle: { type: String, trim: true, default: '' },
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'office'],
      default: 'hybrid',
    },
    stipend: { type: Number, default: 0 },
    eligibility: { type: String, trim: true, default: '' },
    requiredSkills: [{ type: String, trim: true }],
    deadline: { type: Date, default: null },
    openPositions: { type: Number, default: 1, min: 0 },
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
      enum: ['open', 'closed', 'draft', 'published', 'archived', 'paused'],
      default: 'draft',
      index: true,
    },
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

recruitmentInternshipSchema.index({ companyId: 1, status: 1 })

module.exports = mongoose.model('RecruitmentInternship', recruitmentInternshipSchema)
