const {
  getEcosystemOverview,
  getPartnershipIntelligence,
  getProgramIntelligence,
  getSkillAlignment,
  getEcosystemRecommendations,
  searchEcosystem,
  getStudentEcosystemSummary,
} = require('../services/ecosystemIntelligenceService')
const {
  generateEcosystemInsight,
  runMultiAgentEcosystemRequest,
  ECOSYSTEM_AI_INTENTS,
  MULTI_AGENT_ECOSYSTEM_INTENTS,
} = require('../services/ecosystemIntelligenceAiService')
const programIntel = require('../services/programIntelligenceService')
const { INTELLIGENCE_AI_INTENTS } = require('../constants/programIntelligence')

function resolveOrg(req) {
  if (req.user.role === 'institution' && req.institution) {
    return { orgId: req.institution._id, role: 'institution' }
  }
  if (req.user.role === 'company' && req.company) {
    return { orgId: req.company._id, role: 'company' }
  }
  const err = new Error('Institution or company profile required')
  err.statusCode = 403
  throw err
}

exports.getOverview = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await getEcosystemOverview(orgId, role, req.query)
    res.json({ success: true, ecosystem: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPartnerships = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await getPartnershipIntelligence(orgId, role)
    res.json({ success: true, partnerships: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPrograms = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await getProgramIntelligence(orgId, role, req.query)
    res.json({ success: true, programs: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getSkillAlignment = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await getSkillAlignment(orgId, role, req.query)
    res.json({ success: true, alignment: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getRecommendations = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await getEcosystemRecommendations(orgId, role)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.search = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await searchEcosystem(orgId, role, req.query)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({
    success: true,
    intents: ECOSYSTEM_AI_INTENTS,
    multiAgentIntents: MULTI_AGENT_ECOSYSTEM_INTENTS,
  })
}

exports.getAiInsights = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const intent = req.body?.intent || 'ECOSYSTEM_OVERVIEW'
    const result = await generateEcosystemInsight({
      orgId,
      role,
      intent,
      query: req.query,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.runMultiAgent = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const intent = req.body?.intent || 'IMPROVE_PLACEMENT'
    const result = await runMultiAgentEcosystemRequest({
      orgId,
      role,
      intent,
      query: req.query,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentSummary = async (req, res) => {
  try {
    const summary = await getStudentEcosystemSummary(req.user._id)
    res.json({ success: true, summary })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInstitutionHub = async (req, res) => {
  try {
    if (req.user.role !== 'institution' || !req.institution) {
      return res.status(403).json({ success: false, message: 'Institution access required' })
    }
    const hub = await programIntel.getInstitutionIntelligenceHub(req.institution._id, req.query)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyHub = async (req, res) => {
  try {
    if (req.user.role !== 'company' || !req.company) {
      return res.status(403).json({ success: false, message: 'Company access required' })
    }
    const hub = await programIntel.getCompanyIntelligenceHub(req.company._id, req.query)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProgramDetail = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const intel = await programIntel.getProgramDetailIntelligence(orgId, role, req.params.programId)
    res.json({ success: true, intelligence: intel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'institution' || !req.institution) {
      return res.status(403).json({ success: false, message: 'Institution access required' })
    }
    const intel = await programIntel.getDepartmentIntelligence(
      req.institution._id,
      req.params.departmentId,
      req.query,
    )
    res.json({ success: true, intelligence: intel })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getIndustry = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await programIntel.getIndustryIntelligence(orgId, role, req.query)
    res.json({ success: true, industry: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getIndustryTrends = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const data = await programIntel.getIndustryTrends(orgId, role, req.query)
    res.json({ success: true, trends: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyRecommendations = async (req, res) => {
  try {
    if (req.user.role !== 'institution' || !req.institution) {
      return res.status(403).json({ success: false, message: 'Institution access required' })
    }
    const data = await programIntel.getCompanyRecommendations(req.institution._id)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentAggregates = async (req, res) => {
  try {
    if (req.user.role !== 'institution' || !req.institution) {
      return res.status(403).json({ success: false, message: 'Institution access required' })
    }
    const data = await programIntel.getStudentAggregateIntelligence(req.institution._id, req.query)
    res.json({ success: true, aggregates: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyConnection = async (req, res) => {
  try {
    if (req.user.role !== 'institution' || !req.institution) {
      return res.status(403).json({ success: false, message: 'Institution access required' })
    }
    const data = await programIntel.getCompanyProgramConnections(req.institution._id, req.params.companyId)
    res.json({ success: true, connection: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getOtherOrgHub = async (req, res) => {
  res.status(403).json({ success: false, message: 'Access denied' })
}

exports.getIntelligenceIntents = (_req, res) => {
  res.json({ success: true, intents: INTELLIGENCE_AI_INTENTS, ecosystemIntents: ECOSYSTEM_AI_INTENTS })
}
