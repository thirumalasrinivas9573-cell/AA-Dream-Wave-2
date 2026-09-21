const mongoose = require('mongoose')
const plannerService = require('../services/plannerService')
const plannerIntelligence = require('../services/plannerIntelligenceService')
const scheduleEngine = require('../services/scheduleEngine')
const FocusSession = require('../models/FocusSession')
const Task = require('../models/Task')

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, message, code })
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ''))
}

function computeElapsedSeconds(session) {
  const now = Date.now()
  const start = new Date(session.startedAt).getTime()
  let elapsed = Math.max(0, Math.floor((now - start) / 1000))
  elapsed -= session.pausedDurationSeconds || 0
  if (session.status === 'paused' && session.pausedAt) {
    elapsed -= Math.max(0, Math.floor((now - new Date(session.pausedAt).getTime()) / 1000))
  }
  return Math.max(0, elapsed)
}

exports.getToday = async (req, res) => {
  try {
    const date = req.query.date || scheduleEngine.dateKeyFromDate()
    const view = await plannerService.buildTodayView(req.user._id, date)
    return res.json({ success: true, ...view })
  } catch (error) {
    console.error('[planner.getToday]', error.message)
    return fail(res, 500, 'Failed to load today\'s plan.')
  }
}

exports.getWeek = async (req, res) => {
  try {
    const weekStart = req.query.start || scheduleEngine.weekStartKey()
    const view = await plannerService.buildWeekView(req.user._id, weekStart)
    return res.json({ success: true, ...view })
  } catch (error) {
    console.error('[planner.getWeek]', error.message)
    return fail(res, 500, 'Failed to load weekly plan.')
  }
}

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await plannerService.getOrCreatePreferences(req.user._id)
    return res.json({ success: true, preferences })
  } catch (error) {
    console.error('[planner.getPreferences]', error.message)
    return fail(res, 500, 'Failed to load planner preferences.')
  }
}

exports.updatePreferences = async (req, res) => {
  try {
    const preferences = await plannerService.updatePreferences(req.user._id, req.body || {})
    return res.json({ success: true, preferences })
  } catch (error) {
    console.error('[planner.updatePreferences]', error.message)
    return fail(res, 500, 'Failed to update planner preferences.')
  }
}

exports.listSchedule = async (req, res) => {
  try {
    const items = await plannerService.getScheduleItems(req.user._id, {
      date: req.query.date,
      start: req.query.start,
      end: req.query.end,
    })
    return res.json({ success: true, items })
  } catch (error) {
    console.error('[planner.listSchedule]', error.message)
    return fail(res, 500, 'Failed to load schedule.')
  }
}

exports.createSchedule = async (req, res) => {
  try {
    const item = await plannerService.createScheduleItem(req.user._id, req.body || {})
    return res.status(201).json({ success: true, item })
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, conflicts: error.conflicts })
    }
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.createSchedule]', error.message)
    return fail(res, 500, 'Failed to create schedule item.')
  }
}

exports.updateSchedule = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid schedule item ID.', 'INVALID_ID')
    const item = await plannerService.updateScheduleItem(req.user._id, req.params.id, req.body || {})
    return res.json({ success: true, item })
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, conflicts: error.conflicts })
    }
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.updateSchedule]', error.message)
    return fail(res, 500, 'Failed to update schedule item.')
  }
}

exports.deleteSchedule = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid schedule item ID.', 'INVALID_ID')
    await plannerService.deleteScheduleItem(req.user._id, req.params.id)
    return res.json({ success: true })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.deleteSchedule]', error.message)
    return fail(res, 500, 'Failed to delete schedule item.')
  }
}

exports.completeSchedule = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid schedule item ID.', 'INVALID_ID')
    const item = await plannerService.completeScheduleItem(req.user._id, req.params.id, {
      markTaskComplete: Boolean(req.body?.markTaskComplete),
    })
    return res.json({ success: true, item })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.completeSchedule]', error.message)
    return fail(res, 500, 'Failed to complete schedule item.')
  }
}

exports.skipSchedule = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid schedule item ID.', 'INVALID_ID')
    const item = await plannerService.skipScheduleItem(req.user._id, req.params.id)
    return res.json({ success: true, item })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.skipSchedule]', error.message)
    return fail(res, 500, 'Failed to skip schedule item.')
  }
}

exports.suggestDaily = async (req, res) => {
  try {
    const preview = await plannerIntelligence.suggestDailyPlan(req.user._id, req.body || {})
    return res.json({ success: true, preview })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.suggestDaily]', error.message)
    return fail(res, 500, 'Failed to generate daily plan suggestion.')
  }
}

exports.suggestWeekly = async (req, res) => {
  try {
    const preview = await plannerIntelligence.suggestWeeklyPlan(req.user._id, req.body || {})
    return res.json({ success: true, preview })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.suggestWeekly]', error.message)
    return fail(res, 500, 'Failed to generate weekly plan suggestion.')
  }
}

exports.applyPlan = async (req, res) => {
  try {
    const { items, mode, planBatchId } = req.body || {}
    if (!Array.isArray(items) || !items.length) {
      return fail(res, 400, 'Select at least one plan item to apply.')
    }
    const result = await plannerService.applyPlanItems(req.user._id, items, { mode, planBatchId })
    return res.status(201).json({ success: true, ...result })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.errors ? 'VALIDATION' : undefined)
    console.error('[planner.applyPlan]', error.message)
    return fail(res, 500, 'Failed to apply plan.')
  }
}

exports.suggestBreakdown = async (req, res) => {
  try {
    if (!validId(req.params.taskId)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const result = await plannerIntelligence.suggestTaskBreakdown(req.user._id, req.params.taskId)
    return res.json({ success: true, ...result })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message)
    console.error('[planner.suggestBreakdown]', error.message)
    return fail(res, 500, 'Failed to suggest task breakdown.')
  }
}

exports.getMetrics = async (req, res) => {
  try {
    const metrics = await plannerService.buildMetrics(req.user._id)
    return res.json({ success: true, metrics })
  } catch (error) {
    console.error('[planner.getMetrics]', error.message)
    return fail(res, 500, 'Failed to load productivity metrics.')
  }
}

exports.getDailySummary = async (req, res) => {
  try {
    const date = req.query.date || scheduleEngine.dateKeyFromDate()
    const summary = await plannerService.buildDailySummary(req.user._id, date)
    return res.json({ success: true, summary })
  } catch (error) {
    console.error('[planner.getDailySummary]', error.message)
    return fail(res, 500, 'Failed to load daily summary.')
  }
}

exports.suggestAdapt = async (req, res) => {
  try {
    const date = req.body?.date || scheduleEngine.dateKeyFromDate()
    const result = await plannerService.suggestAdaptiveReschedule(req.user._id, date)
    return res.json({ success: true, ...result })
  } catch (error) {
    console.error('[planner.suggestAdapt]', error.message)
    return fail(res, 500, 'Failed to suggest schedule adaptation.')
  }
}

exports.getOverdue = async (req, res) => {
  try {
    const context = await plannerService.loadPlanningContext(req.user._id)
    const overdue = context.tasks.filter((t) => !t.completed && require('../services/priorityEngine').isOverdue(t))
    return res.json({ success: true, overdue })
  } catch (error) {
    console.error('[planner.getOverdue]', error.message)
    return fail(res, 500, 'Failed to load overdue tasks.')
  }
}

exports.getActiveFocus = async (req, res) => {
  try {
    const session = await FocusSession.findOne({ userId: req.user._id, status: { $in: ['active', 'paused'] } })
      .populate('taskId', 'title goalId roadmapId status completed')
      .populate('goalId', 'title')
      .lean()
    if (!session) return res.json({ success: true, session: null })
    return res.json({
      success: true,
      session: { ...session, elapsedSeconds: computeElapsedSeconds(session) },
    })
  } catch (error) {
    console.error('[planner.getActiveFocus]', error.message)
    return fail(res, 500, 'Failed to load active focus session.')
  }
}

exports.getFocusHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const filter = { userId: req.user._id, status: { $in: ['completed', 'cancelled'] } }
    if (req.query.from) filter.startedAt = { $gte: new Date(req.query.from) }
    const [sessions, total] = await Promise.all([
      FocusSession.find(filter)
        .populate('taskId', 'title')
        .sort('-startedAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FocusSession.countDocuments(filter),
    ])
    return res.json({ success: true, sessions, pagination: { page, limit, total } })
  } catch (error) {
    console.error('[planner.getFocusHistory]', error.message)
    return fail(res, 500, 'Failed to load focus history.')
  }
}

exports.startFocus = async (req, res) => {
  try {
    const { taskId, timerMode, plannedDurationMinutes, goalId } = req.body || {}
    if (!validId(taskId)) return fail(res, 400, 'Valid task ID is required.', 'INVALID_ID')
    const task = await Task.findOne({ _id: taskId, userId: req.user._id })
    if (!task) return fail(res, 404, 'Task not found.', 'NOT_FOUND')

    const existing = await FocusSession.findOne({ userId: req.user._id, status: { $in: ['active', 'paused'] } })
    if (existing) {
      return res.json({
        success: true,
        session: { ...existing.toObject(), elapsedSeconds: computeElapsedSeconds(existing) },
        resumed: true,
      })
    }

    const session = await FocusSession.create({
      userId: req.user._id,
      taskId: task._id,
      goalId: goalId || task.goalId,
      timerMode: ['custom', '25', '45', '60'].includes(timerMode) ? timerMode : 'custom',
      plannedDurationMinutes: Number(plannedDurationMinutes) || 0,
      startedAt: new Date(),
      status: 'active',
    })
    return res.status(201).json({ success: true, session })
  } catch (error) {
    console.error('[planner.startFocus]', error.message)
    return fail(res, 500, 'Failed to start focus session.')
  }
}

exports.pauseFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid session ID.', 'INVALID_ID')
    const session = await FocusSession.findOne({ _id: req.params.id, userId: req.user._id, status: 'active' })
    if (!session) return fail(res, 404, 'No active focus session found.', 'NOT_FOUND')
    session.status = 'paused'
    session.pausedAt = new Date()
    await session.save()
    return res.json({ success: true, session: { ...session.toObject(), elapsedSeconds: computeElapsedSeconds(session) } })
  } catch (error) {
    console.error('[planner.pauseFocus]', error.message)
    return fail(res, 500, 'Failed to pause focus session.')
  }
}

exports.resumeFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid session ID.', 'INVALID_ID')
    const session = await FocusSession.findOne({ _id: req.params.id, userId: req.user._id, status: 'paused' })
    if (!session) return fail(res, 404, 'No paused focus session found.', 'NOT_FOUND')
    if (session.pausedAt) {
      session.pausedDurationSeconds = (session.pausedDurationSeconds || 0)
        + Math.max(0, Math.floor((Date.now() - new Date(session.pausedAt).getTime()) / 1000))
    }
    session.pausedAt = null
    session.status = 'active'
    await session.save()
    return res.json({ success: true, session: { ...session.toObject(), elapsedSeconds: computeElapsedSeconds(session) } })
  } catch (error) {
    console.error('[planner.resumeFocus]', error.message)
    return fail(res, 500, 'Failed to resume focus session.')
  }
}

exports.completeFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid session ID.', 'INVALID_ID')
    const session = await FocusSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['active', 'paused'] },
    })
    if (!session) return fail(res, 404, 'Focus session not found.', 'NOT_FOUND')

    if (session.status === 'paused' && session.pausedAt) {
      session.pausedDurationSeconds = (session.pausedDurationSeconds || 0)
        + Math.max(0, Math.floor((Date.now() - new Date(session.pausedAt).getTime()) / 1000))
      session.pausedAt = null
    }

    session.endedAt = new Date()
    session.durationSeconds = computeElapsedSeconds(session)
    session.status = 'completed'
    if (req.body?.note) session.note = String(req.body.note).slice(0, 500)
    if (req.body?.distractionNote) session.distractionNote = String(req.body.distractionNote).slice(0, 200)
    await session.save()

    const focusMinutes = Math.max(1, Math.round(session.durationSeconds / 60))
    await Task.updateOne({ _id: session.taskId, userId: req.user._id }, { $inc: { actualMinutes: focusMinutes } })

    if (req.body?.markTaskComplete) {
      await Task.updateOne(
        { _id: session.taskId, userId: req.user._id },
        { $set: { completed: true, status: 'completed', completedAt: new Date() } },
      )
    }

    return res.json({ success: true, session })
  } catch (error) {
    console.error('[planner.completeFocus]', error.message)
    return fail(res, 500, 'Failed to complete focus session.')
  }
}

exports.cancelFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid session ID.', 'INVALID_ID')
    const session = await FocusSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'ready'] },
    })
    if (!session) return fail(res, 404, 'Focus session not found.', 'NOT_FOUND')
    session.status = 'cancelled'
    session.endedAt = new Date()
    session.durationSeconds = computeElapsedSeconds(session)
    await session.save()
    return res.json({ success: true, session })
  } catch (error) {
    console.error('[planner.cancelFocus]', error.message)
    return fail(res, 500, 'Failed to cancel focus session.')
  }
}
