const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveInstitutionMember,
  requirePermission,
} = require('../middleware/institutionPermission')
const institutionFoundationController = require('../controllers/institutionFoundationController')

const institutionAuth = [
  auth,
  requireRole('institution'),
  resolveOrganization,
  resolveInstitutionMember,
]

router.get(
  '/profile',
  institutionAuth,
  requirePermission('students.read'),
  institutionFoundationController.getProfile,
)

router.patch(
  '/profile',
  institutionAuth,
  requirePermission('students.manage'),
  institutionFoundationController.updateProfile,
)

router.get(
  '/dashboard',
  institutionAuth,
  requirePermission('analytics.read'),
  institutionFoundationController.getDashboard,
)

module.exports = router
