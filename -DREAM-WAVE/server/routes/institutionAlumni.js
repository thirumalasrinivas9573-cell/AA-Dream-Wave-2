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
const institutionAlumniController = require('../controllers/institutionAlumniController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/meta', institutionAuth, institutionAlumniController.getMeta)
router.get('/stats', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.getStats)
router.get('/workspace', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.getWorkspace)

router.get('/directory', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listAlumni)
router.post('/directory', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createAlumni)
router.get('/directory/:id', institutionAuth, requirePermission('alumni.read'), validateIdParam, institutionAlumniController.getAlumni)
router.patch('/directory/:id', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.updateAlumni)
router.post('/directory/:id/verify', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.verifyAlumni)
router.post('/directory/from-student/:studentId', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.createAlumniFromStudent)

router.get('/connections', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listConnections)
router.post('/connections', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createConnection)
router.post('/connections/:id/respond', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.respondConnection)

router.get('/groups', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listGroups)
router.post('/groups', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createGroup)
router.post('/groups/:id/members', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.addGroupMember)

router.get('/mentorships', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listMentorships)
router.patch('/mentorships/:id', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.updateMentorship)
router.post('/mentorships/:id/feedback', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.addMentorshipFeedback)

router.get('/sessions', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listSessions)
router.post('/sessions', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.scheduleSession)
router.post('/sessions/:id/complete', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.completeSession)

router.get('/career', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listContributions)
router.post('/career', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createContribution)
router.patch('/career/:id', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.updateContribution)

router.get('/browse', auth, institutionAlumniController.browseDirectory)
router.post('/mentorships/request', auth, institutionAlumniController.requestMentorship)
router.get('/career/browse', auth, institutionAlumniController.browseCareerOpportunities)
router.post('/career/:id/apply', auth, validateIdParam, institutionAlumniController.applyToCareer)

router.get('/engagement', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.getEngagement)
router.get('/analytics', institutionAuth, requirePermission('analytics.read'), institutionAlumniController.getAnalytics)
router.get('/reports/types', institutionAuth, requirePermission('reports.read'), institutionAlumniController.getReportTypes)
router.get('/reports/:type/export', institutionAuth, requirePermission('reports.generate'), institutionAlumniController.exportReport)
router.get('/reports/:type', institutionAuth, requirePermission('reports.read'), institutionAlumniController.previewReport)

router.get('/events/browse', auth, institutionAlumniController.browseEvents)

router.get('/events', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listEvents)
router.post('/events', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createEvent)
router.post('/events/:id/publish', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.publishEvent)
router.post('/events/:id/registrations/:registrationId/attendance', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.recordEventAttendance)
router.post('/events/:id/register', auth, validateIdParam, institutionAlumniController.registerForEvent)

router.get('/contributions', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listInstitutionalContributions)
router.post('/contributions', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createInstitutionalContribution)
router.post('/contributions/:id/approve', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.approveInstitutionalContribution)

router.get('/groups/:groupId/posts', institutionAuth, requirePermission('alumni.read'), validateIdParam, institutionAlumniController.listGroupPosts)
router.post('/groups/:groupId/posts', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.createGroupPost)
router.post('/groups/posts/:postId/comments', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.addGroupPostComment)
router.post('/groups/:groupId/join', auth, validateIdParam, institutionAlumniController.requestGroupMembership)
router.post('/groups/membership/:id/review', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.reviewGroupMembership)

router.get('/conversations', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listConversations)
router.get('/conversations/:conversationId/messages', institutionAuth, requirePermission('alumni.read'), validateIdParam, institutionAlumniController.listMessages)
router.post('/conversations/:conversationId/messages', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.sendMessage)

router.get('/applications', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listCareerApplications)
router.patch('/applications/:id', institutionAuth, requirePermission('alumni.manage'), validateIdParam, institutionAlumniController.reviewCareerApplication)

router.get('/volunteers', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listVolunteers)
router.post('/volunteers', institutionAuth, requirePermission('alumni.manage'), institutionAlumniController.createVolunteerRecord)

router.get('/audit', institutionAuth, requirePermission('alumni.read'), institutionAlumniController.listAuditLog)

module.exports = router
