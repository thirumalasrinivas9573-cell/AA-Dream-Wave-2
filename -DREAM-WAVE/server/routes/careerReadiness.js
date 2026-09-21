const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ctrl = require('../controllers/careerReadinessController')

const studentAuth = [auth, requireRole('student')]

router.get('/dashboard', studentAuth, ctrl.dashboard)
router.get('/dimensions', studentAuth, ctrl.dimensions)
router.get('/gaps', studentAuth, ctrl.gaps)
router.get('/opportunity/:source/:sourceId', studentAuth, ctrl.opportunityReadiness)
router.post('/interview/start', studentAuth, ctrl.startInterview)
router.post('/interview/:sessionId/answer', studentAuth, ctrl.submitAnswer)
router.get('/interview/history', studentAuth, ctrl.interviewHistory)
router.get('/interview/:sessionId', studentAuth, ctrl.getInterview)
router.get('/question-bank', studentAuth, ctrl.questionBank)
router.post('/multi-agent', studentAuth, ctrl.multiAgent)
router.get('/action-plan', studentAuth, ctrl.actionPlan)
router.get('/application-readiness', studentAuth, ctrl.applicationReadiness)
router.get('/application-readiness/:source/:sourceId', studentAuth, ctrl.applicationReadiness)
router.get('/simulation', studentAuth, ctrl.simulation)
router.get('/timeline', studentAuth, ctrl.timeline)
router.post('/coach', studentAuth, ctrl.coach)
router.get('/report', studentAuth, ctrl.report)

module.exports = router
