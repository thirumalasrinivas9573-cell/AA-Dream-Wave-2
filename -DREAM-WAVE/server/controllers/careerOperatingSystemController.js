const careerOS = require('../services/careerOperatingSystemService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.commandCenter = async (req, res) => {
  try {
    const center = await careerOS.getCommandCenter(req.user._id)
    res.json({ success: true, commandCenter: center })
  } catch (err) { handleError(res, err) }
}

exports.state = async (req, res) => {
  try {
    const state = await careerOS.getCareerState(req.user._id)
    res.json({ success: true, state })
  } catch (err) { handleError(res, err) }
}

exports.whatChanged = async (req, res) => {
  try {
    const data = await careerOS.getWhatChanged(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.whatMatters = async (req, res) => {
  try {
    const data = await careerOS.getWhatMatters(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.nextActions = async (req, res) => {
  try {
    const data = await careerOS.getNextActions(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.today = async (req, res) => {
  try {
    const today = await careerOS.getTodayView(req.user._id)
    res.json({ success: true, today })
  } catch (err) { handleError(res, err) }
}

exports.report = async (req, res) => {
  try {
    const report = await careerOS.generateCareerReport(req.user._id)
    res.json({ success: true, report })
  } catch (err) { handleError(res, err) }
}

exports.scenario = async (req, res) => {
  try {
    const data = await careerOS.runScenario(req.user._id, req.body)
    res.status(201).json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.getScenario = async (req, res) => {
  try {
    const scenario = await careerOS.assertScenarioAccess(req.user._id, req.params.scenarioId)
    res.json({ success: true, scenario })
  } catch (err) { handleError(res, err) }
}

exports.copilot = async (req, res) => {
  try {
    const data = await careerOS.commandCenterCopilot(req.user._id, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.multiAgent = async (req, res) => {
  try {
    const data = await careerOS.multiAgentCareerQuery(req.user._id, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.readiness = async (req, res) => {
  try {
    const slices = await careerOS.getCareerState(req.user._id)
    res.json({ success: true, readiness: slices.readiness })
  } catch (err) { handleError(res, err) }
}

exports.funnel = async (req, res) => {
  try {
    const state = await careerOS.getCareerState(req.user._id)
    const funnel = careerOS.buildCareerFunnel({
      ctx: { targetRole: state.targetRole, careerGoal: state.currentGoal },
      gapAnalysis: { strengths: state.topSkills.map((s) => ({ skill: s })), gaps: state.skillGaps.map((s) => ({ skill: s })) },
      learningDash: { activePlans: state.activeLearning },
      projectDash: { projects: state.activeProjects },
      oppDash: { feed: state.relevantOpportunities },
      appDash: { active: state.activeApplications },
      interviewHistory: state.interviewStatus.recent,
    })
    res.json({ success: true, funnel })
  } catch (err) { handleError(res, err) }
}
