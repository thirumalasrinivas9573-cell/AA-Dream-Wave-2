const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ctrl = require('../controllers/careerCopilotController')

const studentAuth = [auth, requireRole('student')]

router.get('/hub', studentAuth, ctrl.getHub)
router.get('/gaps', studentAuth, ctrl.getGaps)
router.get('/roadmap', studentAuth, ctrl.getRoadmap)
router.get('/weekly-plan', studentAuth, ctrl.getWeeklyPlan)
router.get('/daily-focus', studentAuth, ctrl.getDailyFocus)
router.get('/success', studentAuth, ctrl.getSuccess)
router.get('/explore', studentAuth, ctrl.getExplore)
router.post('/suggest-tasks', studentAuth, ctrl.suggestTasks)
router.get('/prepare/application/:source/:sourceId', studentAuth, ctrl.prepareApplication)
router.get('/prepare/interview', studentAuth, ctrl.prepareInterview)
router.post('/compare/paths', studentAuth, ctrl.comparePaths)
router.post('/compare/opportunities', studentAuth, ctrl.compareOpportunities)
router.get('/ai/intents', studentAuth, ctrl.getAiIntents)
router.post('/ai/insights', studentAuth, ctrl.getAiInsight)
router.get('/hub/:studentId', studentAuth, ctrl.getOtherStudentHub)

module.exports = router
