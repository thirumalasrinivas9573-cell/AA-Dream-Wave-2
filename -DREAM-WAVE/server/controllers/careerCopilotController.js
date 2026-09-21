const careerService = require('../services/careerCopilotService')
const { compareMarketplaceOpportunities } = require('../services/industryOpportunityMarketplaceService')
const { COPILOT_INTENTS, RECOMMENDATION_TYPES } = require('../constants/careerCopilot')

exports.getHub = async (req, res) => {
  try {
    const hub = await careerService.getCareerHub(req.user._id)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getGaps = async (req, res) => {
  try {
    const gaps = await careerService.getCareerGapAnalysis(req.user._id, req.query)
    res.json({ success: true, gaps })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getRoadmap = async (req, res) => {
  try {
    const roadmap = await careerService.getPersonalizedRoadmapView(req.user._id)
    res.json({ success: true, roadmap })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getWeeklyPlan = async (req, res) => {
  try {
    const plan = await careerService.getWeeklyCareerPlan(req.user._id)
    res.json({ success: true, plan })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDailyFocus = async (req, res) => {
  try {
    const focus = await careerService.getDailyCareerFocus(req.user._id)
    res.json({ success: true, focus })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getSuccess = async (req, res) => {
  try {
    const success = await careerService.getStudentSuccessIntelligence(req.user._id)
    res.json({ success: true, success })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getExplore = async (req, res) => {
  try {
    const exploration = await careerService.getExplorationMode(req.user._id)
    res.json({ success: true, exploration })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.suggestTasks = async (req, res) => {
  try {
    const suggestions = await careerService.suggestRoadmapTasks(req.user._id, req.body || {})
    res.json({ success: true, ...suggestions })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.prepareApplication = async (req, res) => {
  try {
    const { source, sourceId } = req.params
    const prep = await careerService.prepareApplication(req.user._id, source, sourceId)
    res.json({ success: true, preparation: prep })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.prepareInterview = async (req, res) => {
  try {
    const prep = await careerService.prepareInterview(req.user._id, req.query)
    res.json({ success: true, preparation: prep })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.comparePaths = async (req, res) => {
  try {
    const paths = req.body?.paths || []
    const comparison = await careerService.compareCareerPaths(req.user._id, paths)
    res.json({ success: true, comparison })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.compareOpportunities = async (req, res) => {
  try {
    const data = await compareMarketplaceOpportunities(req.user._id, req.body?.items || [])
    res.json({ success: true, comparison: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: COPILOT_INTENTS, recommendationTypes: RECOMMENDATION_TYPES })
}

exports.getAiInsight = async (req, res) => {
  try {
    const intent = req.body?.intent || 'DAILY_FOCUS'
    const result = await careerService.getCopilotInsight(req.user._id, intent, req.body)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getOtherStudentHub = async (req, res) => {
  res.status(403).json({ success: false, message: 'Access denied' })
}
