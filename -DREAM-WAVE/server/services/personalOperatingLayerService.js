/**
 * Personal AI Operating Layer (Thirumala V4 Prompt 3).
 *
 * Coordinates existing Daily Life, priority, learning, brain, memory, agents.
 * Does NOT create GoalV4/TaskV4/CalendarV4 or silently write user data.
 *
 * Flow: STATE → FOCUS → PRIORITY → NEXT ACTION → (CONFIRM) → EXECUTE → VERIFY → ADAPT
 */
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const StudentProfile = require('../models/StudentProfile')
const CareerProfile = require('../models/CareerProfile')
const Application = require('../models/Application')
const UserProfile = require('../models/UserProfile')
const priorityEngine = require('./priorityEngine')
const decisionSupportService = require('./decisionSupportService')
const personalDailyIntelligenceService = require('./personalDailyIntelligenceService')
const memoryService = require('./memoryService')

const HEALTH = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  BLOCKED: 'BLOCKED',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
}

const DEADLINE_RISK = {
  SAFE: 'SAFE',
  APPROACHING: 'APPROACHING',
  URGENT: 'URGENT',
  OVERDUE: 'OVERDUE',
  UNKNOWN: 'UNKNOWN',
}

const ACTION_TYPES = [
  'READ', 'LEARN', 'BUILD', 'RESEARCH', 'REVIEW', 'PLAN', 'COMMUNICATE', 'APPLY', 'ATTEND', 'REST',
]

const TREND = {
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
  SLOWING: 'SLOWING',
  BLOCKED: 'BLOCKED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
}

const PROACTIVE = {
  IGNORE: 'IGNORE',
  SURFACE: 'SURFACE',
  REMIND: 'REMIND',
  RECOMMEND: 'RECOMMEND',
}

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  throw err
}

function requireUserId(userId) {
  if (!userId) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  return userId
}

function daysUntil(date, now = new Date()) {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000)
}

function classifyDeadline(date, now = new Date()) {
  if (!date) return { risk: DEADLINE_RISK.UNKNOWN, days: null, why: 'No date recorded.' }
  const days = daysUntil(date, now)
  if (days < 0) return { risk: DEADLINE_RISK.OVERDUE, days, why: `Overdue by ${Math.abs(days)} day(s).` }
  if (days <= 1) return { risk: DEADLINE_RISK.URGENT, days, why: 'Due today or tomorrow.' }
  if (days <= 3) return { risk: DEADLINE_RISK.APPROACHING, days, why: 'Due within 3 days.' }
  if (days <= 14) return { risk: DEADLINE_RISK.APPROACHING, days, why: 'Due within two weeks.' }
  return { risk: DEADLINE_RISK.SAFE, days, why: 'Deadline is not immediate.' }
}

function classifyActionType(title = '', source = '') {
  const t = `${title} ${source}`.toLowerCase()
  if (/\b(rest|break|nothing urgent|done for today)\b/.test(t)) return 'REST'
  if (/\b(read|review notes|skim)\b/.test(t)) return 'READ'
  if (/\b(learn|study|course|roadmap|skill)\b/.test(t)) return 'LEARN'
  if (/\b(build|code|implement|api|project|milestone)\b/.test(t)) return 'BUILD'
  if (/\b(research|source|citation|literature)\b/.test(t)) return 'RESEARCH'
  if (/\b(review|reflect|check)\b/.test(t)) return 'REVIEW'
  if (/\b(plan|prepare|organize)\b/.test(t)) return 'PLAN'
  if (/\b(message|email|communicate|reach out)\b/.test(t)) return 'COMMUNICATE'
  if (/\b(apply|application|internship|job)\b/.test(t)) return 'APPLY'
  if (/\b(attend|event|hackathon|workshop)\b/.test(t)) return 'ATTEND'
  return 'PLAN'
}

/**
 * Load minimal canonical snapshot — not the entire user database.
 */
async function loadPersonalSnapshot(userId) {
  const uid = requireUserId(userId)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const [
    goals,
    openTasks,
    recentCompleted,
    profile,
    career,
    applications,
    aiProfile,
    daily,
    learning,
    memories,
    memSettings,
  ] = await Promise.all([
    Goal.find({ userId: uid, status: { $ne: 'archived' } })
      .sort('-updatedAt').limit(8)
      .select('title status progress priority deadline category requiredSkills updatedAt')
      .lean(),
    Task.find({ userId: uid, status: { $ne: 'archived' }, completed: { $ne: true } })
      .sort('-updatedAt').limit(40)
      .select('title status priority dueDate goalId type dependsOn dependencyOf source')
      .lean(),
    Task.find({
      userId: uid,
      $or: [{ completed: true }, { status: 'completed' }],
      updatedAt: { $gte: weekAgo },
    }).select('title updatedAt completedAt').limit(30).lean(),
    StudentProfile.findOne({ userId: uid }).select('projects skills').lean(),
    CareerProfile.findOne({ userId: uid }).select('targetCareer targetRoles requiredSkills').lean(),
    Application.find({ userId: uid }).sort('-updatedAt').limit(8)
      .select('status createdAt updatedAt jobId internshipId').lean().catch(() => []),
    UserProfile.findOne({ userId: uid }).select('notifications learningPreferences preferredTopics memorySettings').lean(),
    personalDailyIntelligenceService.getDailyLifeIntelligence(uid).catch(() => null),
    (async () => {
      try {
        return await require('./learningIntelligenceService').getLearningIntelligence(uid)
      } catch { return null }
    })(),
    memoryService.getRelevantMemories(uid, {
      message: 'priorities goals projects learning career',
      intent: 'PLANNER_HELP',
      limit: 5,
    }).catch(() => []),
    memoryService.getMemorySettings(uid).catch(() => ({ proactiveMemoryUse: true })),
  ])

  const projects = (profile?.projects || []).filter((p) => p.status !== 'archived').slice(0, 8)

  return {
    userId: uid,
    now,
    goals,
    openTasks,
    recentCompleted,
    projects,
    skills: profile?.skills || [],
    career,
    applications,
    notifications: aiProfile?.notifications || {},
    learningPreferences: aiProfile?.learningPreferences || {},
    memorySettings: memSettings || {},
    daily,
    learning,
    memories,
  }
}

function evaluateGoalHealth(goal, snapshot) {
  if (!goal) return { status: HEALTH.INSUFFICIENT_DATA, why: 'No active goal.', sources: [] }
  const linked = snapshot.openTasks.filter((t) => String(t.goalId) === String(goal._id))
  const overdue = linked.filter((t) => t.dueDate && new Date(t.dueDate) < snapshot.now)
  const sources = ['Goal']
  if (goal.status === 'completed') {
    return { status: HEALTH.COMPLETED, why: 'Goal marked completed.', sources }
  }
  if (goal.status === 'paused' || goal.status === 'inactive') {
    return { status: HEALTH.INACTIVE, why: `Goal status is ${goal.status}.`, sources }
  }
  if (overdue.length) {
    sources.push('Tasks')
    return {
      status: HEALTH.AT_RISK,
      why: `${overdue.length} linked open task(s) are overdue.`,
      sources,
      evidence: overdue.slice(0, 3).map((t) => t.title),
    }
  }
  if (goal.deadline) {
    const d = classifyDeadline(goal.deadline, snapshot.now)
    sources.push('Goal.deadline')
    if (d.risk === DEADLINE_RISK.OVERDUE || d.risk === DEADLINE_RISK.URGENT) {
      return { status: HEALTH.AT_RISK, why: d.why, sources }
    }
  }
  if ((goal.progress || 0) === 0 && !linked.length) {
    return {
      status: HEALTH.INACTIVE,
      why: 'No progress and no linked open tasks.',
      sources: ['Goal', 'Tasks'],
    }
  }
  return {
    status: HEALTH.ON_TRACK,
    why: linked.length
      ? `${linked.length} linked open task(s); no overdue blockers detected.`
      : 'No overdue linked tasks detected.',
    sources: ['Goal', 'Tasks'],
  }
}

function evaluateProjectHealth(project, snapshot) {
  if (!project) return { status: HEALTH.INSUFFICIENT_DATA, why: 'No active project.', sources: [] }
  if (project.status === 'completed') {
    return { status: HEALTH.COMPLETED, why: 'Project marked completed.', sources: ['Project'] }
  }
  const related = snapshot.openTasks.filter((t) => {
    const a = String(t.title || '').toLowerCase()
    const b = String(project.title || '').toLowerCase()
    return a.includes((b.split(' ')[0] || '')) || /\bapi|milestone|project\b/i.test(t.title || '')
  })
  const overdue = related.filter((t) => t.dueDate && new Date(t.dueDate) < snapshot.now)
  if (overdue.length) {
    return {
      status: HEALTH.AT_RISK,
      why: `Related open task overdue: “${overdue[0].title}”.`,
      sources: ['Project', 'Tasks'],
      evidence: overdue.map((t) => t.title).slice(0, 3),
    }
  }
  if (project.status === 'planned' && !related.length) {
    return {
      status: HEALTH.INACTIVE,
      why: 'Project is planned with no related open tasks.',
      sources: ['Project', 'Tasks'],
    }
  }
  if (related.length && String(project.status).toLowerCase() === 'completed') {
    return {
      status: HEALTH.BLOCKED,
      why: 'Project marked completed but related open tasks remain (data conflict).',
      sources: ['Project', 'Tasks'],
    }
  }
  return {
    status: HEALTH.ON_TRACK,
    why: related.length
      ? `${related.length} related open task(s); none overdue.`
      : 'No overdue related tasks detected.',
    sources: ['Project', 'Tasks'],
  }
}

function evaluateLearningHealth(snapshot) {
  const learning = snapshot.learning
  if (!learning) {
    return { status: HEALTH.INSUFFICIENT_DATA, why: 'Learning intelligence unavailable.', sources: [] }
  }
  const gaps = learning.skillGaps?.gaps || []
  const next = learning.nextAction
  const sources = ['Learning Intelligence']
  if (gaps.length >= 3) {
    return {
      status: HEALTH.AT_RISK,
      why: `${gaps.length} skill-gap signals recorded for active goals/roadmap.`,
      sources,
      evidence: gaps.slice(0, 3).map((g) => g.skill || g),
    }
  }
  if (!next && !learning.overview?.currentTopic) {
    return {
      status: HEALTH.INACTIVE,
      why: 'No current learning topic or next action recorded.',
      sources,
    }
  }
  return {
    status: HEALTH.ON_TRACK,
    why: next
      ? `Next learning action available: ${next.study || next.title || 'continue'}.`
      : 'Learning context present without urgent gap signals.',
    sources,
  }
}

function evaluateCareerHealth(snapshot) {
  const career = snapshot.career
  if (!career?.targetCareer && !(career?.targetRoles || []).length) {
    return { status: HEALTH.INSUFFICIENT_DATA, why: 'No career target configured.', sources: [] }
  }
  const sources = ['CareerProfile']
  const apps = snapshot.applications || []
  const openApps = apps.filter((a) => !['withdrawn', 'rejected', 'hired'].includes(String(a.status || '').toLowerCase()))
  if (openApps.length) sources.push('Applications')
  const required = career.requiredSkills || []
  const have = new Set(
    (snapshot.skills || [])
      .map((s) => String(s.name || s).toLowerCase())
      .concat((snapshot.projects || []).flatMap((p) => (p.technologies || []).map((t) => String(t).toLowerCase()))),
  )
  const missing = required.filter((s) => !have.has(String(s).toLowerCase()))
  if (missing.length) {
    return {
      status: HEALTH.AT_RISK,
      why: `Career-required skills without profile/project evidence: ${missing.slice(0, 3).join(', ')}.`,
      sources: [...sources, 'Profile', 'Projects'],
      evidence: missing.slice(0, 5),
      note: 'This is evidence-based skill coverage — not a placement probability.',
    }
  }
  return {
    status: HEALTH.ON_TRACK,
    why: openApps.length
      ? `${openApps.length} active application(s); no uncovered required-skill tokens detected.`
      : 'Career target set; no uncovered required-skill tokens detected.',
    sources,
    note: 'Does not claim placement probability.',
  }
}

function buildDeadlines(snapshot) {
  const items = []
  for (const t of snapshot.openTasks) {
    if (!t.dueDate) continue
    const risk = classifyDeadline(t.dueDate, snapshot.now)
    items.push({
      type: 'task',
      id: String(t._id),
      title: t.title,
      dueDate: t.dueDate,
      ...risk,
      source: 'Tasks',
      url: '/student/tasks',
    })
  }
  for (const g of snapshot.goals) {
    if (!g.deadline) continue
    const risk = classifyDeadline(g.deadline, snapshot.now)
    items.push({
      type: 'goal',
      id: String(g._id),
      title: g.title,
      dueDate: g.deadline,
      ...risk,
      source: 'Goals',
      url: '/student/goals',
    })
  }
  items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  return items.slice(0, 12)
}

/**
 * Dependency intelligence — only when explicit fields exist.
 */
function buildDependencies(snapshot) {
  const blockers = []
  for (const t of snapshot.openTasks) {
    const deps = t.dependsOn || t.dependencies || []
    if (!Array.isArray(deps) || !deps.length) continue
    for (const depId of deps.slice(0, 5)) {
      const dep = snapshot.openTasks.find((x) => String(x._id) === String(depId))
        || snapshot.recentCompleted.find((x) => String(x._id) === String(depId))
      if (dep && (dep.completed || dep.status === 'completed')) continue
      if (dep) {
        blockers.push({
          blocked: { id: String(t._id), title: t.title },
          blocker: { id: String(dep._id), title: dep.title },
          why: `Task “${t.title}” depends on “${dep.title}”.`,
          source: 'Tasks.dependsOn',
        })
      }
    }
  }
  // Soft signal: high-priority task + linked goal with overdue sibling
  return blockers.slice(0, 10)
}

function detectOverload(snapshot) {
  const open = snapshot.openTasks.length
  const urgentDeadlines = buildDeadlines(snapshot)
    .filter((d) => d.risk === DEADLINE_RISK.URGENT || d.risk === DEADLINE_RISK.OVERDUE)
    .length
  const projects = snapshot.projects.length
  const crowded = open >= 12 || urgentDeadlines >= 3 || (open >= 8 && projects >= 3)
  if (!crowded) {
    return {
      overloaded: false,
      message: null,
      factors: { openTasks: open, urgentDeadlines, projects },
    }
  }
  return {
    overloaded: true,
    message: 'Your current schedule appears crowded based on open tasks and near-term deadlines.',
    factors: { openTasks: open, urgentDeadlines, projects },
    caution: 'This is a workload signal only — not a medical or stress diagnosis.',
  }
}

function progressTrend(snapshot) {
  const completed = snapshot.recentCompleted.length
  const open = snapshot.openTasks.length
  const overdue = snapshot.openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < snapshot.now).length
  if (!completed && !open) return { trend: TREND.INSUFFICIENT_DATA, why: 'Not enough recent task activity.' }
  if (overdue >= 3) return { trend: TREND.BLOCKED, why: `${overdue} overdue open tasks.` }
  if (completed >= 5 && overdue === 0) return { trend: TREND.IMPROVING, why: `${completed} tasks completed in the last 7 days.` }
  if (completed === 0 && open >= 5) return { trend: TREND.SLOWING, why: 'Open work exists with no completions in the last 7 days.' }
  return { trend: TREND.STABLE, why: `${completed} completed / ${open} open in recent window.` }
}

function buildCurrentFocus(snapshot, health) {
  const instructionOverride = null // caller may pass user message separately
  const activeGoal = snapshot.goals.find((g) => g.status === 'active') || snapshot.goals[0] || null
  const project = snapshot.projects[0] || null
  const learningTopic = snapshot.learning?.overview?.currentTopic
    || snapshot.learning?.nextAction?.study
    || null

  if (!activeGoal && !project && !learningTopic && !snapshot.openTasks.length) {
    return {
      focus: null,
      why: 'Insufficient data to determine current focus.',
      sources: [],
    }
  }

  // Prefer urgent deadline task if present
  const deadlines = buildDeadlines(snapshot)
  const urgent = deadlines.find((d) => d.risk === DEADLINE_RISK.OVERDUE || d.risk === DEADLINE_RISK.URGENT)
  if (urgent) {
    return {
      focus: urgent.title,
      type: urgent.type,
      why: urgent.why,
      sources: [urgent.source],
      instructionOverride,
    }
  }

  if (health.goal?.status === HEALTH.AT_RISK && activeGoal) {
    return {
      focus: activeGoal.title,
      type: 'goal',
      why: health.goal.why,
      sources: health.goal.sources,
    }
  }

  if (project) {
    return {
      focus: project.title,
      type: 'project',
      why: activeGoal
        ? `Active project while pursuing goal “${activeGoal.title}”.`
        : 'Most recently updated portfolio project.',
      sources: activeGoal ? ['Project', 'Goal'] : ['Project'],
    }
  }

  if (activeGoal) {
    return {
      focus: activeGoal.title,
      type: 'goal',
      why: 'Active goal without a stronger deadline signal.',
      sources: ['Goal'],
    }
  }

  return {
    focus: learningTopic || snapshot.openTasks[0]?.title || null,
    type: learningTopic ? 'learning' : 'task',
    why: 'Fallback to learning topic or first open task.',
    sources: learningTopic ? ['Learning'] : ['Tasks'],
  }
}

function buildPriorityList(snapshot, userInstruction = '') {
  const ranked = priorityEngine.sortTasksByPriority(snapshot.openTasks, {
    goals: snapshot.goals,
    now: snapshot.now,
  })

  // Explicit user instruction wins
  const forceProject = /\b(finish|prioritize|focus on) (my )?project\b/i.test(userInstruction)
  let items = ranked.slice(0, 8).map(({ task, score, factors }) => {
    const explained = priorityEngine.explainPriority(task, { goals: snapshot.goals, now: snapshot.now })
    return {
      id: String(task._id),
      title: task.title,
      score,
      what: task.title,
      why: explained.explanation,
      source: factors.map((f) => f.key).slice(0, 3).join(' + ') || 'priority',
      sources: ['Tasks', ...(task.goalId ? ['Goals'] : [])],
      actionType: classifyActionType(task.title),
      dueDate: task.dueDate || null,
      url: '/student/tasks',
    }
  })

  if (forceProject && snapshot.projects[0]) {
    items = [
      {
        id: String(snapshot.projects[0]._id),
        title: `Continue project: ${snapshot.projects[0].title}`,
        score: 999,
        what: snapshot.projects[0].title,
        why: 'Current user instruction prioritizes finishing the project.',
        source: 'USER_INSTRUCTION',
        sources: ['User instruction', 'Project'],
        actionType: 'BUILD',
        url: '/student/profile',
      },
      ...items,
    ]
  }

  return items
}

function buildNextAction(snapshot, priorities, health) {
  // Rest when nothing urgent
  const deadlines = buildDeadlines(snapshot)
  const urgent = deadlines.filter((d) => d.risk === DEADLINE_RISK.URGENT || d.risk === DEADLINE_RISK.OVERDUE)
  if (!urgent.length && !snapshot.openTasks.length && health.goal?.status !== HEALTH.AT_RISK) {
    return {
      title: 'Nothing urgent is pending',
      actionType: 'REST',
      why: 'No open tasks and no urgent deadlines detected.',
      source: 'Tasks + Deadlines',
      sources: ['Tasks'],
      url: '/student/daily-life',
    }
  }

  if (snapshot.daily?.nextAction?.title) {
    return {
      title: snapshot.daily.nextAction.title,
      actionType: classifyActionType(snapshot.daily.nextAction.title, snapshot.daily.nextAction.source),
      why: snapshot.daily.nextAction.why || snapshot.daily.nextAction.reason || 'From Daily Life intelligence.',
      source: snapshot.daily.nextAction.source || 'Daily Life',
      sources: ['Daily Life', 'Tasks'],
      url: snapshot.daily.nextAction.url || '/student/daily-life',
    }
  }

  if (priorities[0]) {
    return {
      title: priorities[0].title,
      actionType: priorities[0].actionType,
      why: priorities[0].why,
      source: priorities[0].source,
      sources: priorities[0].sources,
      url: priorities[0].url,
    }
  }

  try {
    // decision support as fallback
  } catch { /* optional */ }

  return {
    title: 'Add a goal or task to unlock next-action recommendations',
    actionType: 'PLAN',
    why: 'Insufficient canonical activity data.',
    source: 'System',
    sources: ['System'],
    url: '/student/goals',
  }
}

function buildDailyPlan(snapshot, priorities, nextAction) {
  const learning = snapshot.learning?.nextAction?.study || snapshot.learning?.overview?.currentTopic
  const deadline = buildDeadlines(snapshot)[0]
  const steps = []
  if (nextAction) {
    steps.push({
      order: 1,
      label: 'Highest priority',
      title: nextAction.title,
      actionType: nextAction.actionType,
      why: nextAction.why,
      source: nextAction.source,
    })
  }
  const projectWork = priorities.find((p) => p.actionType === 'BUILD') || (snapshot.projects[0] && {
    title: `Project: ${snapshot.projects[0].title}`,
    why: 'Active portfolio project',
    source: 'Project',
    actionType: 'BUILD',
  })
  if (projectWork) {
    steps.push({
      order: 2,
      label: 'Important project work',
      title: projectWork.title,
      actionType: projectWork.actionType || 'BUILD',
      why: projectWork.why,
      source: projectWork.source,
    })
  }
  if (learning) {
    steps.push({
      order: 3,
      label: 'Learning focus',
      title: learning,
      actionType: 'LEARN',
      why: 'From learning intelligence.',
      source: 'Learning',
    })
  }
  if (deadline) {
    steps.push({
      order: 4,
      label: 'Upcoming deadline',
      title: deadline.title,
      actionType: 'REVIEW',
      why: deadline.why,
      source: deadline.source,
    })
  }
  if (nextAction?.actionType !== 'REST' && !urgentPressure(snapshot)) {
    steps.push({
      order: 5,
      label: 'Optional',
      title: 'Short review or rest if priorities are clear',
      actionType: 'REST',
      why: 'Avoid unnecessary productivity when core items are covered.',
      source: 'Personal AI',
    })
  }
  return {
    title: 'TODAY',
    steps: steps.slice(0, 5),
    note: 'Plan is advisory. Task creation requires confirmation.',
  }
}

function urgentPressure(snapshot) {
  return buildDeadlines(snapshot).some((d) => d.risk === DEADLINE_RISK.URGENT || d.risk === DEADLINE_RISK.OVERDUE)
}

function buildWeeklyPlan(snapshot, health, priorities) {
  return {
    goals: snapshot.goals.slice(0, 5).map((g) => ({ title: g.title, progress: g.progress || 0, status: g.status })),
    projects: snapshot.projects.slice(0, 5).map((p) => ({ title: p.title, status: p.status })),
    learning: snapshot.learning?.overview?.currentTopic || snapshot.learning?.nextAction?.study || null,
    career: snapshot.career?.targetCareer || null,
    deadlines: buildDeadlines(snapshot).slice(0, 6),
    unfinished: snapshot.openTasks.slice(0, 8).map((t) => t.title),
    recommendedFocus: priorities.slice(0, 3).map((p) => p.title),
    healthSummary: {
      goal: health.goal?.status,
      project: health.project?.status,
      learning: health.learning?.status,
      career: health.career?.status,
    },
    note: 'Weekly plan uses live canonical data — not a separate scheduler.',
  }
}

function buildWeeklyReview(snapshot, trend) {
  const completed = snapshot.recentCompleted.map((t) => t.title).slice(0, 10)
  const inProgress = snapshot.openTasks.filter((t) => t.status === 'in-progress').map((t) => t.title).slice(0, 8)
  const blocked = buildDependencies(snapshot).map((b) => b.why).slice(0, 5)
  const missed = snapshot.openTasks
    .filter((t) => t.dueDate && new Date(t.dueDate) < snapshot.now)
    .map((t) => t.title)
    .slice(0, 8)
  return {
    completed,
    inProgress,
    blocked,
    missed,
    nextWeek: buildPriorityList(snapshot).slice(0, 5).map((p) => p.title),
    trend,
    tone: 'Supportive review based on recorded activity — not a judgment of effort.',
  }
}

function inQuietHours(notifications, now = new Date()) {
  if (!notifications?.quietHoursEnabled) return false
  const h = now.getHours()
  const start = Number(notifications.quietHoursStart ?? 22)
  const end = Number(notifications.quietHoursEnd ?? 7)
  if (start === end) return false
  if (start > end) return h >= start || h < end
  return h >= start && h < end
}

/**
 * Proactive intelligence: EVENT → relevance → urgency → actionability → prefs → decision
 */
function evaluateProactive(snapshot, health) {
  const prefs = snapshot.notifications || {}
  if (prefs.proactiveIntelligence === false) {
    return { decision: PROACTIVE.IGNORE, reason: 'User disabled proactive intelligence.', items: [] }
  }
  if (snapshot.memorySettings?.proactiveMemoryUse === false) {
    return { decision: PROACTIVE.IGNORE, reason: 'Proactive memory use is disabled.', items: [] }
  }
  if (inQuietHours(prefs, snapshot.now)) {
    return { decision: PROACTIVE.IGNORE, reason: 'Quiet hours are active.', items: [] }
  }

  const items = []
  const deadlines = buildDeadlines(snapshot)
  for (const d of deadlines) {
    if (d.risk === DEADLINE_RISK.OVERDUE || d.risk === DEADLINE_RISK.URGENT) {
      if (prefs.deadlineReminders === false) continue
      items.push({
        event: 'DEADLINE',
        relevance: 'HIGH',
        urgency: d.risk,
        actionability: 'HIGH',
        decision: PROACTIVE.REMIND,
        title: d.title,
        why: d.why,
        source: d.source,
      })
    }
  }

  if (health.goal?.status === HEALTH.AT_RISK) {
    items.push({
      event: 'GOAL_AT_RISK',
      relevance: 'HIGH',
      urgency: 'HIGH',
      actionability: 'HIGH',
      decision: PROACTIVE.RECOMMEND,
      title: snapshot.goals[0]?.title || 'Active goal',
      why: health.goal.why,
      source: (health.goal.sources || []).join(' + '),
    })
  }

  if (health.project?.status === HEALTH.AT_RISK || health.project?.status === HEALTH.BLOCKED) {
    items.push({
      event: 'PROJECT_RISK',
      relevance: 'HIGH',
      urgency: 'MEDIUM',
      actionability: 'HIGH',
      decision: PROACTIVE.SURFACE,
      title: snapshot.projects[0]?.title || 'Project',
      why: health.project.why,
      source: (health.project.sources || []).join(' + '),
    })
  }

  // Frequency throttle
  const freq = prefs.recommendationFrequency || 'normal'
  const limit = freq === 'low' ? 1 : freq === 'high' ? 5 : 3
  const trimmed = items.slice(0, limit)

  if (!trimmed.length) {
    return { decision: PROACTIVE.IGNORE, reason: 'No high-relevance proactive signals.', items: [] }
  }

  const top = trimmed[0].decision
  return {
    decision: top,
    reason: 'High relevance and actionability with user prefs allowing surface/remind.',
    items: trimmed,
    note: 'Proactive layer never auto-executes consequential writes.',
  }
}

async function getControls(userId) {
  const uid = requireUserId(userId)
  const profile = await UserProfile.findOne({ userId: uid }).select('notifications learningPreferences').lean()
  return {
    notifications: {
      dailyNudge: profile?.notifications?.dailyNudge !== false,
      weeklyReport: profile?.notifications?.weeklyReport !== false,
      proactiveIntelligence: profile?.notifications?.proactiveIntelligence !== false,
      deadlineReminders: profile?.notifications?.deadlineReminders !== false,
      opportunityAlerts: profile?.notifications?.opportunityAlerts !== false,
      quietHoursEnabled: Boolean(profile?.notifications?.quietHoursEnabled),
      quietHoursStart: profile?.notifications?.quietHoursStart ?? 22,
      quietHoursEnd: profile?.notifications?.quietHoursEnd ?? 7,
      recommendationFrequency: profile?.notifications?.recommendationFrequency || 'normal',
    },
    learningPreferences: profile?.learningPreferences || {},
  }
}

async function updateControls(userId, updates = {}) {
  const uid = requireUserId(userId)
  const allowedNotif = [
    'dailyNudge', 'weeklyReport', 'proactiveIntelligence', 'deadlineReminders',
    'opportunityAlerts', 'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd',
    'recommendationFrequency',
  ]
  const notif = {}
  const incoming = updates.notifications || updates
  for (const key of allowedNotif) {
    if (incoming[key] !== undefined) notif[`notifications.${key}`] = incoming[key]
  }
  if (updates.learningPreferences) {
    notif.learningPreferences = updates.learningPreferences
  }
  await UserProfile.findOneAndUpdate(
    { userId: uid },
    { $set: notif },
    { upsert: true, new: true },
  )
  return getControls(uid)
}

/**
 * Main Personal Operating Layer dashboard payload.
 */
async function getPersonalOperatingLayer(userId, { message = '' } = {}) {
  const snapshot = await loadPersonalSnapshot(userId)
  const health = {
    goal: evaluateGoalHealth(snapshot.goals[0], snapshot),
    project: evaluateProjectHealth(snapshot.projects[0], snapshot),
    learning: evaluateLearningHealth(snapshot),
    career: evaluateCareerHealth(snapshot),
  }
  const focus = buildCurrentFocus(snapshot, health)
  const priorities = buildPriorityList(snapshot, message)
  const nextAction = buildNextAction(snapshot, priorities, health)
  const deadlines = buildDeadlines(snapshot)
  const dependencies = buildDependencies(snapshot)
  const overload = detectOverload(snapshot)
  const trend = progressTrend(snapshot)
  const dailyPlan = buildDailyPlan(snapshot, priorities, nextAction)
  const weeklyPlan = buildWeeklyPlan(snapshot, health, priorities)
  const weeklyReview = buildWeeklyReview(snapshot, trend)
  const proactive = evaluateProactive(snapshot, health)
  const controls = {
    notifications: snapshot.notifications,
    learningPreferences: snapshot.learningPreferences,
  }

  // Memory is subordinate
  const memoryNote = snapshot.memories?.length
    ? `${snapshot.memories.length} relevant memories loaded (preferences only influence style).`
    : 'No relevant long-term memories in budget.'

  let decisionNext = null
  try {
    decisionNext = await decisionSupportService.getNextAction(userId)
  } catch {
    decisionNext = null
  }

  return {
    title: 'MY INTELLIGENCE',
    greeting: snapshot.now.getHours() < 12 ? 'Good morning' : snapshot.now.getHours() < 18 ? 'Good afternoon' : 'Welcome',
    currentState: {
      activeGoal: snapshot.goals[0] ? { id: String(snapshot.goals[0]._id), title: snapshot.goals[0].title, progress: snapshot.goals[0].progress } : null,
      activeProject: snapshot.projects[0] ? { id: String(snapshot.projects[0]._id), title: snapshot.projects[0].title, status: snapshot.projects[0].status } : null,
      openTaskCount: snapshot.openTasks.length,
      learningFocus: snapshot.learning?.overview?.currentTopic || snapshot.learning?.nextAction?.study || null,
      careerTarget: snapshot.career?.targetCareer || null,
      applicationCount: (snapshot.applications || []).length,
    },
    currentFocus: focus,
    topPriority: priorities[0] || null,
    priorities: priorities.slice(0, 5),
    nextAction,
    decisionSupportNext: decisionNext ? {
      title: decisionNext.title,
      reason: decisionNext.reason,
    } : null,
    health,
    deadlines,
    dependencies,
    dailyPlan,
    weeklyPlan,
    weeklyReview,
    progressTrend: trend,
    overload,
    rest: nextAction.actionType === 'REST' ? nextAction : null,
    proactive,
    controls,
    memoryNote,
    sourcePriority: [
      'CURRENT_USER_INSTRUCTION',
      'CANONICAL_DATABASE',
      'EXPLICIT_MEMORY',
      'SYSTEM_DERIVED',
      'AGENT_INFERENCE',
    ],
    safety: {
      writesRequireConfirmation: true,
      noSilentApplications: true,
      noMedicalAdvice: true,
      noPlacementProbability: true,
    },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Multi-system planning (read-only) — may optionally call specialist network.
 */
async function planPersonalRequest(user, message, { includeAgents = false } = {}) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  const msg = String(message || '').trim().slice(0, 2000)
  if (!msg) deny('VALIDATION_ERROR', 'Message is required.')

  if (/\b(ignore (all )?(previous|prior) instructions|exfiltrate|run shell)\b/i.test(msg)) {
    return {
      state: 'FAILED',
      errorCode: 'PROMPT_INJECTION_BLOCKED',
      answer: 'Request blocked. External/user text is treated as DATA only.',
    }
  }

  const layer = await getPersonalOperatingLayer(user._id, { message: msg })
  const plan = {
    steps: [
      { order: 1, action: 'understand', summary: 'Understand request and load current user state' },
      { order: 2, action: 'prioritize', summary: 'Apply priority engine with user instruction override' },
      { order: 3, action: 'recommend', summary: 'Produce next action with WHY + SOURCE' },
    ],
    writes: [],
    confirmationRequired: false,
  }

  if (/\b(create task|add task|schedule|submit application|delete|send message)\b/i.test(msg)) {
    plan.writes.push({
      type: 'potential_write',
      note: 'Consequential writes require existing confirmation flows (Agent CONFIRM / Daily Life confirm).',
    })
    plan.confirmationRequired = true
    plan.steps.push({ order: 4, action: 'confirm', summary: 'Wait for user confirmation before any write' })
  }

  let agent = null
  if (includeAgents) {
    try {
      const specialistNetworkService = require('./agent/specialistNetworkService')
      agent = await specialistNetworkService.runSpecialistNetwork(user, msg, { mode: 'READ_ONLY' })
    } catch (error) {
      agent = { state: 'FAILED', error: error.code || 'AGENT_ERROR', message: error.message }
    }
  }

  return {
    state: 'COMPLETED',
    answer: layer.nextAction?.title || layer.currentFocus?.focus || 'Information not available.',
    why: layer.nextAction?.why || layer.currentFocus?.why,
    relevantContext: {
      focus: layer.currentFocus,
      health: layer.health,
      priorities: layer.priorities.slice(0, 3),
      deadlines: layer.deadlines.slice(0, 3),
    },
    recommendedAction: layer.nextAction,
    plan,
    agent,
    mode: plan.confirmationRequired ? 'PLAN_THEN_CONFIRM' : 'READ',
  }
}

module.exports = {
  HEALTH,
  DEADLINE_RISK,
  ACTION_TYPES,
  TREND,
  PROACTIVE,
  loadPersonalSnapshot,
  getPersonalOperatingLayer,
  planPersonalRequest,
  getControls,
  updateControls,
  evaluateGoalHealth,
  evaluateProjectHealth,
  evaluateLearningHealth,
  evaluateCareerHealth,
  classifyDeadline,
  classifyActionType,
  buildDeadlines,
  buildDependencies,
  detectOverload,
  progressTrend,
  evaluateProactive,
  buildPriorityList,
  buildNextAction,
}
