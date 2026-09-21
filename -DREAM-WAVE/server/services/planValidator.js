const mongoose = require('mongoose')
const { validateTimeBlock, detectConflicts } = require('./scheduleEngine')

const MAX_PLAN_ITEMS = 40

function validId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''))
}

function validatePlanItems(items, { tasks = [], existingSchedule = [] } = {}) {
  const errors = []
  const warnings = []
  const taskMap = new Map(tasks.map((t) => [String(t._id), t]))
  const normalized = []

  if (!Array.isArray(items)) {
    return { valid: false, errors: ['Plan must be an array.'], warnings: [], items: [] }
  }
  if (items.length > MAX_PLAN_ITEMS) {
    errors.push(`Plan exceeds maximum of ${MAX_PLAN_ITEMS} items.`)
  }

  const seenTaskDate = new Set()

  items.forEach((raw, index) => {
    const item = {
      taskId: raw.taskId || null,
      goalId: raw.goalId || null,
      roadmapId: raw.roadmapId || null,
      milestoneKey: raw.milestoneKey || '',
      title: String(raw.title || '').trim().slice(0, 200),
      itemType: ['task', 'break', 'study', 'review', 'custom'].includes(raw.itemType) ? raw.itemType : 'task',
      scheduledDate: String(raw.scheduledDate || '').slice(0, 10),
      startTime: raw.startTime ? String(raw.startTime).slice(0, 5) : '',
      endTime: raw.endTime ? String(raw.endTime).slice(0, 5) : '',
      durationMinutes: Number(raw.durationMinutes) || 30,
      priority: ['High', 'Medium', 'Low'].includes(raw.priority) ? raw.priority : 'Medium',
      priorityReason: String(raw.priorityReason || '').slice(0, 500),
      notes: String(raw.notes || '').slice(0, 500),
      selected: raw.selected !== false,
    }

    if (!item.title) errors.push(`Item ${index + 1}: title is required.`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.scheduledDate)) {
      errors.push(`Item ${index + 1}: invalid date format.`)
    }
    validateTimeBlock(item).forEach((msg) => errors.push(`Item ${index + 1}: ${msg}`))

    if (item.taskId) {
      if (!validId(item.taskId)) errors.push(`Item ${index + 1}: invalid task reference.`)
      else {
        const task = taskMap.get(String(item.taskId))
        if (!task) errors.push(`Item ${index + 1}: task not found.`)
        else {
          item.title = item.title || task.title
          item.goalId = item.goalId || task.goalId
          item.roadmapId = item.roadmapId || task.roadmapId
          const key = `${item.taskId}-${item.scheduledDate}`
          if (seenTaskDate.has(key)) warnings.push(`Duplicate task scheduled on ${item.scheduledDate}.`)
          seenTaskDate.add(key)
        }
      }
    }

    normalized.push(item)
  })

  normalized.forEach((item) => {
    const conflicts = detectConflicts(
      [...existingSchedule, ...normalized.filter((i) => i !== item)],
      item,
    )
    if (conflicts.length) {
      warnings.push(`"${item.title}" on ${item.scheduledDate} overlaps with another block.`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    items: normalized,
  }
}

module.exports = {
  validatePlanItems,
  MAX_PLAN_ITEMS,
}
