const express = require('express')
const auth = require('../middleware/auth')
const controller = require('../controllers/agentOrchestrationController')

const router = express.Router()

router.get('/tools', auth, controller.listTools)
router.post('/run', auth, controller.run)
router.post('/confirm', auth, controller.confirm)
router.post('/cancel/:executionId', auth, controller.cancel)
router.get('/executions', auth, controller.listExecutions)
router.get('/executions/:executionId', auth, controller.getExecution)
router.post('/security/probe', auth, controller.blockedProbe)
// V4 P2 specialist network
router.get('/specialists', auth, controller.listSpecialists)
router.post('/specialists/plan', auth, controller.planSpecialists)
router.post('/network/run', auth, controller.runNetwork)
router.post('/network/cancel/:executionId', auth, controller.cancelNetwork)
router.get('/network/metrics', auth, controller.networkMetrics)

// V4 P5 Workflow Engine (AgentExecution kind=workflow)
router.get('/workflows/templates', auth, controller.workflowTemplates)
router.get('/workflows', auth, controller.workflowList)
router.post('/workflows', auth, controller.workflowCreate)
router.get('/workflows/:workflowId', auth, controller.workflowGet)
router.post('/workflows/:workflowId/approve', auth, controller.workflowApprove)
router.post('/workflows/:workflowId/reject', auth, controller.workflowReject)
router.post('/workflows/:workflowId/pause', auth, controller.workflowPause)
router.post('/workflows/:workflowId/resume', auth, controller.workflowResume)
router.post('/workflows/:workflowId/cancel', auth, controller.workflowCancel)
router.post('/workflows/:workflowId/edit', auth, controller.workflowEdit)

module.exports = router
