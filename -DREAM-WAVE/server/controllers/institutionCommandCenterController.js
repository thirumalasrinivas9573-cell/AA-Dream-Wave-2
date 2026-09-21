const { getCommandCenterOverview } = require('../services/institutionCommandCenterService')
const { getExecutiveAnalytics } = require('../services/institutionExecutiveAnalyticsService')
const {
  generateExecutiveReport,
  exportExecutiveReport,
  EXECUTIVE_REPORT_TYPES,
} = require('../services/institutionExecutiveReportService')
const {
  recordExecutiveAudit,
  listExecutiveAuditLog,
} = require('../services/institutionExecutiveAuditService')
const { EXECUTIVE_REPORT_TYPES: REPORT_TYPES } = require('../constants/institutionCommandCenter')
const { sendApiError } = require('../utils/institutionApiErrors')

function institutionId(req) {
  if (!req.institution?._id) {
    const err = new Error('Institution profile required')
    err.statusCode = 403
    throw err
  }
  return req.institution._id
}

exports.getOverview = async (req, res) => {
  try {
    const overview = await getCommandCenterOverview(institutionId(req), req.query)
    await recordExecutiveAudit({
      institutionId: institutionId(req),
      action: 'dashboard_accessed',
      actorUserId: req.user._id,
      actorName: req.user.name,
      description: 'Command center dashboard accessed',
      metadata: { filters: req.query },
    }).catch(() => {})
    res.json({ success: true, overview })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getExecutiveAnalytics(institutionId(req), req.query)
    await recordExecutiveAudit({
      institutionId: institutionId(req),
      action: 'executive_analytics_viewed',
      actorUserId: req.user._id,
      actorName: req.user.name,
      description: 'Executive analytics viewed',
      metadata: { filters: req.query },
    }).catch(() => {})
    res.json({ success: true, analytics })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getKPIs = async (req, res) => {
  try {
    const analytics = await getExecutiveAnalytics(institutionId(req), req.query)
    await recordExecutiveAudit({
      institutionId: institutionId(req),
      action: 'kpi_viewed',
      actorUserId: req.user._id,
      actorName: req.user.name,
      description: 'Strategic KPIs viewed',
    }).catch(() => {})
    res.json({ success: true, kpis: analytics.strategicKPIs })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getCopilot = async (req, res) => {
  try {
    const overview = await getCommandCenterOverview(institutionId(req), req.query)
    await recordExecutiveAudit({
      institutionId: institutionId(req),
      action: 'copilot_accessed',
      actorUserId: req.user._id,
      actorName: req.user.name,
      description: 'AI executive copilot accessed',
    }).catch(() => {})
    res.json({
      success: true,
      insights: overview.copilotInsights,
      executiveInsights: overview.executiveInsights,
    })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generateExecutiveReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    res.json({ success: true, report })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.exportReport = async (req, res) => {
  try {
    const exported = await exportExecutiveReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query.format || 'csv',
    )
    res.json({ success: true, export: exported })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listAuditLog = async (req, res) => {
  try {
    const result = await listExecutiveAuditLog(institutionId(req), req.query)
    res.json({ success: true, auditLog: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.EXECUTIVE_REPORT_TYPES = EXECUTIVE_REPORT_TYPES
