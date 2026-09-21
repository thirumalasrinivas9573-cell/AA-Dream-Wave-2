const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const institutionProgramController = require('../controllers/institutionProgramController')

const orgAuth = [auth, requireRole('institution', 'company'), resolveOrganization]

router.get('/meta', orgAuth, institutionProgramController.getMeta)
router.get('/', orgAuth, institutionProgramController.listPrograms)
router.post('/', orgAuth, institutionProgramController.createProgram)
router.get('/:id', orgAuth, institutionProgramController.getProgram)
router.patch('/:id', orgAuth, institutionProgramController.updateProgram)
router.post('/:id/status', orgAuth, institutionProgramController.updateStatus)
router.get('/:id/dashboard', orgAuth, institutionProgramController.getDashboard)
router.post('/:id/links', orgAuth, institutionProgramController.linkEntity)
router.get('/:id/participants', orgAuth, institutionProgramController.listParticipants)
router.patch('/:id/participants/:participantId', orgAuth, institutionProgramController.updateParticipant)
router.get('/:id/activity', orgAuth, institutionProgramController.getActivity)
router.post('/:id/ai/insights', orgAuth, institutionProgramController.getAiInsights)

module.exports = router
