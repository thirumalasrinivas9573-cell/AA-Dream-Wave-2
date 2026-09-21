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
const institutionPlacementController = require('../controllers/institutionPlacementController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/meta', institutionAuth, institutionPlacementController.getMeta)
router.get('/analytics', institutionAuth, requirePermission('analytics.read'), institutionPlacementController.getAnalytics)
router.get('/stats', institutionAuth, requirePermission('analytics.read'), institutionPlacementController.getStats)
router.get('/dashboard', institutionAuth, requirePermission('analytics.read'), institutionPlacementController.getDashboard)
router.get('/reports/types', institutionAuth, requirePermission('reports.read'), institutionPlacementController.getReportTypes)
router.get('/reports/:type/export', institutionAuth, requirePermission('reports.generate'), institutionPlacementController.exportReport)
router.get('/reports/:type', institutionAuth, requirePermission('reports.read'), institutionPlacementController.previewReport)
router.get('/workspace', institutionAuth, requirePermission('students.read'), institutionPlacementController.getWorkspace)

router.get('/companies', institutionAuth, requirePermission('students.read'), institutionPlacementController.listCompanies)
router.get('/companies/:companyId/engagement', institutionAuth, requirePermission('students.read'), validateIdParam, institutionPlacementController.getCompanyEngagement)

router.get('/drives', institutionAuth, requirePermission('students.read'), institutionPlacementController.listDrives)
router.post('/drives/:id/action', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.transitionDrive)
router.patch('/drives/:id/workflow', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.updateDriveWorkflow)
router.post('/drives/:driveId/shortlist/generate', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.generateShortlist)
router.post('/drives/:driveId/shortlist/approve', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.approveShortlist)
router.post('/drives/:driveId/shortlist/publish', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.publishShortlist)

router.get('/opportunities', institutionAuth, requirePermission('students.read'), institutionPlacementController.listOpportunities)
router.post('/opportunities', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.createOpportunity)
router.patch('/opportunities/:id', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.updateOpportunity)

router.get('/applications', institutionAuth, requirePermission('students.read'), institutionPlacementController.listApplications)
router.post('/applications', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.submitApplication)
router.patch('/applications/:id/review', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.reviewApplication)
router.post('/applications/:id/withdraw', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.withdrawApplication)
router.post('/applications/reject', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.rejectCandidates)

router.get('/opportunities/:opportunityId/eligibility', institutionAuth, requirePermission('students.read'), validateIdParam, institutionPlacementController.listEligibility)
router.get('/opportunities/:opportunityId/eligibility/:studentId', institutionAuth, requirePermission('students.read'), validateIdParam, institutionPlacementController.getEligibility)

router.get('/interviews', institutionAuth, requirePermission('students.read'), institutionPlacementController.listInterviews)
router.post('/interviews', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.createInterview)
router.patch('/interviews/:id', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.rescheduleInterview)
router.post('/interviews/:id/cancel', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.cancelInterview)
router.post('/interviews/:id/outcome', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.recordInterviewOutcome)

router.get('/offers', institutionAuth, requirePermission('students.read'), institutionPlacementController.listOffers)
router.post('/offers', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.createOffer)
router.patch('/offers/:id', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionPlacementController.updateOffer)

router.get('/pools', institutionAuth, requirePermission('students.read'), institutionPlacementController.listPools)
router.post('/notifications', institutionAuth, requirePermission('placement.manage'), institutionPlacementController.sendNotification)
router.get('/students/:studentId/placement-history', institutionAuth, requirePermission('students.read'), validateIdParam, institutionPlacementController.getStudentPlacementHistory)

module.exports = router
