const PRIORITY_WEIGHT = { High: 30, Medium: 15, Low: 5, Critical: 40 }
const GOAL_PRIORITY_WEIGHT = { Critical: 25, High: 18, Medium: 10, Low: 4 }

function isOverdue(task, now = new Date()) {
  if (!task?.dueDate || task.completed || task.status === 'completed') return false
  return new Date(task.dueDate) < now
}

function daysUntil(dueDate, now = new Date()) {
  if (!dueDate) return null
  const diff = new Date(dueDate).getTime() - now.getTime()
  return Math.ceil(diff / 86400000)
}

function scoreTask(task, { goals = [], roadmaps = [], now = new Date() } = {}) {
  let score = PRIORITY_WEIGHT[task.priority] || PRIORITY_WEIGHT.Medium
  const factors = []

  if (isOverdue(task, now)) {
    score += 35
    factors.push({ key: 'overdue', label: 'Overdue', weight: 35 })
  } else if (task.dueDate) {
    const days = daysUntil(task.dueDate, now)
    if (days != null && days <= 1) {
      score += 28
      factors.push({ key: 'due-soon', label: 'Due tomorrow or today', weight: 28 })
    } else if (days != null && days <= 3) {
      score += 18
      factors.push({ key: 'due-week', label: 'Due within 3 days', weight: 18 })
    } else if (days != null && days <= 7) {
      score += 8
      factors.push({ key: 'due-soon-week', label: 'Due this week', weight: 8 })
    }
  }

  const goal = goals.find((g) => String(g._id) === String(task.goalId))
  if (goal) {
    const gWeight = GOAL_PRIORITY_WEIGHT[goal.priority] || GOAL_PRIORITY_WEIGHT.Medium
    score += gWeight
    factors.push({ key: 'goal-priority', label: `Linked goal "${goal.title}" is ${goal.priority || 'Medium'} priority`, weight: gWeight })
    if (goal.deadline) {
      const gDays = daysUntil(goal.deadline, now)
      if (gDays != null && gDays <= 7) {
        score += 10
        factors.push({ key: 'goal-deadline', label: 'Goal deadline is approaching', weight: 10 })
      }
    }
  }

  const roadmap = roadmaps.find((r) => String(r._id) === String(task.roadmapId))
  if (roadmap) {
    const nextStage = (roadmap.learningStages || []).find((s) => s.status !== 'completed')
    if (nextStage && task.source === 'roadmap') {
      score += 12
      factors.push({ key: 'roadmap-stage', label: `Supports next roadmap stage "${nextStage.title}"`, weight: 12 })
    }
  }

  if (task.status === 'in-progress') {
    score += 6
    factors.push({ key: 'in-progress', label: 'Already in progress', weight: 6 })
  }

  return { score, factors }
}

function explainPriority(task, context = {}) {
  const { score, factors } = scoreTask(task, context)
  if (!factors.length) {
    return {
      score,
      explanation: 'This task is recommended based on its priority and schedule.',
      factors: [],
    }
  }
  const top = [...factors].sort((a, b) => b.weight - a.weight)[0]
  const parts = factors.slice(0, 3).map((f) => f.label.toLowerCase())
  return {
    score,
    explanation: `This task is recommended first because ${parts.join(', ')}.`,
    factors,
    primaryReason: top?.label || '',
  }
}

function sortTasksByPriority(tasks, context = {}) {
  return [...tasks]
    .map((task) => {
      const { score, factors } = scoreTask(task, context)
      return { task, score, factors }
    })
    .sort((a, b) => b.score - a.score)
}

module.exports = {
  scoreTask,
  explainPriority,
  sortTasksByPriority,
  isOverdue,
  daysUntil,
}
