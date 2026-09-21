const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const ctrl = require('../controllers/multiAgentOrchestrationController')

const studentAuth = [auth, requireRole('student')]
const institutionAuth = [auth, requireRole('institution'), resolveOrganization, resolveInstitutionMember]
const companyAuth = [auth, requireRole('company'), resolveOrganization]
const anyOrgAuth = [auth, resolveOrganization]

router.get('/registry', auth, ctrl.getRegistry)
router.get('/health', auth, ctrl.getHealth)

router.use(auth, resolveOrganization)

router.get('/intents', ctrl.getIntents)
router.get('/observability', ctrl.getObservability)
router.post('/plan', ctrl.plan)
router.post('/run', ctrl.run)
router.get('/executions', ctrl.listExecutions)
router.get('/executions/:id', ctrl.getExecution)
router.post('/executions/:id/approve', ctrl.approve)
router.post('/executions/:id/cancel', ctrl.cancel)
router.post('/domain-multi-agent', ctrl.domainMultiAgent)

module.exports = router
