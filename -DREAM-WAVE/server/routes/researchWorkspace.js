const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const ctrl = require('../controllers/researchWorkspaceController')

router.use(auth, resolveOrganization)

router.post('/', ctrl.create)
router.get('/', ctrl.list)
router.get('/:id', ctrl.get)
router.patch('/:id', ctrl.update)
router.get('/:id/dashboard', ctrl.dashboard)

router.post('/:id/sources', ctrl.addSource)
router.delete('/:id/sources/:sourceRefId', ctrl.removeSource)
router.post('/:id/sources/collect', ctrl.collectSources)

router.post('/:id/evidence/extract', ctrl.extractEvidence)
router.post('/:id/synthesize', ctrl.synthesize)

router.post('/:id/reports', ctrl.generateReport)
router.post('/:id/reports/:reportId/review', ctrl.reviewReport)
router.post('/:id/reports/:reportId/approve', ctrl.approveReport)
router.get('/:id/reports/:reportId/export', ctrl.exportReport)

router.post('/:id/notes', ctrl.addNote)
router.post('/:id/chat', ctrl.chat)

module.exports = router
