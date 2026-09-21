const mongoose = require('mongoose')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const Task = require('../models/Task')
const notificationService = require('../services/notificationService')
const knowledgeGraphService = require('../services/knowledgeGraphService')
const { openai } = require('../utils/openaiClient')

const CATEGORIES = [
  'Academic', 'Career', 'Certification', 'Education', 'Finance', 'Health', 'Personal', 'Skill',
  'Technical Skill', 'Soft Skill', 'Project', 'Research', 'Placement', 'Internship',
  'Entrepreneurship', 'Personal Development', 'Custom',
]
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const STATUSES = ['planning', 'active', 'paused', 'completed', 'archived']
const MILESTONE_STATUSES = ['not-started', 'in-progress', 'completed', 'blocked']
const fail = (res, status, message, code = 'GOAL_ERROR') => res.status(status).json({ success: false, code, message })
const validId = (id) => mongoose.isValidObjectId(id)
const clampProgress = (value) => Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function parseDate(value, label = 'date') {
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

function validateGoalInput(body, partial = false) {
  const output = {}
  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > 160) throw Object.assign(new Error('A title between 1 and 160 characters is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.title = title
  }
  if (!partial || body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (description.length > 4000) throw Object.assign(new Error('Description cannot exceed 4000 characters.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.description = description
  }
  if (!partial || body.category !== undefined) {
    const category = body.category || 'Personal'
    if (!CATEGORIES.includes(category)) throw Object.assign(new Error('Invalid goal category.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.category = category
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw Object.assign(new Error('Invalid priority.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.priority = body.priority
  }
  if (body.difficulty !== undefined) {
    if (!DIFFICULTIES.includes(body.difficulty)) throw Object.assign(new Error('Invalid difficulty level.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.difficulty = body.difficulty
  }
  if (body.estimatedDuration !== undefined) {
    const value = String(body.estimatedDuration || '').trim()
    if (value.length > 80) throw Object.assign(new Error('Estimated duration is too long.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.estimatedDuration = value
  }
  if (body.weeklyStudyHours !== undefined) {
    const hours = Number(body.weeklyStudyHours)
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) throw Object.assign(new Error('Weekly study hours must be between 0 and 168.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.weeklyStudyHours = hours
  }
  if (body.deadline !== undefined) output.deadline = body.deadline ? parseDate(body.deadline, 'completion date') : null
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw Object.assign(new Error('Invalid goal status.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
    output.status = body.status
  }
  return output
}

async function notify(userId, data) {
  try {
    await notificationService.createForUser(userId, { channel: 'in-app', source: 'goals', ...data })
  } catch (error) {
    console.warn('[goal-notification]', error.message)
  }
}

function syncCompletion(goal) {
  if (goal.status === 'paused' || goal.status === 'archived') {
    goal.completed = false
    goal.completedAt = undefined
    return
  }
  if (goal.progress >= 100) {
    goal.status = 'completed'
    goal.completed = true
    goal.progress = 100
    goal.completedAt = goal.completedAt || new Date()
  } else {
    goal.completed = false
    goal.completedAt = undefined
    if (goal.status === 'completed') goal.status = 'active'
  }
}

function serializeStatus(goal) {
  if (goal.status) return goal.status
  return goal.completed ? 'completed' : 'active'
}

exports.createGoal = async (req, res) => {
  try {
    const fields = validateGoalInput(req.body)
    const goal = await Goal.create({
      userId: req.user._id,
      ...fields,
      priority: fields.priority || 'Medium',
      difficulty: fields.difficulty || 'Intermediate',
      status: 'active',
    })
    notify(req.user._id, {
      type: 'goal',
      title: 'Goal created',
      body: `Your goal “${goal.title}” is ready for planning.`,
      link: `/student/goals?goalId=${goal._id}`,
      meta: { goalId: goal._id, event: 'created' },
    })
    return res.status(201).json({ success: true, goal })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[goalController.createGoal]', error.message)
    return fail(res, 500, 'Failed to create goal.')
  }
}

exports.getGoals = async (req, res) => {
  try {
    const query = { userId: req.user._id }
    const status = String(req.query.status || '').toLowerCase()
    if (status && status !== 'all') {
      if (!STATUSES.includes(status)) return fail(res, 400, 'Invalid status filter.', 'VALIDATION_ERROR')
      if (status === 'completed') query.$or = [{ status: 'completed' }, { completed: true }]
      else if (status === 'active') query.$or = [{ status: 'active' }, { status: { $exists: false }, completed: { $ne: true } }]
      else query.status = status
    }
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) return fail(res, 400, 'Invalid category filter.', 'VALIDATION_ERROR')
      query.category = req.query.category
    }
    if (req.query.priority) {
      if (!PRIORITIES.includes(req.query.priority)) return fail(res, 400, 'Invalid priority filter.', 'VALIDATION_ERROR')
      query.priority = req.query.priority
    }
    if (req.query.q) {
      const term = String(req.query.q).trim().slice(0, 100)
      if (term) query.$and = [{ $or: [{ title: new RegExp(escapeRegex(term), 'i') }, { description: new RegExp(escapeRegex(term), 'i') }] }]
    }
    const goals = await Goal.find(query).sort({ updatedAt: -1 }).lean()
    return res.json({
      success: true,
      goals: goals.map((goal) => ({ ...goal, status: serializeStatus(goal) })),
      total: goals.length,
    })
  } catch (error) {
    console.error('[goalController.getGoals]', error.message)
    return fail(res, 500, 'Failed to load goals.')
  }
}

exports.getGoal = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const roadmap = await Roadmap.findOne({ goalId: goal._id, userId: req.user._id }).lean()
    return res.json({ success: true, goal: { ...goal, status: serializeStatus(goal) }, roadmap })
  } catch (error) {
    console.error('[goalController.getGoal]', error.message)
    return fail(res, 500, 'Failed to load goal.')
  }
}

exports.getGoalAnalytics = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).lean()
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 6)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const completed = goals.filter((goal) => goal.completed || goal.status === 'completed')
    const active = goals.filter((goal) => !goal.completed && (!goal.status || goal.status === 'active'))
    const overdue = goals.filter((goal) => !goal.completed && goal.deadline && new Date(goal.deadline) < now)
    const history = goals.flatMap((goal) => goal.progressHistory || [])
    const studyHours = history.reduce((sum, entry) => sum + (Number(entry.studyHours) || 0), 0)
    const weeklyEntries = history.filter((entry) => new Date(entry.date) >= startOfWeek)
    const monthlyEntries = history.filter((entry) => new Date(entry.date) >= startOfMonth)
    return res.json({
      success: true,
      analytics: {
        total: goals.length,
        active: active.length,
        completed: completed.length,
        overdue: overdue.length,
        paused: goals.filter((goal) => goal.status === 'paused').length,
        archived: goals.filter((goal) => goal.status === 'archived').length,
        completionPercentage: goals.length ? Math.round(completed.length / goals.length * 100) : 0,
        averageProgress: goals.length ? Math.round(goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / goals.length) : 0,
        weeklyProgress: weeklyEntries.length ? Math.round(weeklyEntries.reduce((sum, entry) => sum + entry.progress, 0) / weeklyEntries.length) : 0,
        monthlyProgress: monthlyEntries.length ? Math.round(monthlyEntries.reduce((sum, entry) => sum + entry.progress, 0) / monthlyEntries.length) : 0,
        studyHours,
        weekly: Array.from({ length: 7 }, (_, index) => {
          const date = new Date(startOfWeek)
          date.setDate(startOfWeek.getDate() + index)
          const key = date.toISOString().slice(0, 10)
          return {
            date: key,
            progress: history.filter((entry) => new Date(entry.date).toISOString().slice(0, 10) === key).reduce((sum, entry) => sum + (entry.progress || 0), 0),
            studyHours: history.filter((entry) => new Date(entry.date).toISOString().slice(0, 10) === key).reduce((sum, entry) => sum + (entry.studyHours || 0), 0),
          }
        }),
      },
    })
  } catch (error) {
    console.error('[goalController.getGoalAnalytics]', error.message)
    return fail(res, 500, 'Failed to load goal analytics.')
  }
}

exports.updateGoal = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const previousCompleted = goal.completed
    Object.assign(goal, validateGoalInput(req.body, true))
    if (req.body.progress !== undefined) {
      const progress = Number(req.body.progress)
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) return fail(res, 400, 'Progress must be between 0 and 100.', 'VALIDATION_ERROR')
      goal.progress = Math.round(progress)
      goal.progressHistory.push({ progress: goal.progress, studyHours: 0, note: 'Progress updated' })
    }
    if (typeof req.body.completed === 'boolean') {
      goal.completed = req.body.completed
      goal.status = req.body.completed ? 'completed' : 'active'
      if (req.body.completed) goal.progress = 100
    }
    if (req.body.resources !== undefined) goal.resources = req.body.resources
    syncCompletion(goal)
    if (goal.status === 'paused') goal.pausedAt = goal.pausedAt || new Date()
    if (goal.status === 'archived') goal.archivedAt = goal.archivedAt || new Date()
    await goal.save()
    if (!previousCompleted && goal.completed) {
      notify(req.user._id, {
        type: 'goal',
        title: 'Goal completed',
        body: `You completed “${goal.title}”.`,
        link: `/student/goals?goalId=${goal._id}`,
        meta: { goalId: goal._id, event: 'completed' },
      })
    }
    return res.json({ success: true, goal })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[goalController.updateGoal]', error.message)
    return fail(res, 500, 'Failed to update goal.')
  }
}

exports.addProgressEntry = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const progress = Number(req.body.progress)
    const studyHours = Number(req.body.studyHours || 0)
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return fail(res, 400, 'Progress must be between 0 and 100.', 'VALIDATION_ERROR')
    if (!Number.isFinite(studyHours) || studyHours < 0 || studyHours > 24) return fail(res, 400, 'Study hours must be between 0 and 24.', 'VALIDATION_ERROR')
    const note = String(req.body.note || '').trim().slice(0, 500)
    goal.progress = Math.round(progress)
    goal.progressHistory.push({ date: new Date(), progress: goal.progress, studyHours, note })
    syncCompletion(goal)
    await goal.save()
    return res.json({ success: true, goal, entry: goal.progressHistory.at(-1) })
  } catch (error) {
    console.error('[goalController.addProgressEntry]', error.message)
    return fail(res, 500, 'Failed to record progress.')
  }
}

exports.addMilestone = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const title = String(req.body.title || '').trim()
    if (!title || title.length > 160) return fail(res, 400, 'A milestone title is required.', 'VALIDATION_ERROR')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const milestone = {
      title,
      description: String(req.body.description || '').trim().slice(0, 1000),
      targetDate: req.body.targetDate ? parseDate(req.body.targetDate, 'milestone target date') : undefined,
      dependencies: Array.isArray(req.body.dependencies) ? req.body.dependencies.filter(validId) : [],
    }
    goal.milestones.push(milestone)
    await goal.save()
    const createdMilestone = goal.milestones.at(-1)
    if (createdMilestone.targetDate && goal.reminders?.milestoneDue) {
      const daysUntilDue = Math.ceil((new Date(createdMilestone.targetDate) - new Date()) / 86400000)
      if (daysUntilDue <= 7) {
        notify(req.user._id, {
          type: 'milestone',
          title: 'Milestone due soon',
          body: `“${createdMilestone.title}” is due ${daysUntilDue < 1 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}.`,
          link: `/student/goals?goalId=${goal._id}`,
          meta: { goalId: goal._id, milestoneId: createdMilestone._id, event: 'due' },
        })
      }
    }
    return res.status(201).json({ success: true, goal, milestone: createdMilestone })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[goalController.addMilestone]', error.message)
    return fail(res, 500, 'Failed to add milestone.')
  }
}

exports.updateMilestone = async (req, res) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.milestoneId)) return fail(res, 400, 'Invalid goal or milestone ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const milestone = goal.milestones.id(req.params.milestoneId)
    if (!milestone) return fail(res, 404, 'Milestone not found.', 'NOT_FOUND')
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim()
      if (!title || title.length > 160) return fail(res, 400, 'Invalid milestone title.', 'VALIDATION_ERROR')
      milestone.title = title
    }
    if (req.body.description !== undefined) milestone.description = String(req.body.description).trim().slice(0, 1000)
    if (req.body.status !== undefined) {
      if (!MILESTONE_STATUSES.includes(req.body.status)) return fail(res, 400, 'Invalid milestone status.', 'VALIDATION_ERROR')
      milestone.status = req.body.status
    }
    if (req.body.progress !== undefined) milestone.progress = clampProgress(req.body.progress)
    if (req.body.targetDate !== undefined) milestone.targetDate = req.body.targetDate ? parseDate(req.body.targetDate, 'milestone target date') : undefined
    if (req.body.dependencies !== undefined) milestone.dependencies = Array.isArray(req.body.dependencies) ? req.body.dependencies.filter(validId) : []
    if (milestone.progress >= 100 || milestone.status === 'completed') {
      milestone.progress = 100
      milestone.status = 'completed'
      milestone.completedAt = milestone.completedAt || new Date()
    } else {
      milestone.completedAt = undefined
      if (milestone.progress > 0 && milestone.status === 'not-started') milestone.status = 'in-progress'
    }
    await goal.save()
    const synced = await require('../services/progressEngine').syncGoalProgress(goal._id, req.user._id, 'Milestone updated')
    const responseGoal = synced?.goal || goal
    return res.json({ success: true, goal: responseGoal, milestone })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[goalController.updateMilestone]', error.message)
    return fail(res, 500, 'Failed to update milestone.')
  }
}

exports.deleteMilestone = async (req, res) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.milestoneId)) return fail(res, 400, 'Invalid goal or milestone ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const milestone = goal.milestones.id(req.params.milestoneId)
    if (!milestone) return fail(res, 404, 'Milestone not found.', 'NOT_FOUND')
    milestone.deleteOne()
    await goal.save()
    return res.json({ success: true, goal })
  } catch (error) {
    console.error('[goalController.deleteMilestone]', error.message)
    return fail(res, 500, 'Failed to delete milestone.')
  }
}

exports.addNote = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const text = String(req.body.text || '').trim()
    if (!text || text.length > 4000) return fail(res, 400, 'A note between 1 and 4000 characters is required.', 'VALIDATION_ERROR')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    goal.notes.push({ text })
    await goal.save()
    return res.status(201).json({ success: true, goal, note: goal.notes.at(-1) })
  } catch (error) {
    console.error('[goalController.addNote]', error.message)
    return fail(res, 500, 'Failed to add note.')
  }
}

exports.deleteGoal = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    await Promise.all([
      Roadmap.deleteMany({ goalId: goal._id, userId: req.user._id }),
      Task.deleteMany({ goalId: goal._id, userId: req.user._id }),
      knowledgeGraphService.removeEdgesForEntity(req.user._id, 'goal', goal._id).catch(() => null),
    ])
    return res.json({ success: true, message: 'Goal and its generated learning records were deleted.' })
  } catch (error) {
    console.error('[goalController.deleteGoal]', error.message)
    return fail(res, 500, 'Failed to delete goal.')
  }
}

exports.generateAIPlan = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id })
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a career coach and learning architect. Return JSON only with a steps array containing exactly six specific action steps.' },
        { role: 'user', content: `Create a practical six-step plan for: ${goal.title}. Category: ${goal.category}. Each step must include actions, named resources, time commitment, and expected outcome.` },
      ],
    })
    const parsed = JSON.parse(completion.choices[0].message.content)
    const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((step) => typeof step === 'string').slice(0, 6) : []
    if (!steps.length) return fail(res, 502, 'AI returned an invalid plan.', 'AI_INVALID_RESPONSE')
    goal.aiPlan = steps
    await goal.save()
    return res.json({ success: true, steps, goal })
  } catch (error) {
    console.error('[goalController.generateAIPlan]', error.message)
    return fail(res, error?.status === 429 ? 429 : 502, error?.status === 429 ? 'AI rate limit reached. Try again shortly.' : 'AI plan generation failed.', 'AI_SERVICE_ERROR')
  }
}
