const execIntel = require('../services/executiveDecisionSupportService')
const { generateExecutiveReport, exportExecutiveReport } = require('../services/institutionExecutiveReportService')
const { EXECUTIVE_REPORT_TYPES } = require('../constants/institutionCommandCenter')
const { DECISION_SUPPORT_INTENTS, EXTENDED_METRIC_REGISTRY } = require('../constants/executiveIntelligence')

function resolveInstitution(req) {
  if (!req.institution?._id) {
    const err = new Error('Institution profile required')
    err.statusCode = 403
    throw err
  }
  return { orgId: req.institution._id, userId: req.user._id }
}

function resolveCompany(req) {
  if (!req.company?._id) {
    const err = new Error('Company profile required')
    err.statusCode = 403
    throw err
  }
  return { orgId: req.company._id, userId: req.user._id }
}

exports.getOverview = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const data = await execIntel.getExecutiveOverview(orgId, req.query)
    await execIntel.recordAccess(orgId, userId, 'dashboard_accessed', { surface: 'executive_intelligence' })
    res.json({ success: true, executive: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getMetrics = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const overview = await execIntel.getExecutiveOverview(orgId, req.query)
    res.json({ success: true, metrics: overview.metricRegistry, registry: EXTENDED_METRIC_REGISTRY })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getFunnel = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const overview = await execIntel.getExecutiveOverview(orgId, req.query)
    res.json({ success: true, funnel: overview.placementFunnel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getTrends = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const trends = await execIntel.getTrendAnalytics(orgId, req.query)
    res.json({ success: true, ...trends })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getSkillDemand = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const data = await execIntel.getSkillDemandAnalytics(orgId, req.query)
    res.json({ success: true, skillDemand: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getSkillGaps = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const data = await execIntel.getSkillGapAnalytics(orgId, req.query)
    res.json({ success: true, skillGaps: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPartnershipHealth = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const data = await execIntel.getPartnershipHealthAnalytics(orgId, req.query)
    res.json({ success: true, partnershipHealth: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProgramAlignment = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const data = await execIntel.getProgramAlignmentAnalytics(orgId, req.query)
    res.json({ success: true, alignment: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAttention = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const overview = await execIntel.getExecutiveOverview(orgId, req.query)
    res.json({
      success: true,
      attentionRequired: overview.attentionRequired,
      keyChanges: overview.keyChanges,
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDataQuality = async (req, res) => {
  try {
    const { orgId } = resolveInstitution(req)
    const data = await execIntel.getDataQualityCenter(orgId)
    res.json({ success: true, dataQuality: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInsights = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const data = await execIntel.getExecutiveInsights(orgId, req.query)
    await execIntel.recordAccess(orgId, userId, 'copilot_accessed', { surface: 'executive_insights' })
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.decisionSupport = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const result = await execIntel.getDecisionSupport(orgId, userId, {
      ...req.query,
      question: req.body?.question || req.query?.question,
      intent: req.body?.intent,
    })
    await execIntel.recordAccess(orgId, userId, 'copilot_accessed', { intent: result.intent })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createWorkflowFromInsight = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const { insightType, context } = req.body || {}
    if (!insightType) return res.status(400).json({ success: false, message: 'insightType required' })
    const result = await execIntel.createWorkflowFromInsight(orgId, userId, { insightType, context })
    res.status(result.duplicate ? 200 : 201).json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: EXECUTIVE_REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const report = await generateExecutiveReport(
      orgId,
      userId,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    await execIntel.recordAccess(orgId, userId, 'executive_report_generated', { type: req.params.type })
    res.json({ success: true, report })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.exportReport = async (req, res) => {
  try {
    const { orgId, userId } = resolveInstitution(req)
    const format = req.query.format || 'csv'
    const result = await exportExecutiveReport(
      orgId,
      userId,
      req.user.name,
      req.params.type,
      req.query,
      format,
    )
    await execIntel.recordAccess(orgId, userId, 'executive_report_exported', { type: req.params.type, format })
    res.json({ success: true, export: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getIntents = (_req, res) => {
  res.json({ success: true, intents: DECISION_SUPPORT_INTENTS })
}

exports.getCompanyOverview = async (req, res) => {
  try {
    const { orgId } = resolveCompany(req)
    const data = await execIntel.getCompanyExecutiveOverview(orgId, req.query)
    res.json({ success: true, executive: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
