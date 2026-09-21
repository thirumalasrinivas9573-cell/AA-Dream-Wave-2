const crypto = require('crypto')
const { openai } = require('../utils/openaiClient')
const plannerService = require('./plannerService')
const scheduleEngine = require('./scheduleEngine')
const { validatePlanItems } = require('./planValidator')

const generationLocks = new Map()
const LOCK_TTL_MS = 8000

function acquireLock(userId, scope) {
  const key = `${userId}:${scope}`
  const existing = generationLocks.get(key)
  if (existing && Date.now() - existing < LOCK_TTL_MS) {
    throw Object.assign(new Error('Plan generation already in progress. Please wait.'), { statusCode: 429 })
  }
  generationLocks.set(key, Date.now())
  return () => generationLocks.delete(key)
}

async function suggestDailyPlan(userId, { date, availableMinutes } = {}) {
  const release = acquireLock(userId, 'daily')
  try {
    const dateKey = date || scheduleEngine.dateKeyFromDate()
    const context = await plannerService.loadPlanningContext(userId)
    const avail = availableMinutes ?? plannerService.availableMinutesForDate(context.preferences, dateKey)
    const deterministic = plannerService.buildDeterministicDailyItems(
      context.tasks, context.goals, context.roadmaps, context.preferences, dateKey,
    )
    deterministic.availableMinutes = avail

    const existing = await plannerService.getScheduleItems(userId, { date: dateKey })
    const validation = validatePlanItems(deterministic.items, {
      tasks: context.tasks,
      existingSchedule: existing,
    })

    let aiNotes = null
    if (process.env.OPENAI_API_KEY && deterministic.items.length) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 600,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Return JSON with keys: summary (string, 1-2 sentences), tips (string[] max 3). Suggest study strategy only. Do not invent tasks or times.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                date: dateKey,
                availableMinutes: avail,
                plannedItems: deterministic.items.map((i) => ({ title: i.title, duration: i.durationMinutes, reason: i.priorityReason })),
              }),
            },
          ],
        })
        aiNotes = JSON.parse(completion.choices[0]?.message?.content || '{}')
      } catch {
        aiNotes = null
      }
    }

    const overload = scheduleEngine.detectOverload(deterministic.plannedMinutes, avail)
    return {
      previewId: crypto.randomUUID(),
      scope: 'daily',
      date: dateKey,
      items: validation.items,
      warnings: validation.warnings,
      overload,
      availableMinutes: avail,
      plannedMinutes: deterministic.plannedMinutes,
      aiReady: Boolean(aiNotes),
      aiSummary: aiNotes?.summary || null,
      aiTips: aiNotes?.tips || [],
      requiresApproval: true,
    }
  } finally {
    release()
  }
}

async function suggestWeeklyPlan(userId, { weekStart, availableMinutesByDay } = {}) {
  const release = acquireLock(userId, 'weekly')
  try {
    const startKey = weekStart || scheduleEngine.weekStartKey()
    const dates = scheduleEngine.weekDateKeys(startKey)
    const context = await plannerService.loadPlanningContext(userId)
    const pending = context.tasks.filter((t) => !t.completed && t.status !== 'completed')
    const items = []
    let taskIndex = 0
    const ranked = require('./priorityEngine').sortTasksByPriority(pending, context)

    for (const dateKey of dates) {
      const avail = availableMinutesByDay?.[dateKey]
        ?? plannerService.availableMinutesForDate(context.preferences, dateKey)
      let used = 0
      let cursor = scheduleEngine.defaultStartTime(context.preferences)
      const sessionLen = context.preferences.sessionLengthMinutes || 45
      const breakLen = context.preferences.shortBreakMinutes || 5

      while (taskIndex < ranked.length && used + sessionLen <= avail) {
        const { task, score } = ranked[taskIndex]
        const duration = task.estimatedMinutes || sessionLen
        if (used + duration > avail) break
        const end = scheduleEngine.addMinutesToTime(cursor, duration)
        const explanation = require('./priorityEngine').explainPriority(task, context)
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
        })
        used += duration
        cursor = scheduleEngine.addMinutesToTime(end, breakLen)
        taskIndex += 1
        if (items.filter((i) => i.scheduledDate === dateKey).length >= 4) break
      }
    }

    const existing = await plannerService.getScheduleItems(userId, { start: dates[0], end: dates[6] })
    const validation = validatePlanItems(items, { tasks: context.tasks, existingSchedule: existing })
    const totalPlanned = scheduleEngine.sumPlannedMinutes(validation.items)
    const totalAvailable = dates.reduce((s, d) => s + plannerService.availableMinutesForDate(context.preferences, d), 0)

    return {
      previewId: crypto.randomUUID(),
      scope: 'weekly',
      weekStart: startKey,
      items: validation.items,
      warnings: validation.warnings,
      overload: scheduleEngine.detectOverload(totalPlanned, totalAvailable),
      availableMinutes: totalAvailable,
      plannedMinutes: totalPlanned,
      requiresApproval: true,
    }
  } finally {
    release()
  }
}

async function suggestTaskBreakdown(userId, taskId) {
  const context = await plannerService.loadPlanningContext(userId)
  const task = context.tasks.find((t) => String(t._id) === String(taskId))
  if (!task) throw Object.assign(new Error('Task not found.'), { statusCode: 404 })

  const fallback = [
    { title: `Review: ${task.title}`, estimatedMinutes: 20 },
    { title: `Practice: ${task.title}`, estimatedMinutes: 30 },
    { title: `Apply: ${task.title}`, estimatedMinutes: 25 },
  ]

  if (!process.env.OPENAI_API_KEY) {
    return { taskId, subtasks: fallback, aiReady: false, requiresApproval: true }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return JSON: { subtasks: [{ title, estimatedMinutes, reason }] } with 3-6 actionable subtasks. Do not create schedule times.',
        },
        { role: 'user', content: `Break down task: "${task.title}". Description: ${task.description || 'none'}` },
      ],
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const subtasks = (parsed.subtasks || []).slice(0, 6).map((s) => ({
      title: String(s.title || '').slice(0, 160),
      estimatedMinutes: Math.min(180, Math.max(5, Number(s.estimatedMinutes) || 25)),
      reason: String(s.reason || '').slice(0, 200),
    })).filter((s) => s.title)
    return { taskId, subtasks: subtasks.length ? subtasks : fallback, aiReady: true, requiresApproval: true }
  } catch {
    return { taskId, subtasks: fallback, aiReady: false, requiresApproval: true }
  }
}

module.exports = {
  suggestDailyPlan,
  suggestWeeklyPlan,
  suggestTaskBreakdown,
}
