const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const { validateIdParam } = require('../validation/institutionStudentValidation')
const institutionIncubationController = require('../controllers/institutionIncubationController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/meta', institutionAuth, institutionIncubationController.getMeta)
router.get('/stats', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.getStats)
router.get('/workspace', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.getWorkspace)

router.get('/startups', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listStartups)
router.post('/startups', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createStartup)
router.patch('/startups/:id', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.updateStartup)
router.get('/startups/:startupId/incubation', institutionAuth, requirePermission('incubation.read'), validateIdParam, institutionIncubationController.getIncubationRecord)
router.post('/startups/:startupId/incubation/advance', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.advanceIncubation)
router.post('/startups/:startupId/mentors', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.assignMentor)

router.get('/mentors', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listMentors)
router.post('/mentors', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createMentor)
router.patch('/mentors/:id', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.updateMentor)

router.get('/sessions', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listSessions)
router.post('/sessions', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createSession)
router.post('/sessions/:id/complete', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.completeSession)

router.get('/funding', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listFunding)
router.post('/funding', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createFunding)
router.patch('/funding/:id', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.updateFunding)

router.get('/investors', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listInvestors)
router.post('/investors', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createInvestor)
router.post('/investors/:id/connect', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.connectInvestor)

router.get('/events', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listEvents)
router.post('/events', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createEvent)
router.post('/events/:id/publish', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.publishEvent)
router.post('/events/:id/register', auth, validateIdParam, institutionIncubationController.registerForEvent)
router.patch('/events/:id/registrations/:registrationId', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.recordAttendance)

router.get('/collaboration', institutionAuth, requirePermission('incubation.read'), institutionIncubationController.listCollaboration)
router.post('/collaboration', institutionAuth, requirePermission('incubation.manage'), institutionIncubationController.createCollaboration)
router.patch('/collaboration/:id', institutionAuth, requirePermission('incubation.manage'), validateIdParam, institutionIncubationController.updateCollaborationTask)

module.exports = router
