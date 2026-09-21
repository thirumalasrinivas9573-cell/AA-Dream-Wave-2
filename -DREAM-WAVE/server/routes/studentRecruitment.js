const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const studentRecruitmentController = require('../controllers/studentRecruitmentController')
const businessIntelligenceController = require('../controllers/businessIntelligenceController')

const studentAuth = [auth, requireRole('student')]

router.get('/dashboard', studentAuth, studentRecruitmentController.getDashboard)
router.get('/career-analytics', studentAuth, businessIntelligenceController.getStudentCareerAnalytics)
router.post('/career-analytics/ai/insights', studentAuth, businessIntelligenceController.getStudentAiInsights)
router.get('/opportunities/browse', studentAuth, studentRecruitmentController.browseOpportunities)
router.get('/opportunities/:sourceType/:opportunityId/eligibility', studentAuth, studentRecruitmentController.getEligibility)
router.post('/opportunities/:sourceType/:opportunityId/apply', studentAuth, studentRecruitmentController.apply)
router.get('/applications', studentAuth, studentRecruitmentController.listApplications)
router.get('/applications/:id', studentAuth, studentRecruitmentController.getApplication)
router.post('/applications/:id/withdraw', studentAuth, studentRecruitmentController.withdrawApplication)

module.exports = router
