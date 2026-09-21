const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const ctrl = require('../controllers/ecosystemAutomationController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

const companyAuth = [auth, requireRole('company'), resolveOrganization]

router.get('/meta', auth, ctrl.getMeta)
router.get('/intents', auth, ctrl.getIntents)
router.get('/templates', auth, ctrl.getTemplates)

router.get('/daily-brief', institutionAuth, requirePermission('analytics.read'), ctrl.getDailyBrief)
router.get('/pending-actions', institutionAuth, requirePermission('analytics.read'), ctrl.getPendingActions)
router.get('/monitor', institutionAuth, requirePermission('analytics.read'), ctrl.getWorkflowMonitor)
router.get('/failed', institutionAuth, requirePermission('analytics.read'), ctrl.getFailedWorkflows)
router.get('/ai-summary', institutionAuth, requirePermission('copilot.read'), ctrl.getAiSummary)
router.get('/approvals', institutionAuth, requirePermission('analytics.read'), ctrl.getPendingApprovals)
router.get('/workflows', institutionAuth, requirePermission('analytics.read'), ctrl.getWorkflows)
router.post('/workflows/from-template', institutionAuth, requirePermission('analytics.read'), ctrl.createFromTemplate)
router.post('/workflows/plan', institutionAuth, requirePermission('copilot.read'), ctrl.planWorkflow)
router.post('/triggers/process', institutionAuth, requirePermission('analytics.read'), ctrl.processTrigger)
router.get('/workflows/:id', institutionAuth, requirePermission('analytics.read'), ctrl.getWorkflow)
router.post('/workflows/:id/approve', institutionAuth, requirePermission('analytics.read'), ctrl.approveWorkflow)
router.post('/workflows/:id/execute', institutionAuth, requirePermission('analytics.read'), ctrl.executeWorkflow)
router.post('/workflows/:id/retry', institutionAuth, requirePermission('analytics.read'), ctrl.retryWorkflow)

router.get('/company/daily-brief', companyAuth, ctrl.getDailyBrief)
router.get('/company/pending-actions', companyAuth, ctrl.getPendingActions)
router.get('/company/monitor', companyAuth, ctrl.getWorkflowMonitor)
router.get('/company/workflows', companyAuth, ctrl.getWorkflows)
router.post('/company/workflows/from-template', companyAuth, ctrl.createFromTemplate)
router.get('/company/workflows/:id', companyAuth, ctrl.getWorkflow)
router.post('/company/workflows/:id/approve', companyAuth, ctrl.approveWorkflow)
router.post('/company/workflows/:id/execute', companyAuth, ctrl.executeWorkflow)

module.exports = router
