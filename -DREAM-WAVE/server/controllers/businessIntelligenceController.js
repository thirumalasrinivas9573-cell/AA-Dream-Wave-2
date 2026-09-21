const businessIntelligenceService = require('../services/businessIntelligenceService')
const businessIntelligenceAiService = require('../services/businessIntelligenceAiService')

function parseQuery(query = {}) {
  return {
    period: query.period,
    department: query.department,
    course: query.course,
    batch: query.batch,
    academicYear: query.academicYear,
    semester: query.semester,
    status: query.status,
    program: query.program,
    opportunityType: query.opportunityType,
    stage: query.stage,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await businessIntelligenceService.getInstitutionDashboard(
      req.institution._id,
      parseQuery(req.query),
    )
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getTrends = async (req, res) => {
  try {
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const trends = await businessIntelligenceService.getInstitutionTrends(req.institution._id, filters)
    res.json({ success: true, trends })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getSkills = async (req, res) => {
  try {
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const skills = await businessIntelligenceService.getInstitutionSkillAnalytics(req.institution._id, filters)
    res.json({ success: true, skills })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCommunity = async (req, res) => {
  try {
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const community = await businessIntelligenceService.getInstitutionCommunityAnalytics(
      req.institution._id,
      filters,
    )
    res.json({ success: true, community })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getProjects = async (req, res) => {
  try {
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const projects = await businessIntelligenceService.getInstitutionProjectAnalytics(
      req.institution._id,
      filters,
    )
    res.json({ success: true, projects })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getLearning = async (req, res) => {
  try {
    const learning = await businessIntelligenceService.getInstitutionLearningAnalytics(req.institution._id)
    res.json({ success: true, learning })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getDataQuality = async (req, res) => {
  try {
    const dataQuality = await businessIntelligenceService.getInstitutionDataQuality(req.institution._id)
    res.json({ success: true, dataQuality })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: businessIntelligenceAiService.BI_INTENTS })
}

exports.getAiInsights = async (req, res) => {
  try {
    const { intent, ...rest } = req.body || {}
    const insights = await businessIntelligenceAiService.generateBiInsights(
      'institution',
      req.institution._id,
      intent,
      parseQuery(rest),
    )
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCompanyDashboard = async (req, res) => {
  try {
    if (!req.company?._id) {
      return res.status(403).json({ success: false, message: 'Company profile required' })
    }
    const dashboard = await businessIntelligenceService.getCompanyDashboard(
      req.company._id,
      parseQuery(req.query),
    )
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCompanyFunnel = async (req, res) => {
  try {
    if (!req.company?._id) {
      return res.status(403).json({ success: false, message: 'Company profile required' })
    }
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const funnel = await businessIntelligenceService.getCompanyRecruitmentFunnel(req.company._id, filters)
    res.json({ success: true, funnel })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCompanySkills = async (req, res) => {
  try {
    if (!req.company?._id) {
      return res.status(403).json({ success: false, message: 'Company profile required' })
    }
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const skills = await businessIntelligenceService.getCompanySkillAnalytics(req.company._id, filters)
    res.json({ success: true, skills })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCompanyTrends = async (req, res) => {
  try {
    if (!req.company?._id) {
      return res.status(403).json({ success: false, message: 'Company profile required' })
    }
    const filters = businessIntelligenceService.buildFilters(parseQuery(req.query))
    const trends = await businessIntelligenceService.getCompanyTrends(req.company._id, filters)
    res.json({ success: true, trends })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCompanyAiInsights = async (req, res) => {
  try {
    if (!req.company?._id) {
      return res.status(403).json({ success: false, message: 'Company profile required' })
    }
    const { intent, ...rest } = req.body || {}
    const insights = await businessIntelligenceAiService.generateBiInsights(
      'company',
      req.company._id,
      intent,
      parseQuery(rest),
    )
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getStudentCareerAnalytics = async (req, res) => {
  try {
    const analytics = await businessIntelligenceService.getStudentCareerAnalytics(
      req.user._id,
      parseQuery(req.query),
    )
    res.json({ success: true, analytics })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getStudentAiInsights = async (req, res) => {
  try {
    const { intent, ...rest } = req.body || {}
    const insights = await businessIntelligenceAiService.generateBiInsights(
      'student',
      req.user._id,
      intent || 'STUDENT_CAREER',
      parseQuery(rest),
    )
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}
