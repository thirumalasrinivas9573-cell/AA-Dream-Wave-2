const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const {
  validateMiddleware,
  validateListFilters,
  validateCreateStudent,
  validateUpdateStudent,
  validateAddNote,
  validateImportRows,
  validateIdParam,
} = require('../validation/institutionStudentValidation')
const institutionStudentController = require('../controllers/institutionStudentController')
const institutionAnalyticsController = require('../controllers/institutionAnalyticsController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get('/meta', institutionAuth, institutionStudentController.getMeta)
router.get('/permissions', institutionAuth, institutionAnalyticsController.getPermissionsMeta)

router.get(
  '/analytics',
  institutionAuth,
  requirePermission('analytics.read'),
  validateMiddleware(validateListFilters),
  institutionAnalyticsController.getAnalytics,
)

router.get(
  '/reports/types',
  institutionAuth,
  requirePermission('reports.read'),
  institutionAnalyticsController.getReportTypes,
)
router.get(
  '/reports/:type',
  institutionAuth,
  requirePermission('reports.read'),
  validateMiddleware(validateListFilters),
  institutionAnalyticsController.previewReport,
)
router.get(
  '/reports/:type/export',
  institutionAuth,
  requirePermission('reports.generate'),
  validateMiddleware(validateListFilters),
  institutionAnalyticsController.exportReport,
)

router.get('/stats', institutionAuth, requirePermission('analytics.read'), institutionStudentController.getStats)
router.get('/filters', institutionAuth, requirePermission('students.read'), institutionStudentController.getFilterOptions)
router.get('/activity', institutionAuth, requirePermission('analytics.read'), institutionStudentController.getActivity)

router.get(
  '/talent/discover',
  institutionAuth,
  requirePermission('students.read'),
  validateMiddleware(validateListFilters),
  institutionStudentController.discoverTalent,
)
router.post('/talent/smart-search', institutionAuth, requirePermission('students.read'), institutionStudentController.smartSearch)

router.post(
  '/import/preview',
  institutionAuth,
  requirePermission('students.import'),
  validateMiddleware(validateImportRows),
  institutionStudentController.previewImport,
)
router.post(
  '/import/confirm',
  institutionAuth,
  requirePermission('students.import'),
  validateMiddleware(validateImportRows),
  institutionStudentController.confirmImport,
)
router.post(
  '/import',
  institutionAuth,
  requirePermission('students.import'),
  validateMiddleware(validateImportRows),
  institutionStudentController.importStudents,
)

router.post('/bulk', institutionAuth, requirePermission('students.manage'), institutionStudentController.bulkAction)

router.get('/cohorts', institutionAuth, requirePermission('students.read'), institutionStudentController.listCohorts)
router.post('/cohorts', institutionAuth, requirePermission('cohorts.manage'), institutionStudentController.createCohort)
router.get('/cohorts/:cohortId/members', institutionAuth, requirePermission('students.read'), institutionStudentController.getCohortMembers)

router.get('/saved-filters', institutionAuth, requirePermission('students.read'), institutionStudentController.listSavedFilters)
router.post('/saved-filters', institutionAuth, requirePermission('students.read'), institutionStudentController.createSavedFilter)

router.get(
  '/',
  institutionAuth,
  requirePermission('students.read'),
  validateMiddleware(validateListFilters),
  institutionStudentController.listStudents,
)
router.post(
  '/',
  institutionAuth,
  requirePermission('students.manage'),
  validateMiddleware(validateCreateStudent),
  institutionStudentController.createStudent,
)

router.get('/:id/placement-summary', institutionAuth, requirePermission('students.read'), validateIdParam, institutionStudentController.getPlacementSummary)
router.get('/:id/documents/:docIndex', institutionAuth, requirePermission('documents.read'), validateIdParam, institutionStudentController.getDocument)
router.get('/:id/audit', institutionAuth, requirePermission('students.read'), validateIdParam, institutionStudentController.getAuditLog)
router.get('/:id', institutionAuth, requirePermission('students.read'), validateIdParam, institutionStudentController.getStudent)
router.patch('/:id', institutionAuth, requirePermission('students.manage'), validateIdParam, validateMiddleware(validateUpdateStudent), institutionStudentController.updateStudent)
router.patch('/:id/placement', institutionAuth, requirePermission('placement.manage'), validateIdParam, institutionStudentController.updatePlacement)
router.post('/:id/notes', institutionAuth, requirePermission('notes.manage'), validateIdParam, validateMiddleware(validateAddNote), institutionStudentController.addNote)
router.post('/:id/verify-skill', institutionAuth, requirePermission('students.verify'), validateIdParam, institutionStudentController.verifySkill)
router.post('/:id/achievements/:index/verify', institutionAuth, requirePermission('students.verify'), validateIdParam, institutionStudentController.verifyAchievement)
router.post('/:id/certificates/:index/verify', institutionAuth, requirePermission('students.verify'), validateIdParam, institutionStudentController.verifyCertificate)
router.post('/:id/promote', institutionAuth, requirePermission('students.manage'), validateIdParam, institutionStudentController.promoteSemester)

module.exports = router
