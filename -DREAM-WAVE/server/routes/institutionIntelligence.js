const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const institutionIntelligenceController = require('../controllers/institutionIntelligenceController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/overview', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getOverview)
router.get('/programs', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getPrograms)
router.get('/courses', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getCourses)
router.get('/faculty', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getFaculty)
router.get('/admissions', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getAdmissions)
router.get('/support-signals', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getSupportSignals)
router.get('/analytics', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getAnalytics)
router.get('/career-outcomes', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getCareerOutcomes)
router.get('/opportunities', institutionAuth, requirePermission('analytics.read'), institutionIntelligenceController.getOpportunities)
router.get('/students/:id/academic-profile', institutionAuth, requirePermission('students.read'), institutionIntelligenceController.getStudentAcademicProfile)
router.get('/ai/intents', institutionAuth, requirePermission('copilot.read'), institutionIntelligenceController.getAiIntents)
router.post('/ai/insights', institutionAuth, requirePermission('copilot.read'), institutionIntelligenceController.getAiInsights)

module.exports = router
