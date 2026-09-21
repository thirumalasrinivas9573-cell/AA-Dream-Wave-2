const mongoose = require('mongoose')
const { APPLICATION_STAGES, RECRUITER_TAGS, ONBOARDING_STATUSES } = require('../constants/recruitment')

/** Canonical recruitment application — single source of truth for ATS */
const recruitmentApplicationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    candidateUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    /** Recruitment-safe snapshot — never auto-sync full student profile */
    candidateSnapshot: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      skills: [{ type: String, trim: true }],
      education: [{ type: String, trim: true }],
      experience: [{ type: String, trim: true }],
      projects: [{ type: String, trim: true }],
      certificates: [{ type: String, trim: true }],
      portfolioUrl: { type: String, trim: true, default: '' },
    },
    opportunityType: {
      type: String,
      enum: ['job', 'internship', 'drive', 'campus_opportunity'],
      required: true,
    },
    campusOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampusOpportunity',
      default: null,
      index: true,
    },
    institutionStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      default: null,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentJob',
      default: null,
      index: true,
    },
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentInternship',
      default: null,
      index: true,
    },
    driveId: { type: String, trim: true, default: null },
    roleTitle: { type: String, required: true, trim: true },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    institutionName: { type: String, trim: true, default: '' },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionCompanyPartnership',
      default: null,
    },
    department: { type: String, trim: true, default: '' },
    graduationYear: { type: String, trim: true, default: '' },
    cgpa: { type: Number, default: null },
    skillsSummary: { type: String, trim: true, default: '' },
    stage: {
      type: String,
      enum: APPLICATION_STAGES,
      default: 'applied',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    tags: [{ type: String, enum: RECRUITER_TAGS }],
    assignedRecruiterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: { type: Date, default: null },
    assignedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    applicationAnswers: [
      {
        question: { type: String, trim: true, default: '' },
        answer: { type: String, trim: true, default: '' },
        answerType: { type: String, trim: true, default: 'text' },
      },
    ],
    resumeUrl: { type: String, trim: true, default: '' },
    resumeFileName: { type: String, trim: true, default: '' },
    resumeUploadedAt: { type: Date, default: null },
    ratings: {
      technicalFit: { type: Number, min: 1, max: 5, default: null },
      communication: { type: Number, min: 1, max: 5, default: null },
      experienceFit: { type: Number, min: 1, max: 5, default: null },
      roleFit: { type: Number, min: 1, max: 5, default: null },
    },
    rejectionInternalReason: { type: String, trim: true, default: '' },
    rejectionCandidateMessage: { type: String, trim: true, default: '' },
    withdrawnAt: { type: Date, default: null },
    withdrawnBy: {
      type: String,
      enum: ['candidate', 'recruiter', 'system'],
    },
    onboarding: {
      status: {
        type: String,
        enum: ONBOARDING_STATUSES,
      },
      history: [
        {
          status: { type: String, trim: true },
          note: { type: String, trim: true, default: '' },
          actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          at: { type: Date, default: Date.now },
        },
      ],
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

recruitmentApplicationSchema.index({ companyId: 1, stage: 1 })
recruitmentApplicationSchema.index({ companyId: 1, updatedAt: -1 })
recruitmentApplicationSchema.index(
  { companyId: 1, candidateUserId: 1, jobId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      jobId: { $type: 'objectId' },
      stage: { $nin: ['rejected', 'withdrawn'] },
    },
  },
)
recruitmentApplicationSchema.index(
  { companyId: 1, candidateUserId: 1, internshipId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      internshipId: { $type: 'objectId' },
      stage: { $nin: ['rejected', 'withdrawn'] },
    },
  },
)
recruitmentApplicationSchema.index(
  { institutionId: 1, institutionStudentId: 1, campusOpportunityId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      campusOpportunityId: { $type: 'objectId' },
      stage: { $nin: ['rejected', 'withdrawn'] },
    },
  },
)
recruitmentApplicationSchema.index({ institutionId: 1, stage: 1 })
recruitmentApplicationSchema.index({
  'candidateSnapshot.name': 'text',
  roleTitle: 'text',
  skillsSummary: 'text',
})

module.exports = mongoose.model('RecruitmentApplication', recruitmentApplicationSchema)
