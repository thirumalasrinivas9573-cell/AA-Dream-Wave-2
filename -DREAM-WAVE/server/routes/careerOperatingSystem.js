const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ctrl = require('../controllers/careerOperatingSystemController')

const studentAuth = [auth, requireRole('student')]

router.get('/dashboard', studentAuth, ctrl.commandCenter)
router.get('/state', studentAuth, ctrl.state)
router.get('/what-changed', studentAuth, ctrl.whatChanged)
router.get('/what-matters', studentAuth, ctrl.whatMatters)
router.get('/next-actions', studentAuth, ctrl.nextActions)
router.get('/today', studentAuth, ctrl.today)
router.get('/report', studentAuth, ctrl.report)
router.get('/readiness', studentAuth, ctrl.readiness)
router.get('/funnel', studentAuth, ctrl.funnel)
router.post('/scenario', studentAuth, ctrl.scenario)
router.get('/scenario/:scenarioId', studentAuth, ctrl.getScenario)
router.post('/copilot', studentAuth, ctrl.copilot)
router.post('/multi-agent', studentAuth, ctrl.multiAgent)

module.exports = router
