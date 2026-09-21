/**
 * Continuous Cross-System Intelligence Orchestration (V4 Prompt 8).
 * Coordinates brain, decision, POL, memory, KG, events — not a new database.
 */
const mongoose = require('mongoose')
const limits = require('../config/intelligenceLimits')
const changeImpactService = require('./changeImpactService')
const intelligenceEventService = require('./intelligenceEventService')
const decisionIntelligenceService = require('./decisionIntelligenceService')
const aiCommandRouterService = require('./aiCommandRouterService')

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  throw err
}

function requireUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  }
  return String(userId)
}

async function safe(label, fn) {
  try {
    return { ok: true, label, data: await fn() }
  } catch (err) {
    return { ok: false, label, error: err.message || String(err) }
  }
}

/**
 * Assemble bounded cross-system context for AI / decisions.
 */
async function assembleContext(userId, { message = '', intent = 'PLANNING' } = {}) {
  const uid = requireUserId(userId)
  const parts = await Promise.all([
    safe('decision', () => require('./decisionSupportService').loadSnapshot(uid)),
    safe('memory', async () => {
      const memoryService = require('./memoryService')
      return memoryService.getRelevantMemories(uid, {
        message: message || 'priorities today',
        intent: intent === 'CAREER' ? 'CAREER_HELP' : intent === 'LEARNING' ? 'STUDY_HELP' : 'PLANNER_HELP',
        limit: 4,
        markUsed: false,
      })
    }),
    safe('graph', async () => {
      const kg = require('./knowledgeGraphService')
      if (!kg.isEnabled?.()) return { edges: [], enabled: false }
      return kg.getSummary?.(uid).catch(() => ({ edges: [], enabled: true }))
        || { enabled: true }
    }),
    safe('pol', () => require('./personalOperatingLayerService').getPersonalOperatingLayer(uid)),
  ])

  const by = Object.fromEntries(parts.map((p) => [p.label, p]))
  const snapshot = by.decision?.ok ? by.decision.data : null
  const memories = by.memory?.ok ? by.memory.data : []
  const pol = by.pol?.ok ? by.pol.data : null

  const entities = []
  if (snapshot?.goals?.[0]) {
    entities.push({
      type: 'goal',
      id: String(snapshot.goals[0]._id),
      title: snapshot.goals[0].title,
      priority: 1,
    })
  }
  for (const t of (snapshot?.tasks || []).filter((x) => !x.completed).slice(0, 5)) {
    entities.push({ type: 'task', id: String(t._id), title: t.title, priority: 2 })
  }
  for (const m of (memories || []).slice(0, 3)) {
    entities.push({ type: 'memory', id: m.id, title: m.content, priority: 3 })
  }

  return {
    priority: [
      'CURRENT_USER_REQUEST',
      'CURRENT_TASK',
      'CURRENT_GOAL',
      'RELEVANT_ENTITIES',
      'RECENT_EVENTS',
      'EXPLICIT_MEMORY',
    ],
    entities: entities.slice(0, limits.MAX_CONTEXT_ENTITIES),
    snapshot: snapshot
      ? {
        goalCount: snapshot.goals?.length || 0,
        openTasks: (snapshot.tasks || []).filter((t) => !t.completed && t.status !== 'completed').length,
        applications: snapshot.applications?.length || 0,
        reading: snapshot.reading?.length || 0,
      }
      : null,
    memories: memories || [],
    polSummary: pol
      ? {
        nextAction: pol.nextAction || pol.priority?.primary || null,
        health: pol.health || null,
        proactive: pol.proactive?.decision || null,
      }
      : null,
    graph: by.graph?.ok ? by.graph.data : null,
    failures: parts.filter((p) => !p.ok).map((p) => ({ source: p.label, error: p.error })),
    state: parts.every((p) => p.ok) ? 'SUCCESS' : parts.some((p) => p.ok) ? 'PARTIAL' : 'ERROR',
  }
}

/**
 * Cross-system insights with confidence + sources.
 */
async function buildInsights(userId) {
  const uid = requireUserId(userId)
  const insights = []

  const ctx = await assembleContext(uid, { message: 'cross system insights' })
  const snap = ctx.snapshot

  if (snap?.openTasks === 0 && snap?.goalCount > 0) {
    insights.push({
      text: 'You have active goals but no open tasks — define a next step to keep momentum.',
      confidence: 'HIGH',
      sources: [{ type: 'goal' }, { type: 'task' }],
    })
  }
  if (snap?.applications > 1) {
    insights.push({
      text: 'You have multiple applications in flight — focus on the nearest deadline first.',
      confidence: 'MEDIUM',
      sources: [{ type: 'application' }],
    })
  }

  try {
    const brain = require('./unifiedBrainService')
    const summary = await brain.getIntelligenceSummary(uid)
    if (summary?.recommendedNextAction?.title) {
      insights.push({
        text: `Recommended focus: ${summary.recommendedNextAction.title}${summary.why ? ` — ${summary.why}` : ''}`,
        confidence: 'HIGH',
        sources: [{ type: 'brain' }, ...(summary.goal ? [{ type: 'goal', title: summary.goal.title }] : [])],
      })
    }
    for (const c of (summary?.connections || []).slice(0, 3)) {
      const text = typeof c === 'string' ? c : (c.what || c.text || c.title)
      if (text) {
        insights.push({
          text,
          confidence: 'MEDIUM',
          sources: c.sources || [{ type: 'graph' }],
        })
      }
    }
  } catch { /* optional */ }

  try {
    const decisionSupport = require('./decisionSupportService')
    const snapshot = await decisionSupport.loadSnapshot(uid)
    const stalled = decisionSupport.detectStalledGoals(snapshot)
    for (const g of stalled.slice(0, 2)) {
      insights.push({
        text: `Goal "${g.title}" looks stalled — no recent task/roadmap activity.`,
        confidence: 'HIGH',
        sources: [{ type: 'goal', id: String(g._id), title: g.title }],
      })
    }
    const gaps = decisionSupport.detectRoadmapGaps(snapshot)
    for (const gap of gaps.slice(0, 2)) {
      insights.push({
        text: gap.suggestion,
        confidence: 'MEDIUM',
        sources: [{ type: 'skill', title: gap.skill }, { type: 'goal', title: gap.goalTitle }],
      })
    }
  } catch { /* optional */ }

  // Deduplicate by text
  const seen = new Set()
  const unique = []
  for (const i of insights) {
    const key = String(i.text).toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(i)
  }

  return {
    state: ctx.state,
    insights: unique.slice(0, limits.MAX_INSIGHTS),
    failures: ctx.failures,
  }
}

/**
 * Progress + bottleneck from live systems.
 */
async function getProgressIntelligence(userId) {
  const uid = requireUserId(userId)
  const failures = []
  let snapshot = null
  try {
    snapshot = await require('./decisionSupportService').loadSnapshot(uid)
  } catch (err) {
    failures.push({ source: 'snapshot', error: err.message })
  }

  const goals = snapshot?.goals || []
  const tasks = snapshot?.tasks || []
  const open = tasks.filter((t) => !t.completed && t.status !== 'completed')
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
  const completed = tasks.filter((t) => t.completed || t.status === 'completed')

  let bottleneck = null
  if (overdue.length) {
    bottleneck = {
      blocker: overdue[0].title,
      why: 'Overdue task is blocking timely progress.',
      nextAction: { title: `Complete: ${overdue[0].title}`, url: '/student/tasks' },
      confidence: 'HIGH',
    }
  } else {
    const stalled = snapshot
      ? require('./decisionSupportService').detectStalledGoals(snapshot)
      : []
    if (stalled[0]) {
      bottleneck = {
        blocker: stalled[0].title,
        why: 'Active goal with insufficient recent progress.',
        nextAction: { title: `Revive: ${stalled[0].title}`, url: `/student/goals?goalId=${stalled[0]._id}` },
        confidence: 'MEDIUM',
      }
    }
  }

  return {
    state: failures.length ? 'PARTIAL' : 'SUCCESS',
    completed: completed.length,
    inProgress: open.length,
    overdue: overdue.length,
    blocked: bottleneck ? 1 : 0,
    staleGoals: snapshot ? require('./decisionSupportService').detectStalledGoals(snapshot).length : 0,
    goals: goals.slice(0, 5).map((g) => ({
      id: String(g._id),
      title: g.title,
      status: g.status,
      progress: g.progress,
    })),
    bottleneck,
    failures,
  }
}

async function getDailyIntelligence(userId) {
  const uid = requireUserId(userId)
  const [decision, progress, pol, daily] = await Promise.all([
    safe('decision', () => decisionIntelligenceService.decide(uid, { question: 'What should I do today?', persist: false })),
    safe('progress', () => getProgressIntelligence(uid)),
    safe('pol', () => require('./personalOperatingLayerService').getPersonalOperatingLayer(uid)),
    safe('dailyLife', () => require('./personalDailyIntelligenceService').getDailyLifeIntelligence(uid)),
  ])

  return {
    state: [decision, progress, pol, daily].some((x) => x.ok) ? 'SUCCESS' : 'ERROR',
    primaryAction: decision.ok ? decision.data.primary : null,
    why: decision.ok ? decision.data.why : null,
    alternatives: decision.ok ? decision.data.alternatives : [],
    progress: progress.ok ? progress.data : null,
    notifications: (() => {
      if (!pol.ok) return []
      const items = pol.data?.proactive?.items
      return Array.isArray(items) ? items.slice(0, 3) : []
    })(),
    daily: daily.ok ? {
      nextAction: daily.data?.nextAction || null,
      risks: Array.isArray(daily.data?.risks) ? daily.data.risks.slice(0, 3) : [],
    } : null,
    failures: [decision, progress, pol, daily].filter((x) => !x.ok).map((x) => ({ source: x.label, error: x.error })),
  }
}

async function getWeeklyIntelligence(userId) {
  const uid = requireUserId(userId)
  const [brainWeekly, progress, insights] = await Promise.all([
    safe('weekly', () => require('./unifiedBrainService').getWeeklyIntelligence(uid)),
    safe('progress', () => getProgressIntelligence(uid)),
    safe('insights', () => buildInsights(uid)),
  ])

  return {
    state: [brainWeekly, progress, insights].some((x) => x.ok) ? 'SUCCESS' : 'ERROR',
    weekly: brainWeekly.ok ? brainWeekly.data : null,
    progress: progress.ok ? progress.data : null,
    insights: insights.ok ? insights.data.insights : [],
    nextFocus: (progress.ok && progress.data?.bottleneck?.nextAction) || null,
    failures: [brainWeekly, progress, insights].filter((x) => !x.ok).map((x) => ({ source: x.label, error: x.error })),
  }
}

/**
 * Process a domain event through impact → decision refresh → notify.
 */
async function processDomainEvent(userId, eventInput = {}, { io = null } = {}) {
  const uid = requireUserId(userId)
  return intelligenceEventService.publish(uid, eventInput, {
    io,
    processHook: async ({ impact }) => {
      if (!impact.recalculate?.includes('decision') && !impact.recalculate?.includes('insights')) {
        return { refreshed: false }
      }
      const decision = await decisionIntelligenceService.decide(uid, {
        question: `Event ${eventInput.eventType}`,
        persist: false,
      }).catch(() => null)
      return { refreshed: true, primary: decision?.primary?.title || null }
    },
  })
}

/**
 * Command Center aggregate payload.
 */
async function getCommandCenter(user, { includeHistory = true } = {}) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  const uid = String(user._id)

  const [daily, insights, progress, history, decisions] = await Promise.all([
    safe('daily', () => getDailyIntelligence(uid)),
    safe('insights', () => buildInsights(uid)),
    safe('progress', () => getProgressIntelligence(uid)),
    safe('history', () => includeHistory
      ? aiCommandRouterService.commandHistory(uid, { limit: 8 })
      : Promise.resolve([])),
    safe('decisions', () => decisionIntelligenceService.listDecisions(uid, { limit: 5 })),
  ])

  return {
    state: [daily, insights, progress].some((x) => x.ok) ? ( [daily, insights, progress].every((x) => x.ok) ? 'SUCCESS' : 'PARTIAL') : 'ERROR',
    quickCommands: aiCommandRouterService.QUICK_COMMANDS,
    today: daily.ok ? daily.data : null,
    insights: insights.ok ? insights.data.insights : [],
    progress: progress.ok ? progress.data : null,
    career: {
      hint: 'Use Find opportunities or Prepare application quick commands.',
      url: '/student/career',
    },
    learning: {
      hint: 'Use Learn next to prioritize skills against your active goal.',
      url: '/student/learn',
    },
    history: history.ok ? history.data : [],
    recentDecisions: decisions.ok ? decisions.data : [],
    failures: [daily, insights, progress, history, decisions]
      .filter((x) => !x.ok)
      .map((x) => ({ source: x.label, error: x.error })),
    offlineNote: process.env.OPENAI_API_KEY
      ? null
      : 'AI provider optional — deterministic intelligence remains available.',
  }
}

async function runCommand(user, message, options = {}) {
  return aiCommandRouterService.executeCommand(user, message, options)
}

module.exports = {
  assembleContext,
  buildInsights,
  getProgressIntelligence,
  getDailyIntelligence,
  getWeeklyIntelligence,
  processDomainEvent,
  getCommandCenter,
  runCommand,
  analyzeImpact: changeImpactService.analyzeImpact,
  MAX_CASCADE_DEPTH: limits.MAX_CASCADE_DEPTH,
}
