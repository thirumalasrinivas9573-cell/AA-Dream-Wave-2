const crypto = require('crypto')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const CareerProfile = require('../models/CareerProfile')
const Application = require('../models/Application')
const IntelligenceRecommendationState = require('../models/IntelligenceRecommendationState')
const priorityEngine = require('./priorityEngine')
const progressEngine = require('./progressEngine')
const scheduleEngine = require('./scheduleEngine')
const knowledgeGraphService = require('./knowledgeGraphService')
const academicService = require('./academicService')
const conceptMasteryService = require('./conceptMasteryService')

const RECOMMENDATION_TTL_MS = 6 * 60 * 60 * 1000
const STALLED_DAYS = 14

function fingerprint(type, targetEntity = {}) {
  const key = `${type}:${targetEntity.type || ''}:${targetEntity.id || targetEntity.title || ''}`
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)
}

async function loadSnapshot(userId) {
  const [goals, tasks, roadmaps, reading, career, applications, academicOverview, revisionQueue] = await Promise.all([
    Goal.find({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').limit(50).lean(),
    Task.find({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').limit(100).lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } }).populate('goalId', 'title category skills').limit(20).lean(),
    LibraryProgress.find({ userId, percent: { $gt: 0, $lt: 100 } })
      .populate({ path: 'bookId', match: { status: 'active' }, select: 'title author' })
      .sort('-lastReadAt').limit(5).lean(),
    CareerProfile.findOne({ userId }).select('targetCareer targetRoles requiredSkills currentSkills').lean(),
    Application.find({ studentId: userId }).sort('-updatedAt').limit(10).lean(),
    academicService.isEnabled() ? academicService.getOverview(userId).catch(() => null) : null,
    academicService.isEnabled() ? conceptMasteryService.getRevisionQueue(userId, { limit: 3 }).catch(() => []) : [],
  ])

  if (knowledgeGraphService.isEnabled()) {
    await knowledgeGraphService.syncFromCanonical(userId).catch(() => null)
  }

  return { goals, tasks, roadmaps, reading: reading.filter((r) => r.bookId), career, applications, academicOverview, revisionQueue }
}

function detectStalledGoals({ goals, tasks, roadmaps }) {
  const cutoff = Date.now() - STALLED_DAYS * 86400000
  return goals.filter((goal) => {
    if (goal.completed || goal.status === 'completed' || goal.status !== 'active') return false
    const updated = new Date(goal.updatedAt || goal.createdAt).getTime()
    if (updated > cutoff) return false
    const hasOpenTask = tasks.some((t) => String(t.goalId) === String(goal._id) && !t.completed && t.status !== 'completed')
    const hasRoadmap = roadmaps.some((r) => String(r.goalId?._id || r.goalId) === String(goal._id))
    return !hasOpenTask || !hasRoadmap
  })
}

function detectRoadmapGaps({ roadmaps, career, goals }) {
  const gaps = []
  const activeGoal = goals.find((g) => g.status === 'active' && !g.completed) || goals[0]
  if (!activeGoal) return gaps

  const requiredSkills = [
    ...(career?.requiredSkills || []).map((s) => s.name || s),
  ].map((s) => String(s).toLowerCase())

  const roadmap = roadmaps.find((r) => String(r.goalId?._id || r.goalId) === String(activeGoal._id))
  if (!roadmap || !requiredSkills.length) return gaps

  const stageText = (roadmap.learningStages || [])
    .flatMap((s) => [s.title, ...(s.topics || []), ...(s.skills || [])])
    .join(' ')
    .toLowerCase()

  for (const skill of [...new Set(requiredSkills)].slice(0, 5)) {
    if (!stageText.includes(skill)) {
      gaps.push({
        skill,
        goalTitle: activeGoal.title,
        suggestion: `Consider adding "${skill}" to your roadmap for "${activeGoal.title}".`,
      })
    }
  }
  return gaps.slice(0, 3)
}

async function filterDismissed(studentId, items) {
  const fps = items.map((item) => item.fingerprint)
  const states = await IntelligenceRecommendationState.find({
    studentId,
    fingerprint: { $in: fps },
    dismissedAt: { $ne: null },
  }).select('fingerprint').lean()
  const dismissed = new Set(states.map((s) => s.fingerprint))
  return items.filter((item) => !dismissed.has(item.fingerprint))
}

function buildNextBestAction(snapshot) {
  const { goals, tasks, roadmaps, reading, applications, academicOverview, revisionQueue } = snapshot

  if (academicOverview?.upcomingExam && academicOverview.upcomingExam.daysRemaining <= 2) {
    const exam = academicOverview.upcomingExam
    return {
      type: 'ACADEMIC',
      title: `Prepare for ${exam.name}`,
      reason: `Your exam is in ${exam.daysRemaining} day(s). Prioritize syllabus revision and weak concepts from your uploaded structure.`,
      priority: exam.daysRemaining <= 1 ? 'critical' : 'high',
      sourceSignals: ['Exam', 'Syllabus', 'Academic Intelligence'],
      targetEntity: { type: 'exam', id: exam.id },
      action: { label: 'Open subject workspace', url: `/student/academics/subjects/${exam.subjectId}` },
      fingerprint: fingerprint('ACADEMIC', { type: 'exam', id: exam.id }),
    }
  }

  if (revisionQueue?.[0]) {
    const rev = revisionQueue[0]
    return {
      type: 'ACADEMIC',
      title: `Revise ${rev.name}`,
      reason: rev.overdue
        ? 'This concept is overdue for revision based on your practice evidence.'
        : `Concept mastery level: ${rev.level}.`,
      priority: rev.overdue ? 'high' : 'normal',
      sourceSignals: ['Concept Mastery', 'Revision'],
      targetEntity: { type: 'concept', id: rev.id },
      action: { label: 'Open academics', url: '/student/academics' },
      fingerprint: fingerprint('ACADEMIC', { type: 'concept', id: rev.id }),
    }
  }

  if (academicOverview?.dueAssignment) {
    const assignment = academicOverview.dueAssignment
    return {
      type: 'ACADEMIC',
      title: assignment.title,
      reason: assignment.dueDate
        ? `Assignment due ${new Date(assignment.dueDate).toLocaleDateString()}.`
        : 'Pending academic assignment.',
      priority: 'high',
      sourceSignals: ['Assignment', 'Academic Intelligence'],
      targetEntity: { type: 'assignment', id: assignment.id },
      action: { label: 'View assignment', url: `/student/academics/subjects/${assignment.subjectId}` },
      fingerprint: fingerprint('ACADEMIC', { type: 'assignment', id: assignment.id }),
    }
  }

  const pending = tasks.filter((t) => !t.completed && t.status !== 'completed' && t.status !== 'archived')
  const context = { goals, roadmaps }
  const ranked = priorityEngine.sortTasksByPriority(pending, context)

  if (ranked[0]) {
    const { task } = ranked[0]
    const goal = goals.find((g) => String(g._id) === String(task.goalId))
    const roadmap = roadmaps.find((r) => String(r._id) === String(task.roadmapId))
    const overdue = priorityEngine.isOverdue(task)
    const reasonParts = []
    if (overdue) reasonParts.push('This task is overdue.')
    else if (task.dueDate) reasonParts.push(`Due ${new Date(task.dueDate).toLocaleDateString()}.`)
    if (goal) reasonParts.push(`Supports your goal "${goal.title}".`)
    if (roadmap?.goalId?.title) reasonParts.push(`Part of your ${roadmap.goalId.title} roadmap.`)

    return {
      type: 'NEXT_ACTION',
      title: task.title,
      reason: reasonParts.join(' ') || priorityEngine.explainPriority(task, context).primaryReason,
      priority: overdue ? 'critical' : (task.priority?.toLowerCase() || 'high'),
      sourceSignals: ['Task', goal ? 'Goal' : null, roadmap ? 'Roadmap' : null].filter(Boolean),
      targetEntity: { type: 'task', id: String(task._id) },
      action: { label: 'Open task', url: `/student/tasks?taskId=${task._id}` },
      fingerprint: fingerprint('NEXT_ACTION', { type: 'task', id: task._id }),
      expiresAt: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    }
  }

  const activeGoal = goals.find((g) => !g.completed && g.status === 'active') || goals.find((g) => !g.completed)
  if (activeGoal) {
    const nextStage = roadmaps
      .find((r) => String(r.goalId?._id || r.goalId) === String(activeGoal._id))
      ?.learningStages?.find((s) => s.status !== 'completed')
    if (nextStage) {
      return {
        type: 'NEXT_ACTION',
        title: `Continue: ${nextStage.title}`,
        reason: `Current roadmap stage for "${activeGoal.title}".`,
        priority: 'normal',
        sourceSignals: ['Goal', 'Roadmap'],
        targetEntity: { type: 'roadmap_stage', id: nextStage._id || nextStage.title },
        action: { label: 'Open roadmap', url: '/student/roadmap' },
        fingerprint: fingerprint('NEXT_ACTION', { type: 'roadmap_stage', title: nextStage.title }),
      }
    }
  }

  const continueBook = reading[0]
  if (continueBook?.bookId) {
    return {
      type: 'LEARNING',
      title: `Continue reading ${continueBook.bookId.title}`,
      reason: `You are ${Math.round(continueBook.percent || 0)}% through this book.`,
      priority: 'normal',
      sourceSignals: ['Library', 'Reading progress'],
      targetEntity: { type: 'book', id: String(continueBook.bookId._id) },
      action: { label: 'Continue reading', url: `/library/books/${continueBook.bookId._id}` },
      fingerprint: fingerprint('LEARNING', { type: 'book', id: continueBook.bookId._id }),
    }
  }

  const interviewApp = applications.find((a) => String(a.status || '').toLowerCase().includes('interview'))
  if (interviewApp) {
    return {
      type: 'CAREER',
      title: 'Prepare for upcoming interview',
      reason: `Application status: ${interviewApp.status}.`,
      priority: 'high',
      sourceSignals: ['Career', 'Application'],
      targetEntity: { type: 'application', id: String(interviewApp._id) },
      action: { label: 'View application', url: '/student/career/applications' },
      fingerprint: fingerprint('CAREER', { type: 'application', id: interviewApp._id }),
    }
  }

  if (activeGoal) {
    return {
      type: 'NEXT_ACTION',
      title: activeGoal.title,
      reason: 'Define your next task or continue your roadmap.',
      priority: 'low',
      sourceSignals: ['Goal'],
      targetEntity: { type: 'goal', id: String(activeGoal._id) },
      action: { label: 'Open goal', url: `/student/goals?goalId=${activeGoal._id}` },
      fingerprint: fingerprint('NEXT_ACTION', { type: 'goal', id: activeGoal._id }),
    }
  }

  return {
    type: 'NEXT_ACTION',
    title: 'Set your first goal',
    reason: 'Dream Wave connects goals, skills, learning, and career once you define a direction.',
    priority: 'normal',
    sourceSignals: ['Onboarding'],
    targetEntity: { type: 'goal', id: 'new' },
    action: { label: 'Create goal', url: '/student/goals' },
    fingerprint: fingerprint('NEXT_ACTION', { type: 'goal', id: 'new' }),
  }
}

async function buildRecommendations(studentId, snapshot, { types = null, limit = 8 } = {}) {
  const allowed = new Set(types || ['NEXT_ACTION', 'LEARNING', 'RESOURCE', 'CAREER', 'PROJECT', 'PRODUCTIVITY', 'ACADEMIC'])
  const items = []
  const seen = new Set()

  const push = (rec) => {
    if (!allowed.has(rec.type)) return
    if (seen.has(rec.fingerprint)) return
    seen.add(rec.fingerprint)
    items.push({ ...rec, createdAt: new Date().toISOString() })
  }

  push(buildNextBestAction(snapshot))

  const { goals, tasks, roadmaps, reading, career } = snapshot
  const stalled = detectStalledGoals(snapshot)
  for (const goal of stalled.slice(0, 2)) {
    push({
      type: 'PRODUCTIVITY',
      title: `Revive "${goal.title}"`,
      reason: `No recent progress in ${STALLED_DAYS}+ days. Create a next task or resume your roadmap.`,
      priority: 'normal',
      sourceSignals: ['Goal', 'Stalled detection'],
      targetEntity: { type: 'goal', id: String(goal._id) },
      action: { label: 'Open goal', url: `/student/goals?goalId=${goal._id}` },
      fingerprint: fingerprint('PRODUCTIVITY', { type: 'stalled_goal', id: goal._id }),
      expiresAt: new Date(Date.now() + RECOMMENDATION_TTL_MS).toISOString(),
    })
  }

  for (const gap of detectRoadmapGaps(snapshot)) {
    push({
      type: 'LEARNING',
      title: `Add ${gap.skill} to your roadmap`,
      reason: gap.suggestion,
      priority: 'normal',
      sourceSignals: ['Goal', 'Skill gap', 'Roadmap'],
      targetEntity: { type: 'skill', id: gap.skill },
      action: { label: 'Open roadmap', url: '/student/roadmap' },
      fingerprint: fingerprint('LEARNING', { type: 'roadmap_gap', id: gap.skill }),
      expiresAt: new Date(Date.now() + RECOMMENDATION_TTL_MS).toISOString(),
    })
  }

  const continueBook = reading[0]
  if (continueBook?.bookId) {
    const activeGoal = goals.find((g) => g.status === 'active')
    const stage = roadmaps[0]?.learningStages?.find((s) => s.status !== 'completed')
    push({
      type: 'RESOURCE',
      title: `Continue ${continueBook.bookId.title}`,
      reason: stage
        ? `Supports your current stage "${stage.title}"${activeGoal ? ` for ${activeGoal.title}` : ''}.`
        : `You already started this book (${Math.round(continueBook.percent || 0)}% complete).`,
      priority: 'normal',
      sourceSignals: ['Library', 'Reading progress', stage ? 'Roadmap' : null].filter(Boolean),
      targetEntity: { type: 'book', id: String(continueBook.bookId._id) },
      action: { label: 'Continue reading', url: `/library/books/${continueBook.bookId._id}` },
      fingerprint: fingerprint('RESOURCE', { type: 'book', id: continueBook.bookId._id }),
    })
  }

  if (career?.targetCareer || career?.targetRoles?.[0]) {
    const target = career.targetCareer || career.targetRoles[0]
    const currentSkills = new Set((career.currentSkills || []).map((s) => String(s.name || s).toLowerCase()))
    const missing = (career.requiredSkills || [])
      .map((s) => s.name || s)
      .filter((s) => !currentSkills.has(String(s).toLowerCase()))
      .slice(0, 1)
    if (missing[0]) {
      push({
        type: 'CAREER',
        title: `Build skill: ${missing[0]}`,
        reason: `"${missing[0]}" is required for your target role (${target}) but not yet in your skill profile.`,
        priority: 'normal',
        sourceSignals: ['Career Target', 'Skill gap'],
        targetEntity: { type: 'skill', id: missing[0].toLowerCase().replace(/\s+/g, '-') },
        action: { label: 'Open career hub', url: '/student/career' },
        fingerprint: fingerprint('CAREER', { type: 'skill_gap', id: missing[0] }),
      })
    }
  }

  const dueToday = tasks.filter((t) => {
    if (t.completed || t.status === 'completed') return false
    if (!t.dueDate) return false
    return scheduleEngine.dateKeyFromDate(new Date(t.dueDate)) === scheduleEngine.dateKeyFromDate()
  })
  for (const task of dueToday.slice(0, 2)) {
    push({
      type: 'PRODUCTIVITY',
      title: task.title,
      reason: 'Due today.',
      priority: 'high',
      sourceSignals: ['Task', 'Deadline'],
      targetEntity: { type: 'task', id: String(task._id) },
      action: { label: 'Open task', url: `/student/tasks?taskId=${task._id}` },
      fingerprint: fingerprint('PRODUCTIVITY', { type: 'due_today', id: task._id }),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    })
  }

  const { academicOverview, revisionQueue } = snapshot
  if (academicOverview?.upcomingExam) {
    const exam = academicOverview.upcomingExam
    push({
      type: 'ACADEMIC',
      title: `Exam prep: ${exam.name}`,
      reason: `${exam.daysRemaining} day(s) remaining. Study plan available from your syllabus.`,
      priority: exam.daysRemaining <= 3 ? 'high' : 'normal',
      sourceSignals: ['Exam', 'Syllabus'],
      targetEntity: { type: 'exam', id: exam.id },
      action: { label: 'Prepare', url: `/student/academics/subjects/${exam.subjectId}` },
      fingerprint: fingerprint('ACADEMIC', { type: 'exam_prep', id: exam.id }),
    })
  }
  for (const rev of (revisionQueue || []).slice(0, 2)) {
    push({
      type: 'ACADEMIC',
      title: `Revise ${rev.name}`,
      reason: rev.overdue ? 'Revision overdue.' : `Mastery: ${rev.level}.`,
      priority: rev.overdue ? 'high' : 'normal',
      sourceSignals: ['Concept', 'Revision'],
      targetEntity: { type: 'concept', id: rev.id },
      action: { label: 'Revise', url: '/student/academics' },
      fingerprint: fingerprint('ACADEMIC', { type: 'revision', id: rev.id }),
    })
  }

  const filtered = await filterDismissed(studentId, items)
  const now = Date.now()
  return filtered
    .filter((item) => !item.expiresAt || new Date(item.expiresAt).getTime() > now)
    .slice(0, limit)
}

function enrichDailyBrief(brief, snapshot, nextAction) {
  if (!brief || !nextAction) return brief
  const lines = [...(brief.highlights || [])]
  if (nextAction.reason && nextAction.title) {
    const contextual = `Recommended next: ${nextAction.title} — ${nextAction.reason}`
    if (!lines.some((l) => l.includes(nextAction.title))) lines.unshift(contextual)
  }
  const { academicOverview } = snapshot
  if (academicOverview?.upcomingExam && lines.length < 6) {
    const exam = academicOverview.upcomingExam
    lines.push(`Upcoming exam: ${exam.name} in ${exam.daysRemaining} day(s).`)
  }
  if (academicOverview?.dueAssignment && lines.length < 6) {
    lines.push(`Assignment due: ${academicOverview.dueAssignment.title}.`)
  }
  const activeGoal = snapshot.goals.find((g) => g.status === 'active' && !g.completed)
  const stage = snapshot.roadmaps
    .find((r) => String(r.goalId?._id || r.goalId) === String(activeGoal?._id))
    ?.learningStages?.find((s) => s.status !== 'completed')
  if (stage && activeGoal && lines.length < 6) {
    lines.push(`Current learning focus: ${stage.title} (supports "${activeGoal.title}").`)
  }
  return {
    ...brief,
    highlights: lines.slice(0, 6),
    summary: lines.join(' '),
    relationshipAware: true,
    source: brief.source || 'deterministic',
  }
}

async function dismissRecommendation(studentId, fp) {
  return IntelligenceRecommendationState.findOneAndUpdate(
    { studentId, fingerprint: fp },
    { $set: { dismissedAt: new Date() } },
    { upsert: true, new: true },
  )
}

async function feedbackRecommendation(studentId, fp, feedback) {
  if (!['helpful', 'not_relevant'].includes(feedback)) {
    throw Object.assign(new Error('Invalid feedback'), { statusCode: 400, code: 'INVALID_FEEDBACK' })
  }
  return IntelligenceRecommendationState.findOneAndUpdate(
    { studentId, fingerprint: fp },
    { $set: { feedback, dismissedAt: feedback === 'not_relevant' ? new Date() : null } },
    { upsert: true, new: true },
  )
}

async function getNextAction(studentId) {
  const snapshot = await loadSnapshot(studentId)
  const action = buildNextBestAction(snapshot)
  const filtered = await filterDismissed(studentId, [action])
  return filtered[0] || action
}

async function getRecommendations(studentId, options = {}) {
  const snapshot = await loadSnapshot(studentId)
  return buildRecommendations(studentId, snapshot, options)
}

module.exports = {
  loadSnapshot,
  buildNextBestAction,
  buildRecommendations,
  getNextAction,
  getRecommendations,
  enrichDailyBrief,
  dismissRecommendation,
  feedbackRecommendation,
  detectStalledGoals,
  detectRoadmapGaps,
  fingerprint,
}
