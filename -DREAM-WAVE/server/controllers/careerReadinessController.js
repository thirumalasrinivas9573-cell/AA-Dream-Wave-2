const careerReadiness = require('../services/careerReadinessService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await careerReadiness.getReadinessDashboard(req.user._id, req.query)
    res.json({ success: true, dashboard })
  } catch (err) { handleError(res, err) }
}

exports.dimensions = async (req, res) => {
  try {
    const data = await careerReadiness.computeReadinessDimensions(req.user._id, req.query)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.gaps = async (req, res) => {
  try {
    const data = await careerReadiness.getGapExplanations(req.user._id, req.query)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.opportunityReadiness = async (req, res) => {
  try {
    const data = await careerReadiness.getOpportunityReadiness(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.startInterview = async (req, res) => {
  try {
    const data = await careerReadiness.createInterviewSession(req.user._id, req.body)
    res.status(201).json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.submitAnswer = async (req, res) => {
  try {
    const data = await careerReadiness.submitAnswer(req.user._id, req.params.sessionId, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.interviewHistory = async (req, res) => {
  try {
    const history = await careerReadiness.listInterviewHistory(req.user._id, req.query)
    res.json({ success: true, history })
  } catch (err) { handleError(res, err) }
}

exports.getInterview = async (req, res) => {
  try {
    const session = await careerReadiness.getInterviewSession(req.user._id, req.params.sessionId)
    res.json({ success: true, session })
  } catch (err) { handleError(res, err) }
}

exports.questionBank = async (req, res) => {
  try {
    const data = await careerReadiness.getQuestionBank(req.user._id, req.query)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.multiAgent = async (req, res) => {
  try {
    const analysis = await careerReadiness.multiAgentCareerAnalysis(req.user._id, req.body)
    res.json({ success: true, analysis })
  } catch (err) { handleError(res, err) }
}

exports.actionPlan = async (req, res) => {
  try {
    const plan = await careerReadiness.getCareerActionPlan(req.user._id, req.query)
    res.json({ success: true, ...plan })
  } catch (err) { handleError(res, err) }
}

exports.applicationReadiness = async (req, res) => {
  try {
    const data = await careerReadiness.getApplicationReadinessCheck(req.user._id, { ...req.query, ...req.params })
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.simulation = async (req, res) => {
  try {
    const simulation = await careerReadiness.getCareerSimulation(req.user._id, req.query)
    res.json({ success: true, simulation })
  } catch (err) { handleError(res, err) }
}

exports.timeline = async (req, res) => {
  try {
    const data = await careerReadiness.getCareerProgressTimeline(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.coach = async (req, res) => {
  try {
    const reply = await careerReadiness.careerCoachChat(req.user._id, req.body)
    res.json({ success: true, ...reply })
  } catch (err) { handleError(res, err) }
}

exports.report = async (req, res) => {
  try {
    const report = await careerReadiness.getReadinessReport(req.user._id, req.query)
    res.json({ success: true, report })
  } catch (err) { handleError(res, err) }
}
