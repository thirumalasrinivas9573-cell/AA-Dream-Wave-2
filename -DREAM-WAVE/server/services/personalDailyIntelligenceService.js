/**
 * Personal AI Operating Layer + Daily Life Intelligence (Thirumala V3 Prompt 8).
 *
 * Reuses: decisionSupport, priorityEngine, planner, learningIntelligence, research,
 * notifications, dashboard orchestration signals.
 * Does NOT create a second assistant, task system, or calendar.
 *
 * Principles: context-aware, explainable, user-controlled, privacy-aware, non-destructive.
 */
const crypto = require('crypto')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const Application = require('../models/Application')
const StudentProfile = require('../models/StudentProfile')
const CareerProfile = require('../models/CareerProfile')
const FocusSession = require('../models/FocusSession')
const User = require('../models/User')
const priorityEngine = require('./priorityEngine')
const decisionSupportService = require('./decisionSupportService')
const scheduleEngine = require('./scheduleEngine')
const plannerService = require('./plannerService')
const notificationService = require('./notificationService')

const DAILY_INTENTS = [
  'NEXT_ACTION',
  'DAILY_PLAN',
  'GAP_REVIEW',
  'PROGRESS_RISK',
  'URGENT_TASKS',
  'DEADLINES',
  'LEARNING_TODAY',
  'PROJECT_HELP',
  'PREPARE_EVENT',
]

const INTENT_KEYWORDS = {
  NEXT_ACTION: /\b(what should i do now|do now|next action|right now)\b/i,
  DAILY_PLAN: /\b(plan my day|what should i do today|today'?s plan|daily plan)\b/i,
  GAP_REVIEW: /\b(what am i missing|gaps?|missing)\b/i,
  PROGRESS_RISK: /\b(falling behind|behind on|overdue|needs attention|stuck)\b/i,
  URGENT_TASKS: /\b(urgent tasks?|show (my )?urgent|critical tasks?)\b/i,
  DEADLINES: /\b(deadlines?|what'?s due|coming up)\b/i,
  LEARNING_TODAY: /\b(what should i learn( today)?|learn today)\b/i,
  PROJECT_HELP: /\b(help me finish my project|project (help|milestone)|what should i build)\b/i,
  PREPARE_EVENT: /\b(prepare (me )?for|interview tomorrow|hackathon)\b/i,
}

const SAFE_ACTIONS = new Set([
  'create_task_suggestion', // propose only
  'apply_daily_plan', // confirmable via planner apply
  'start_focus', // confirmable via existing focus API (client-side start preferred)
])

const actionPreviewStore = new Map()
const PREVIEW_TTL_MS = 15 * 60 * 1000

function routeDailyIntent(message = '', action = '') {
  if (action === 'plan-day') return 'DAILY_PLAN'
  if (action === 'recommend-next' || action === 'next-action') return 'NEXT_ACTION'
  if (action === 'gap-review') return 'GAP_REVIEW'
  if (action === 'progress-risk' || action === 'review-progress') return 'PROGRESS_RISK'
  if (action === 'urgent-tasks') return 'URGENT_TASKS'
  if (action === 'deadlines') return 'DEADLINES'
  if (action === 'learning-next' || action === 'learn-today') return 'LEARNING_TODAY'
  if (action === 'project-help') return 'PROJECT_HELP'
  if (action === 'prepare-event') return 'PREPARE_EVENT'
  for (const [intent, pattern] of Object.entries(INTENT_KEYWORDS)) {
    if (pattern.test(message)) return intent
  }
  return 'NEXT_ACTION'
}

function todayKey() {
  return scheduleEngine.dateKeyFromDate()
}

function bucketLevel(item) {
  if (item.level === 'critical' || item.overdue) return 'Critical'
  if (item.level === 'high' || item.dueToday) return 'Important'
  if (item.level === 'normal') return 'Recommended'
  return 'Optional'
}

/**
 * Secure personal tools — ALWAYS scoped to authenticated userId.
 * Never accept ownerId/userId overrides from clients.
 */
const personalTools = {
  async getTasks(userId, { limit = 40 } = {}) {
    return Task.find({ userId, status: { $ne: 'archived' } })
      .sort('-updatedAt')
      .limit(Math.min(100, limit))
      .lean()
  },
  async getGoals(userId, { limit = 20 } = {}) {
    return Goal.find({ userId, status: { $ne: 'archived' } })
      .sort('-updatedAt')
      .limit(Math.min(50, limit))
      .lean()
  },
  async getRoadmaps(userId, { limit = 10 } = {}) {
    return Roadmap.find({ userId, status: { $ne: 'archived' } })
      .populate('goalId', 'title category priority status progress')
      .limit(Math.min(20, limit))
      .lean()
  },
  async getProjects(userId) {
    const profile = await StudentProfile.findOne({ userId }).select('projects').lean()
    return (profile?.projects || []).filter((p) => p.status !== 'archived')
  },
  async getResearch(userId) {
    try {
      const researchService = require('./researchService')
      if (!researchService.isEnabled?.()) return []
      return researchService.listProjects(userId, { limit: 5 })
    } catch {
      return []
    }
  },
  async getApplications(userId) {
    return Application.find({ studentId: userId })
      .sort('-updatedAt')
      .limit(15)
      .lean()
  },
  async getNotifications(userId) {
    try {
      return notificationService.listForUser(userId, { limit: 15, unreadOnly: false })
    } catch {
      return { items: [], unread: 0 }
    }
  },
  async getReading(userId) {
    return LibraryProgress.find({ userId, percent: { $gt: 0, $lt: 100 } })
      .populate({ path: 'bookId', match: { status: 'active' }, select: 'title author' })
      .sort('-lastReadAt')
      .limit(5)
      .lean()
      .then((rows) => rows.filter((r) => r.bookId))
  },
  async getCareer(userId) {
    return CareerProfile.findOne({ userId }).select('targetCareer targetRoles requiredSkills').lean()
  },
  async getFocus(userId) {
    return FocusSession.findOne({ userId, status: { $in: ['active', 'paused'] } })
      .populate('taskId', 'title')
      .sort('-startedAt')
      .lean()
  },
}

async function loadPersonalSnapshot(userId) {
  if (!userId) {
    const err = new Error('Authenticated user required')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }

  const [
    user,
    goals,
    tasks,
    roadmaps,
    projects,
    research,
    applications,
    notifications,
    reading,
    career,
    focusActive,
    plannerToday,
  ] = await Promise.all([
    User.findById(userId).select('name').lean(),
    personalTools.getGoals(userId),
    personalTools.getTasks(userId),
    personalTools.getRoadmaps(userId),
    personalTools.getProjects(userId),
    personalTools.getResearch(userId),
    personalTools.getApplications(userId),
    personalTools.getNotifications(userId),
    personalTools.getReading(userId),
    personalTools.getCareer(userId),
    personalTools.getFocus(userId),
    plannerService.buildTodayView(userId, todayKey()).catch(() => null),
  ])

  let learning = null
  try {
    const learningIntelligenceService = require('./learningIntelligenceService')
    learning = await learningIntelligenceService.getLearningIntelligence(userId)
  } catch {
    learning = null
  }

  let academicOverview = null
  try {
    const academicService = require('./academicService')
    if (academicService.isEnabled()) {
      academicOverview = await academicService.getOverview(userId).catch(() => null)
    }
  } catch {
    academicOverview = null
  }

  return {
    user,
    goals,
    tasks,
    roadmaps,
    projects,
    research,
    applications,
    notifications,
    reading,
    career,
    focusActive,
    plannerToday,
    learning,
    academicOverview,
    calendarNote: 'Calendar availability is not connected to an external calendar. Plans use your Dream Wave planner preferences and tasks only.',
    generatedAt: new Date().toISOString(),
  }
}

function alignTaskToGoal(task, goals) {
  if (!task?.goalId) return null
  const goal = goals.find((g) => String(g._id) === String(task.goalId))
  if (!goal) return null
  return {
    taskTitle: task.title,
    goalTitle: goal.title,
    goalId: String(goal._id),
    explanation: `"${task.title}" supports your goal “${goal.title}”.`,
  }
}

function alignTaskToRoadmap(task, roadmaps) {
  const roadmap = roadmaps.find((r) => String(r._id) === String(task.roadmapId))
    || (task.goalId
      ? roadmaps.find((r) => String(r.goalId?._id || r.goalId) === String(task.goalId))
      : null)
  if (!roadmap) return null
  const stage = (roadmap.learningStages || []).find((s) => s.status !== 'completed')
  return {
    roadmapId: String(roadmap._id),
    stageTitle: stage?.title || null,
    explanation: stage
      ? `This advances your current roadmap stage “${stage.title}”.`
      : 'This task is linked to your learning roadmap.',
  }
}

function buildPrioritizedBuckets(snapshot) {
  const { tasks, goals, roadmaps, applications, academicOverview, notifications } = snapshot
  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed' && t.status !== 'archived')
  const ranked = priorityEngine.sortTasksByPriority(pending, { goals, roadmaps })
  const buckets = { Critical: [], Important: [], Recommended: [], Optional: [] }

  for (const { task, score, factors } of ranked.slice(0, 12)) {
    const overdue = priorityEngine.isOverdue(task)
    const days = task.dueDate ? priorityEngine.daysUntil(task.dueDate) : null
    const level = overdue || days === 0 ? 'critical' : days === 1 ? 'high' : task.priority === 'High' ? 'high' : 'normal'
    const item = {
      id: String(task._id),
      type: 'task',
      title: task.title,
      level,
      score,
      overdue,
      dueToday: days === 0,
      reason: priorityEngine.explainPriority(task, { goals, roadmaps }).primaryReason
        || factors[0]?.label
        || 'Open task',
      source: 'Task',
      url: `/student/tasks?taskId=${task._id}`,
      goalAlignment: alignTaskToGoal(task, goals),
      roadmapAlignment: alignTaskToRoadmap(task, roadmaps),
      focusUrl: `/student/focus?taskId=${task._id}`,
    }
    buckets[bucketLevel(item)].push(item)
  }

  const interview = applications.find((a) => String(a.status || '').toLowerCase() === 'interview')
  if (interview) {
    buckets.Important.push({
      id: `app-${interview._id}`,
      type: 'application',
      title: 'Prepare for interview',
      level: 'high',
      reason: `Application status is “interview”.`,
      source: 'Application',
      url: '/student/career/applications',
    })
  }

  if (academicOverview?.upcomingExam && academicOverview.upcomingExam.daysRemaining <= 3) {
    const exam = academicOverview.upcomingExam
    buckets.Critical.push({
      id: `exam-${exam.id}`,
      type: 'exam',
      title: `Prepare for ${exam.name}`,
      level: 'critical',
      reason: `Exam in ${exam.daysRemaining} day(s).`,
      source: 'Academics',
      url: `/student/academics/subjects/${exam.subjectId}`,
    })
  }

  const urgentNotifs = (notifications?.items || []).filter((n) => !n.read && ['urgent', 'high'].includes(n.priority))
  urgentNotifs.slice(0, 2).forEach((n) => {
    buckets.Important.push({
      id: `notif-${n._id || n.id}`,
      type: 'notification',
      title: n.title,
      level: 'high',
      reason: n.body || 'Important notification',
      source: 'Notification',
      url: n.link || '/notifications',
    })
  })

  if (snapshot.learning?.nextAction?.study) {
    buckets.Recommended.push({
      id: 'learning-next',
      type: 'learning',
      title: `Study: ${snapshot.learning.nextAction.study}`,
      level: 'normal',
      reason: snapshot.learning.nextAction.why,
      source: 'Learning Intelligence',
      url: snapshot.learning.nextAction.url || '/student/intelligence',
    })
  }

  const project = (snapshot.projects || []).find((p) => p.status === 'in-progress')
  if (project) {
    buckets.Recommended.push({
      id: `project-${project._id}`,
      type: 'project',
      title: `Continue project: ${project.title}`,
      level: 'normal',
      reason: project.technologies?.[0]
        ? `Active portfolio project using ${project.technologies[0]}.`
        : 'Active portfolio project.',
      source: 'StudentProfile.projects',
      url: '/student/profile',
    })
  }

  const research = (snapshot.research || [])[0]
  if (research) {
    buckets.Optional.push({
      id: `research-${research.id}`,
      type: 'research',
      title: `Research: ${research.title}`,
      level: 'low',
      reason: research.question
        ? `Open research question: ${research.question}`
        : `Status ${research.status}`,
      source: 'Research',
      url: `/student/research/${research.id}`,
    })
  }

  return buckets
}

function buildNextAction(snapshot, buckets) {
  const hasWork = snapshot.tasks.some((t) => !t.completed && t.status !== 'completed')
    || snapshot.goals.some((g) => !g.completed && g.status !== 'archived')
  if (!hasWork) {
    return {
      type: 'SETUP',
      title: 'Set your first goal',
      why: 'No active tasks, deadlines, or roadmap stages were found for today.',
      source: 'Onboarding',
      url: '/student/goals',
      focusUrl: null,
      estimatedComplexity: null,
      origin: 'SYSTEM',
    }
  }

  const decisionSnap = {
    goals: snapshot.goals,
    tasks: snapshot.tasks,
    roadmaps: snapshot.roadmaps,
    reading: snapshot.reading,
    career: snapshot.career,
    applications: snapshot.applications,
    academicOverview: snapshot.academicOverview,
    revisionQueue: [],
  }
  let next = null
  try {
    next = decisionSupportService.buildNextBestAction(decisionSnap)
  } catch {
    next = null
  }

  const firstBucket = ['Critical', 'Important', 'Recommended', 'Optional']
    .map((k) => buckets[k][0])
    .find(Boolean)

  if (next?.title) {
    const task = snapshot.tasks.find((t) => String(t._id) === String(next.targetEntity?.id))
    return {
      type: next.type || 'NEXT_ACTION',
      title: next.title,
      why: next.reason,
      source: (next.sourceSignals || []).join(', ') || 'Decision Support',
      url: next.action?.url || firstBucket?.url || '/student/tasks',
      focusUrl: task ? `/student/focus?taskId=${task._id}` : '/student/focus',
      estimatedComplexity: null,
      complexityNote: 'Time estimates are not fabricated when duration is unknown.',
      goalAlignment: task ? alignTaskToGoal(task, snapshot.goals) : null,
      roadmapAlignment: task ? alignTaskToRoadmap(task, snapshot.roadmaps) : null,
      fingerprint: next.fingerprint || null,
      origin: 'STRUCTURED_DATA',
    }
  }

  if (firstBucket) {
    return {
      type: 'NEXT_ACTION',
      title: firstBucket.title,
      why: firstBucket.reason,
      source: firstBucket.source,
      url: firstBucket.url,
      focusUrl: firstBucket.focusUrl || '/student/focus',
      estimatedComplexity: null,
      complexityNote: 'Time estimates are not fabricated when duration is unknown.',
      goalAlignment: firstBucket.goalAlignment || null,
      roadmapAlignment: firstBucket.roadmapAlignment || null,
      origin: 'STRUCTURED_DATA',
    }
  }

  return {
    type: 'SETUP',
    title: 'Set your first goal',
    why: 'No active tasks, deadlines, or roadmap stages were found for today.',
    source: 'Onboarding',
    url: '/student/goals',
    focusUrl: null,
    estimatedComplexity: null,
    origin: 'SYSTEM',
  }
}

function buildDailyPlan(snapshot, buckets) {
  const ordered = [
    ...buckets.Critical,
    ...buckets.Important,
    ...buckets.Recommended,
    ...buckets.Optional,
  ].slice(0, 8)

  const plannerItems = (snapshot.plannerToday?.items || [])
    .filter((i) => !i.completed)
    .slice(0, 5)
    .map((i) => ({
      id: String(i._id),
      title: i.title,
      startTime: i.startTime || null,
      durationMinutes: i.durationMinutes || null,
      reason: i.priorityReason || 'On your Dream Wave planner',
      source: 'Planner',
      url: '/student/planner',
    }))

  return {
    date: todayKey(),
    buckets,
    ordered,
    plannerItems,
    calendarNote: snapshot.calendarNote,
    note: plannerItems.length
      ? 'Ordered from real tasks, deadlines, and planner items. Times shown only when already scheduled.'
      : 'Ordered from real tasks and deadlines. Calendar availability is not connected — times are not invented.',
    requiresApprovalToPersist: true,
    aiCalled: false,
  }
}

function buildGapReview(snapshot) {
  const gaps = []
  if (!snapshot.goals.length) {
    gaps.push({ area: 'goal', message: 'No active goals.', action: { label: 'Create a goal', url: '/student/goals' } })
  }
  if (!snapshot.tasks.filter((t) => !t.completed).length && snapshot.goals.length) {
    gaps.push({ area: 'task', message: 'Active goal has no open tasks.', action: { label: 'Add tasks', url: '/student/tasks' } })
  }
  if (!snapshot.roadmaps.length && snapshot.goals.length) {
    gaps.push({ area: 'learning', message: 'No roadmap linked to your goals.', action: { label: 'Open roadmap', url: '/student/roadmap' } })
  }
  if (!(snapshot.projects || []).some((p) => p.status === 'in-progress' || p.status === 'planned')) {
    gaps.push({ area: 'project', message: 'No in-progress portfolio projects recorded.', action: { label: 'Open profile projects', url: '/student/profile' } })
  }
  if (!snapshot.applications.length && (snapshot.career?.targetCareer || snapshot.career?.targetRoles?.[0])) {
    gaps.push({
      area: 'application',
      message: 'Career target is set but no applications are tracked.',
      action: { label: 'Explore opportunities', url: '/student/career' },
    })
  }
  if (snapshot.learning?.skillGaps?.gaps?.[0]) {
    const gap = snapshot.learning.skillGaps.gaps[0]
    gaps.push({
      area: 'learning',
      message: `Skill needs attention: ${gap.skill}.`,
      action: { label: 'Open learning intelligence', url: '/student/intelligence' },
    })
  }
  return {
    items: gaps,
    note: gaps.length ? 'Gaps are derived from missing records in your account — not diagnoses.' : 'No structural gaps detected from available data.',
  }
}

function buildProgressRisk(snapshot) {
  const risks = []
  const overdue = snapshot.tasks.filter((t) => priorityEngine.isOverdue(t))
  if (overdue.length) {
    risks.push({
      area: 'tasks',
      severity: 'needs_attention',
      title: `${overdue.length} overdue task(s)`,
      detail: overdue[0].title,
      language: 'Needs attention.',
      url: '/student/tasks',
    })
  }
  const stalledGoals = snapshot.goals.filter((g) => {
    if (g.completed || g.status !== 'active') return false
    const updated = new Date(g.updatedAt || g.createdAt).getTime()
    return Date.now() - updated > 14 * 86400000
  })
  stalledGoals.slice(0, 2).forEach((g) => {
    risks.push({
      area: 'goal',
      severity: 'needs_attention',
      title: `Goal inactive 14+ days: ${g.title}`,
      detail: 'Inactivity alone is not failure — review whether this goal still fits.',
      language: 'Needs attention.',
      url: `/student/goals?goalId=${g._id}`,
    })
  })
  const blocked = (snapshot.goals || []).flatMap((g) =>
    (g.milestones || []).filter((m) => m.status === 'blocked').map((m) => ({ goal: g, milestone: m })),
  )
  blocked.slice(0, 2).forEach(({ goal, milestone }) => {
    risks.push({
      area: 'milestone',
      severity: 'needs_attention',
      title: `Blocked milestone: ${milestone.title}`,
      detail: `On goal “${goal.title}”.`,
      language: 'Needs attention.',
      url: `/student/goals?goalId=${goal._id}`,
    })
  })
  return {
    items: risks,
    note: 'Risk signals use neutral language. This is not a personal diagnosis.',
  }
}

function suggestTaskBreakdown(title = '') {
  const clean = String(title || '').trim()
  if (!clean) {
    return { label: 'AI SUGGESTION', steps: [], note: 'Provide a task title to suggest a breakdown.', requiresConfirmation: true }
  }
  const steps = [
    `Clarify requirements for “${clean}”`,
    'Inspect existing architecture / related work',
    'Design the approach',
    'Implement the core piece',
    'Add tests or validation',
    'Review and document',
  ]
  return {
    label: 'AI SUGGESTION',
    parentTitle: clean,
    steps: steps.map((titleStep, index) => ({ order: index + 1, title: titleStep })),
    requiresConfirmation: true,
    note: 'Suggestions only. Tasks are not created until you confirm through the existing task APIs.',
  }
}

function buildDailyBriefing(snapshot, nextAction, buckets, gaps, risks) {
  const name = snapshot.user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? `Good morning, ${name}` : hour < 18 ? `Good afternoon, ${name}` : `Good evening, ${name}`

  const focus = [
    buckets.Critical[0],
    buckets.Important[0],
    buckets.Recommended.find((i) => i.type === 'learning') || buckets.Recommended[0],
  ].filter(Boolean)

  const project = (snapshot.projects || []).find((p) => p.status === 'in-progress')
  const interview = snapshot.applications.find((a) => String(a.status || '').toLowerCase() === 'interview')

  return {
    greeting,
    todaysFocus: focus.map((item) => ({
      title: item.title,
      why: item.reason,
      source: item.source,
      url: item.url,
      bucket: bucketLevel(item),
    })),
    project: project
      ? { title: project.title, milestone: null, note: 'Portfolio project (no separate milestone record unless linked).', url: '/student/profile' }
      : { title: null, note: 'No in-progress project recorded.' },
    learning: snapshot.learning?.nextAction
      ? {
        topic: snapshot.learning.nextAction.study || snapshot.learning.overview?.currentTopic,
        why: snapshot.learning.nextAction.why,
        url: snapshot.learning.nextAction.url,
      }
      : { topic: null, note: 'No learning next-action derived yet.' },
    career: interview
      ? {
        title: 'Interview preparation',
        why: 'Application status is interview.',
        source: 'Application',
        url: '/student/career/applications',
      }
      : snapshot.career?.targetCareer || snapshot.career?.targetRoles?.[0]
        ? {
          title: `Career focus: ${snapshot.career.targetCareer || snapshot.career.targetRoles[0]}`,
          why: 'From your career profile.',
          source: 'CareerProfile',
          url: '/student/career',
        }
        : { title: null, note: 'No career target or interview recorded.' },
    events: snapshot.academicOverview?.upcomingExam
      ? {
        title: snapshot.academicOverview.upcomingExam.name,
        why: `Exam in ${snapshot.academicOverview.upcomingExam.daysRemaining} day(s).`,
        source: 'Academics',
        url: `/student/academics/subjects/${snapshot.academicOverview.upcomingExam.subjectId}`,
      }
      : { title: null, note: 'No upcoming personal event deadline in connected records.' },
    notifications: {
      unread: snapshot.notifications?.unread || 0,
      highlights: (snapshot.notifications?.items || []).filter((n) => !n.read).slice(0, 3).map((n) => ({
        title: n.title,
        body: n.body,
        link: n.link,
      })),
    },
    focusMode: snapshot.focusActive
      ? {
        active: true,
        taskTitle: snapshot.focusActive.taskId?.title || 'Focus session',
        url: '/student/focus',
      }
      : { active: false, url: '/student/focus' },
    aiNote: nextAction
      ? { what: nextAction.title, why: nextAction.why, source: nextAction.source }
      : risks.items[0]
        ? { what: risks.items[0].title, why: risks.items[0].detail, source: 'Progress risk' }
        : gaps.items[0]
          ? { what: gaps.items[0].message, why: 'Setup gap from your account data.', source: 'Gap review' }
          : { what: 'Your queue looks clear.', why: 'No overdue tasks or critical deadlines detected.', source: 'Structured data' },
    nextAction,
    calendarNote: snapshot.calendarNote,
    generatedAt: new Date().toISOString(),
    aiCalled: false,
  }
}

async function getDailyLifeIntelligence(userId) {
  const snapshot = await loadPersonalSnapshot(userId)
  const buckets = buildPrioritizedBuckets(snapshot)
  const nextAction = buildNextAction(snapshot, buckets)
  const plan = buildDailyPlan(snapshot, buckets)
  const gaps = buildGapReview(snapshot)
  const risks = buildProgressRisk(snapshot)
  const briefing = buildDailyBriefing(snapshot, nextAction, buckets, gaps, risks)

  const empty = !snapshot.goals.length && !snapshot.tasks.length && !snapshot.roadmaps.length

  return {
    briefing,
    nextAction,
    plan,
    gaps,
    risks,
    taskIntelligence: {
      overdue: snapshot.tasks.filter((t) => priorityEngine.isOverdue(t)).slice(0, 8).map((t) => ({
        id: String(t._id),
        title: t.title,
        dueDate: t.dueDate,
        goalAlignment: alignTaskToGoal(t, snapshot.goals),
        roadmapAlignment: alignTaskToRoadmap(t, snapshot.roadmaps),
        url: `/student/tasks?taskId=${t._id}`,
      })),
      ordered: plan.ordered.filter((i) => i.type === 'task'),
    },
    alignments: {
      learning: snapshot.learning?.overview || null,
      project: (snapshot.projects || []).filter((p) => p.status === 'in-progress').slice(0, 3),
      research: (snapshot.research || []).slice(0, 3),
      career: snapshot.career
        ? { target: snapshot.career.targetCareer || snapshot.career.targetRoles?.[0] || null }
        : null,
    },
    focus: briefing.focusMode,
    empty,
    setupActions: empty
      ? [
        { label: 'Create a goal', url: '/student/goals' },
        { label: 'Add a task', url: '/student/tasks' },
        { label: 'Explore AI Mentor', url: '/student/mentor?action=plan-day' },
      ]
      : [],
    intents: DAILY_INTENTS,
    generatedAt: new Date().toISOString(),
  }
}

function storeActionPreview(userId, payload) {
  const id = crypto.randomUUID()
  actionPreviewStore.set(id, {
    userId: String(userId),
    payload,
    createdAt: Date.now(),
  })
  // prune occasionally
  if (actionPreviewStore.size > 500) {
    const now = Date.now()
    for (const [key, value] of actionPreviewStore) {
      if (now - value.createdAt > PREVIEW_TTL_MS) actionPreviewStore.delete(key)
    }
  }
  return id
}

function proposeSafeAction(userId, { type, payload = {} } = {}) {
  if (!SAFE_ACTIONS.has(type) && type !== 'create_tasks_from_breakdown' && type !== 'breakdown_task') {
    const err = new Error('Unsupported action type.')
    err.statusCode = 400
    err.code = 'UNSUPPORTED_ACTION'
    throw err
  }

  if (type === 'breakdown_task' || type === 'create_tasks_from_breakdown') {
    const breakdown = suggestTaskBreakdown(payload.title || payload.taskTitle)
    const previewId = storeActionPreview(userId, {
      type: 'create_tasks_from_breakdown',
      steps: breakdown.steps,
      parentTitle: breakdown.parentTitle,
    })
    return {
      previewId,
      type: 'create_tasks_from_breakdown',
      label: 'AI SUGGESTION',
      requiresConfirmation: true,
      breakdown,
      note: 'Confirming will create tasks only after server validation. Owner is always the authenticated user.',
    }
  }

  if (type === 'apply_daily_plan') {
    const previewId = storeActionPreview(userId, { type: 'apply_daily_plan', plan: payload.plan || null })
    return {
      previewId,
      type: 'apply_daily_plan',
      requiresConfirmation: true,
      note: 'Use existing planner suggest/apply flow. This preview does not mutate data.',
      redirect: '/student/planner',
    }
  }

  const previewId = storeActionPreview(userId, { type, payload })
  return {
    previewId,
    type,
    requiresConfirmation: true,
    note: 'Action proposed. Confirm to execute.',
  }
}

async function confirmSafeAction(userId, { previewId, confirmed = false } = {}) {
  if (!confirmed) {
    const err = new Error('Confirmation required.')
    err.statusCode = 400
    err.code = 'CONFIRMATION_REQUIRED'
    throw err
  }
  const entry = actionPreviewStore.get(previewId)
  if (!entry || String(entry.userId) !== String(userId)) {
    const err = new Error('Action preview not found or expired.')
    err.statusCode = 404
    err.code = 'PREVIEW_NOT_FOUND'
    throw err
  }
  if (Date.now() - entry.createdAt > PREVIEW_TTL_MS) {
    actionPreviewStore.delete(previewId)
    const err = new Error('Action preview expired.')
    err.statusCode = 410
    err.code = 'PREVIEW_EXPIRED'
    throw err
  }

  const { payload } = entry
  actionPreviewStore.delete(previewId)

  if (payload.type === 'create_tasks_from_breakdown') {
    const created = []
    for (const step of (payload.steps || []).slice(0, 7)) {
      const task = await Task.create({
        userId, // server-controlled ownership
        title: String(step.title || '').slice(0, 160),
        type: 'learn',
        source: 'ai',
        status: 'todo',
        priority: 'Medium',
      })
      created.push({ id: String(task._id), title: task.title })
    }
    try {
      await notificationService.createForUser(userId, {
        type: 'task',
        title: 'Suggested tasks created',
        body: `${created.length} tasks were created from your confirmed AI breakdown.`,
        link: '/student/tasks',
        source: 'daily-life',
      })
    } catch {
      // notification optional
    }
    return {
      success: true,
      type: payload.type,
      created,
      note: 'Tasks created with authenticated ownership only.',
    }
  }

  if (payload.type === 'apply_daily_plan') {
    return {
      success: true,
      type: payload.type,
      note: 'Use POST /api/planner/plan/apply with an approved planner preview. Daily Life does not silently write schedules.',
      redirect: '/student/planner',
    }
  }

  return { success: true, type: payload.type, note: 'No mutation performed.' }
}

async function buildPersonalContextBlock(userId, { message = '', action = '' } = {}) {
  const intent = routeDailyIntent(message, action)
  const intel = await getDailyLifeIntelligence(userId)
  const lines = [
    'PERSONAL DAILY INTELLIGENCE (private, owner-scoped)',
    `Daily intent: ${intent}`,
    `Next action: ${intel.nextAction.title}`,
    `Why: ${intel.nextAction.why}`,
    `Source: ${intel.nextAction.source}`,
    `Critical today: ${intel.plan.buckets.Critical.map((i) => i.title).slice(0, 3).join('; ') || 'none'}`,
    `Important today: ${intel.plan.buckets.Important.map((i) => i.title).slice(0, 3).join('; ') || 'none'}`,
    intel.risks.items[0] ? `Needs attention: ${intel.risks.items[0].title}` : null,
    intel.gaps.items[0] ? `Gap: ${intel.gaps.items[0].message}` : null,
    intel.briefing.calendarNote,
    'Rules: Do not invent tasks, deadlines, interviews, events, or milestones. Do not perform destructive actions. Suggest then wait for confirmation. Missing data must be stated as missing.',
    'Current user request overrides any stored preference memory.',
  ].filter(Boolean)

  try {
    const memoryService = require('./memoryService')
    const prefs = await memoryService.getRelevantMemories(userId, {
      message,
      intent: 'DAILY_PLAN',
      limit: 3,
      types: ['PREFERENCE', 'WORKFLOW_PREFERENCE', 'TEMPORARY_CONTEXT', 'GOAL_CONTEXT'],
    })
    if (prefs.length) {
      lines.splice(lines.length - 2, 0, `Saved preferences (explicit/high only influence style): ${prefs.map((m) => m.content).join('; ')}`)
    }
  } catch {
    // optional
  }

  return {
    intent,
    text: lines.join('\n'),
    intelligence: {
      nextAction: intel.nextAction,
      critical: intel.plan.buckets.Critical.slice(0, 3),
      risks: intel.risks.items.slice(0, 3),
    },
  }
}

module.exports = {
  DAILY_INTENTS,
  SAFE_ACTIONS,
  routeDailyIntent,
  personalTools,
  loadPersonalSnapshot,
  getDailyLifeIntelligence,
  suggestTaskBreakdown,
  proposeSafeAction,
  confirmSafeAction,
  buildPersonalContextBlock,
  buildPrioritizedBuckets,
  buildNextAction,
  buildGapReview,
  buildProgressRisk,
}
