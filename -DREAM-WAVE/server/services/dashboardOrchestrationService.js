const priorityEngine = require('./priorityEngine')
const profilePortfolioService = require('./profilePortfolioService')
const plannerService = require('./plannerService')
const scheduleEngine = require('./scheduleEngine')
const decisionSupportService = require('./decisionSupportService')
const knowledgeGraphService = require('./knowledgeGraphService')
const academicService = require('./academicService')
const FocusSession = require('../models/FocusSession')
const CareerProfile = require('../models/CareerProfile')
const Post = require('../models/Post')

const PRIORITY_LEVELS = { critical: 4, high: 3, normal: 2, low: 1 }

function todayKey() {
  return scheduleEngine.dateKeyFromDate()
}

function classifyPriority(item) {
  if (item.overdue) return 'critical'
  if (item.dueToday) return 'critical'
  if (item.dueTomorrow) return 'high'
  if (item.interview) return 'high'
  if (item.applicationAction) return 'high'
  return item.level || 'normal'
}

function buildDeterministicDailyBrief({ user, goals, tasks, roadmaps, books, applications, plannerToday }) {
  const name = user?.name?.split(' ')[0] || 'there'
  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed' && t.status !== 'archived')
  const overdue = pending.filter((t) => priorityEngine.isOverdue(t))
  const dueToday = pending.filter((t) => {
    if (!t.dueDate) return false
    return scheduleEngine.dateKeyFromDate(new Date(t.dueDate)) === todayKey()
  })
  const activeGoal = goals.find((g) => !g.completed && g.status === 'active') || goals.find((g) => !g.completed)
  const activeRoadmap = roadmaps.find((r) => r.status === 'active' || r.status === 'in_progress') || roadmaps[0]
  const nextStage = activeRoadmap?.learningStages?.find((s) => s.status !== 'completed')
  const continueBook = books[0]
  const recentApp = applications.find((a) => ['interview_scheduled', 'offer', 'review', 'shortlisted'].includes(String(a.status || '').toLowerCase()))

  const lines = []
  if (overdue.length) lines.push(`You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}.`)
  else if (dueToday.length) lines.push(`You have ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today.`)
  else if (pending.length) lines.push(`You have ${pending.length} open task${pending.length > 1 ? 's' : ''}.`)
  else lines.push('Your task queue is clear today.')

  if (activeGoal) lines.push(`Active goal: ${activeGoal.title} (${Math.round(activeGoal.progress || 0)}%).`)
  if (nextStage) lines.push(`Current roadmap stage: ${nextStage.title}.`)
  if (continueBook?.bookId) lines.push(`Continue reading ${continueBook.bookId.title || 'your book'}.`)
  if (recentApp) lines.push(`Application update: ${recentApp.status}.`)
  if (plannerToday?.metrics?.planned) {
    lines.push(`Planner: ${plannerToday.metrics.completed || 0}/${plannerToday.metrics.planned} sessions today.`)
  }

  return {
    greeting: `Hello ${name}`,
    summary: lines.join(' '),
    highlights: lines,
    generatedAt: new Date().toISOString(),
    aiReady: false,
    source: 'deterministic',
  }
}

function buildPriorities({ tasks, goals, roadmaps, applications, plannerToday }) {
  const context = { goals, roadmaps }
  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed' && t.status !== 'archived')
  const ranked = priorityEngine.sortTasksByPriority(pending, context)
  const priorities = []

  for (const { task, score, factors } of ranked.slice(0, 3)) {
    const overdue = priorityEngine.isOverdue(task)
    const days = task.dueDate ? priorityEngine.daysUntil(task.dueDate) : null
    priorities.push({
      id: String(task._id),
      type: 'task',
      title: task.title,
      level: classifyPriority({ overdue, dueToday: days === 0, dueTomorrow: days === 1 }),
      score,
      reason: priorityEngine.explainPriority(task, context).primaryReason || priorityEngine.explainPriority(task, context).explanation,
      url: `/student/tasks?taskId=${task._id}`,
      action: 'Open task',
    })
  }

  const activeRoadmap = roadmaps.find((r) => r.status === 'active') || roadmaps[0]
  const nextStage = activeRoadmap?.learningStages?.find((s) => s.status !== 'completed')
  if (nextStage && priorities.length < 4) {
    priorities.push({
      id: `roadmap-${activeRoadmap._id}`,
      type: 'roadmap',
      title: `Continue: ${nextStage.title}`,
      level: 'normal',
      reason: `Next stage on ${activeRoadmap.goalId?.title || 'your roadmap'}.`,
      url: '/student/roadmap',
      action: 'Open roadmap',
    })
  }

  const actionApp = applications.find((a) => ['interview_scheduled', 'action_required', 'offer'].includes(String(a.status || '').toLowerCase()))
  if (actionApp && priorities.length < 5) {
    priorities.push({
      id: `app-${actionApp._id}`,
      type: 'application',
      title: actionApp.opportunity?.title || 'Application needs attention',
      level: 'high',
      reason: `Status: ${actionApp.status}`,
      url: '/student/career/applications',
      action: 'View application',
    })
  }

  const nextPlanner = plannerToday?.items?.find((i) => !i.completed)
  if (nextPlanner && priorities.length < 5) {
    priorities.push({
      id: `planner-${nextPlanner._id}`,
      type: 'planner',
      title: nextPlanner.title,
      level: 'normal',
      reason: nextPlanner.startTime ? `Scheduled at ${nextPlanner.startTime}` : 'On today\'s plan',
      url: '/student/planner',
      action: 'Open planner',
    })
  }

  return priorities.sort((a, b) => (PRIORITY_LEVELS[b.level] || 0) - (PRIORITY_LEVELS[a.level] || 0)).slice(0, 5)
}

function buildAlerts({ tasks, applications, notifications }) {
  const alerts = []
  const overdue = tasks.filter((t) => priorityEngine.isOverdue(t))
  if (overdue.length) {
    alerts.push({
      id: 'overdue-tasks',
      level: 'critical',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      message: overdue[0]?.title ? `Start with "${overdue[0].title}".` : 'Review your task list.',
      url: '/student/tasks',
    })
  }
  const urgentNotifs = (notifications?.items || []).filter((n) => !n.read && ['urgent', 'high'].includes(n.priority))
  if (urgentNotifs.length) {
    alerts.push({
      id: 'urgent-notifications',
      level: 'high',
      title: urgentNotifs.length === 1 ? urgentNotifs[0].title : `${urgentNotifs.length} important notifications`,
      message: urgentNotifs[0]?.body || 'Review your notification center.',
      url: urgentNotifs[0]?.link || '/notifications',
    })
  }
  const interviewApp = applications.find((a) => String(a.status || '').toLowerCase().includes('interview'))
  if (interviewApp) {
    alerts.push({
      id: `interview-${interviewApp._id}`,
      level: 'high',
      title: 'Interview update',
      message: interviewApp.opportunity?.title || 'Check your application status.',
      url: '/student/career/applications',
    })
  }
  return alerts.slice(0, 3)
}

function buildGoalWidget(goals) {
  const active = goals.find((g) => !g.completed && g.status === 'active') || goals.find((g) => !g.completed)
  if (!active) return null
  const milestones = active.milestones || []
  const current = milestones.find((m) => !m.completed) || milestones[milestones.length - 1]
  return {
    id: String(active._id),
    title: active.title,
    progress: Math.round(active.progress || 0),
    milestone: current?.title || null,
    deadline: active.deadline || null,
    url: `/student/goals?goalId=${active._id}`,
  }
}

function buildRoadmapWidget(roadmaps) {
  const active = roadmaps.find((r) => r.status === 'active' || r.status === 'in_progress') || roadmaps[0]
  if (!active) return null
  const stages = active.learningStages || []
  const current = stages.find((s) => s.status === 'in_progress') || stages.find((s) => s.status !== 'completed')
  const completed = stages.filter((s) => s.status === 'completed').length
  return {
    id: String(active._id),
    goalTitle: active.goalId?.title || 'Learning roadmap',
    currentStage: current?.title || null,
    stageProgress: stages.length ? Math.round((completed / stages.length) * 100) : 0,
    nextStage: stages.find((s, i) => stages[i - 1]?.status === 'completed' && s.status !== 'completed')?.title || null,
    url: '/student/roadmap',
  }
}

function buildTaskSummary(tasks) {
  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed' && t.status !== 'archived')
  const key = todayKey()
  return {
    overdue: pending.filter((t) => priorityEngine.isOverdue(t)).slice(0, 5),
    dueToday: pending.filter((t) => t.dueDate && scheduleEngine.dateKeyFromDate(new Date(t.dueDate)) === key).slice(0, 5),
    upcoming: pending.filter((t) => {
      if (!t.dueDate || priorityEngine.isOverdue(t)) return false
      const days = priorityEngine.daysUntil(t.dueDate)
      return days != null && days > 0 && days <= 7
    }).slice(0, 5),
    total: pending.length,
  }
}

function buildReadingWidget(books) {
  const item = books[0]
  if (!item?.bookId) return null
  return {
    bookId: String(item.bookId._id),
    title: item.bookId.title,
    author: item.bookId.author,
    percent: Math.round(item.percent || 0),
    currentPage: item.currentPage || null,
    totalPages: item.totalPages || null,
    url: `/library/books/${item.bookId._id}`,
  }
}

function buildProfileWidget(profile) {
  if (!profile) return null
  const completeness = profilePortfolioService.computeCompleteness(profile)
  const missing = completeness.checks.filter((c) => !c.done).slice(0, 2)
  return {
    percent: completeness.percent,
    missing,
    url: '/student/profile',
  }
}

function buildOnboardingActions({ goals, tasks, roadmaps, profile, books }) {
  const actions = []
  if (!goals.length) actions.push({ label: 'Set your first goal', url: '/student/goals', icon: '🎯' })
  if (!tasks.length) actions.push({ label: 'Create a task', url: '/student/tasks', icon: '✓' })
  if (!roadmaps.length && goals.length) actions.push({ label: 'Build a roadmap', url: '/student/roadmap', icon: '🗺️' })
  if (!books.length) actions.push({ label: 'Explore the library', url: '/student/books', icon: '📚' })
  if (profile && profilePortfolioService.computeCompleteness(profile).percent < 60) {
    actions.push({ label: 'Complete your profile', url: '/student/profile', icon: '👤' })
  }
  if (!profile?.careerDirection?.targetRole && !profile?.careerDirection?.targetCareer) {
    actions.push({ label: 'Choose career direction', url: '/student/career', icon: '🚀' })
  }
  return actions.slice(0, 5)
}

async function buildCommandCenter(userId, domainData = {}) {
  const {
    user,
    profile,
    goals = [],
    tasks = [],
    roadmaps = [],
    books = [],
    applications = [],
    notifications = {},
    discovery = {},
  } = domainData

  const dateKey = todayKey()
  const [plannerToday, focusActive, focusLast, careerProfile, communityPost, academicOverview] = await Promise.all([
    plannerService.buildTodayView(userId, dateKey).catch(() => null),
    FocusSession.findOne({ userId, status: { $in: ['active', 'paused'] } }).populate('taskId', 'title').sort('-startedAt').lean(),
    FocusSession.findOne({ userId, status: 'completed' }).sort('-endedAt').limit(1).lean(),
    CareerProfile.findOne({ userId }).select('targetCareer targetRoles requiredSkills').lean(),
    Post.find({ status: 'published', visibility: 'public' }).sort('-createdAt').limit(1).select('content userId').populate('userId', 'name').lean(),
    academicService.isEnabled() ? academicService.getOverview(userId).catch(() => null) : null,
  ])

  let dailyBrief = buildDeterministicDailyBrief({
    user, goals, tasks, roadmaps, books, applications, plannerToday,
  })
  const snapshot = { goals, tasks, roadmaps, reading: books, career: careerProfile, applications, academicOverview }
  let nextBestAction = null
  let intelligenceRecommendations = []
  if (knowledgeGraphService.isEnabled()) {
    try {
      nextBestAction = decisionSupportService.buildNextBestAction(snapshot)
      dailyBrief = decisionSupportService.enrichDailyBrief(dailyBrief, snapshot, nextBestAction)
      intelligenceRecommendations = await decisionSupportService.buildRecommendations(userId, snapshot, { limit: 4 })
    } catch {
      // Intelligence layer failure must not break dashboard
    }
  }
  const priorities = buildPriorities({ tasks, goals, roadmaps, applications, plannerToday })
  const alerts = buildAlerts({ tasks, applications, notifications })
  const taskSummary = buildTaskSummary(tasks)
  const isNewUser = !goals.length && !tasks.length && !roadmaps.length && !books.length

  const opportunity = (discovery.jobs || [])[0] || (discovery.internships || [])[0]
  const opportunityWidget = opportunity ? {
    id: String(opportunity._id),
    title: opportunity.title,
    company: opportunity.companyId?.name || opportunity.companyName || '',
    type: opportunity.stipend != null ? 'internship' : 'job',
    url: opportunity.stipend != null ? `/companies/internships/${opportunity._id}` : `/companies/jobs/${opportunity._id}`,
    reason: careerProfile?.targetCareer || careerProfile?.targetRoles?.[0]
      ? `Related to your target role: ${careerProfile.targetCareer || careerProfile.targetRoles[0]}`
      : 'Open opportunity on Dream Wave',
  } : null

  const applicationUpdates = applications
    .filter((a) => a.updatedAt)
    .slice(0, 3)
    .map((a) => ({
      id: String(a._id),
      title: a.opportunity?.title || `${a.targetType} application`,
      status: a.status,
      updatedAt: a.updatedAt,
      url: '/student/career/applications',
    }))

  return {
    dailyBrief,
    priorities,
    alerts,
    activeGoal: buildGoalWidget(goals),
    roadmap: buildRoadmapWidget(roadmaps),
    tasks: taskSummary,
    planner: plannerToday ? {
      date: plannerToday.date,
      items: (plannerToday.items || []).slice(0, 5),
      metrics: plannerToday.metrics || {},
      url: '/student/planner',
    } : null,
    focus: {
      active: focusActive ? {
        id: String(focusActive._id),
        durationMinutes: focusActive.plannedDurationMinutes,
        taskTitle: focusActive.taskId?.title || 'Focus session',
      } : null,
      lastSession: focusLast ? {
        endedAt: focusLast.endedAt,
        durationMinutes: Math.round((focusLast.durationSeconds || 0) / 60),
      } : null,
      url: '/student/focus',
    },
    continueReading: buildReadingWidget(books),
    continueLearning: buildRoadmapWidget(roadmaps),
    career: careerProfile ? {
      targetRole: careerProfile.targetCareer || careerProfile.targetRoles?.[0] || null,
      skillGap: (careerProfile.requiredSkills || [])[0] || null,
      url: '/student/career',
    } : null,
    opportunity: opportunityWidget,
    applicationUpdates,
    profile: buildProfileWidget(profile),
    community: communityPost ? {
      title: String(communityPost.content || '').slice(0, 80),
      author: communityPost.userId?.name,
      url: '/student/community',
    } : null,
    onboarding: isNewUser ? buildOnboardingActions({ goals, tasks, roadmaps, profile, books }) : [],
    isNewUser,
    nextBestAction,
    intelligenceRecommendations,
    academics: academicOverview ? {
      setupRequired: academicOverview.setupRequired,
      subjectCount: academicOverview.stats?.subjectCount || 0,
      upcomingExam: academicOverview.upcomingExam,
      dueAssignment: academicOverview.dueAssignment,
      url: '/student/academics',
    } : null,
    generatedAt: new Date().toISOString(),
  }
}

module.exports = {
  buildCommandCenter,
  buildDeterministicDailyBrief,
  buildPriorities,
  buildAlerts,
}
