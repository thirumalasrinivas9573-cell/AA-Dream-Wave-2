const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryBook = require('../models/LibraryBook')
const UserProfile = require('../models/UserProfile')
const StudentProfile = require('../models/StudentProfile')
const Job = require('../models/Job')
const Internship = require('../models/Internship')
const CompanyProfile = require('../models/CompanyProfile')
const progressEngine = require('./progressEngine')
const ScheduleItem = require('../models/ScheduleItem')
const FocusSession = require('../models/FocusSession')
const PlannerPreferences = require('../models/PlannerPreferences')

const MAX_CONTEXT_CHARS = 4200

const KEYWORDS = {
  goals: /\b(goal|objective|target|milestone|progress)\b/i,
  tasks: /\b(task|todo|deadline|due|priority|today|plan my day|plan day|study tonight|focus|schedule|planner|postpone)\b/i,
  roadmaps: /\b(roadmap|stage|next step|learning path|path)\b/i,
  library: /\b(book|read|library|resource|pdf|chapter|study material)\b/i,
  career: /\b(career|job|internship|interview|salary|role|hire|apply|resume)\b/i,
  skills: /\b(skill|learn|study|practice|concept|explain|topic)\b/i,
  planner: /\b(planner|schedule|focus session|study plan|time block|weekly plan|today'?s plan)\b/i,
}

const ACTION_SOURCES = {
  'plan-day': ['tasks', 'goals', 'roadmaps', 'planner'],
  'help-goal': ['goals', 'tasks', 'roadmaps'],
  'review-progress': ['goals', 'tasks', 'roadmaps'],
  'recommend-next': ['goals', 'tasks', 'roadmaps', 'library'],
  'recommend-books': ['library', 'goals'],
  'help-career': ['career', 'skills', 'goals'],
  'break-task': ['tasks', 'planner'],
  'improve-roadmap': ['roadmaps', 'goals'],
  'research-topic': ['library', 'skills'],
}

async function loadPlannerContext(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const [schedule, prefs, focus, weekFocus] = await Promise.all([
    ScheduleItem.find({ userId, scheduledDate: today, status: { $nin: ['cancelled'] } })
      .select('title startTime endTime durationMinutes status taskId priorityReason')
      .sort({ startTime: 1 })
      .limit(8)
      .lean(),
    PlannerPreferences.findOne({ userId }).select('availableTodayMinutes sessionLengthMinutes preferredStudyTime').lean(),
    FocusSession.findOne({ userId, status: { $in: ['active', 'paused'] } }).select('taskId status startedAt timerMode').lean(),
    FocusSession.find({ userId, status: 'completed', endedAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
      .select('durationSeconds endedAt')
      .lean(),
  ])
  const focusMinutes = Math.round(weekFocus.reduce((s, f) => s + (f.durationSeconds || 0), 0) / 60)
  return { schedule, prefs, focus, focusMinutesWeek: focusMinutes, today }
}

function buildPlannerBlock({ schedule, prefs, focus, focusMinutesWeek, today }) {
  const lines = [`Today's date: ${today}`]
  if (prefs?.availableTodayMinutes) lines.push(`Available study time today: ~${prefs.availableTodayMinutes} min`)
  if (schedule.length) {
    lines.push(`Today's schedule:\n${formatList(schedule, (i) => `- ${i.startTime || '?'}–${i.endTime || '?'} "${i.title}" · ${i.status}${i.priorityReason ? ` · ${i.priorityReason}` : ''}`)}`)
  } else {
    lines.push('Today\'s schedule: nothing planned yet.')
  }
  if (focus) lines.push('Focus session: active')
  if (focusMinutesWeek) lines.push(`Focus time this week: ${focusMinutesWeek} min`)
  return lines.join('\n')
}

function truncate(text, max = 900) {
  const value = String(text || '').trim()
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function formatList(items, mapper, limit = 5) {
  return items.slice(0, limit).map(mapper).join('\n')
}

async function loadGoals(userId) {
  return Goal.find({ userId, status: { $ne: 'archived' } })
    .select('title category progress status priority deadline')
    .sort('-updatedAt')
    .limit(6)
    .lean()
}

async function loadTasks(userId) {
  return Task.find({ userId, status: { $ne: 'archived' } })
    .select('title status priority dueDate completed category')
    .sort('-updatedAt')
    .limit(12)
    .lean()
}

async function loadRoadmaps(userId) {
  return Roadmap.find({ userId, status: { $ne: 'archived' } })
    .populate('goalId', 'title')
    .select('status progress learningStages goalId')
    .sort('-updatedAt')
    .limit(4)
    .lean()
}

async function loadReading(userId) {
  const progress = await LibraryProgress.find({ userId, percent: { $gt: 0 } })
    .populate({ path: 'bookId', match: { status: 'active' }, select: 'title author category _id' })
    .sort('-lastReadAt')
    .limit(5)
    .lean()
  return progress.filter((item) => item.bookId)
}

async function loadCareerContext(userId) {
  const [aiProfile, studentProfile, approvedCompanies] = await Promise.all([
    UserProfile.findOne({ userId }).select('targetRole currentRole skills careerPreferences preferredTopics').lean(),
    StudentProfile.findOne({ userId }).select('skills headline').lean(),
    CompanyProfile.find({ status: 'approved', isPublic: true }).distinct('_id'),
  ])
  const filter = {
    companyId: { $in: approvedCompanies },
    status: 'open',
    $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: new Date() } }],
  }
  const [jobs, internships] = await Promise.all([
    Job.find(filter).select('title location workMode skills').sort('-createdAt').limit(4).lean(),
    Internship.find(filter).select('title location duration skills').sort('-createdAt').limit(4).lean(),
  ])
  return { aiProfile, studentProfile, jobs, internships }
}

async function loadProfileBasics(userId) {
  return UserProfile.findOne({ userId })
    .select('tone targetRole currentRole interests preferredTopics learningPreferences explanationDepth')
    .lean()
}

function resolveSources(message, mentorMode = 'general', action = '') {
  const sources = new Set(['profile'])
  if (action && ACTION_SOURCES[action]) {
    ACTION_SOURCES[action].forEach((item) => sources.add(item))
  }
  if (mentorMode === 'study' || mentorMode === 'learning') sources.add('library').add('skills')
  if (mentorMode === 'goal') sources.add('goals').add('tasks').add('roadmaps')
  if (mentorMode === 'career') sources.add('career').add('skills')
  if (mentorMode === 'project') sources.add('goals').add('tasks').add('roadmaps')
  if (mentorMode === 'research') sources.add('library').add('skills')

  Object.entries(KEYWORDS).forEach(([source, pattern]) => {
    if (pattern.test(message || '')) sources.add(source)
  })

  if (/\bplan my day\b/i.test(message || '') || action === 'plan-day') {
    sources.add('tasks').add('goals').add('roadmaps').add('planner')
  }
  if (/\b(focus|schedule|planner|study tonight|one hour)\b/i.test(message || '')) {
    sources.add('planner')
  }

  return [...sources]
}

function buildGoalsBlock(goals) {
  if (!goals.length) return 'Active goals: none set yet.'
  return `Active goals:\n${formatList(goals, (g) => `- "${g.title}" (${g.category || 'general'}) · ${g.progress || 0}% · ${g.status}${g.deadline ? ` · due ${new Date(g.deadline).toISOString().slice(0, 10)}` : ''}`)}`
}

function buildTasksBlock(tasks) {
  const pending = tasks.filter((item) => !item.completed && item.status !== 'completed')
  if (!pending.length) return 'Pending tasks: none currently open.'
  return `Pending tasks:\n${formatList(pending, (t) => `- "${t.title}" · ${t.priority || 'medium'} · ${t.status}${t.dueDate ? ` · due ${new Date(t.dueDate).toISOString().slice(0, 10)}` : ''}`)}`
}

function buildRoadmapsBlock(roadmaps) {
  if (!roadmaps.length) return 'Roadmaps: none created yet.'
  return roadmaps.map((item) => {
    const stages = (item.learningStages || []).slice(0, 4)
    const next = stages.find((stage) => stage.status !== 'completed') || stages[0]
    return `- "${item.goalId?.title || 'Roadmap'}" · ${item.progress?.percent || 0}% · next: ${next?.title || 'start first stage'}`
  }).join('\n')
}

function buildLibraryBlock(reading) {
  if (!reading.length) return 'Reading progress: no active books.'
  return `Reading progress:\n${formatList(reading, (item) => `- "${item.bookId.title}" by ${item.bookId.author || 'Unknown'} · ${Math.round(item.percent || 0)}% · /library/books/${item.bookId._id}`)}`
}

function buildCareerBlock({ aiProfile, studentProfile, jobs, internships }) {
  const skills = [
    ...(studentProfile?.skills || []).map((item) => item.name),
    ...(aiProfile?.skills || []),
  ].filter(Boolean).slice(0, 8)
  const lines = [
    aiProfile?.targetRole ? `Target role: ${aiProfile.targetRole}` : null,
    aiProfile?.currentRole ? `Current role/context: ${aiProfile.currentRole}` : null,
    skills.length ? `Skills: ${skills.join(', ')}` : null,
    jobs.length ? `Open jobs (public):\n${formatList(jobs, (j) => `- ${j.title} · ${j.location || j.workMode || 'open'} · /companies/jobs/${j._id}`)}` : null,
    internships.length ? `Open internships (public):\n${formatList(internships, (i) => `- ${i.title} · ${i.duration || i.location || 'open'} · /companies/internships/${i._id}`)}` : null,
  ].filter(Boolean)
  return lines.join('\n') || 'Career context: no target role set yet.'
}

function buildProfileBlock(profile) {
  if (!profile) return 'Student preferences: default tone and depth.'
  return [
    profile.tone ? `Preferred tone: ${profile.tone}` : null,
    profile.learningPreferences?.sessionLengthMinutes ? `Preferred session length: ${profile.learningPreferences.sessionLengthMinutes} min` : null,
    profile.preferredTopics?.length ? `Preferred topics: ${profile.preferredTopics.slice(0, 6).join(', ')}` : null,
    profile.interests?.length ? `Interests: ${profile.interests.slice(0, 6).join(', ')}` : null,
  ].filter(Boolean).join('\n') || 'Student preferences: not configured yet.'
}

async function buildMentorContext(userId, { message = '', mentorMode = 'general', action = '', sourcesOverride = null, priorityMode = 'standard' } = {}) {
  const sources = Array.isArray(sourcesOverride) && sourcesOverride.length
    ? sourcesOverride
    : resolveSources(message, mentorMode, action)

  // High-priority sources first so truncation keeps the most useful signal
  const HIGH = ['goals', 'tasks', 'roadmaps', 'planner']
  const MEDIUM = ['library', 'career', 'skills', 'profile']
  const ordered = [
    ...HIGH.filter((s) => sources.includes(s)),
    ...MEDIUM.filter((s) => sources.includes(s)),
    ...sources.filter((s) => !HIGH.includes(s) && !MEDIUM.includes(s)),
  ]

  const charBudget = priorityMode === 'minimal' ? Math.min(MAX_CONTEXT_CHARS, 2800) : MAX_CONTEXT_CHARS
  const blocks = []
  const loaded = {}

  for (const source of ordered) {
    if (source === 'profile') {
      loaded.profile = await loadProfileBasics(userId)
      blocks.push(`STUDENT PROFILE\n${buildProfileBlock(loaded.profile)}`)
    }
    if (source === 'goals') {
      loaded.goals = await loadGoals(userId)
      // Prefer active goals in the text block (high priority)
      const prioritizedGoals = [
        ...loaded.goals.filter((g) => g.status === 'active'),
        ...loaded.goals.filter((g) => g.status !== 'active'),
      ]
      blocks.push(`GOALS\n${buildGoalsBlock(prioritizedGoals)}`)
      const primaryGoal = prioritizedGoals.find((item) => item.status === 'active') || prioritizedGoals[0]
      if (primaryGoal) {
        const [nextAction, review] = await Promise.all([
          progressEngine.getNextBestAction(primaryGoal._id, userId),
          progressEngine.computeGoalProgress(primaryGoal._id, userId),
        ])
        if (nextAction) {
          blocks.push(`NEXT BEST ACTION\n- ${nextAction.title} (${nextAction.type}) · ${nextAction.reason}`)
        }
        if (review?.breakdown) {
          blocks.push(`GOAL PROGRESS BREAKDOWN\n- Overall: ${review.percent}% · milestones ${review.breakdown.milestones ?? 'n/a'}% · tasks ${review.breakdown.tasks ?? 'n/a'}% · roadmap ${review.breakdown.roadmap ?? 'n/a'}%`)
        }
      }
    }
    if (source === 'tasks') {
      loaded.tasks = await loadTasks(userId)
      const pending = loaded.tasks.filter((item) => !item.completed && item.status !== 'completed')
      const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
      const orderedTasks = [
        ...overdue,
        ...pending.filter((t) => !overdue.includes(t)),
      ]
      blocks.push(`TASKS\n${buildTasksBlock(orderedTasks.length ? orderedTasks : loaded.tasks)}`)
    }
    if (source === 'roadmaps') {
      loaded.roadmaps = await loadRoadmaps(userId)
      blocks.push(`ROADMAPS\n${buildRoadmapsBlock(loaded.roadmaps)}`)
    }
    if (source === 'library') {
      loaded.reading = await loadReading(userId)
      blocks.push(`LIBRARY\n${buildLibraryBlock(loaded.reading)}`)
    }
    if (source === 'career' || source === 'skills') {
      if (!loaded.career) {
        loaded.career = await loadCareerContext(userId)
        blocks.push(`CAREER\n${buildCareerBlock(loaded.career)}`)
      }
    }
    if (source === 'planner') {
      loaded.planner = await loadPlannerContext(userId)
      blocks.push(`STUDY PLANNER\n${buildPlannerBlock(loaded.planner)}`)
    }
  }

  let contextText = blocks.join('\n\n')
  if (contextText.length > charBudget) {
    contextText = `${contextText.slice(0, charBudget)}\n[context truncated for efficiency]`
  }

  return {
    sources: ordered,
    contextText,
    loaded,
    dataConfidence: {
      profile: loaded.profile ? 'system_record' : 'none',
      goals: loaded.goals?.length ? 'system_record' : 'none',
      tasks: loaded.tasks?.length ? 'system_record' : 'none',
      roadmaps: loaded.roadmaps?.length ? 'system_record' : 'none',
      library: loaded.reading?.length ? 'system_record' : 'none',
      career: loaded.career ? 'system_record' : 'none',
      planner: loaded.planner ? 'system_record' : 'none',
    },
  }
}

module.exports = {
  buildMentorContext,
  resolveSources,
  MAX_CONTEXT_CHARS,
}
