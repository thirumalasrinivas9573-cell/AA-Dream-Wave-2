const goalExecution = require('../services/goalExecutionService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await goalExecution.getExecutionDashboard(req.user._id)
    res.json({ success: true, dashboard })
  } catch (err) { handleError(res, err) }
}

exports.strategy = async (req, res) => {
  try {
    const goal = req.query.goalId
      ? await goalExecution.assertGoalAccess(req.user._id, req.query.goalId)
      : await goalExecution.getPrimaryCareerGoal(req.user._id)
    if (!goal) return res.json({ success: true, strategy: [], empty: true })
    const { strategy } = await goalExecution.buildStrategy(req.user._id, goal)
    res.json({ success: true, strategy, goal: { id: goal._id, title: goal.title } })
  } catch (err) { handleError(res, err) }
}

exports.milestones = async (req, res) => {
  try {
    const { plan } = await goalExecution.getOrCreateExecutionPlan(req.user._id, { goalId: req.query.goalId })
    res.json({ success: true, milestones: plan?.milestones || [] })
  } catch (err) { handleError(res, err) }
}

exports.generatePlan = async (req, res) => {
  try {
    const { goal, plan } = await goalExecution.getOrCreateExecutionPlan(req.user._id, {
      goalId: req.body.goalId,
      regenerate: req.body.regenerate,
    })
    res.status(plan?.status === 'PROPOSED' ? 201 : 200).json({ success: true, goal, plan })
  } catch (err) { handleError(res, err) }
}

exports.currentPlan = async (req, res) => {
  try {
    const goal = await goalExecution.getPrimaryCareerGoal(req.user._id)
    if (!goal) return res.json({ success: true, plan: null, empty: true })
    const ExecutionPlan = require('../models/ExecutionPlan')
    const plan = await ExecutionPlan.findOne({ userId: req.user._id, goalId: goal._id, status: 'ACTIVE' }).lean()
      || await ExecutionPlan.findOne({ userId: req.user._id, goalId: goal._id }).sort({ version: -1 }).lean()
    res.json({ success: true, plan, goal })
  } catch (err) { handleError(res, err) }
}

exports.acceptPlan = async (req, res) => {
  try {
    const plan = await goalExecution.acceptPlan(req.user._id, req.params.planId)
    res.json({ success: true, plan, message: 'Execution plan activated.' })
  } catch (err) { handleError(res, err) }
}

exports.daily = async (req, res) => {
  try {
    const daily = await goalExecution.getDailyPlan(req.user._id, { regenerate: req.query.regenerate === 'true' })
    res.json({ success: true, daily })
  } catch (err) { handleError(res, err) }
}

exports.weekly = async (req, res) => {
  try {
    const weekly = await goalExecution.getWeeklyPlan(req.user._id)
    res.json({ success: true, weekly })
  } catch (err) { handleError(res, err) }
}

exports.blockers = async (req, res) => {
  try {
    const goal = await goalExecution.getPrimaryCareerGoal(req.user._id)
    if (!goal) return res.json({ success: true, blockers: [] })
    const ExecutionPlan = require('../models/ExecutionPlan')
    const plan = await ExecutionPlan.findOne({ userId: req.user._id, goalId: goal._id, status: 'ACTIVE' }).lean()
    const slices = { gapAnalysis: await require('../services/careerCopilotService').getCareerGapAnalysis(req.user._id) }
    const blockers = await goalExecution.detectBlockers(req.user._id, goal, plan?.milestones || [], slices)
    res.json({ success: true, blockers })
  } catch (err) { handleError(res, err) }
}

exports.progress = async (req, res) => {
  try {
    const goal = req.query.goalId
      ? await goalExecution.assertGoalAccess(req.user._id, req.query.goalId)
      : await goalExecution.getPrimaryCareerGoal(req.user._id)
    if (!goal) return res.json({ success: true, progress: null, empty: true })
    const progress = await goalExecution.getProgress(req.user._id, goal._id)
    res.json({ success: true, progress })
  } catch (err) { handleError(res, err) }
}

exports.risk = async (req, res) => {
  try {
    const dashboard = await goalExecution.getExecutionDashboard(req.user._id)
    res.json({ success: true, risk: dashboard.risk, empty: dashboard.empty })
  } catch (err) { handleError(res, err) }
}

exports.recovery = async (req, res) => {
  try {
    const recovery = await goalExecution.getRecoveryPlan(req.user._id)
    res.json({ success: true, recovery })
  } catch (err) { handleError(res, err) }
}

exports.completeTask = async (req, res) => {
  try {
    const result = await goalExecution.completeTask(req.user._id, req.params.taskId)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.skipTask = async (req, res) => {
  try {
    const result = await goalExecution.skipTask(req.user._id, req.params.taskId, req.body)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.failTask = async (req, res) => {
  try {
    const result = await goalExecution.markTaskFailed(req.user._id, req.params.taskId)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.splitTask = async (req, res) => {
  try {
    const result = await goalExecution.splitTask(req.user._id, req.params.taskId)
    res.status(201).json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.rescheduleProposal = async (req, res) => {
  try {
    const result = await goalExecution.proposeReschedule(req.user._id, req.params.taskId)
    res.json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

exports.planChanges = async (req, res) => {
  try {
    const data = await goalExecution.getPlanChangeExplanation(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.copilot = async (req, res) => {
  try {
    const data = await goalExecution.executionCopilot(req.user._id, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.replan = async (req, res) => {
  try {
    const data = await goalExecution.replan(req.user._id, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}
