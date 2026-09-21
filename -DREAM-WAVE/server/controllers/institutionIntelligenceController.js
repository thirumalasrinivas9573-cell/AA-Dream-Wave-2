const institutionIntelligenceService = require('../services/institutionIntelligenceService')
const institutionAiService = require('../services/institutionAiService')

function parseFilters(query = {}) {
  return {
    department: query.department || undefined,
    course: query.course || undefined,
    batch: query.batch || undefined,
    academicYear: query.academicYear || undefined,
    semester: query.semester || undefined,
    status: query.status || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
  }
}

exports.getOverview = async (req, res) => {
  try {
    const overview = await institutionIntelligenceService.getOverview(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, overview })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getPrograms = async (req, res) => {
  try {
    const programs = await institutionIntelligenceService.getProgramIntelligence(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, programs })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCourses = async (req, res) => {
  try {
    const courses = await institutionIntelligenceService.getCourseIntelligence(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, courses })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getFaculty = async (req, res) => {
  try {
    const faculty = await institutionIntelligenceService.getFacultyIntelligence(req.institution._id)
    res.json({ success: true, faculty })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAdmissions = async (req, res) => {
  try {
    const admissions = await institutionIntelligenceService.getAdmissionsAnalytics(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, admissions })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getSupportSignals = async (req, res) => {
  try {
    const support = await institutionIntelligenceService.getSupportSignals(
      req.institution._id,
      parseFilters(req.query),
      { page: req.query.page, limit: req.query.limit },
    )
    res.json({ success: true, support })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getStudentAcademicProfile = async (req, res) => {
  try {
    const profile = await institutionIntelligenceService.getStudentAcademicProfile(
      req.institution._id,
      req.params.id,
    )
    res.json({ success: true, profile })
  } catch (error) {
    res.status(error.statusCode || 404).json({ success: false, message: error.message })
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await institutionIntelligenceService.getAcademicAnalytics(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, analytics })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getCareerOutcomes = async (req, res) => {
  try {
    const outcomes = await institutionIntelligenceService.getCareerOutcomes(
      req.institution._id,
      parseFilters(req.query),
    )
    res.json({ success: true, outcomes })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getOpportunities = async (req, res) => {
  try {
    const opportunities = await institutionIntelligenceService.getOpportunitiesSummary(
      req.institution._id,
    )
    res.json({ success: true, opportunities })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAiInsights = async (req, res) => {
  try {
    const intent = req.body?.intent || req.query?.intent || 'INSTITUTION_OVERVIEW'
    const result = await institutionAiService.generateInstitutionInsights(
      req.institution._id,
      intent,
      parseFilters({ ...req.query, ...req.body }),
    )
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAiIntents = async (_req, res) => {
  res.json({ success: true, intents: institutionAiService.AI_INTENTS })
}
