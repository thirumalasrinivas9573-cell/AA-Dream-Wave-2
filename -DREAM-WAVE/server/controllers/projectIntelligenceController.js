const projectIntelligence = require('../services/projectIntelligenceService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await projectIntelligence.getDashboard(req.user._id)
    res.json({ success: true, dashboard })
  } catch (err) { handleError(res, err) }
}

exports.portfolio = async (req, res) => {
  try {
    const portfolio = await projectIntelligence.getPortfolio(req.user._id)
    res.json({ success: true, portfolio })
  } catch (err) { handleError(res, err) }
}

exports.recommendations = async (req, res) => {
  try {
    const data = await projectIntelligence.getSkillToProjectRecommendations(req.user._id, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.templates = async (_req, res) => {
  try {
    const templates = await projectIntelligence.getTemplates()
    res.json({ success: true, templates })
  } catch (err) { handleError(res, err) }
}

exports.multiAgentPlan = async (req, res) => {
  try {
    const plan = await projectIntelligence.multiAgentPlan(req.user._id, req.body)
    res.json({ success: true, plan })
  } catch (err) { handleError(res, err) }
}

exports.build = async (req, res) => {
  try {
    const project = await projectIntelligence.buildProjectFromIdea(req.user._id, req.body.idea, req.body)
    res.status(201).json({ success: true, project })
  } catch (err) { handleError(res, err) }
}

exports.list = async (req, res) => {
  try {
    const items = await projectIntelligence.listProjects(req.user._id, req.query)
    res.json({ success: true, items })
  } catch (err) { handleError(res, err) }
}

exports.create = async (req, res) => {
  try {
    const project = await projectIntelligence.createProject(req.user._id, req.body)
    res.status(201).json({ success: true, project })
  } catch (err) { handleError(res, err) }
}

exports.get = async (req, res) => {
  try {
    const project = await projectIntelligence.getProject(req.params.id, req.user._id)
    res.json({ success: true, project })
  } catch (err) { handleError(res, err) }
}

exports.update = async (req, res) => {
  try {
    const project = await projectIntelligence.updateProject(req.params.id, req.user._id, req.body)
    res.json({ success: true, project })
  } catch (err) { handleError(res, err) }
}

exports.milestoneTasks = async (req, res) => {
  try {
    const result = await projectIntelligence.generateMilestoneTasks(req.user._id, req.params.id, req.params.milestoneId)
    res.status(201).json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.addEvidence = async (req, res) => {
  try {
    const result = await projectIntelligence.addEvidence(req.user._id, req.params.id, req.body)
    res.status(201).json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.review = async (req, res) => {
  try {
    const review = await projectIntelligence.reviewProject(req.user._id, req.params.id)
    res.json({ success: true, review })
  } catch (err) { handleError(res, err) }
}

exports.descriptions = async (req, res) => {
  try {
    const descriptions = await projectIntelligence.generateDescriptions(req.user._id, req.params.id)
    res.json({ success: true, descriptions })
  } catch (err) { handleError(res, err) }
}

exports.readme = async (req, res) => {
  try {
    const result = await projectIntelligence.generateReadme(req.user._id, req.params.id)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.testPlan = async (req, res) => {
  try {
    const result = await projectIntelligence.generateTestPlan(req.user._id, req.params.id)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.opportunityMatch = async (req, res) => {
  try {
    const match = await projectIntelligence.getOpportunityMatch(req.user._id, req.params.id)
    res.json({ success: true, match })
  } catch (err) { handleError(res, err) }
}

exports.coachChat = async (req, res) => {
  try {
    const result = await projectIntelligence.projectCoachChat(req.user._id, req.params.id, req.body)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}
