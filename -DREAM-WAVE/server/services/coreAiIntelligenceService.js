/**
 * Dream Wave Core AI Intelligence pipeline (Thirumala V3).
 *
 * Canonical orchestration for authenticated mentor / context requests.
 * Reuses studentContextEngine + mentorContextEngine + decisionSupport.
 * Does NOT merge MJ architecture.
 *
 * Pipeline: request → auth userId → intent → prioritized context → reasoning aids → actions
 */
const studentContextEngine = require('./studentContextEngine')
const mentorContextEngine = require('./mentorContextEngine')
const knowledgeGraphService = require('./knowledgeGraphService')
const decisionSupportService = require('./decisionSupportService')

/** Prompt-aligned intents (aliases normalize to engine intents). */
const CORE_INTENTS = [
  'GENERAL_CHAT',
  'GOAL_HELP',
  'TASK_HELP',
  'LEARNING_HELP',
  'ROADMAP_HELP',
  'PROJECT_HELP',
  'RESEARCH_HELP',
  'CAREER_HELP',
  'RESOURCE_HELP',
  'DAILY_PLAN',
  'PROGRESS_REVIEW',
  'MEMORY_REVIEW',
  'FORGET_MEMORY',
  'REMEMBER_EXPLICIT',
]

const INTENT_ALIASES = {
  GENERAL_CHAT: 'GENERAL_MENTOR',
  GENERAL_MENTOR: 'GENERAL_MENTOR',
  LEARNING_HELP: 'STUDY_HELP',
  LEARNING_NEXT: 'STUDY_HELP',
  LEARNING_PLAN: 'STUDY_HELP',
  SKILL_GAP: 'STUDY_HELP',
  TOPIC_EXPLANATION: 'STUDY_HELP',
  RESOURCE_RECOMMENDATION: 'LIBRARY_HELP',
  REVISION_PLAN: 'STUDY_HELP',
  PROJECT_LEARNING: 'PROJECT_HELP',
  EXAM_PREPARATION: 'ACADEMIC_HELP',
  STUDY_HELP: 'STUDY_HELP',
  RESOURCE_HELP: 'LIBRARY_HELP',
  LIBRARY_HELP: 'LIBRARY_HELP',
  DAILY_PLAN: 'PLANNER_HELP',
  PLANNER_HELP: 'PLANNER_HELP',
  PROGRESS_REVIEW: 'PROGRESS_REVIEW',
  ROADMAP_REVIEW: 'ROADMAP_HELP',
  GOAL_HELP: 'GOAL_HELP',
  TASK_HELP: 'TASK_HELP',
  ROADMAP_HELP: 'ROADMAP_HELP',
  PROJECT_HELP: 'PROJECT_HELP',
  RESEARCH_HELP: 'RESEARCH_HELP',
  CAREER_HELP: 'CAREER_HELP',
  ACADEMIC_HELP: 'ACADEMIC_HELP',
  PROFILE_HELP: 'PROFILE_HELP',
  SEARCH_HELP: 'SEARCH_HELP',
  MEMORY_REVIEW: 'MEMORY_REVIEW',
  FORGET_MEMORY: 'FORGET_MEMORY',
  REMEMBER_EXPLICIT: 'REMEMBER_EXPLICIT',
}

const PUBLIC_INTENT = {
  GENERAL_MENTOR: 'GENERAL_CHAT',
  STUDY_HELP: 'LEARNING_HELP',
  LIBRARY_HELP: 'RESOURCE_HELP',
  PLANNER_HELP: 'DAILY_PLAN',
  PROGRESS_REVIEW: 'PROGRESS_REVIEW',
  GOAL_HELP: 'GOAL_HELP',
  TASK_HELP: 'TASK_HELP',
  ROADMAP_HELP: 'ROADMAP_HELP',
  PROJECT_HELP: 'PROJECT_HELP',
  RESEARCH_HELP: 'RESEARCH_HELP',
  CAREER_HELP: 'CAREER_HELP',
  ACADEMIC_HELP: 'LEARNING_HELP',
  PROFILE_HELP: 'GENERAL_CHAT',
  SEARCH_HELP: 'RESOURCE_HELP',
  MEMORY_REVIEW: 'MEMORY_REVIEW',
  FORGET_MEMORY: 'FORGET_MEMORY',
  REMEMBER_EXPLICIT: 'REMEMBER_EXPLICIT',
}

function detectCoreIntent(message = '', options = {}) {
  const { mentorMode = 'general', action = '' } = options
  const memoryService = require('./memoryService')
  const memIntent = memoryService.detectMemoryIntent(message)
  if (memIntent) return memIntent
  if (action === 'plan-day') return 'DAILY_PLAN'
  if (action === 'review-progress') return 'PROGRESS_REVIEW'
  if (action === 'help-goal') return 'GOAL_HELP'
  if (action === 'help-career') return 'CAREER_HELP'
  if (action === 'recommend-books') return 'RESOURCE_HELP'
  if (action === 'learning-next' || action === 'recommend-next') return 'LEARNING_HELP'
  if (action === 'skill-gap') return 'LEARNING_HELP'
  if (action === 'next-action' || action === 'gap-review' || action === 'progress-risk') return 'DAILY_PLAN'
  if (/\b(what should i do now|falling behind|what am i missing)\b/i.test(message)) {
    return 'DAILY_PLAN'
  }
  if (/\b(what should i learn|learn next|skill gap|learning plan)\b/i.test(message)) {
    return 'LEARNING_HELP'
  }
  if (/\b(what should i (do|work on) today|plan my day|today'?s (plan|priority)|daily plan)\b/i.test(message)) {
    return 'DAILY_PLAN'
  }
  if (/\b(progress review|how am i doing|review my progress|weekly review)\b/i.test(message)) {
    return 'PROGRESS_REVIEW'
  }
  const engineIntent = studentContextEngine.routeIntent(message, { mentorMode, action })
  return PUBLIC_INTENT[engineIntent] || 'GENERAL_CHAT'
}

function toEngineIntent(coreIntent) {
  return INTENT_ALIASES[coreIntent] || INTENT_ALIASES.GENERAL_CHAT
}

function prioritizeLoaded(loaded = {}, intent = 'GENERAL_CHAT') {
  const high = {}
  const medium = {}
  const low = {}

  const goals = loaded.goals || []
  const tasks = (loaded.tasks || []).filter((t) => !t.completed && t.status !== 'completed')
  const activeGoal = goals.find((g) => g.status === 'active') || goals[0] || null
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
  const dueSoon = tasks.filter((t) => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate).getTime()
    const now = Date.now()
    return due >= now && due <= now + 3 * 86400000
  })

  high.activeGoal = activeGoal
  high.priorityTasks = (overdue.length ? overdue : dueSoon.length ? dueSoon : tasks).slice(0, 5)
  high.currentRoadmap = (loaded.roadmaps || [])[0] || null
  high.currentReading = (loaded.reading || [])[0] || null
  high.careerTarget = loaded.career?.aiProfile?.targetRole || null
  high.plannerToday = loaded.planner?.schedule || []

  if (intent === 'CAREER_HELP') {
    high.skills = [
      ...(loaded.career?.studentProfile?.skills || []).map((s) => s.name),
      ...(loaded.career?.aiProfile?.skills || []),
    ].filter(Boolean).slice(0, 8)
    medium.openJobs = (loaded.career?.jobs || []).slice(0, 3)
  }

  medium.recentGoals = goals.slice(0, 4)
  medium.recentTasks = tasks.slice(0, 8)
  medium.reading = (loaded.reading || []).slice(0, 3)
  medium.research = loaded.research || null
  medium.academics = loaded.academics || null

  low.olderGoals = goals.slice(4)
  low.completedHint = (loaded.tasks || []).filter((t) => t.completed || t.status === 'completed').length

  return { high, medium, low }
}

function buildActionRecommendations(prioritized, intent, nextAction, loaded = {}) {
  const recommendations = []
  const { high } = prioritized

  if (nextAction?.title) {
    recommendations.push({
      type: 'next_action',
      label: nextAction.title,
      reason: nextAction.reason || 'Highest leverage action from your current data',
      url: nextAction.url || null,
      priority: 'high',
    })
  }
  if (high.priorityTasks?.[0]) {
    const task = high.priorityTasks[0]
    recommendations.push({
      type: 'create_or_continue_task',
      label: `Work on: ${task.title}`,
      reason: task.dueDate ? `Due ${new Date(task.dueDate).toISOString().slice(0, 10)}` : 'Open task on your list',
      url: '/student/tasks',
      priority: 'high',
    })
  }
  if (high.activeGoal && ['GOAL_HELP', 'DAILY_PLAN', 'PROGRESS_REVIEW', 'GENERAL_CHAT'].includes(intent)) {
    recommendations.push({
      type: 'continue_goal',
      label: `Continue goal: ${high.activeGoal.title}`,
      reason: `Progress ${high.activeGoal.progress || 0}%`,
      url: `/student/goals?goalId=${high.activeGoal._id}`,
      priority: 'high',
    })
  }
  if (high.currentRoadmap && ['ROADMAP_HELP', 'LEARNING_HELP', 'DAILY_PLAN'].includes(intent)) {
    recommendations.push({
      type: 'continue_roadmap',
      label: 'Continue roadmap',
      reason: 'Active learning path available',
      url: `/student/roadmap?goalId=${high.currentRoadmap.goalId?._id || high.currentRoadmap.goalId || ''}`,
      priority: 'medium',
    })
  }
  if (high.currentReading && ['RESOURCE_HELP', 'LEARNING_HELP', 'DAILY_PLAN'].includes(intent)) {
    recommendations.push({
      type: 'open_resource',
      label: `Continue reading: ${high.currentReading.bookId?.title || 'book'}`,
      reason: `${Math.round(high.currentReading.percent || 0)}% complete`,
      url: `/library/books/${high.currentReading.bookId?._id}`,
      priority: 'medium',
    })
  }
  const learningNext = loaded?.learningIntelligence?.nextAction
  if (learningNext && ['LEARNING_HELP', 'ROADMAP_HELP', 'DAILY_PLAN', 'PROGRESS_REVIEW', 'GENERAL_CHAT'].includes(intent)) {
    recommendations.push({
      type: 'learning_next',
      label: learningNext.study ? `Study: ${learningNext.study}` : learningNext.title,
      reason: learningNext.why || 'Next best learning action from your real progress',
      url: learningNext.url || '/student/intelligence',
      priority: 'high',
    })
  }
  if (intent === 'CAREER_HELP') {
    recommendations.push({
      type: 'career_action',
      label: 'Open Career Hub',
      reason: high.careerTarget ? `Aligned to ${high.careerTarget}` : 'Review roles and applications',
      url: '/student/career',
      priority: 'medium',
    })
  }
  if (intent === 'RESEARCH_HELP' || intent === 'PROJECT_HELP') {
    recommendations.push({
      type: intent === 'RESEARCH_HELP' ? 'continue_research' : 'continue_project',
      label: intent === 'RESEARCH_HELP' ? 'Open research workspace' : 'Open projects / portfolio',
      reason: 'Continue where your current work lives',
      url: intent === 'RESEARCH_HELP' ? '/student/research' : '/student/profile',
      priority: 'medium',
    })
  }

  return recommendations.slice(0, 5)
}

function buildUiSuggestions(prioritized, recommendations, mentorMode) {
  const fromRecs = recommendations
    .filter((item) => item.url)
    .map((item) => ({ label: item.label.slice(0, 48), url: item.url }))

  const fallback = []
  if (prioritized.high.activeGoal) {
    fallback.push({
      label: 'Open top goal',
      url: `/student/goals?goalId=${prioritized.high.activeGoal._id}`,
    })
  }
  if (prioritized.high.priorityTasks?.length) fallback.push({ label: 'Open tasks', url: '/student/tasks' })
  if (prioritized.high.currentRoadmap) {
    fallback.push({
      label: 'View roadmap',
      url: `/student/roadmap?goalId=${prioritized.high.currentRoadmap.goalId?._id || prioritized.high.currentRoadmap.goalId || ''}`,
    })
  }
  if (prioritized.high.currentReading?.bookId?._id) {
    fallback.push({
      label: 'Continue reading',
      url: `/library/books/${prioritized.high.currentReading.bookId._id}`,
    })
  }
  if (mentorMode === 'career') fallback.push({ label: 'Career hub', url: '/student/career' })
  if (mentorMode !== 'general') fallback.push({ label: 'AI Home', url: '/student/intelligence' })

  const merged = [...fromRecs, ...fallback]
  const seen = new Set()
  return merged.filter((item) => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  }).slice(0, 4)
}

/**
 * Build full Core AI context for an authenticated student.
 * @param {import('mongoose').Types.ObjectId|string} userId — MUST come from JWT/session, never client body
 */
async function buildCoreAiContext(userId, options = {}) {
  if (!userId) {
    const err = new Error('Authenticated user required')
    err.code = 'AUTH_REQUIRED'
    throw err
  }

  const {
    message = '',
    mentorMode = 'general',
    action = '',
    budget = 4200,
    includeNextAction = true,
  } = options

  const coreIntent = detectCoreIntent(message, { mentorMode, action })
  const engineIntent = toEngineIntent(coreIntent)

  // Prefer V3 student context when intelligence graph is enabled; otherwise V2 mentor context.
  let contextText = ''
  let sources = []
  let loaded = {}
  let dataConfidence = {}
  let intent = engineIntent
  let layers = []
  let provenance = []

  if (knowledgeGraphService.isEnabled()) {
    const v3 = await studentContextEngine.buildStudentContext(userId, {
      message,
      mentorMode,
      action,
      budget,
      includeGraph: true,
      forcedIntent: engineIntent,
    })
    contextText = v3.text
    sources = (v3.provenance || []).map((p) => p.source)
    loaded = v3.loaded || {}
    dataConfidence = v3.dataConfidence || {}
    intent = v3.intent || engineIntent
    layers = v3.layers || []
    provenance = v3.provenance || []
  } else {
    const mentorSources = mentorContextEngine.resolveSources(message, mentorMode, action)
    const v2 = await mentorContextEngine.buildMentorContext(userId, {
      message,
      mentorMode,
      action,
      sourcesOverride: mentorSources,
    })
    contextText = v2.contextText
    sources = v2.sources
    loaded = v2.loaded || {}
    dataConfidence = v2.dataConfidence || {}
    intent = engineIntent
    layers = studentContextEngine.layersForIntent(engineIntent)
  }

  // If V3 path did not attach loaded entities, hydrate lightly for action suggestions only.
  if (!loaded.goals && !loaded.tasks) {
    const hydrateSources = sources.length ? sources : ['goals', 'tasks', 'roadmaps']
    const hydrate = await mentorContextEngine.buildMentorContext(userId, {
      message,
      mentorMode,
      action,
      sourcesOverride: hydrateSources.filter((s) => ['profile', 'goals', 'tasks', 'roadmaps', 'library', 'career', 'skills', 'planner'].includes(s)),
    })
    loaded = { ...hydrate.loaded, ...loaded }
    if (!contextText) contextText = hydrate.contextText
    if (!sources.length) sources = hydrate.sources
    dataConfidence = { ...hydrate.dataConfidence, ...dataConfidence }
  }

  const prioritized = prioritizeLoaded(loaded, coreIntent)

  let nextAction = null
  
  if (includeNextAction) {
    try {
      const decision = await decisionSupportService.getNextAction(userId)
      if (decision) {
        nextAction = {
          title: decision.title || 'Continue your top priority',
          reason: decision.reason || '',
          type: decision.type || 'NEXT_ACTION',
          url: decision.action?.url || decision.url || null,
          label: decision.action?.label || null,
        }
      }
    } catch {
      nextAction = null
    }
  }

  const recommendations = buildActionRecommendations(prioritized, coreIntent, nextAction, loaded)
  const suggestions = buildUiSuggestions(prioritized, recommendations, mentorMode)
  const publicIntent = PUBLIC_INTENT[intent] || coreIntent

  return {
    intent: publicIntent,
    engineIntent: intent,
    layers,
    sources,
    provenance,
    contextText,
    contextUsed: sources,
    loaded,
    prioritized,
    dataConfidence,
    recommendations,
    memoryTransparency: loaded.memoryTransparency || null,
    nextAction: nextAction || (recommendations[0]
      ? {
          title: recommendations[0].label,
          reason: recommendations[0].reason,
          type: recommendations[0].type,
          url: recommendations[0].url || null,
        }
      : null),
    suggestions,
    budgetUsed: (contextText || '').length,
    generatedAt: new Date().toISOString(),
  }
}

module.exports = {
  CORE_INTENTS,
  detectCoreIntent,
  toEngineIntent,
  prioritizeLoaded,
  buildActionRecommendations,
  buildCoreAiContext,
}
