const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ctrl = require('../controllers/applicationIntelligenceController')

const studentAuth = [auth, requireRole('student')]

router.get('/dashboard', studentAuth, ctrl.dashboard)
router.get('/search', studentAuth, ctrl.search)
router.get('/analytics', studentAuth, ctrl.analytics)
router.get('/profile', studentAuth, ctrl.profile)
router.post('/start', studentAuth, ctrl.start)
router.post('/multi-agent', studentAuth, ctrl.multiAgent)
router.post('/coach', studentAuth, ctrl.coach)
router.get('/opportunity/:source/:sourceId', studentAuth, ctrl.byOpportunity)
router.get('/:workspaceId', studentAuth, ctrl.get)
router.post('/:workspaceId/resume', studentAuth, ctrl.resumeVersion)
router.post('/:workspaceId/cover-letter', studentAuth, ctrl.coverLetter)
router.post('/:workspaceId/questions', studentAuth, ctrl.questionAnswer)
router.get('/:workspaceId/preview', studentAuth, ctrl.preview)
router.post('/:workspaceId/submit', studentAuth, ctrl.submit)
router.post('/:workspaceId/follow-up', studentAuth, ctrl.followUp)
router.patch('/:workspaceId/outcome', studentAuth, ctrl.outcome)
router.get('/:workspaceId/ats', studentAuth, ctrl.ats)

module.exports = router
