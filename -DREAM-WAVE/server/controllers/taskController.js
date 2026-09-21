const mongoose = require('mongoose')
const Task = require('../models/Task')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const FocusSession = require('../models/FocusSession')
const notificationService = require('../services/notificationService')
const aiTaskService = require('../services/aiTaskService')
const { syncGoalProgress } = require('../services/progressEngine')

const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['todo', 'in-progress', 'paused', 'completed', 'archived']
const TYPES = ['learn', 'quiz', 'practice', 'revise']
const SOURCES = ['manual', 'ai', 'duplicate', 'roadmap']
const fail = (res, status, message, code = 'TASK_ERROR') => res.status(status).json({ success: false, code, message })
const validId = (value) => mongoose.isValidObjectId(value)
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function parseDate(value, label) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${label}.`)
    error.statusCode = 400
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  return date
}

async function validateLinks({ goalId, roadmapId }, userId) {
  let goal
  let roadmap
  if (goalId) {
    if (!validId(goalId)) throw Object.assign(new Error('Invalid goal ID.'), { statusCode: 400, code: 'INVALID_ID' })
    goal = await Goal.findOne({ _id: goalId, userId })
    if (!goal) throw Object.assign(new Error('Linked goal not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  if (roadmapId) {
    if (!validId(roadmapId)) throw Object.assign(new Error('Invalid roadmap ID.'), { statusCode: 400, code: 'INVALID_ID' })
    roadmap = await Roadmap.findOne({ _id: roadmapId, userId })
    if (!roadmap) throw Object.assign(new Error('Linked roadmap not found.'), { statusCode: 404, code: 'NOT_FOUND' })
    if (goalId && String(roadmap.goalId) !== String(goalId)) {
      throw Object.assign(new Error('The roadmap does not belong to the selected goal.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    }
  }
  return { goal, roadmap }
}

function sanitizeArray(value, max, mapper, label) {
  if (!Array.isArray(value)) throw Object.assign(new Error(`${label} must be an array.`), { statusCode: 400, code: 'VALIDATION_ERROR' })
  if (value.length > max) throw Object.assign(new Error(`${label} cannot contain more than ${max} items.`), { statusCode: 400, code: 'VALIDATION_ERROR' })
  return value.map(mapper)
}

function validateTaskInput(body, partial = false) {
  const output = {}
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim()
    if (!title || title.length > 200) throw Object.assign(new Error('A task title between 1 and 200 characters is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.title = title
  }
  if (body.description !== undefined) {
    const description = String(body.description || '').trim()
    if (description.length > 10000) throw Object.assign(new Error('Description cannot exceed 10000 characters.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.description = description
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw Object.assign(new Error('Invalid priority.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.priority = body.priority
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw Object.assign(new Error('Invalid task status.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.status = body.status
  }
  if (body.type !== undefined && body.type !== '') {
    if (!TYPES.includes(body.type)) throw Object.assign(new Error('Invalid learning task type.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.type = body.type
  }
  if (body.category !== undefined) output.category = String(body.category || 'General').trim().slice(0, 100)
  if (body.startDate !== undefined) output.startDate = body.startDate ? parseDate(body.startDate, 'start date') : null
  if (body.dueDate !== undefined) output.dueDate = body.dueDate ? parseDate(body.dueDate, 'due date') : null
  if (body.reminderAt !== undefined) output.reminderAt = body.reminderAt ? parseDate(body.reminderAt, 'reminder date') : null
  if (body.estimatedMinutes !== undefined) {
    const value = Number(body.estimatedMinutes)
    if (!Number.isFinite(value) || value < 0 || value > 1440) throw Object.assign(new Error('Estimated duration must be between 0 and 1440 minutes.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.estimatedMinutes = Math.round(value)
  }
  if (body.actualMinutes !== undefined) {
    const value = Number(body.actualMinutes)
    if (!Number.isFinite(value) || value < 0) throw Object.assign(new Error('Actual time cannot be negative.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.actualMinutes = Math.round(value)
  }
  if (body.progress !== undefined) {
    const value = Number(body.progress)
    if (!Number.isFinite(value) || value < 0 || value > 100) throw Object.assign(new Error('Progress must be between 0 and 100.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.progress = Math.round(value)
  }
  if (body.tags !== undefined) output.tags = sanitizeArray(body.tags, 20, (tag) => String(tag).trim().toLowerCase().slice(0, 40), 'Tags').filter(Boolean)
  if (body.subtasks !== undefined) output.subtasks = sanitizeArray(body.subtasks, 50, (item) => ({
    ...item,
    title: String(item.title || '').trim().slice(0, 200),
    completed: Boolean(item.completed),
    completedAt: item.completed ? item.completedAt || new Date() : undefined,
  }), 'Subtasks').filter((item) => item.title)
  if (body.checklist !== undefined) output.checklist = sanitizeArray(body.checklist, 100, (item) => ({
    ...item,
    text: String(item.text || '').trim().slice(0, 300),
    done: Boolean(item.done),
    doneAt: item.done ? item.doneAt || new Date() : undefined,
  }), 'Checklist').filter((item) => item.text)
  if (body.notes !== undefined) output.notes = sanitizeArray(body.notes, 100, (item) => ({
    ...item,
    text: String(item.text || '').trim().slice(0, 4000),
    createdAt: item.createdAt || new Date(),
  }), 'Notes').filter((item) => item.text)
  if (body.attachments !== undefined) output.attachments = sanitizeArray(body.attachments, 20, (item) => ({
    ...item,
    name: String(item.name || '').trim().slice(0, 200),
    url: String(item.url || '').trim().slice(0, 1000),
    mime: String(item.mime || '').trim().slice(0, 100),
    size: Math.max(0, Number(item.size) || 0),
  }), 'Attachments').filter((item) => item.name && item.url)
  if (body.reminder !== undefined) output.reminder = {
    enabled: Boolean(body.reminder.enabled),
    daily: Boolean(body.reminder.daily),
    dueSoon: body.reminder.dueSoon !== false,
    overdue: body.reminder.overdue !== false,
    weeklySummary: body.reminder.weeklySummary !== false,
  }
  if (body.countsTowardGoalProgress !== undefined) output.countsTowardGoalProgress = Boolean(body.countsTowardGoalProgress)
  if (body.source !== undefined) {
    if (!SOURCES.includes(body.source)) throw Object.assign(new Error('Invalid task source.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.source = body.source
  }
  return output
}

function syncTaskStatus(task, body = {}) {
  if (typeof body.completed === 'boolean') task.status = body.completed ? 'completed' : 'todo'
  if (task.status === 'paused' || task.status === 'archived') {
    task.completed = false
    task.completedAt = undefined
    task.pausedAt = task.status === 'paused' ? task.pausedAt || new Date() : undefined
    task.archivedAt = task.status === 'archived' ? task.archivedAt || new Date() : undefined
    return
  }
  if (task.status === 'completed' || task.progress >= 100) {
    task.status = 'completed'
    task.completed = true
    task.progress = 100
    task.completedAt = task.completedAt || new Date()
  } else {
    task.completed = false
    task.completedAt = undefined
  }
  task.pausedAt = task.status === 'paused' ? task.pausedAt || new Date() : undefined
  task.archivedAt = task.status === 'archived' ? task.archivedAt || new Date() : undefined
}

async function updateGoalProgress(goalId, userId) {
  if (!goalId) return
  try {
    await syncGoalProgress(goalId, userId, 'Task activity updated progress')
  } catch (error) {
    console.error('[updateGoalProgress]', error.message)
  }
}

async function notify(userId, data) {
  try {
    await notificationService.createForUser(userId, { channel: 'in-app', source: 'tasks', ...data })
  } catch (error) {
    console.warn('[task-notification]', error.message)
  }
}

async function maybeNotifyDueSoon(task) {
  if (!task.dueDate || task.completed || !task.reminder?.dueSoon) return
  const hours = (new Date(task.dueDate) - new Date()) / 3600000
  if (hours >= 0 && hours <= 24) {
    await notify(task.userId, {
      type: 'task',
      title: 'Task due soon',
      body: `“${task.title}” is due within 24 hours.`,
      link: `/student/tasks?taskId=${task._id}`,
      meta: { taskId: task._id, event: 'due-soon' },
    })
  }
}

exports.getTasks = async (req, res) => {
  try {
    const query = { userId: req.user._id }
    if (req.query.status && req.query.status !== 'all') {
      if (!STATUSES.includes(req.query.status)) return fail(res, 400, 'Invalid status filter.', 'VALIDATION_ERROR')
      if (req.query.status === 'todo') query.$or = [{ status: 'todo' }, { status: { $exists: false }, completed: { $ne: true } }]
      else if (req.query.status === 'completed') query.$or = [{ status: 'completed' }, { completed: true }]
      else query.status = req.query.status
    }
    if (req.query.priority) query.priority = req.query.priority
    if (req.query.category) query.category = req.query.category
    if (req.query.goalId && validId(req.query.goalId)) query.goalId = req.query.goalId
    if (req.query.roadmapId && validId(req.query.roadmapId)) query.roadmapId = req.query.roadmapId
    if (req.query.tag) query.tags = String(req.query.tag).toLowerCase()
    if (req.query.q) {
      const term = String(req.query.q).trim().slice(0, 100)
      if (term) query.$and = [{ $or: [{ title: new RegExp(escapeRegex(term), 'i') }, { description: new RegExp(escapeRegex(term), 'i') }, { tags: new RegExp(escapeRegex(term), 'i') }] }]
    }
    const now = new Date()
    if (req.query.when === 'today' || req.query.when === 'tomorrow') {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      if (req.query.when === 'tomorrow') start.setDate(start.getDate() + 1)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      query.dueDate = { $gte: start, $lt: end }
    } else if (req.query.when === 'week') {
      const end = new Date(now)
      end.setDate(end.getDate() + 7)
      query.dueDate = { $gte: now, $lte: end }
    }
    const tasks = await Task.find(query)
      .populate('goalId', 'title category status')
      .populate('roadmapId', 'status version')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean()
    return res.json({ success: true, tasks, total: tasks.length })
  } catch (error) {
    console.error('[taskController.getTasks]', error.message)
    return fail(res, 500, 'Failed to load tasks.')
  }
}

exports.getTask = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('goalId', 'title category status')
      .populate('roadmapId', 'status version')
      .lean()
    if (!task) return fail(res, 404, 'Task not found.', 'NOT_FOUND')
    return res.json({ success: true, task })
  } catch (error) {
    console.error('[taskController.getTask]', error.message)
    return fail(res, 500, 'Failed to load task.')
  }
}

exports.createTask = async (req, res) => {
  try {
    const fields = validateTaskInput(req.body)
    await validateLinks(req.body, req.user._id)
    const task = new Task({
      userId: req.user._id,
      ...fields,
      goalId: req.body.goalId || undefined,
      roadmapId: req.body.roadmapId || undefined,
      priority: fields.priority || 'Medium',
      category: fields.category || 'General',
      status: fields.status || 'todo',
      source: 'manual',
    })
    syncTaskStatus(task, req.body)
    await task.save()
    if (task.goalId) await updateGoalProgress(task.goalId, req.user._id)
    maybeNotifyDueSoon(task)
    return res.status(201).json({ success: true, task })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    console.error('[taskController.createTask]', error.message)
    return fail(res, 500, 'Failed to create task.')
  }
}

exports.updateTask = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) return fail(res, 404, 'Task not found.', 'NOT_FOUND')
    const oldGoalId = task.goalId
    const nextGoalId = req.body.goalId !== undefined ? req.body.goalId || undefined : task.goalId
    const nextRoadmapId = req.body.roadmapId !== undefined ? req.body.roadmapId || undefined : task.roadmapId
    if (req.body.goalId !== undefined || req.body.roadmapId !== undefined) {
      await validateLinks({ goalId: nextGoalId, roadmapId: nextRoadmapId }, req.user._id)
      task.goalId = nextGoalId
      task.roadmapId = nextRoadmapId
    }
    Object.assign(task, validateTaskInput(req.body, true))
    syncTaskStatus(task, req.body)
    await task.save()
    if (task.goalId) await updateGoalProgress(task.goalId, req.user._id)
    if (oldGoalId && String(oldGoalId) !== String(task.goalId || '')) await updateGoalProgress(oldGoalId, req.user._id)
    maybeNotifyDueSoon(task)
    return res.json({ success: true, task })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    console.error('[taskController.updateTask]', error.message)
    return fail(res, 500, 'Failed to update task.')
  }
}

exports.duplicateTask = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const source = await Task.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!source) return fail(res, 404, 'Task not found.', 'NOT_FOUND')
    const { _id, createdAt, updatedAt, completedAt, archivedAt, pausedAt, ...copy } = source
    const task = await Task.create({
      ...copy,
      userId: req.user._id,
      title: `${source.title} (copy)`,
      status: 'todo',
      completed: false,
      progress: 0,
      source: 'duplicate',
      duplicatedFrom: _id,
      subtasks: (source.subtasks || []).map((item) => ({ title: item.title, completed: false })),
      checklist: (source.checklist || []).map((item) => ({ text: item.text, done: false })),
    })
    if (task.goalId) await updateGoalProgress(task.goalId, req.user._id)
    return res.status(201).json({ success: true, task })
  } catch (error) {
    console.error('[taskController.duplicateTask]', error.message)
    return fail(res, 500, 'Failed to duplicate task.')
  }
}

exports.deleteTask = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!task) return fail(res, 404, 'Task not found.', 'NOT_FOUND')
    await FocusSession.deleteMany({ taskId: task._id, userId: req.user._id })
    if (task.goalId) await updateGoalProgress(task.goalId, req.user._id)
    return res.json({ success: true, message: 'Task deleted.' })
  } catch (error) {
    console.error('[taskController.deleteTask]', error.message)
    return fail(res, 500, 'Failed to delete task.')
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const [tasks, sessions] = await Promise.all([
      Task.find({ userId: req.user._id }).lean(),
      FocusSession.find({ userId: req.user._id, status: 'completed' }).lean(),
    ])
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const weekStart = new Date(startOfToday)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const activeTasks = tasks.filter((task) => !['archived'].includes(task.status))
    const completed = activeTasks.filter((task) => task.completed || task.status === 'completed')
    const dayKeys = new Set(completed.filter((task) => task.completedAt).map((task) => new Date(task.completedAt).toISOString().slice(0, 10)))
    let streak = 0
    const cursor = new Date(startOfToday)
    if (!dayKeys.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
    while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      const key = date.toISOString().slice(0, 10)
      return {
        date: key,
        completed: completed.filter((task) => task.completedAt && new Date(task.completedAt).toISOString().slice(0, 10) === key).length,
        studyMinutes: sessions.filter((session) => new Date(session.startedAt).toISOString().slice(0, 10) === key).reduce((sum, session) => sum + Math.round(session.durationSeconds / 60), 0),
      }
    })
    return res.json({
      success: true,
      analytics: {
        total: activeTasks.length,
        today: activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) >= startOfToday && new Date(task.dueDate) < new Date(startOfToday.getTime() + 86400000)).length,
        upcoming: activeTasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) > now).length,
        completed: completed.length,
        overdue: activeTasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now).length,
        archived: tasks.filter((task) => task.status === 'archived').length,
        weeklyCompleted: completed.filter((task) => task.completedAt && new Date(task.completedAt) >= weekStart).length,
        monthlyCompleted: completed.filter((task) => task.completedAt && new Date(task.completedAt) >= monthStart).length,
        completionRate: activeTasks.length ? Math.round(completed.length / activeTasks.length * 100) : 0,
        focusMinutes: sessions.reduce((sum, session) => sum + Math.round(session.durationSeconds / 60), 0),
        studyHours: Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 360) / 10,
        streak,
        daily,
        byStatus: Object.fromEntries(STATUSES.map((status) => [status, tasks.filter((task) => (task.status || (task.completed ? 'completed' : 'todo')) === status).length])),
        byPriority: Object.fromEntries(PRIORITIES.map((priority) => [priority, tasks.filter((task) => task.priority === priority).length])),
      },
    })
  } catch (error) {
    console.error('[taskController.getAnalytics]', error.message)
    return fail(res, 500, 'Failed to load task analytics.')
  }
}

exports.startFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) return fail(res, 404, 'Task not found.', 'NOT_FOUND')
    const existing = await FocusSession.findOne({ taskId: task._id, userId: req.user._id, status: 'active' })
    if (existing) return res.json({ success: true, session: existing, resumed: true })
    const session = await FocusSession.create({ taskId: task._id, userId: req.user._id, startedAt: new Date() })
    return res.status(201).json({ success: true, session })
  } catch (error) {
    console.error('[taskController.startFocus]', error.message)
    return fail(res, 500, 'Failed to start focus session.')
  }
}

exports.stopFocus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid task ID.', 'INVALID_ID')
    const session = await FocusSession.findOne({ taskId: req.params.id, userId: req.user._id, status: 'active' })
    if (!session) return fail(res, 404, 'No active focus session found.', 'NOT_FOUND')
    session.endedAt = new Date()
    if (session.status === 'paused' && session.pausedAt) {
      session.pausedDurationSeconds = (session.pausedDurationSeconds || 0)
        + Math.max(0, Math.floor((session.endedAt - session.pausedAt) / 1000))
    }
    session.durationSeconds = Math.max(1, Math.round((session.endedAt - session.startedAt) / 1000) - (session.pausedDurationSeconds || 0))
    session.status = 'completed'
    await session.save()
    await Task.updateOne({ _id: req.params.id, userId: req.user._id }, { $inc: { actualMinutes: Math.max(1, Math.round(session.durationSeconds / 60)) } })
    return res.json({ success: true, session })
  } catch (error) {
    console.error('[taskController.stopFocus]', error.message)
    return fail(res, 500, 'Failed to stop focus session.')
  }
}

exports.generateFromRoadmap = async (req, res) => {
  try {
    const { goalId, roadmapId } = req.body
    if (!goalId || !roadmapId || !validId(goalId) || !validId(roadmapId)) return fail(res, 400, 'Valid Goal and Roadmap IDs are required.', 'INVALID_ID')
    const [goal, roadmap] = await Promise.all([
      Goal.findOne({ _id: goalId, userId: req.user._id }),
      Roadmap.findOne({ _id: roadmapId, userId: req.user._id, goalId }),
    ])
    if (!goal || !roadmap) return fail(res, 404, 'Goal or Roadmap not found.', 'NOT_FOUND')
    const { days } = await aiTaskService.generateDailyTasks(goal.title, goal.category, roadmap.data)
    await Task.deleteMany({
      roadmapId: roadmap._id,
      userId: req.user._id,
      $or: [{ source: { $in: ['ai', 'roadmap'] } }, { source: { $exists: false } }],
    })
    const tasks = (days || []).flatMap((dayInfo) => (dayInfo.tasks || []).map((task) => ({
      userId: req.user._id,
      goalId: goal._id,
      roadmapId: roadmap._id,
      source: 'roadmap',
      day: dayInfo.day,
      type: task.type,
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime,
      category: goal.category,
      status: 'todo',
      completed: false,
    }))).filter((task) => task.title)
    if (tasks.length) await Task.insertMany(tasks)
    await updateGoalProgress(goal._id, req.user._id)
    return res.status(201).json({ success: true, message: 'Plan generated successfully.', count: tasks.length })
  } catch (error) {
    console.error('[taskController.generateFromRoadmap]', error.message)
    return fail(res, 500, 'Failed to generate execution plan.')
  }
}
