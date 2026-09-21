const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryBook = require('../models/LibraryBook')
const LibraryProgress = require('../models/LibraryProgress')
const { openai } = require('../utils/openaiClient')
const { validateRoadmapPayload, diffRoadmapAdaptation } = require('./roadmapValidator')
const progressEngine = require('./progressEngine')

const GOAL_CATEGORIES = [
  'Academic', 'Career', 'Certification', 'Education', 'Finance', 'Health', 'Personal', 'Skill',
  'Technical Skill', 'Soft Skill', 'Project', 'Research', 'Placement', 'Internship',
  'Entrepreneurship', 'Personal Development', 'Custom',
]

async function loadLibraryTitles(userId, limit = 8) {
  const progress = await LibraryProgress.find({ userId }).sort('-lastReadAt').limit(limit).populate('bookId', 'title author _id').lean()
  const inProgress = progress.filter((item) => item.bookId).map((item) => ({
    title: item.bookId.title,
    author: item.bookId.author,
    url: `/library/books/${item.bookId._id}`,
    source: 'dream_wave_library',
  }))
  if (inProgress.length >= 4) return inProgress
  const featured = await LibraryBook.find({ status: 'active' }).sort('-saves').limit(4).select('title author _id').lean()
  return [
    ...inProgress,
    ...featured.map((book) => ({
      title: book.title,
      author: book.author,
      url: `/library/books/${book._id}`,
      source: 'dream_wave_library',
    })),
  ].slice(0, 8)
}

async function suggestGoal(userId, { ambition = '', category = 'Career' } = {}) {
  const text = String(ambition || '').trim()
  if (!text) throw Object.assign(new Error('Describe your ambition to get suggestions.'), { statusCode: 400 })

  const libraryBooks = await loadLibraryTitles(userId)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.65,
    max_tokens: 2200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a goal planning architect for Dream Wave. Return JSON only with keys:
title, description, category, priority, difficulty, estimatedDuration, skills[], milestones[{title,description,targetWeek}], roadmapStages[{title,description,skills[]}], suggestedTasks[{title,reason,priority,estimatedEffort}], resources[{title,type,source,url?}].
Use only these categories when possible: ${GOAL_CATEGORIES.join(', ')}.
For resources, prefer provided library books with exact titles. Never invent PDF download links.
Mark resource source as dream_wave_library, external, or topic_suggestion.`,
      },
      {
        role: 'user',
        content: `Student ambition: "${text}". Preferred category: ${category}. Available library books: ${JSON.stringify(libraryBooks)}`,
      },
    ],
  })

  let parsed
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
  } catch {
    throw Object.assign(new Error('AI returned invalid goal suggestions.'), { statusCode: 502 })
  }

  return {
    aiReady: true,
    suggestion: {
      title: String(parsed.title || text).slice(0, 160),
      description: String(parsed.description || '').slice(0, 4000),
      category: GOAL_CATEGORIES.includes(parsed.category) ? parsed.category : category,
      priority: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.priority) ? parsed.priority : 'Medium',
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(parsed.difficulty) ? parsed.difficulty : 'Intermediate',
      estimatedDuration: String(parsed.estimatedDuration || '').slice(0, 80),
      skills: (parsed.skills || []).map((item) => String(item).slice(0, 100)).slice(0, 12),
      milestones: (parsed.milestones || []).slice(0, 10).map((item) => ({
        title: String(item.title || item).slice(0, 160),
        description: String(item.description || '').slice(0, 1000),
        targetWeek: Number(item.targetWeek) || null,
      })),
      roadmapStages: (parsed.roadmapStages || []).slice(0, 12).map((item, index) => ({
        title: String(item.title || `Stage ${index + 1}`).slice(0, 160),
        description: String(item.description || '').slice(0, 1000),
        skills: (item.skills || []).map((skill) => String(skill).slice(0, 100)).slice(0, 8),
        order: index + 1,
        status: index === 0 ? 'available' : 'locked',
      })),
      suggestedTasks: (parsed.suggestedTasks || []).slice(0, 8).map((item) => ({
        title: String(item.title || '').slice(0, 160),
        reason: String(item.reason || '').slice(0, 500),
        priority: ['Low', 'Medium', 'High'].includes(item.priority) ? item.priority : 'Medium',
        estimatedEffort: String(item.estimatedEffort || '').slice(0, 80),
      })).filter((item) => item.title),
      resources: (parsed.resources || []).slice(0, 10),
    },
    libraryBooks,
    confidence: 'ai_inference',
  }
}

async function clarifyGoal({ ambition = '' } = {}) {
  const text = String(ambition || '').trim()
  if (!text) throw Object.assign(new Error('Enter a goal idea to clarify.'), { statusCode: 400 })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return JSON with refinedGoals[{title, description, whySpecific}] and questions[] to ask the student. Help narrow broad goals without forcing one choice.',
      },
      { role: 'user', content: `Clarify this broad goal idea: "${text}"` },
    ],
  })
  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
  return {
    refinedGoals: (parsed.refefinedGoals || []).slice(0, 5),
    questions: (parsed.questions || []).slice(0, 4),
    confidence: 'ai_inference',
  }
}

async function buildGoalReview(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId }).lean()
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })

  const [progress, nextAction, tasks, roadmap] = await Promise.all([
    progressEngine.computeGoalProgress(goalId, userId),
    progressEngine.getNextBestAction(goalId, userId),
    Task.find({ goalId, userId, status: { $ne: 'archived' } }).select('title status completed dueDate priority').lean(),
    Roadmap.findOne({ goalId, userId }).lean(),
  ])

  const completedTasks = tasks.filter((item) => item.completed || item.status === 'completed')
  const pendingMilestones = (goal.milestones || []).filter((item) => item.status !== 'completed')
  const blockers = []
  if (goal.deadline && new Date(goal.deadline) < new Date() && progress.percent < 100) {
    blockers.push({ type: 'deadline', message: 'Target date has passed with incomplete progress.' })
  }
  if (pendingMilestones.some((item) => item.targetDate && new Date(item.targetDate) < new Date())) {
    blockers.push({ type: 'milestone', message: 'One or more milestones are overdue.' })
  }
  if (!roadmap) blockers.push({ type: 'roadmap', message: 'No roadmap created yet.' })

  return {
    goal: { id: goal._id, title: goal.title, status: goal.status, deadline: goal.deadline },
    progress,
    completedTasks: completedTasks.length,
    pendingTasks: tasks.length - completedTasks.length,
    pendingMilestones: pendingMilestones.map((item) => item.title),
    nextAction,
    blockers,
    adaptationHint: progress.percent < 35 && goal.deadline
      ? 'At current pace, this target may require additional weekly effort.'
      : null,
  }
}

async function buildWeeklyReview(userId) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const [goals, tasks] = await Promise.all([
    Goal.find({ userId, status: { $in: ['active', 'planning'] } }).lean(),
    Task.find({ userId, updatedAt: { $gte: weekStart }, status: { $ne: 'archived' } }).lean(),
  ])

  const tasksCompleted = tasks.filter((item) => item.completed || item.status === 'completed').length
  const milestonesCompleted = goals.flatMap((goal) => goal.milestones || [])
    .filter((item) => item.status === 'completed' && item.completedAt && new Date(item.completedAt) >= weekStart).length

  return {
    weekStart,
    tasksCompleted,
    milestonesCompleted,
    goalsActive: goals.length,
    goalMovement: goals.map((goal) => ({
      id: goal._id,
      title: goal.title,
      progress: goal.progress || 0,
      deltaNote: (goal.progressHistory || []).filter((entry) => new Date(entry.date) >= weekStart).length
        ? 'Progress updated this week'
        : 'No progress updates recorded this week',
    })),
    nextWeekPriorities: (await Promise.all(goals.slice(0, 5).map(async (goal) => progressEngine.getNextBestAction(goal._id, userId)))).filter(Boolean),
  }
}

async function suggestRoadmapAdaptation(userId, goalId) {
  const [goal, roadmap] = await Promise.all([
    Goal.findOne({ _id: goalId, userId }).lean(),
    Roadmap.findOne({ goalId, userId }).lean(),
  ])
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })
  if (!roadmap) throw Object.assign(new Error('Roadmap not found.'), { statusCode: 404 })

  const progress = await progressEngine.computeGoalProgress(goalId, userId)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Suggest roadmap adjustments only. Return JSON { summary, nextSteps[], learningStages[], milestones[], rationale }. Do not claim changes were applied.',
      },
      {
        role: 'user',
        content: `Goal: ${goal.title}. Progress: ${progress.percent}%. Deadline: ${goal.deadline || 'none'}. Current roadmap: ${JSON.stringify({ nextSteps: roadmap.data?.nextSteps, learningStages: roadmap.learningStages, milestones: goal.milestones?.map((m) => m.title) })}`,
      },
    ],
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
  const validated = validateRoadmapPayload({
    ...roadmap.data,
    nextSteps: parsed.nextSteps || roadmap.data?.nextSteps,
    learningStages: parsed.learningStages || roadmap.learningStages,
    milestones: parsed.milestones,
  })
  if (!validated.valid) throw Object.assign(new Error('AI adaptation failed validation.'), { statusCode: 502 })

  const diff = diffRoadmapAdaptation(
    { nextSteps: roadmap.data?.nextSteps, learningStages: roadmap.learningStages, milestones: goal.milestones?.map((m) => m.title) },
    { nextSteps: validated.data.nextSteps, learningStages: validated.data.learningStages, milestones: validated.data.milestones },
  )

  return {
    summary: String(parsed.summary || parsed.rationale || 'Suggested roadmap adjustments ready for review.'),
    current: {
      progress: progress.percent,
      nextSteps: roadmap.data?.nextSteps || [],
      learningStages: roadmap.learningStages || [],
    },
    suggested: validated.data,
    diff,
    requiresApproval: true,
  }
}

async function applyRoadmapAdaptation(userId, goalId, suggestedData) {
  const validated = validateRoadmapPayload(suggestedData)
  if (!validated.valid) throw Object.assign(new Error(validated.errors.join(' ')), { statusCode: 400 })

  const roadmap = await Roadmap.findOne({ goalId, userId })
  if (!roadmap) throw Object.assign(new Error('Roadmap not found.'), { statusCode: 404 })

  const snapshot = {
    data: roadmap.data,
    learningStages: roadmap.learningStages,
    version: roadmap.version,
  }
  roadmap.changeHistory = roadmap.changeHistory || []
  roadmap.changeHistory.push({
    version: roadmap.version,
    summary: 'AI-assisted roadmap adaptation applied',
    changedAt: new Date(),
    snapshot,
  })
  if (roadmap.changeHistory.length > 10) roadmap.changeHistory = roadmap.changeHistory.slice(-10)

  roadmap.data = { ...roadmap.data, ...validated.data }
  if (validated.data.learningStages?.length) roadmap.learningStages = validated.data.learningStages
  roadmap.version += 1
  roadmap.architecture.source = 'ai'
  roadmap.architecture.generatedAt = new Date()
  await roadmap.save()

  const goal = await Goal.findOne({ _id: goalId, userId })
  if (goal && validated.data.milestones?.length) {
    validated.data.milestones.forEach((title) => {
      if (!goal.milestones.some((item) => item.title.toLowerCase() === String(title).toLowerCase())) {
        goal.milestones.push({ title: String(title).slice(0, 160) })
      }
    })
    await goal.save()
  }

  await progressEngine.syncGoalProgress(goalId, userId, 'Roadmap adaptation applied')
  return { roadmap, goal }
}

async function suggestTasks(userId, goalId, { stageTitle = '' } = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId }).lean()
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.55,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return JSON { tasks:[{title, reason, priority, estimatedEffort, relatedMilestone}] }. Suggestions only — do not imply they were saved.',
      },
      {
        role: 'user',
        content: `Suggest tasks for goal "${goal.title}"${stageTitle ? ` focusing on stage "${stageTitle}"` : ''}. Milestones: ${(goal.milestones || []).map((m) => m.title).join(', ')}`,
      },
    ],
  })
  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
  return {
    tasks: (parsed.tasks || []).slice(0, 8).map((item) => ({
      title: String(item.title || '').slice(0, 160),
      reason: String(item.reason || '').slice(0, 500),
      priority: ['Low', 'Medium', 'High'].includes(item.priority) ? item.priority : 'Medium',
      estimatedEffort: String(item.estimatedEffort || '').slice(0, 80),
      relatedMilestone: String(item.relatedMilestone || '').slice(0, 160),
      goalId,
    })).filter((item) => item.title),
    requiresExplicitSave: true,
  }
}

async function acceptSuggestedTasks(userId, goalId, tasks = []) {
  if (!Array.isArray(tasks) || !tasks.length) throw Object.assign(new Error('No tasks to save.'), { statusCode: 400 })
  const goal = await Goal.findOne({ _id: goalId, userId })
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })

  const created = []
  for (const item of tasks.slice(0, 10)) {
    const title = String(item.title || '').trim().slice(0, 160)
    if (!title) continue
    const task = await Task.create({
      userId,
      goalId: goal._id,
      title,
      description: String(item.reason || '').slice(0, 2000),
      priority: ['Low', 'Medium', 'High', 'Critical'].includes(item.priority) ? item.priority : 'Medium',
      source: 'ai',
      status: 'todo',
      category: goal.category,
      estimatedTime: item.estimatedEffort || '',
    })
    created.push(task)
  }
  await progressEngine.syncGoalProgress(goal._id, userId, 'Suggested tasks accepted')
  return created
}

async function detectGoalConflicts(userId) {
  const goals = await Goal.find({ userId, status: { $in: ['active', 'planning'] } }).lean()
  const highPriority = goals.filter((item) => ['High', 'Critical'].includes(item.priority))
  const sameDeadline = goals.filter((item) => item.deadline).reduce((map, goal) => {
    const key = new Date(goal.deadline).toISOString().slice(0, 7)
    map[key] = map[key] || []
    map[key].push(goal)
    return map
  }, {})
  const conflicts = Object.entries(sameDeadline).filter(([, items]) => items.length >= 2 && items.some((g) => ['High', 'Critical'].includes(g.priority)))
  return {
    highPriorityCount: highPriority.length,
    warnings: conflicts.map(([month, items]) => ({
      type: 'deadline_overlap',
      message: `You have ${items.length} high-priority goals targeting ${month}.`,
      goalIds: items.map((item) => item._id),
    })),
  }
}

module.exports = {
  suggestGoal,
  clarifyGoal,
  buildGoalReview,
  buildWeeklyReview,
  suggestRoadmapAdaptation,
  applyRoadmapAdaptation,
  suggestTasks,
  acceptSuggestedTasks,
  detectGoalConflicts,
  GOAL_CATEGORIES,
}
