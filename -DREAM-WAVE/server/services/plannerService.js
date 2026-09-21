const crypto = require('crypto')
const Task = require('../models/Task')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const ScheduleItem = require('../models/ScheduleItem')
const PlannerPreferences = require('../models/PlannerPreferences')
const FocusSession = require('../models/FocusSession')
const scheduleEngine = require('./scheduleEngine')
const priorityEngine = require('./priorityEngine')
const { validatePlanItems } = require('./planValidator')

const DEFAULT_PREFS = {
  timezone: 'UTC',
  availableTodayMinutes: 180,
  preferredStudyTime: 'flexible',
  sessionLengthMinutes: 45,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  maxDailyStudyMinutes: 360,
  preferredDifficultyMix: 'balanced',
  defaultTimerMode: '45',
  breakReminders: true,
}

async function getOrCreatePreferences(userId) {
  let prefs = await PlannerPreferences.findOne({ userId }).lean()
  if (!prefs) {
    prefs = (await PlannerPreferences.create({ userId, ...DEFAULT_PREFS })).toObject()
  }
  return prefs
}

async function updatePreferences(userId, payload = {}) {
  const allowed = [
    'timezone', 'availableTodayMinutes', 'weeklyAvailability', 'preferredStudyTime',
    'sessionLengthMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'maxDailyStudyMinutes',
    'preferredDifficultyMix', 'defaultTimerMode', 'breakReminders',
  ]
  const update = {}
  allowed.forEach((key) => {
    if (payload[key] !== undefined) update[key] = payload[key]
  })
  return PlannerPreferences.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId, ...DEFAULT_PREFS } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
}

async function loadPlanningContext(userId) {
  const [tasks, goals, roadmaps, preferences] = await Promise.all([
    Task.find({ userId, status: { $ne: 'archived' } })
      .select('title status priority dueDate completed goalId roadmapId estimatedMinutes estimatedTime source')
      .lean(),
    Goal.find({ userId, status: { $ne: 'archived' } })
      .select('title priority deadline progress status')
      .lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } })
      .select('goalId learningStages progress status')
      .lean(),
    getOrCreatePreferences(userId),
  ])
  return { tasks, goals, roadmaps, preferences }
}

function availableMinutesForDate(preferences, dateKey) {
  const dayKey = scheduleEngine.dayKeyFromDate(scheduleEngine.parseDateKey(dateKey))
  const weekly = preferences.weeklyAvailability?.[dayKey]
  if (weekly?.enabled === false) return 0
  if (weekly?.minutes) return weekly.minutes
  const todayKey = scheduleEngine.dateKeyFromDate(new Date())
  if (dateKey === todayKey && preferences.availableTodayMinutes) {
    return preferences.availableTodayMinutes
  }
  return preferences.sessionLengthMinutes * 3 || 120
}

async function getScheduleItems(userId, { start, end, date } = {}) {
  const filter = { userId, status: { $nin: ['cancelled'] } }
  if (date) filter.scheduledDate = date
  else if (start && end) filter.scheduledDate = { $gte: start, $lte: end }
  return ScheduleItem.find(filter)
    .sort({ scheduledDate: 1, startTime: 1 })
    .lean()
}

async function enrichScheduleItems(items, { tasks, goals, roadmaps } = {}) {
  const taskMap = new Map((tasks || []).map((t) => [String(t._id), t]))
  const goalMap = new Map((goals || []).map((g) => [String(g._id), g]))
  const roadmapMap = new Map((roadmaps || []).map((r) => [String(r._id), r]))

  return items.map((item) => {
    const task = item.taskId ? taskMap.get(String(item.taskId)) : null
    const goal = item.goalId ? goalMap.get(String(item.goalId)) : (task?.goalId ? goalMap.get(String(task.goalId)) : null)
    const roadmap = item.roadmapId ? roadmapMap.get(String(item.roadmapId)) : (task?.roadmapId ? roadmapMap.get(String(task.roadmapId)) : null)
    const completed = task?.completed || task?.status === 'completed' || item.status === 'completed'
    return {
      ...item,
      task: task ? { _id: task._id, title: task.title, status: task.status, completed: task.completed, dueDate: task.dueDate } : null,
      goal: goal ? { _id: goal._id, title: goal.title, priority: goal.priority } : null,
      roadmap: roadmap ? { _id: roadmap._id, goalId: roadmap.goalId } : null,
      isCompleted: completed,
      isOverdue: task ? priorityEngine.isOverdue(task) : false,
    }
  })
}

async function createScheduleItem(userId, payload) {
  const errors = scheduleEngine.validateTimeBlock(payload)
  if (errors.length) throw Object.assign(new Error(errors[0]), { statusCode: 400 })

  if (payload.taskId) {
    const task = await Task.findOne({ _id: payload.taskId, userId })
    if (!task) throw Object.assign(new Error('Task not found.'), { statusCode: 404 })
    payload.title = payload.title || task.title
    payload.goalId = payload.goalId || task.goalId
    payload.roadmapId = payload.roadmapId || task.roadmapId
  }

  const existing = await ScheduleItem.find({
    userId,
    scheduledDate: payload.scheduledDate,
    status: { $nin: ['cancelled', 'skipped'] },
  }).lean()
  const conflicts = scheduleEngine.detectConflicts(existing, payload)
  if (conflicts.length) {
    throw Object.assign(new Error('Schedule conflict detected.'), { statusCode: 409, conflicts })
  }

  return ScheduleItem.create({
    userId,
    ...payload,
    source: payload.source || 'manual',
  })
}

async function updateScheduleItem(userId, id, payload) {
  const item = await ScheduleItem.findOne({ _id: id, userId })
  if (!item) throw Object.assign(new Error('Schedule item not found.'), { statusCode: 404 })

  const merged = {
    ...item.toObject(),
    ...payload,
    scheduledDate: payload.scheduledDate || item.scheduledDate,
    startTime: payload.startTime ?? item.startTime,
    endTime: payload.endTime ?? item.endTime,
    durationMinutes: payload.durationMinutes ?? item.durationMinutes,
  }
  const errors = scheduleEngine.validateTimeBlock(merged)
  if (errors.length) throw Object.assign(new Error(errors[0]), { statusCode: 400 })

  const siblings = await ScheduleItem.find({
    userId,
    scheduledDate: merged.scheduledDate,
    _id: { $ne: id },
    status: { $nin: ['cancelled', 'skipped'] },
  }).lean()
  const conflicts = scheduleEngine.detectConflicts(siblings, merged)
  if (conflicts.length) {
    throw Object.assign(new Error('Schedule conflict detected.'), { statusCode: 409, conflicts })
  }

  Object.assign(item, payload)
  await item.save()
  return item
}

async function deleteScheduleItem(userId, id) {
  const item = await ScheduleItem.findOneAndDelete({ _id: id, userId })
  if (!item) throw Object.assign(new Error('Schedule item not found.'), { statusCode: 404 })
  return item
}

async function completeScheduleItem(userId, id, { markTaskComplete = false } = {}) {
  const item = await ScheduleItem.findOne({ _id: id, userId })
  if (!item) throw Object.assign(new Error('Schedule item not found.'), { statusCode: 404 })
  item.status = 'completed'
  await item.save()
  if (markTaskComplete && item.taskId) {
    await Task.updateOne(
      { _id: item.taskId, userId },
      { $set: { completed: true, status: 'completed', completedAt: new Date() } },
    )
  }
  return item
}

async function skipScheduleItem(userId, id) {
  return updateScheduleItem(userId, id, { status: 'skipped' })
}

function buildDeterministicDailyItems(tasks, goals, roadmaps, preferences, dateKey) {
  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed')
  const ranked = priorityEngine.sortTasksByPriority(pending, { goals, roadmaps })
  const available = availableMinutesForDate(preferences, dateKey)
  const sessionLen = preferences.sessionLengthMinutes || 45
  const breakLen = preferences.shortBreakMinutes || 5
  let cursor = scheduleEngine.defaultStartTime(preferences)
  let used = 0
  const items = []

  for (const { task, score, factors } of ranked) {
    const duration = task.estimatedMinutes || sessionLen
    if (used + duration > available) break
    const end = scheduleEngine.addMinutesToTime(cursor, duration)
    const explanation = priorityEngine.explainPriority(task, { goals, roadmaps })
    items.push({
      taskId: task._id,
      goalId: task.goalId,
      roadmapId: task.roadmapId,
      title: task.title,
      itemType: 'task',
      scheduledDate: dateKey,
      startTime: cursor,
      endTime: end,
      durationMinutes: duration,
      priority: task.priority || 'Medium',
      priorityScore: score,
      priorityReason: explanation.primaryReason || explanation.explanation,
      selected: true,
      source: 'system',
    })
    used += duration
    cursor = scheduleEngine.addMinutesToTime(end, breakLen)
    if (items.length >= 12) break
  }
  return { items, availableMinutes: available, plannedMinutes: used }
}

async function buildTodayView(userId, dateKey = scheduleEngine.dateKeyFromDate()) {
  const context = await loadPlanningContext(userId)
  const [schedule, focusSessions] = await Promise.all([
    getScheduleItems(userId, { date: dateKey }),
    FocusSession.find({
      userId,
      startedAt: { $gte: scheduleEngine.startOfDay(scheduleEngine.parseDateKey(dateKey)), $lte: scheduleEngine.endOfDay(scheduleEngine.parseDateKey(dateKey)) },
    }).select('durationSeconds status taskId startedAt').lean(),
  ])

  let items = await enrichScheduleItems(schedule, context)
  items = items.filter((item) => !item.isCompleted || item.status === 'completed')

  const pending = context.tasks.filter((t) => !t.completed && t.status !== 'completed')
  const overdue = pending.filter((t) => priorityEngine.isOverdue(t))
  const availableMinutes = availableMinutesForDate(context.preferences, dateKey)
  const plannedMinutes = scheduleEngine.sumPlannedMinutes(items)
  const overload = scheduleEngine.detectOverload(plannedMinutes, availableMinutes)
  const focusMinutes = Math.round(focusSessions.reduce((s, f) => s + (f.durationSeconds || 0), 0) / 60)
  const completedCount = items.filter((i) => i.status === 'completed' || i.isCompleted).length

  const goalPriorities = context.goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => (b.priority === 'Critical' ? 1 : 0) - (a.priority === 'Critical' ? 1 : 0))
    .slice(0, 5)

  const roadmapPriorities = context.roadmaps
    .filter((r) => r.status === 'active')
    .slice(0, 4)
    .map((r) => {
      const next = (r.learningStages || []).find((s) => s.status !== 'completed')
      return { ...r, nextStage: next?.title || null }
    })

  const ranked = priorityEngine.sortTasksByPriority(pending, context).slice(0, 8)

  return {
    date: dateKey,
    items,
    overdue,
    upcoming: ranked.map(({ task, score, factors }) => ({
      task,
      score,
      explanation: priorityEngine.explainPriority(task, context),
    })),
    goalPriorities,
    roadmapPriorities,
    metrics: {
      planned: items.length,
      completed: completedCount,
      focusMinutes,
      availableMinutes,
      plannedMinutes,
      overload,
    },
    preferences: context.preferences,
  }
}

async function buildWeekView(userId, startKey = scheduleEngine.weekStartKey()) {
  const dates = scheduleEngine.weekDateKeys(startKey)
  const context = await loadPlanningContext(userId)
  const schedule = await getScheduleItems(userId, { start: dates[0], end: dates[6] })
  const enriched = await enrichScheduleItems(schedule, context)

  const days = dates.map((dateKey) => {
    const dayItems = enriched.filter((i) => i.scheduledDate === dateKey)
    const available = availableMinutesForDate(context.preferences, dateKey)
    const planned = scheduleEngine.sumPlannedMinutes(dayItems)
    return {
      date: dateKey,
      label: scheduleEngine.dayKeyFromDate(scheduleEngine.parseDateKey(dateKey)),
      items: dayItems,
      availableMinutes: available,
      plannedMinutes: planned,
      overload: scheduleEngine.detectOverload(planned, available),
      deadlines: context.tasks.filter((t) => {
        if (!t.dueDate) return false
        return scheduleEngine.dateKeyFromDate(t.dueDate) === dateKey
      }),
    }
  })

  return { weekStart: startKey, days, preferences: context.preferences }
}

async function applyPlanItems(userId, items, { mode = 'selected', planBatchId } = {}) {
  const context = await loadPlanningContext(userId)
  const toApply = mode === 'all' ? items : items.filter((i) => i.selected !== false)
  const validation = validatePlanItems(toApply, { tasks: context.tasks })
  if (!validation.valid) {
    throw Object.assign(new Error(validation.errors[0]), { statusCode: 400, errors: validation.errors })
  }

  const batch = planBatchId || crypto.randomUUID()
  const created = []
  for (const item of validation.items) {
    const doc = await ScheduleItem.create({
      userId,
      taskId: item.taskId || undefined,
      goalId: item.goalId || undefined,
      roadmapId: item.roadmapId || undefined,
      milestoneKey: item.milestoneKey || undefined,
      title: item.title,
      itemType: item.itemType,
      scheduledDate: item.scheduledDate,
      startTime: item.startTime,
      endTime: item.endTime,
      durationMinutes: item.durationMinutes,
      priority: item.priority,
      priorityScore: item.priorityScore || 0,
      priorityReason: item.priorityReason,
      notes: item.notes,
      source: 'ai',
      planBatchId: batch,
      status: 'scheduled',
    })
    created.push(doc)
  }
  return { created, warnings: validation.warnings, planBatchId: batch }
}

async function buildMetrics(userId) {
  const now = new Date()
  const weekStart = scheduleEngine.startOfDay(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const [sessions, tasks, schedule] = await Promise.all([
    FocusSession.find({ userId, status: 'completed', endedAt: { $gte: weekStart } }).lean(),
    Task.find({ userId, completedAt: { $gte: weekStart } }).select('completedAt goalId').lean(),
    ScheduleItem.find({ userId, scheduledDate: { $gte: scheduleEngine.dateKeyFromDate(weekStart) } }).lean(),
  ])

  const focusByDay = {}
  sessions.forEach((s) => {
    const key = scheduleEngine.dateKeyFromDate(s.endedAt || s.startedAt)
    focusByDay[key] = (focusByDay[key] || 0) + Math.round((s.durationSeconds || 0) / 60)
  })

  const tasksByDay = {}
  tasks.forEach((t) => {
    const key = scheduleEngine.dateKeyFromDate(t.completedAt)
    tasksByDay[key] = (tasksByDay[key] || 0) + 1
  })

  const totalFocusMinutes = sessions.reduce((s, f) => s + Math.round((f.durationSeconds || 0) / 60), 0)
  const planned = schedule.filter((i) => i.status !== 'cancelled').length
  const completedSchedule = schedule.filter((i) => i.status === 'completed').length

  return {
    totalFocusMinutes,
    sessionsCompleted: sessions.length,
    averageSessionMinutes: sessions.length ? Math.round(totalFocusMinutes / sessions.length) : 0,
    tasksCompletedThisWeek: tasks.length,
    plannedItemsThisWeek: planned,
    completedScheduleItems: completedSchedule,
    planCompletionRate: planned ? Math.round((completedSchedule / planned) * 100) : 0,
    focusByDay,
    tasksByDay,
    insights: buildInsights({ focusByDay, tasksByDay, totalFocusMinutes, tasksCompleted: tasks.length, planned, completedSchedule }),
  }
}

function buildInsights({ focusByDay, tasksByDay, totalFocusMinutes, tasksCompleted, planned, completedSchedule }) {
  const insights = []
  if (planned > 0) {
    insights.push(`You completed ${completedSchedule} of ${planned} planned items this week.`)
  }
  if (totalFocusMinutes > 0) {
    const h = Math.floor(totalFocusMinutes / 60)
    const m = totalFocusMinutes % 60
    insights.push(`You focused for ${h ? `${h}h ` : ''}${m}m this week.`)
  }
  if (tasksCompleted > 0) {
    insights.push(`You completed ${tasksCompleted} tasks this week.`)
  }
  const eveningSessions = Object.entries(focusByDay).filter(([, mins]) => mins >= 30).length
  if (eveningSessions >= 3) {
    insights.push('You may prefer scheduling difficult work in periods when you have longer focus blocks.')
  }
  return insights
}

async function buildDailySummary(userId, dateKey = scheduleEngine.dateKeyFromDate()) {
  const today = await buildTodayView(userId, dateKey)
  return {
    date: dateKey,
    plannedTasks: today.items.length,
    completedTasks: today.metrics.completed,
    remainingTasks: today.items.filter((i) => i.status !== 'completed' && !i.isCompleted).length,
    focusMinutes: today.metrics.focusMinutes,
    goalProgress: today.goalPriorities.map((g) => ({ _id: g._id, title: g.title, progress: g.progress })),
    overload: today.metrics.overload,
  }
}

async function suggestAdaptiveReschedule(userId, dateKey = scheduleEngine.dateKeyFromDate()) {
  const context = await loadPlanningContext(userId)
  const todayItems = await getScheduleItems(userId, { date: dateKey })
  const incomplete = todayItems.filter((i) => i.status === 'scheduled' || i.status === 'in-progress')
  const tomorrow = scheduleEngine.dateKeyFromDate(scheduleEngine.addDays(scheduleEngine.parseDateKey(dateKey), 1))
  const suggestions = incomplete.slice(0, 5).map((item) => ({
    itemId: item._id,
    title: item.title,
    action: 'move',
    targetDate: tomorrow,
    reason: 'Missed or incomplete block — consider moving to the next available day.',
  }))
  return { suggestions, preserveExisting: true }
}

module.exports = {
  getOrCreatePreferences,
  updatePreferences,
  loadPlanningContext,
  availableMinutesForDate,
  getScheduleItems,
  enrichScheduleItems,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  completeScheduleItem,
  skipScheduleItem,
  buildDeterministicDailyItems,
  buildTodayView,
  buildWeekView,
  applyPlanItems,
  buildMetrics,
  buildDailySummary,
  suggestAdaptiveReschedule,
}
