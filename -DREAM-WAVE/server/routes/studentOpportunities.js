const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const opportunityMatchingController = require('../controllers/opportunityMatchingController')

const studentAuth = [auth, requireRole('student')]
const institutionAuth = [auth, requireRole('institution')]

router.get('/feed', studentAuth, opportunityMatchingController.getFeed)
router.get('/match/:source/:id', studentAuth, opportunityMatchingController.getMatch)
router.get('/prepare/:source/:id', studentAuth, opportunityMatchingController.prepare)
router.post('/compare', studentAuth, opportunityMatchingController.compare)
router.post('/discover', studentAuth, opportunityMatchingController.discover)
router.post('/feedback', studentAuth, opportunityMatchingController.feedback)
router.get('/ai/intents', studentAuth, opportunityMatchingController.getAiIntents)
router.post('/ai/insights', studentAuth, opportunityMatchingController.getAiInsights)
router.get('/organizer/insights', institutionAuth, opportunityMatchingController.getOrganizerInsights)

module.exports = router
