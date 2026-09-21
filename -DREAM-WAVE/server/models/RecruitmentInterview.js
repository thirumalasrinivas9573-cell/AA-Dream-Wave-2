const mongoose = require('mongoose')
const {
  INTERVIEW_ROUNDS,
  INTERVIEW_STATUSES,
  INTERVIEW_RECOMMENDATIONS,
  INTERVIEW_TYPES,
  EVALUATION_CRITERIA,
} = require('../constants/recruitment')

const recruitmentInterviewSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentApplication',
      required: true,
      index: true,
    },
    candidateUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    roleTitle: { type: String, trim: true, default: '' },
    round: { type: String, enum: INTERVIEW_ROUNDS, default: 'Screening' },
    interviewType: {
      type: String,
      enum: INTERVIEW_TYPES,
      default: 'online',
    },
    panelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewPanel',
      default: null,
    },
    interviewers: [{ type: String, trim: true }],
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, trim: true, default: '' },
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid', 'phone', 'onsite'],
      default: 'online',
    },
    meetingLink: { type: String, trim: true, default: '' },
    venue: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'scheduled',
      index: true,
    },
    attendance: {
      type: String,
      enum: ['present', 'absent', 'no_show'],
      default: undefined,
    },
    rescheduledFrom: { type: Date, default: null },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    feedback: {
      recommendation: {
        type: String,
        enum: INTERVIEW_RECOMMENDATIONS,
      },
      strengths: { type: String, trim: true, default: '' },
      concerns: { type: String, trim: true, default: '' },
      technicalFeedback: { type: String, trim: true, default: '' },
      communicationFeedback: { type: String, trim: true, default: '' },
      roleFit: { type: String, trim: true, default: '' },
      privateNotes: { type: String, trim: true, default: '' },
      scores: {
        technicalSkills: { type: Number, min: 1, max: 5, default: null },
        communication: { type: Number, min: 1, max: 5, default: null },
        problemSolving: { type: Number, min: 1, max: 5, default: null },
        leadership: { type: Number, min: 1, max: 5, default: null },
        teamwork: { type: Number, min: 1, max: 5, default: null },
        domainKnowledge: { type: Number, min: 1, max: 5, default: null },
      },
      submittedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      submittedAt: { type: Date, default: null },
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

recruitmentInterviewSchema.index({ companyId: 1, scheduledDate: 1 })

module.exports = mongoose.model('RecruitmentInterview', recruitmentInterviewSchema)
