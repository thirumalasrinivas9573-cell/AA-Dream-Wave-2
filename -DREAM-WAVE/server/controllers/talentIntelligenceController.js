const talentService = require('../services/talentIntelligenceService')
const talentAi = require('../services/talentIntelligenceAiService')

function resolveInstitution(req) {
  if (req.user.role === 'institution' && req.institution) {
    return req.institution._id
  }
  const err = new Error('Institution profile required')
  err.statusCode = 403
  throw err
}

function resolveCompany(req) {
  if (req.user.role === 'company' && req.company) {
    return req.company._id
  }
  const err = new Error('Company profile required')
  err.statusCode = 403
  throw err
}

exports.getStudentCareerIntelligence = async (req, res) => {
  try {
    const data = await talentService.getStudentCareerIntelligence(req.user._id)
    res.json({ success: true, intelligence: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentTalentProfile = async (req, res) => {
  try {
    const data = await talentService.getStudentTalentProfile(req.user._id)
    res.json({ success: true, profile: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentReadiness = async (req, res) => {
  try {
    const data = await talentService.getPlacementReadiness(req.user._id)
    res.json({ success: true, readiness: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentSkillGaps = async (req, res) => {
  try {
    const data = await talentService.getSkillGapIntelligence(req.user._id, req.query)
    res.json({ success: true, gaps: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentPipeline = async (req, res) => {
  try {
    const data = await talentService.getApplicationPipeline(req.user._id)
    res.json({ success: true, pipeline: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.matchOpportunity = async (req, res) => {
  try {
    const { source, sourceId } = req.params
    const data = await talentService.matchStudentToOpportunity(req.user._id, source, sourceId)
    res.json({ success: true, match: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentRecommendations = async (req, res) => {
  try {
    const [learning, projects, programs] = await Promise.all([
      talentService.getLearningRecommendations(req.user._id, req.query),
      talentService.getProjectRecommendations(req.user._id),
      talentService.getProgramRecommendations(req.user._id),
    ])
    res.json({ success: true, learning, projects, programs })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.studentSearch = async (req, res) => {
  try {
    const data = await talentService.searchTalentIntelligence(req.user._id, 'student', req.query)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentAiIntents = (_req, res) => {
  res.json({
    success: true,
    intents: talentAi.STUDENT_AI_INTENTS,
    multiAgentIntents: talentAi.MULTI_AGENT_TALENT_INTENTS,
  })
}

exports.getStudentAiInsight = async (req, res) => {
  try {
    const intent = req.body?.intent || 'CAREER_READINESS'
    const result = await talentAi.generateStudentTalentInsight(req.user._id, intent, req.body || {})
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.runStudentMultiAgent = async (req, res) => {
  try {
    const intent = req.body?.intent || 'IMPROVE_STUDENT_PLACEMENT'
    const result = await talentAi.runMultiAgentTalentRequest('student', req.user._id, intent, req.body || {})
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyIntelligence = async (req, res) => {
  try {
    const companyId = resolveCompany(req)
    const data = await talentService.getCompanyTalentIntelligence(companyId, req.query)
    res.json({ success: true, intelligence: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.companySearch = async (req, res) => {
  try {
    const companyId = resolveCompany(req)
    const data = await talentService.searchTalentIntelligence(companyId, 'company', req.query)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyAiIntents = (_req, res) => {
  res.json({ success: true, intents: talentAi.COMPANY_AI_INTENTS })
}

exports.getCompanyAiInsight = async (req, res) => {
  try {
    const companyId = resolveCompany(req)
    const intent = req.body?.intent || 'TALENT_POOL'
    const result = await talentAi.generateCompanyTalentInsight(companyId, intent, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInstitutionIntelligence = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const data = await talentService.getInstitutionPlacementIntelligence(institutionId, req.query)
    res.json({ success: true, intelligence: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.institutionSearch = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const data = await talentService.searchTalentIntelligence(institutionId, 'institution', req.query)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInstitutionAiIntents = (_req, res) => {
  res.json({ success: true, intents: talentAi.INSTITUTION_AI_INTENTS })
}

exports.getInstitutionAiInsight = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const intent = req.body?.intent || 'PLACEMENT_PIPELINE'
    const result = await talentAi.generateInstitutionTalentInsight(institutionId, intent, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
