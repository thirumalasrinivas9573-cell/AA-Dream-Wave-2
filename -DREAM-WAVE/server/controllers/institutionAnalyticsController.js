const { getAnalyticsDashboard } = require('../services/institutionAnalyticsService')
const { generateReport, exportReport, REPORT_TYPES } = require('../services/institutionReportService')
const {
  INSTITUTION_ROLES,
  INSTITUTION_PERMISSIONS,
  ROLE_PERMISSIONS,
  ADMIN_TAGS,
  NOTE_TYPES,
} = require('../constants/institutionPermissions')

function institutionId(req) {
  if (!req.institution?._id) {
    const err = new Error('Institution profile required')
    err.statusCode = 403
    throw err
  }
  return req.institution._id
}

exports.getPermissionsMeta = (req, res) => {
  res.json({
    success: true,
    roles: INSTITUTION_ROLES,
    permissions: INSTITUTION_PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
    adminTags: ADMIN_TAGS,
    noteTypes: NOTE_TYPES,
    currentRole: req.institutionMember?.role || 'VIEWER',
  })
}

exports.getAnalytics = async (req, res) => {
  try {
    const dashboard = await getAnalyticsDashboard(institutionId(req), req.validatedQuery || req.query)
    res.json({ success: true, analytics: dashboard })
  } catch (e) {
    const { sendApiError } = require('../utils/institutionApiErrors')
    sendApiError(res, e)
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generateReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    res.json({ success: true, report })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.exportReport = async (req, res) => {
  try {
    const exported = await exportReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query.format || 'csv',
    )
    res.json({ success: true, export: exported })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
