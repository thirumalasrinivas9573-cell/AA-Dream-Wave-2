const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const ctrl = require('../controllers/contextPersonalizationController')

router.use(auth, resolveOrganization)

router.get('/context', ctrl.getContext)
router.get('/home', ctrl.getHome)
router.get('/dashboard', ctrl.getDashboard)
router.get('/next-actions', ctrl.getNextActions)
router.get('/privacy-center', ctrl.getPrivacyCenter)
router.get('/preferences', ctrl.getPreferences)
router.put('/preferences', ctrl.updatePreferences)
router.post('/session-context', ctrl.setSessionContext)
router.post('/temporary-context', ctrl.setTemporaryContext)
router.post('/feedback', ctrl.recordFeedback)
router.post('/memory-consent', ctrl.memoryConsent)
router.post('/refresh', ctrl.refresh)
router.get('/agent-context', ctrl.getAgentContext)

module.exports = router
