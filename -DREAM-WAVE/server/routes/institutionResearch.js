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
const institutionResearchController = require('../controllers/institutionResearchController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/meta', institutionAuth, institutionResearchController.getMeta)
router.get('/stats', institutionAuth, requirePermission('research.read'), institutionResearchController.getStats)
router.get('/workspace', institutionAuth, requirePermission('research.read'), institutionResearchController.getWorkspace)

router.get('/analytics', institutionAuth, requirePermission('analytics.read'), institutionResearchController.getAnalytics)
router.get('/reports/types', institutionAuth, requirePermission('reports.read'), institutionResearchController.getReportTypes)
router.get('/reports/:type/export', institutionAuth, requirePermission('reports.generate'), institutionResearchController.exportReport)
router.get('/reports/:type', institutionAuth, requirePermission('reports.read'), institutionResearchController.previewReport)

router.get('/projects', institutionAuth, requirePermission('research.read'), institutionResearchController.listProjects)
router.post('/projects', institutionAuth, requirePermission('research.manage'), institutionResearchController.createProject)
router.get('/projects/:id', institutionAuth, requirePermission('research.read'), validateIdParam, institutionResearchController.getProject)
router.patch('/projects/:id', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.updateProject)
router.post('/projects/:id/status', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.transitionProject)
router.post('/projects/:id/members', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.addProjectMember)
router.delete('/projects/:id/members/:memberId', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.removeProjectMember)

router.get('/publications', institutionAuth, requirePermission('research.read'), institutionResearchController.listPublications)
router.post('/publications', institutionAuth, requirePermission('research.manage'), institutionResearchController.createPublication)

router.get('/opportunities', institutionAuth, requirePermission('research.read'), institutionResearchController.listOpportunities)
router.get('/opportunities/browse', auth, institutionResearchController.browseOpportunities)
router.post('/opportunities', institutionAuth, requirePermission('research.manage'), institutionResearchController.createOpportunity)
router.post('/opportunities/:id/apply', auth, validateIdParam, institutionResearchController.applyToOpportunity)
router.patch('/opportunities/:id', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.updateOpportunity)
router.post('/opportunities/:id/action', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.transitionOpportunity)

router.get('/applications', institutionAuth, requirePermission('research.read'), institutionResearchController.listApplications)
router.patch('/applications/:id/review', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.reviewApplication)

router.get('/ideas', institutionAuth, requirePermission('research.read'), institutionResearchController.listIdeas)
router.post('/ideas', institutionAuth, requirePermission('research.manage'), institutionResearchController.submitIdea)
router.patch('/ideas/:id/review', institutionAuth, requirePermission('research.manage'), validateIdParam, institutionResearchController.reviewIdea)

router.post('/ideas/submit', auth, institutionResearchController.submitIdeaAsUser)

module.exports = router
