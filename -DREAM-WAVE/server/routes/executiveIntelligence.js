const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const ctrl = require('../controllers/executiveIntelligenceController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

const companyAuth = [auth, requireRole('company'), resolveOrganization]

router.get('/intents', auth, ctrl.getIntents)

router.get('/overview', institutionAuth, requirePermission('executive.read'), ctrl.getOverview)
router.get('/metrics', institutionAuth, requirePermission('analytics.read'), ctrl.getMetrics)
router.get('/funnel', institutionAuth, requirePermission('analytics.read'), ctrl.getFunnel)
router.get('/trends', institutionAuth, requirePermission('analytics.read'), ctrl.getTrends)
router.get('/skill-demand', institutionAuth, requirePermission('analytics.read'), ctrl.getSkillDemand)
router.get('/skill-gaps', institutionAuth, requirePermission('analytics.read'), ctrl.getSkillGaps)
router.get('/partnership-health', institutionAuth, requirePermission('analytics.read'), ctrl.getPartnershipHealth)
router.get('/program-alignment', institutionAuth, requirePermission('analytics.read'), ctrl.getProgramAlignment)
router.get('/attention', institutionAuth, requirePermission('executive.read'), ctrl.getAttention)
router.get('/data-quality', institutionAuth, requirePermission('analytics.read'), ctrl.getDataQuality)
router.get('/insights', institutionAuth, requirePermission('copilot.read'), ctrl.getInsights)
router.post('/decision-support', institutionAuth, requirePermission('copilot.read'), ctrl.decisionSupport)
router.post('/workflow-from-insight', institutionAuth, requirePermission('analytics.read'), ctrl.createWorkflowFromInsight)

router.get('/reports/types', institutionAuth, requirePermission('executive.read'), ctrl.getReportTypes)
router.get('/reports/:type', institutionAuth, requirePermission('executive.read'), ctrl.previewReport)
router.get('/reports/:type/export', institutionAuth, requirePermission('executive.export'), ctrl.exportReport)

router.get('/company/overview', companyAuth, ctrl.getCompanyOverview)

module.exports = router
