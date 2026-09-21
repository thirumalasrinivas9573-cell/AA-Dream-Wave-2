const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ctrl = require('../controllers/opportunityIntelligenceController')

const studentAuth = [auth, requireRole('student')]

router.get('/dashboard', studentAuth, ctrl.dashboard)
router.get('/feed', studentAuth, ctrl.feed)
router.get('/search', studentAuth, ctrl.search)
router.get('/saved', studentAuth, ctrl.saved)
router.post('/saved/:source/:sourceId', studentAuth, ctrl.save)
router.get('/applications', studentAuth, ctrl.applications)
router.get('/analytics', studentAuth, ctrl.analytics)
router.get('/match/:source/:sourceId', studentAuth, ctrl.match)
router.get('/detail/:source/:sourceId', studentAuth, ctrl.detail)
router.get('/strategy/:source/:sourceId', studentAuth, ctrl.strategy)
router.get('/checklist/:source/:sourceId', studentAuth, ctrl.checklist)
router.get('/resume-match/:source/:sourceId', studentAuth, ctrl.resumeMatch)
router.get('/resume-customize/:source/:sourceId', studentAuth, ctrl.resumeCustomize)
router.post('/cover-letter/:source/:sourceId', studentAuth, ctrl.coverLetter)
router.post('/compare', studentAuth, ctrl.compare)
router.post('/multi-agent', studentAuth, ctrl.multiAgent)
router.post('/coach', studentAuth, ctrl.coach)

module.exports = router
