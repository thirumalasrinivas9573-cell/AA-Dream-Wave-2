const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveCompanyMember,
  requireCompanyPermission,
} = require('../middleware/companyPermission')
const recruitmentController = require('../controllers/recruitmentController')
const businessIntelligenceController = require('../controllers/businessIntelligenceController')

const companyAuth = [auth, requireRole('company'), resolveOrganization, resolveCompanyMember]

router.get('/meta', companyAuth, recruitmentController.getMeta)
router.get('/bi/dashboard', companyAuth, requireCompanyPermission('analytics.read'), businessIntelligenceController.getCompanyDashboard)
router.get('/bi/funnel', companyAuth, requireCompanyPermission('analytics.read'), businessIntelligenceController.getCompanyFunnel)
router.get('/bi/skills', companyAuth, requireCompanyPermission('analytics.read'), businessIntelligenceController.getCompanySkills)
router.get('/bi/trends', companyAuth, requireCompanyPermission('analytics.read'), businessIntelligenceController.getCompanyTrends)
router.post('/bi/ai/insights', companyAuth, requireCompanyPermission('analytics.read'), businessIntelligenceController.getCompanyAiInsights)
router.get('/analytics', companyAuth, requireCompanyPermission('analytics.read'), recruitmentController.getAnalytics)
router.get('/stats', companyAuth, requireCompanyPermission('analytics.read'), recruitmentController.getStats)
router.get('/funnel', companyAuth, requireCompanyPermission('analytics.read'), recruitmentController.getFunnel)

router.get('/reports/types', companyAuth, requireCompanyPermission('reports.read'), recruitmentController.getReportTypes)
router.get('/reports/:type/export', companyAuth, requireCompanyPermission('reports.generate'), recruitmentController.exportReport)
router.get('/reports/:type', companyAuth, requireCompanyPermission('reports.read'), recruitmentController.previewReport)

router.get('/profile', companyAuth, recruitmentController.getProfile)
router.patch('/profile', companyAuth, requireCompanyPermission('profile.manage'), recruitmentController.updateProfile)

router.get('/team', companyAuth, recruitmentController.getProfile)
router.patch('/team', companyAuth, requireCompanyPermission('team.manage'), recruitmentController.updateTeam)

router.get('/partners', companyAuth, recruitmentController.listPartners)

router.get('/pipeline', companyAuth, recruitmentController.getPipeline)
router.patch('/pipeline', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.updatePipeline)

router.get('/applicants', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.listApplicants)
router.get('/talent/discover', companyAuth, requireCompanyPermission('talent.discover'), recruitmentController.discoverTalent)
router.get('/shortlist', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.listShortlisted)
router.post('/shortlist/bulk', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.bulkShortlistAction)

router.post('/communications', companyAuth, requireCompanyPermission('communications.send'), recruitmentController.sendCommunication)

router.get('/interviews', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.listInterviews)
router.patch('/interviews/:interviewId', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.rescheduleInterview)
router.post('/interviews/:interviewId/cancel', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.cancelInterview)
router.post('/interviews/:interviewId/outcome', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.recordInterviewOutcome)
router.post('/interviews/:interviewId/feedback', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.submitInterviewFeedback)

router.get('/panels', companyAuth, requireCompanyPermission('panels.manage'), recruitmentController.listPanels)
router.post('/panels', companyAuth, requireCompanyPermission('panels.manage'), recruitmentController.createPanel)
router.patch('/panels/:id', companyAuth, requireCompanyPermission('panels.manage'), recruitmentController.updatePanel)
router.post('/panels/:id/assign', companyAuth, requireCompanyPermission('panels.manage'), recruitmentController.assignPanel)

router.get('/applications', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.listApplications)
router.post('/applications', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.createApplication)
router.post('/applications/bulk/assign', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.bulkAssign)
router.post('/applications/bulk/stage', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.bulkTransition)
router.post('/applications/bulk/tags', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.bulkUpdateTags)
router.get('/applications/:id', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.getApplication)
router.patch('/applications/:id/stage', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.transitionStage)
router.patch('/applications/:id/assign', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.assignRecruiter)
router.post('/applications/:id/notes', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.addNote)
router.patch('/applications/:id/tags', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.updateTags)
router.patch('/applications/:id/ratings', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.updateRatings)
router.post('/applications/:id/interviews', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.scheduleInterview)
router.post('/applications/:id/assessments', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.createAssessment)
router.post('/applications/:id/offer', companyAuth, requireCompanyPermission('offers.manage'), recruitmentController.releaseOffer)
router.post('/applications/:applicationId/offer/draft', companyAuth, requireCompanyPermission('offers.manage'), recruitmentController.createOfferDraft)
router.patch('/applications/:applicationId/onboarding', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.updateOnboarding)
router.get('/applications/:id/intelligence', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.getCandidateIntelligence)
router.post('/applications/:id/ai-summary', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.getCandidateAiSummary)
router.post('/applications/:id/interview-questions', companyAuth, requireCompanyPermission('interviews.manage'), recruitmentController.suggestInterviewQuestions)
router.post('/applications/compare', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.compareCandidates)

router.get('/applications/:id/transitions', companyAuth, requireCompanyPermission('applications.read'), recruitmentController.getAllowedTransitions)

router.post('/offers/:id/action', companyAuth, requireCompanyPermission('offers.manage'), recruitmentController.transitionOffer)

router.post('/assessments/:assessmentId/complete', companyAuth, requireCompanyPermission('applications.manage'), recruitmentController.completeAssessment)

router.get('/jobs', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.listJobs)
router.post('/jobs', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.createJob)
router.get('/jobs/:id', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.getJob)
router.patch('/jobs/:id', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.updateJob)
router.post('/jobs/:id/action', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.transitionJob)
router.post('/jobs/:id/ai-analysis', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.analyzeJob)

router.get('/internships', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.listInternships)
router.post('/internships', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.createInternship)
router.get('/internships/:id', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.getInternship)
router.patch('/internships/:id', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.updateInternship)
router.post('/internships/:id/action', companyAuth, requireCompanyPermission('jobs.manage'), recruitmentController.transitionInternship)

module.exports = router
