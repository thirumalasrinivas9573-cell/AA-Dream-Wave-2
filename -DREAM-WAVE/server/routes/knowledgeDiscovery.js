const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const ctrl = require('../controllers/knowledgeDiscoveryController')

router.use(auth, resolveOrganization)

router.get('/', ctrl.search)
router.get('/suggest', ctrl.suggest)
router.get('/recent', ctrl.recent)
router.get('/saved', ctrl.saved)
router.post('/saved', ctrl.saveSearch)
router.post('/recent/clear', ctrl.clearRecent)
router.post('/research', ctrl.research)
router.get('/research/:id', ctrl.getResearch)
router.post('/index', ctrl.index)
router.get('/graph/expand', ctrl.graphExpand)
router.post('/feedback', ctrl.feedback)

module.exports = router
