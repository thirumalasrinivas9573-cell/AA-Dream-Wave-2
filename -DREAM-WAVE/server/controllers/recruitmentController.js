const recruitmentService = require('../services/recruitmentService')
const extendedService = require('../services/companyRecruitmentExtendedService')
const {
  LISTING_STATUSES,
  JOB_ACTIONS,
  INTERNSHIP_ACTIONS,
  DEFAULT_PIPELINE_STAGES,
  RECRUITMENT_REPORT_TYPES,
} = require('../constants/companyRecruitment')
const {
  COMPANY_ROLES,
  COMPANY_PERMISSIONS,
} = require('../constants/companyPermissions')
const {
  INTERVIEW_TYPES,
  OFFER_ACTIONS,
  ONBOARDING_STATUSES,
  EVALUATION_CRITERIA,
} = require('../constants/recruitment')
const { getRecruitmentAnalytics } = require('../services/recruitmentAnalyticsService')
const {
  generateRecruitmentReport,
  exportRecruitmentReport,
} = require('../services/recruitmentReportService')

function companyId(req) {
  if (!req.company?._id) {
    const err = new Error('Company profile required')
    err.statusCode = 403
    throw err
  }
  return req.company._id
}

exports.getMeta = (_req, res) => {
  res.json({
    success: true,
    stages: recruitmentService.APPLICATION_STAGES,
    tags: recruitmentService.RECRUITER_TAGS,
    rejectionReasons: recruitmentService.REJECTION_REASONS,
    interviewRounds: recruitmentService.INTERVIEW_ROUNDS,
    interviewRecommendations: recruitmentService.INTERVIEW_RECOMMENDATIONS,
    assessmentTypes: recruitmentService.ASSESSMENT_TYPES,
    listingStatuses: LISTING_STATUSES,
    jobActions: JOB_ACTIONS,
    internshipActions: INTERNSHIP_ACTIONS,
    defaultPipelineStages: DEFAULT_PIPELINE_STAGES,
    interviewTypes: INTERVIEW_TYPES,
    offerActions: OFFER_ACTIONS,
    onboardingStatuses: ONBOARDING_STATUSES,
    evaluationCriteria: EVALUATION_CRITERIA,
    companyRoles: COMPANY_ROLES,
    companyPermissions: COMPANY_PERMISSIONS,
    reportTypes: RECRUITMENT_REPORT_TYPES,
  })
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getRecruitmentAnalytics(companyId(req), req.query)
    res.json({ success: true, analytics })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: RECRUITMENT_REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generateRecruitmentReport(
      companyId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    res.json({ success: true, report })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.exportReport = async (req, res) => {
  try {
    const exported = await exportRecruitmentReport(
      companyId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query.format || 'csv',
    )
    res.json({ success: true, export: exported })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStats = async (req, res) => {
  try {
    const stats = await recruitmentService.getAtsStats(companyId(req))
    res.json({ success: true, stats })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getFunnel = async (req, res) => {
  try {
    const funnel = await recruitmentService.getFunnel(companyId(req))
    res.json({ success: true, funnel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listApplications = async (req, res) => {
  try {
    const result = await recruitmentService.listApplications(companyId(req), req.query)
    res.json({ success: true, applications: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getApplication = async (req, res) => {
  try {
    const detail = await recruitmentService.getApplicationDetail(
      companyId(req),
      req.params.id,
    )
    res.json({ success: true, ...detail })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createApplication = async (req, res) => {
  try {
    const app = await recruitmentService.createApplication(
      companyId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({
      success: true,
      application: recruitmentService.serializeApplication(app),
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.transitionStage = async (req, res) => {
  try {
    const app = await recruitmentService.transitionStage(
      companyId(req),
      req.params.id,
      req.body.stage,
      req.user._id,
      req.body,
    )
    res.json({ success: true, application: recruitmentService.serializeApplication(app) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.assignRecruiter = async (req, res) => {
  try {
    const app = await recruitmentService.assignRecruiter(
      companyId(req),
      req.params.id,
      req.body.recruiterUserId,
      req.user._id,
    )
    res.json({ success: true, application: recruitmentService.serializeApplication(app) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.bulkAssign = async (req, res) => {
  try {
    const results = await recruitmentService.bulkAssign(
      companyId(req),
      req.body.applicationIds || [],
      req.body.recruiterUserId,
      req.user._id,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.bulkTransition = async (req, res) => {
  try {
    const results = await recruitmentService.bulkTransition(
      companyId(req),
      req.body.applicationIds || [],
      req.body.stage,
      req.user._id,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.addNote = async (req, res) => {
  try {
    const note = await recruitmentService.addNote(
      companyId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, note })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateTags = async (req, res) => {
  try {
    const app = await recruitmentService.updateTags(
      companyId(req),
      req.params.id,
      req.body.tags || [],
      req.user._id,
    )
    res.json({ success: true, application: recruitmentService.serializeApplication(app) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateRatings = async (req, res) => {
  try {
    const app = await recruitmentService.updateRatings(
      companyId(req),
      req.params.id,
      req.body.ratings || {},
    )
    res.json({ success: true, application: recruitmentService.serializeApplication(app) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.scheduleInterview = async (req, res) => {
  try {
    const interview = await recruitmentService.scheduleInterview(
      companyId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, interview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.submitInterviewFeedback = async (req, res) => {
  try {
    const interview = await recruitmentService.submitInterviewFeedback(
      companyId(req),
      req.params.interviewId,
      req.user._id,
      req.body,
    )
    res.json({ success: true, interview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createAssessment = async (req, res) => {
  try {
    const assessment = await recruitmentService.createAssessment(
      companyId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, assessment })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.releaseOffer = async (req, res) => {
  try {
    const offer = await recruitmentService.releaseOffer(
      companyId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, offer })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.bulkUpdateTags = async (req, res) => {
  try {
    const results = await recruitmentService.bulkUpdateTags(
      companyId(req),
      req.body.applicationIds || [],
      req.body.tags || [],
      req.user._id,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAllowedTransitions = async (req, res) => {
  try {
    const app = await recruitmentService.assertCompanyApplication(
      companyId(req),
      req.params.id,
    )
    const transitions = recruitmentService.getAllowedTransitions(app.stage)
    res.json({ success: true, currentStage: app.stage, allowedTransitions: transitions })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listJobs = async (req, res) => {
  try {
    const result = await recruitmentService.listJobs(companyId(req), req.query)
    res.json({ success: true, jobs: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getJob = async (req, res) => {
  try {
    const job = await recruitmentService.getJob(companyId(req), req.params.id)
    res.json({ success: true, job })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createJob = async (req, res) => {
  try {
    const job = await recruitmentService.createJob(companyId(req), req.user._id, req.body)
    res.status(201).json({ success: true, job })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateJob = async (req, res) => {
  try {
    const job = await recruitmentService.updateJob(companyId(req), req.params.id, req.body)
    res.json({ success: true, job })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.transitionJob = async (req, res) => {
  try {
    const job = await recruitmentService.transitionJobStatus(
      companyId(req),
      req.params.id,
      req.body.action,
    )
    res.json({ success: true, job })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listInternships = async (req, res) => {
  try {
    const internships = await recruitmentService.listInternships(companyId(req), req.query)
    res.json({ success: true, internships })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInternship = async (req, res) => {
  try {
    const internship = await recruitmentService.getInternship(companyId(req), req.params.id)
    res.json({ success: true, internship })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createInternship = async (req, res) => {
  try {
    const internship = await recruitmentService.createInternship(
      companyId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, internship })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateInternship = async (req, res) => {
  try {
    const internship = await recruitmentService.updateInternship(
      companyId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, internship })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.transitionInternship = async (req, res) => {
  try {
    const internship = await recruitmentService.transitionInternshipStatus(
      companyId(req),
      req.params.id,
      req.body.action,
    )
    res.json({ success: true, internship })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProfile = async (req, res) => {
  try {
    const profile = await recruitmentService.getCompanyProfile(companyId(req))
    res.json({ success: true, profile })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await recruitmentService.updateCompanyProfile(companyId(req), req.body)
    res.json({ success: true, profile })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPipeline = async (req, res) => {
  try {
    const pipeline = await recruitmentService.getPipelineConfig(companyId(req))
    res.json({ success: true, pipeline })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updatePipeline = async (req, res) => {
  try {
    const pipeline = await recruitmentService.updatePipelineConfig(
      companyId(req),
      req.body.stages,
    )
    res.json({ success: true, pipeline })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listApplicants = async (req, res) => {
  try {
    const result = await recruitmentService.listApplicantDirectory(companyId(req), req.query)
    res.json({ success: true, applicants: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listShortlisted = async (req, res) => {
  try {
    const result = await recruitmentService.listShortlisted(companyId(req), req.query)
    res.json({ success: true, applications: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.bulkShortlistAction = async (req, res) => {
  try {
    const results = await recruitmentService.bulkShortlistAction(
      companyId(req),
      req.body.applicationIds || [],
      req.body.action,
      req.user._id,
      req.body,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.completeAssessment = async (req, res) => {
  try {
    const assessment = await recruitmentService.completeAssessment(
      companyId(req),
      req.params.assessmentId,
      req.user._id,
      req.body,
    )
    res.json({ success: true, assessment })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listInterviews = async (req, res) => {
  try {
    const interviews = await extendedService.listInterviews(companyId(req), req.query)
    res.json({ success: true, interviews })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.rescheduleInterview = async (req, res) => {
  try {
    const interview = await extendedService.rescheduleInterview(
      companyId(req),
      req.params.interviewId,
      req.user._id,
      req.body,
    )
    res.json({ success: true, interview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.cancelInterview = async (req, res) => {
  try {
    const interview = await extendedService.cancelInterview(
      companyId(req),
      req.params.interviewId,
      req.user._id,
      req.body.reason,
    )
    res.json({ success: true, interview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.recordInterviewOutcome = async (req, res) => {
  try {
    const interview = await extendedService.recordInterviewOutcome(
      companyId(req),
      req.params.interviewId,
      req.user._id,
      req.body,
    )
    res.json({ success: true, interview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listPanels = async (req, res) => {
  try {
    const panels = await extendedService.listPanels(companyId(req))
    res.json({ success: true, panels })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createPanel = async (req, res) => {
  try {
    const panel = await extendedService.createPanel(companyId(req), req.user._id, req.body)
    res.status(201).json({ success: true, panel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updatePanel = async (req, res) => {
  try {
    const panel = await extendedService.updatePanel(companyId(req), req.params.id, req.body)
    res.json({ success: true, panel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.assignPanel = async (req, res) => {
  try {
    const panel = await extendedService.assignPanelToApplication(
      companyId(req),
      req.params.id,
      req.body.applicationId,
    )
    res.json({ success: true, panel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createOfferDraft = async (req, res) => {
  try {
    const offer = await extendedService.createOfferDraft(
      companyId(req),
      req.params.applicationId,
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, offer })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.transitionOffer = async (req, res) => {
  try {
    const offer = await extendedService.transitionOffer(
      companyId(req),
      req.params.id,
      req.body.action,
      req.user._id,
      req.body,
    )
    res.json({ success: true, offer })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateOnboarding = async (req, res) => {
  try {
    const application = await extendedService.updateOnboardingStatus(
      companyId(req),
      req.params.applicationId,
      req.body.status,
      req.user._id,
      req.body.note,
    )
    res.json({ success: true, application: recruitmentService.serializeApplication(application) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.discoverTalent = async (req, res) => {
  try {
    const result = await extendedService.discoverTalent(companyId(req), req.query)
    res.json({ success: true, candidates: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.sendCommunication = async (req, res) => {
  try {
    const results = await extendedService.sendBulkCommunication(
      companyId(req),
      req.user._id,
      req.body,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateTeam = async (req, res) => {
  try {
    const team = await extendedService.updateRecruiterTeam(companyId(req), req.body.team)
    res.json({ success: true, team })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listPartners = async (req, res) => {
  try {
    const partners = await extendedService.listPartnerInstitutions(companyId(req))
    res.json({ success: true, partners })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

const recruitmentAiService = require('../services/recruitmentAiService')
const {
  buildSafeCandidateProfile,
  buildRuleBasedCandidateSummary,
} = require('../services/recruitmentIntelligenceService')
const InstitutionStudent = require('../models/InstitutionStudent')
const RecruitmentJob = require('../models/RecruitmentJob')

exports.getCandidateIntelligence = async (req, res) => {
  try {
    const cid = companyId(req)
    const detail = await recruitmentService.getApplicationDetail(cid, req.params.id)
    let student = null
    if (detail.application?.institutionStudentId) {
      student = await InstitutionStudent.findById(detail.application.institutionStudentId)
    }
    const profile = student
      ? buildSafeCandidateProfile(student, detail.application)
      : { snapshot: detail.application?.candidateSnapshot || {} }
    res.json({ success: true, profile })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCandidateAiSummary = async (req, res) => {
  try {
    const cid = companyId(req)
    const app = await recruitmentService.assertCompanyApplication(cid, req.params.id)
    const student = app.institutionStudentId
      ? await InstitutionStudent.findById(app.institutionStudentId)
      : null
    const job = app.jobId ? await RecruitmentJob.findById(app.jobId).lean() : null
    const summary = student
      ? await recruitmentAiService.generateCandidateSummary(student, app, job)
      : buildRuleBasedCandidateSummary({ fullName: app.candidateSnapshot?.name, sharedSkills: app.candidateSnapshot?.skills || [] }, app, job)
    res.json({ success: true, summary })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.analyzeJob = async (req, res) => {
  try {
    const job = await recruitmentService.getJob(companyId(req), req.params.id)
    const analysis = await recruitmentAiService.analyzeJobDescription(job)
    res.json({ success: true, analysis })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.suggestInterviewQuestions = async (req, res) => {
  try {
    const cid = companyId(req)
    const app = await recruitmentService.assertCompanyApplication(cid, req.params.id)
    const student = app.institutionStudentId
      ? await InstitutionStudent.findById(app.institutionStudentId)
      : { sharedSkills: app.candidateSnapshot?.skills || [], sharedProjects: [] }
    const job = app.jobId
      ? await RecruitmentJob.findById(app.jobId).lean()
      : { title: app.roleTitle, requiredSkills: (app.skillsSummary || '').split(',').map((s) => s.trim()) }
    const suggestions = await recruitmentAiService.suggestInterviewQuestions(job, student)
    res.json({ success: true, suggestions })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.compareCandidates = async (req, res) => {
  try {
    const cid = companyId(req)
    const ids = Array.isArray(req.body.applicationIds) ? req.body.applicationIds.slice(0, 5) : []
    const comparisons = []
    for (const id of ids) {
      const app = await recruitmentService.assertCompanyApplication(cid, id)
      const student = app.institutionStudentId
        ? await InstitutionStudent.findById(app.institutionStudentId)
        : null
      const job = app.jobId ? await RecruitmentJob.findById(app.jobId).lean() : null
      comparisons.push({
        applicationId: id,
        candidateName: app.candidateSnapshot?.name || student?.fullName || 'Candidate',
        summary: student
          ? buildRuleBasedCandidateSummary(student, app, job)
          : buildRuleBasedCandidateSummary({ fullName: app.candidateSnapshot?.name, sharedSkills: app.candidateSnapshot?.skills || [] }, app, job),
      })
    }
    res.json({ success: true, comparisons })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
