const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/adaptiveLearningController')

router.use(auth)

router.get('/profile', ctrl.getProfile)
router.patch('/profile', ctrl.updateProfile)
router.get('/dashboard', ctrl.dashboard)
router.get('/roadmap', ctrl.roadmap)
router.get('/gaps', ctrl.skillGaps)
router.get('/prerequisites', ctrl.prerequisites)
router.get('/resources', ctrl.resources)

router.post('/plan', ctrl.generatePlan)
router.post('/plan/pause', ctrl.pausePlan)

router.post('/evidence', ctrl.recordEvidence)
router.get('/mastery/:skillName', ctrl.mastery)

router.post('/sessions', ctrl.startSession)
router.get('/sessions/:id', ctrl.getSession)
router.patch('/sessions/:id', ctrl.updateSession)

router.post('/practice', ctrl.practice)
router.post('/assessment/submit', ctrl.submitAssessment)

router.post('/coach/chat', ctrl.coachChat)

module.exports = router
