const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const institutionCommandCenterController = require('../controllers/institutionCommandCenterController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get(
  '/overview',
  institutionAuth,
  requirePermission('executive.read'),
  institutionCommandCenterController.getOverview,
)

router.get(
  '/analytics',
  institutionAuth,
  requirePermission('analytics.read'),
  institutionCommandCenterController.getAnalytics,
)

router.get(
  '/kpis',
  institutionAuth,
  requirePermission('strategic.kpi.read'),
  institutionCommandCenterController.getKPIs,
)

router.get(
  '/copilot',
  institutionAuth,
  requirePermission('copilot.read'),
  institutionCommandCenterController.getCopilot,
)

router.get(
  '/reports/types',
  institutionAuth,
  requirePermission('reports.read'),
  institutionCommandCenterController.getReportTypes,
)

router.get(
  '/reports/:type/export',
  institutionAuth,
  requirePermission('executive.export'),
  institutionCommandCenterController.exportReport,
)

router.get(
  '/reports/:type',
  institutionAuth,
  requirePermission('reports.read'),
  institutionCommandCenterController.previewReport,
)

router.get(
  '/audit',
  institutionAuth,
  requirePermission('executive.read'),
  institutionCommandCenterController.listAuditLog,
)

module.exports = router
