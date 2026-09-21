const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/projectIntelligenceController')

router.use(auth)

router.get('/dashboard', ctrl.dashboard)
router.get('/portfolio', ctrl.portfolio)
router.get('/templates', ctrl.templates)
router.post('/recommendations', ctrl.recommendations)
router.post('/plan/multi-agent', ctrl.multiAgentPlan)
router.post('/build', ctrl.build)

router.get('/', ctrl.list)
router.post('/', ctrl.create)
router.get('/:id', ctrl.get)
router.patch('/:id', ctrl.update)

router.post('/:id/milestones/:milestoneId/tasks', ctrl.milestoneTasks)
router.post('/:id/evidence', ctrl.addEvidence)
router.post('/:id/review', ctrl.review)
router.get('/:id/descriptions', ctrl.descriptions)
router.post('/:id/readme', ctrl.readme)
router.post('/:id/test-plan', ctrl.testPlan)
router.get('/:id/opportunity-match', ctrl.opportunityMatch)
router.post('/:id/coach/chat', ctrl.coachChat)

module.exports = router
