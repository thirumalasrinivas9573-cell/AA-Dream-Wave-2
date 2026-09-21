const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const businessIntelligenceController = require('../controllers/businessIntelligenceController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/dashboard', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getDashboard)
router.get('/trends', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getTrends)
router.get('/skills', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getSkills)
router.get('/community', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getCommunity)
router.get('/projects', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getProjects)
router.get('/learning', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getLearning)
router.get('/data-quality', institutionAuth, requirePermission('analytics.read'), businessIntelligenceController.getDataQuality)
router.get('/ai/intents', institutionAuth, requirePermission('copilot.read'), businessIntelligenceController.getAiIntents)
router.post('/ai/insights', institutionAuth, requirePermission('copilot.read'), businessIntelligenceController.getAiInsights)

module.exports = router
