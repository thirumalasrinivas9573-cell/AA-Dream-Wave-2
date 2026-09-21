const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')

function roadmapStepProgress(roadmap) {
  if (!roadmap?.data) return null
  if (Array.isArray(roadmap.data.nextSteps) && roadmap.data.nextSteps.length) {
    const total = roadmap.data.nextSteps.length
    const done = roadmap.data.nextSteps.filter((step) => step.completed).length
    return Math.round((done / total) * 100)
  }
  if (Array.isArray(roadmap.data.phases) && roadmap.data.phases.length) {
    const steps = roadmap.data.phases.flatMap((phase) => (Array.isArray(phase.tasks) ? phase.tasks : []))
    if (!steps.length) return null
    const done = steps.filter((step) => step.completed).length
    return Math.round((done / steps.length) * 100)
  }
  if (Array.isArray(roadmap.learningStages) && roadmap.learningStages.length) {
    const completed = roadmap.learningStages.filter((stage) => stage.status === 'completed').length
    return Math.round((completed / roadmap.learningStages.length) * 100)
  }
  if (roadmap.progress?.percent !== undefined && roadmap.progress?.percent !== null) {
    return Math.round(Number(roadmap.progress.percent) || 0)
  }
  return null
}

function milestoneProgress(goal) {
  const milestones = goal?.milestones || []
  if (!milestones.length) return null
  const completed = milestones.filter((item) => item.status === 'completed' || item.progress >= 100).length
  return Math.round((completed / milestones.length) * 100)
}

function taskProgress(tasks) {
  const relevant = tasks.filter((item) => item.countsTowardGoalProgress !== false)
  if (!relevant.length) return null
  const completed = relevant.filter((item) => item.completed || item.status === 'completed').length
  return Math.round((completed / relevant.length) * 100)
}

async function computeGoalProgress(goalId, userId) {
  const [goal, tasks, roadmap] = await Promise.all([
    Goal.findOne({ _id: goalId, userId }).lean(),
    Task.find({
      goalId,
      userId,
      status: { $nin: ['archived', 'paused'] },
    }).select('completed status countsTowardGoalProgress').lean(),
    Roadmap.findOne({ goalId, userId }).lean(),
  ])
  if (!goal) return { percent: 0, breakdown: {} }

  const contributors = []
  const milestone = milestoneProgress(goal)
  const tasksPct = taskProgress(tasks)
  const roadmapPct = roadmapStepProgress(roadmap)

  if (milestone !== null) contributors.push({ key: 'milestones', weight: 0.35, percent: milestone })
  if (tasksPct !== null) contributors.push({ key: 'tasks', weight: 0.35, percent: tasksPct })
  if (roadmapPct !== null) contributors.push({ key: 'roadmap', weight: 0.30, percent: roadmapPct })

  let percent = 0
  if (contributors.length) {
    const totalWeight = contributors.reduce((sum, item) => sum + item.weight, 0)
    percent = Math.round(contributors.reduce((sum, item) => sum + item.percent * item.weight, 0) / totalWeight)
  } else {
    percent = Math.round(Number(goal.progress) || 0)
  }

  return {
    percent: Math.min(100, Math.max(0, percent)),
    breakdown: Object.fromEntries(contributors.map((item) => [item.key, item.percent])),
    counts: {
      milestones: goal.milestones?.length || 0,
      milestonesCompleted: (goal.milestones || []).filter((item) => item.status === 'completed').length,
      tasks: tasks.length,
      tasksCompleted: tasks.filter((item) => item.completed || item.status === 'completed').length,
      roadmapStages: roadmap?.learningStages?.length || roadmap?.data?.nextSteps?.length || 0,
    },
  }
}

async function syncGoalProgress(goalId, userId, note = 'Progress recalculated') {
  if (!goalId) return null
  const goal = await Goal.findOne({ _id: goalId, userId })
  if (!goal || ['paused', 'archived'].includes(goal.status)) return null

  const result = await computeGoalProgress(goalId, userId)
  const previous = goal.progress
  goal.progress = result.percent
  goal.completed = result.percent >= 100
  goal.status = result.percent >= 100 ? 'completed' : (goal.status === 'planning' ? 'active' : goal.status)
  goal.completedAt = result.percent >= 100 ? goal.completedAt || new Date() : undefined
  if (previous !== result.percent) {
    goal.progressHistory.push({
      date: new Date(),
      progress: result.percent,
      studyHours: 0,
      note,
    })
  }
  await goal.save()
  if (result.percent !== previous) {
    const RoadmapModel = require('../models/Roadmap')
    await RoadmapModel.updateOne(
      { goalId, userId },
      { $set: { 'progress.percent': result.breakdown.roadmap ?? result.percent, 'progress.lastUpdatedAt': new Date() } },
    ).catch(() => {})
  }
  return { goal, result }
}

async function getNextBestAction(goalId, userId) {
  const [goal, tasks, roadmap] = await Promise.all([
    Goal.findOne({ _id: goalId, userId }).lean(),
    Task.find({ goalId, userId, status: { $nin: ['archived', 'completed'] }, completed: { $ne: true } })
      .sort({ dueDate: 1, priority: -1, updatedAt: -1 }).limit(20).lean(),
    Roadmap.findOne({ goalId, userId }).lean(),
  ])
  if (!goal) return null

  const now = new Date()
  const overdueTasks = tasks.filter((item) => item.dueDate && new Date(item.dueDate) < now)
  const pendingMilestone = (goal.milestones || []).find((item) => item.status !== 'completed')
  const nextRoadmapStep = roadmap?.data?.nextSteps?.find((item) => !item.completed)
    || roadmap?.learningStages?.find((item) => item.status !== 'completed')

  if (overdueTasks[0]) {
    return {
      type: 'task',
      title: overdueTasks[0].title,
      reason: 'This task is overdue and blocking momentum.',
      url: `/student/tasks?taskId=${overdueTasks[0]._id}`,
      priority: 'high',
    }
  }
  if (tasks[0]) {
    return {
      type: 'task',
      title: tasks[0].title,
      reason: tasks[0].dueDate ? `Due ${new Date(tasks[0].dueDate).toLocaleDateString()}` : 'Highest priority open task.',
      url: `/student/tasks?taskId=${tasks[0]._id}`,
      priority: tasks[0].priority || 'Medium',
    }
  }
  if (pendingMilestone) {
    return {
      type: 'milestone',
      title: pendingMilestone.title,
      reason: 'Next incomplete milestone for this goal.',
      url: `/student/goals?goalId=${goal._id}`,
      priority: 'medium',
    }
  }
  if (nextRoadmapStep) {
    return {
      type: 'roadmap',
      title: nextRoadmapStep.title || nextRoadmapStep.step || 'Continue roadmap',
      reason: 'Next roadmap stage awaiting progress.',
      url: `/student/roadmap?goalId=${goal._id}`,
      priority: 'medium',
    }
  }
  return {
    type: 'goal',
    title: goal.title,
    reason: 'Define milestones or generate a roadmap to create actionable next steps.',
    url: `/student/goals?goalId=${goal._id}`,
    priority: 'low',
  }
}

module.exports = {
  computeGoalProgress,
  syncGoalProgress,
  getNextBestAction,
  milestoneProgress,
  taskProgress,
  roadmapStepProgress,
}
