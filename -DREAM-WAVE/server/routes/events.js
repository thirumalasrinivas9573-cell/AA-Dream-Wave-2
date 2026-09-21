const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const eventOpportunityController = require('../controllers/eventOpportunityController')

const studentAuth = [auth, requireRole('student')]
const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/browse', studentAuth, eventOpportunityController.browse)
router.get('/my', studentAuth, eventOpportunityController.getMyEvents)
router.get('/ai/intents', studentAuth, eventOpportunityController.getAiIntents)
router.post('/ai/insights', studentAuth, eventOpportunityController.getAiInsights)

router.get(
  '/organizer/dashboard',
  institutionAuth,
  requirePermission('analytics.read'),
  eventOpportunityController.getOrganizerDashboard,
)
router.post(
  '/organizer/submissions/:submissionId/result',
  institutionAuth,
  requirePermission('incubation.manage'),
  eventOpportunityController.setSubmissionResult,
)

router.get('/:source/:id', studentAuth, eventOpportunityController.getDetails)
router.get('/:source/:id/eligibility', studentAuth, eventOpportunityController.getEligibility)
router.post('/:source/:id/register', studentAuth, eventOpportunityController.register)
router.post('/:source/:id/save', studentAuth, eventOpportunityController.toggleSaved)
router.post('/:source/:id/teams', studentAuth, eventOpportunityController.createTeam)
router.post('/:source/:id/submissions', studentAuth, eventOpportunityController.submitProject)

router.post('/teams/:teamId/invite', studentAuth, eventOpportunityController.inviteTeamMember)
router.post('/teams/:teamId/respond', studentAuth, eventOpportunityController.respondTeamInvite)

module.exports = router
