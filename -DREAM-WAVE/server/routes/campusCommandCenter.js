const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const ctrl = require('../controllers/campusCommandCenterController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/', institutionAuth, requirePermission('analytics.read'), ctrl.getOverview)
router.get('/daily-brief', institutionAuth, requirePermission('analytics.read'), ctrl.getDailyBrief)
router.get('/weekly-report', institutionAuth, requirePermission('reports.read'), ctrl.getWeeklyReport)
router.get('/ai/intents', institutionAuth, requirePermission('copilot.read'), ctrl.getAiIntents)
router.post('/ai/insights', institutionAuth, requirePermission('copilot.read'), ctrl.getAiInsight)

module.exports = router
