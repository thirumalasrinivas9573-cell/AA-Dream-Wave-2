/**
 * Lasya V5 Prompt 2 — Context Intelligence + Personalization Engine
 * Composes UserProfile, Career Copilot, Opportunity Matching, MJ Memory — no duplicates.
 */
const mongoose = require('mongoose')
const UserProfile = require('../models/UserProfile')
const PersonalizationPreference = require('../models/PersonalizationPreference')
const RecommendationFeedback = require('../models/RecommendationFeedback')
const {
  CONTEXT_LAYERS,
  CONTEXT_PRIORITIES,
  CONTEXT_EXPIRATION,
  CONTEXT_SOURCES,
  CONTEXT_BUDGET,
  DASHBOARD_MODES,
  PROTECTED_INFERENCE_BLOCKLIST,
  FEEDBACK_TYPES,
} = require('../constants/contextPersonalization')
const careerCopilot = require('./careerCopilotService')
const { buildOpportunityContext } = require('./opportunityContextService')
const { getStudentFeed } = require('./opportunityMatchingService')
const execIntel = require('./executiveDecisionSupportService')

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /modify\s+permissions/i,
  /modify\s+personalization/i,
]

function sanitizeText(text = '') {
  let str = String(text || '').slice(0, 2000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

function isProtectedInference(text) {
  return PROTECTED_INFERENCE_BLOCKLIST.some((p) => p.test(String(text || '')))
}

function sourceLabel(source) {
  return CONTEXT_SOURCES.includes(source) ? source : 'SYSTEM_INFERENCE'
}

async function getOrCreatePreferences(userId) {
  let prefs = await PersonalizationPreference.findOne({ ownerUserId: userId })
  if (!prefs) {
    prefs = await PersonalizationPreference.create({ ownerUserId: userId })
  }
  return prefs
}

function pruneExpiredTemporary(prefs) {
  const now = Date.now()
  prefs.temporaryContext = (prefs.temporaryContext || []).filter(
    (t) => t.expiresAt && new Date(t.expiresAt).getTime() > now,
  )
  if (prefs.sessionContext?.expiresAt && new Date(prefs.sessionContext.expiresAt).getTime() <= now) {
    prefs.sessionContext = {
      page: '',
      entityType: '',
      entityId: '',
      task: '',
      currentInstruction: '',
      expiresAt: null,
    }
  }
  return prefs
}

async function loadMjPreferences(userId) {
  const MJPreference = mongoose.models.MJPreference
  if (!MJPreference) return []
  return MJPreference.find({ userId, archived: { $ne: true } })
    .select('category key value visibility updatedAt')
    .sort({ updatedAt: -1 })
    .limit(CONTEXT_BUDGET.MAX_MEMORY_ITEMS)
    .lean()
}

function buildKnowledgeGraphSignals(careerCtx, oppCtx) {
  const signals = []
  const goal = careerCtx?.careerGoal || oppCtx?.careerGoal
  if (goal) {
    signals.push({
      type: 'CareerGoal',
      value: goal,
      source: sourceLabel('GOAL'),
      layer: 'CAREER',
    })
  }
  for (const skill of (careerCtx?.topSkills || oppCtx?.skills || []).slice(0, 6)) {
    signals.push({
      type: 'Skill',
      value: typeof skill === 'string' ? skill : skill.name || skill.skill,
      source: sourceLabel('PROFILE'),
      layer: 'CAREER',
    })
  }
  for (const project of (oppCtx?.projects || []).slice(0, 3)) {
    signals.push({
      type: 'Project',
      value: project.title || project.name,
      source: sourceLabel('PROJECT'),
      layer: 'PROJECT',
    })
  }
  return signals
}

function inferDashboardMode(careerState) {
  if (careerState === 'APPLYING' || careerState === 'INTERVIEWING') return 'APPLYING'
  if (careerState === 'BUILDING' || careerState === 'PREPARING') return 'LEARNING'
  if (careerState === 'EXPLORING' || careerState === 'INSUFFICIENT_DATA') return 'EXPLORING'
  return 'DEFAULT'
}

function rankSignals(signals) {
  const priorityMap = Object.fromEntries(CONTEXT_PRIORITIES.map((p, i) => [p, i]))
  return signals
    .sort((a, b) => (priorityMap[a.priority] ?? 99) - (priorityMap[b.priority] ?? 99))
    .slice(0, CONTEXT_BUDGET.MAX_SIGNALS)
}

function buildExplanation(rec) {
  const bullets = []
  if (rec.careerGoal) bullets.push(`You selected ${rec.careerGoal} as your current career goal.`)
  if (rec.skillMatch) bullets.push(`The role matches your ${rec.skillMatch} evidence.`)
  if (rec.deadline) bullets.push(`The deadline is ${rec.deadline}.`)
  if (rec.reason) bullets.push(rec.reason)
  if (rec.source) bullets.push(`Based on ${rec.source.replace(/_/g, ' ').toLowerCase()}.`)
  return bullets.slice(0, CONTEXT_BUDGET.MAX_EXPLANATION_BULLETS)
}

function isDismissed(prefs, key) {
  return (prefs.dismissedRecommendations || []).some((d) => d.key === key)
}

async function filterRecommendations(recs, prefs, userId) {
  const filtered = []
  for (const rec of recs) {
    const key = rec.id || rec.key || `${rec.type}:${rec.title}`
    if (isDismissed(prefs, key)) continue
    const notRelevant = await RecommendationFeedback.findOne({
      ownerUserId: userId,
      recommendationKey: key,
      feedback: 'NOT_RELEVANT',
    }).lean()
    if (notRelevant) continue
    const category = (rec.category || rec.type || 'career').toLowerCase()
    const cats = prefs.recommendationCategories
    if (cats && cats.get && cats.get(category) === false) continue
    filtered.push({ ...rec, key, explanation: buildExplanation(rec) })
  }
  return filtered.slice(0, CONTEXT_BUDGET.MAX_RECOMMENDATIONS)
}

async function buildStudentContext(userId, prefs, options = {}) {
  const [hub, oppCtx, feed, mjPrefs] = await Promise.all([
    careerCopilot.getCareerHub(userId).catch(() => null),
    buildOpportunityContext(userId),
    getStudentFeed(userId, { limit: CONTEXT_BUDGET.MAX_OPPORTUNITIES }).catch(() => ({ items: [] })),
    loadMjPreferences(userId),
  ])

  const profile = hub?.userProfile || oppCtx?.profile || null
  const careerGoal = hub?.targetRole || hub?.careerGoal || oppCtx?.careerGoal || profile?.targetRole || ''
  const careerState = hub?.careerState || 'INSUFFICIENT_DATA'
  const dashboardMode = options.dashboardMode || inferDashboardMode(careerState)

  const session = prefs.sessionContext?.page ? {
    page: prefs.sessionContext.page,
    entityType: prefs.sessionContext.entityType,
    entityId: prefs.sessionContext.entityId,
    task: prefs.sessionContext.task,
    currentInstruction: prefs.sessionContext.currentInstruction,
    source: sourceLabel('EXPLICIT_USER'),
    priority: 'SESSION',
  } : null

  const signals = rankSignals([
    ...(session ? [session] : []),
    ...(prefs.temporaryContext || []).map((t) => ({
      key: t.key,
      value: t.value,
      source: sourceLabel(t.source),
      priority: 'TASK',
      layer: 'TEMPORARY',
    })),
    ...(prefs.explicitPreferences || []).map((p) => ({
      key: p.key,
      value: p.value,
      source: sourceLabel('EXPLICIT_USER'),
      priority: 'EXPLICIT_PREFERENCE',
      layer: 'MEMORY',
    })),
    ...buildKnowledgeGraphSignals(hub || {}, oppCtx),
    ...(mjPrefs || []).map((m) => ({
      key: m.key,
      value: m.value,
      source: sourceLabel('MEMORY'),
      priority: 'AUTHORIZED_MEMORY',
      layer: 'MEMORY',
    })),
    {
      key: 'careerGoal',
      value: careerGoal || 'UNKNOWN',
      source: careerGoal ? sourceLabel('GOAL') : sourceLabel('PROFILE'),
      priority: 'CURRENT_GOAL',
      layer: 'CAREER',
    },
    {
      key: 'careerState',
      value: careerState,
      source: sourceLabel('ACTIVITY'),
      priority: 'RECENT_ACTIVITY',
      layer: 'CAREER',
    },
  ])

  const recommendations = hub
    ? await filterRecommendations(
        (hub.recommendations || []).map((r) => ({
          ...r,
          careerGoal,
          category: (r.type || 'career').toLowerCase(),
        })),
        prefs,
        userId,
      )
    : []

  const opportunities = (feed.items || []).slice(0, CONTEXT_BUDGET.MAX_OPPORTUNITIES).map((o) => ({
    ...o,
    explanation: buildExplanation({
      careerGoal,
      skillMatch: o.matchReason || o.topSkill,
      deadline: o.deadline || o.closingDate,
      source: 'OPPORTUNITY',
    }),
  }))

  return {
    layers: CONTEXT_LAYERS,
    identity: { userId: String(userId), role: 'student' },
    role: { role: 'student', permissions: ['student'] },
    session: session || null,
    career: {
      goal: careerGoal || 'UNKNOWN',
      state: careerState,
      readiness: hub?.readiness || null,
      topSkills: hub?.topSkills?.slice(0, 8) || oppCtx?.skills?.slice(0, 8) || [],
      source: sourceLabel('GOAL'),
    },
    learning: {
      weeklyPlan: hub?.weeklyPlan || null,
      dailyFocus: hub?.dailyFocus || null,
      source: sourceLabel('LEARNING'),
    },
    projects: {
      items: oppCtx?.projects?.slice(0, 5) || [],
      source: sourceLabel('PROJECT'),
    },
    opportunities: { items: opportunities, source: sourceLabel('OPPORTUNITY') },
    memory: {
      authorized: mjPrefs.length,
      items: mjPrefs.map((m) => ({
        key: m.key,
        value: m.value,
        source: sourceLabel('MEMORY'),
        visibility: m.visibility || 'private',
      })),
    },
    signals,
    recommendations,
    dashboardMode,
    dataLimitations: hub?.dataLimitations || (careerGoal ? [] : ['INSUFFICIENT_DATA — no explicit career goal']),
    refreshedAt: new Date().toISOString(),
  }
}

async function buildInstitutionContext(userId, orgId, prefs) {
  const overview = orgId
    ? await execIntel.getExecutiveOverview(orgId, {}).catch(() => null)
    : null

  return {
    layers: CONTEXT_LAYERS,
    identity: { userId: String(userId), role: 'institution' },
    role: { role: 'institution', organizationId: orgId ? String(orgId) : null },
    session: prefs.sessionContext?.page ? prefs.sessionContext : null,
    analytics: overview ? {
      summary: overview.summary,
      metrics: overview.metrics?.slice(0, 6) || [],
      source: sourceLabel('ACTIVITY'),
    } : { summary: null, source: sourceLabel('SYSTEM_INFERENCE') },
    dashboardMode: prefs.dashboardMode || 'DEFAULT',
    priorities: DASHBOARD_MODES.institution.DEFAULT,
    signals: rankSignals([
      {
        key: 'ecosystemHealth',
        value: overview?.summary?.headline || 'Review ecosystem metrics',
        source: sourceLabel('ACTIVITY'),
        priority: 'RECENT_ACTIVITY',
        layer: 'CAREER',
      },
    ]),
    recommendations: [],
    dataLimitations: overview ? [] : ['INSUFFICIENT_DATA — institution scope unavailable'],
    refreshedAt: new Date().toISOString(),
  }
}

async function buildCompanyContext(userId, orgId, prefs) {
  return {
    layers: CONTEXT_LAYERS,
    identity: { userId: String(userId), role: 'company' },
    role: { role: 'company', organizationId: orgId ? String(orgId) : null },
    session: prefs.sessionContext?.page ? prefs.sessionContext : null,
    dashboardMode: 'DEFAULT',
    priorities: DASHBOARD_MODES.company.DEFAULT,
    signals: [],
    recommendations: [],
    dataLimitations: [],
    refreshedAt: new Date().toISOString(),
  }
}

async function buildUserContext(userId, role, options = {}) {
  const prefs = pruneExpiredTemporary(await getOrCreatePreferences(userId))
  await prefs.save()

  if (role === 'student') return buildStudentContext(userId, prefs, options)
  if (role === 'institution') return buildInstitutionContext(userId, options.organizationId, prefs)
  if (role === 'company') return buildCompanyContext(userId, options.organizationId, prefs)

  const err = new Error('Unsupported role for personalization context')
  err.statusCode = 403
  throw err
}

async function getContextForAgent(userId, role, { intent, query, organizationId } = {}) {
  const safeQuery = sanitizeText(query)
  const ctx = await buildUserContext(userId, role, { organizationId })

  const bounded = {
    intent: intent || null,
    query: safeQuery,
    role,
    careerGoal: ctx.career?.goal,
    careerState: ctx.career?.state,
    topSkills: ctx.career?.topSkills?.slice(0, 6) || [],
    sessionTask: ctx.session?.task || ctx.session?.currentInstruction || null,
    opportunityCount: ctx.opportunities?.items?.length || 0,
    signals: ctx.signals.slice(0, 12),
    dataLimitations: ctx.dataLimitations || [],
  }

  if (role === 'institution') {
    bounded.organizationId = organizationId
    bounded.analyticsSummary = ctx.analytics?.summary || null
  }

  return bounded
}

async function getNextBestActions(userId, role, options = {}) {
  const ctx = await buildUserContext(userId, role, options)
  const actions = []

  if (role === 'student') {
    const top = ctx.learning?.dailyFocus?.topPriority
    if (top?.what) {
      actions.push({
        id: 'daily-focus',
        title: top.what,
        reason: top.why || 'Highest priority for today',
        href: top.href || '/ai/career/copilot',
        priority: 'HIGH',
        source: sourceLabel('GOAL'),
        deadline: top.deadline || null,
      })
    }
    for (const rec of ctx.recommendations.slice(0, 2)) {
      actions.push({
        id: rec.key,
        title: rec.title || rec.nextStep || rec.label,
        reason: rec.explanation?.[0] || rec.reason || 'Recommended for your career goal',
        href: rec.href || '/ai/career/copilot',
        priority: rec.priority || 'MEDIUM',
        source: sourceLabel('SYSTEM_INFERENCE'),
      })
    }
    for (const opp of ctx.opportunities.items.slice(0, 1)) {
      if (opp.closingSoon || opp.urgency === 'high') {
        actions.push({
          id: `opp-${opp.source}-${opp.sourceId}`,
          title: `Review ${opp.title || 'opportunity'} before deadline`,
          reason: 'Closing soon and matches your profile',
          href: opp.href || `/opportunities/${opp.source}/${opp.sourceId}`,
          priority: 'HIGH',
          source: sourceLabel('OPPORTUNITY'),
          deadline: opp.deadline || opp.closingDate,
        })
      }
    }
  }

  if (role === 'institution' && ctx.analytics?.summary) {
    actions.push({
      id: 'exec-review',
      title: ctx.analytics.summary.headline || 'Review ecosystem intelligence',
      reason: 'Institution priority based on recent analytics',
      href: '/institution/executive-intelligence',
      priority: 'MEDIUM',
      source: sourceLabel('ACTIVITY'),
    })
  }

  return actions.slice(0, CONTEXT_BUDGET.MAX_NEXT_ACTIONS)
}

async function getAdaptiveDashboard(userId, role, options = {}) {
  const ctx = await buildUserContext(userId, role, options)
  const mode = ctx.dashboardMode || 'DEFAULT'
  const roleModes = DASHBOARD_MODES[role] || DASHBOARD_MODES.student
  const priorities = roleModes[mode] || roleModes.DEFAULT || []

  return {
    mode,
    priorities,
    sections: priorities.map((section) => ({
      id: section,
      priority: priorities.indexOf(section) + 1,
      relevant: true,
    })),
    nextActions: await getNextBestActions(userId, role, options),
    recommendations: ctx.recommendations?.slice(0, 5) || [],
    contextSummary: {
      careerGoal: ctx.career?.goal,
      careerState: ctx.career?.state,
      signalCount: ctx.signals?.length || 0,
    },
  }
}

async function getPersonalizedHome(userId, role, options = {}) {
  const [ctx, actions] = await Promise.all([
    buildUserContext(userId, role, options),
    getNextBestActions(userId, role, options),
  ])

  const priority = actions[0] || null

  return {
    greeting: 'Good morning',
    priority,
    forYou: {
      opportunities: ctx.opportunities?.items?.slice(0, 3) || [],
      recommendations: ctx.recommendations?.slice(0, 3) || [],
    },
    roadmap: ctx.learning?.weeklyPlan ? {
      next: ctx.learning.weeklyPlan.focus?.[0] || ctx.learning.dailyFocus?.topPriority?.what,
      source: sourceLabel('LEARNING'),
    } : null,
    recentProgress: ctx.career?.state ? {
      state: ctx.career.state,
      readiness: ctx.career.readiness?.level || 'UNKNOWN',
      source: sourceLabel('ACTIVITY'),
    } : null,
    copilotPrompt: 'What should I do next?',
    transparency: {
      basedOn: [
        ctx.career?.goal && ctx.career.goal !== 'UNKNOWN' ? 'career goal' : null,
        ctx.career?.topSkills?.length ? 'skills' : null,
        ctx.opportunities?.items?.length ? 'opportunities' : null,
        ctx.session?.task ? 'current task' : null,
      ].filter(Boolean),
    },
  }
}

async function getPrivacyCenter(userId, role) {
  const [prefs, ctx, feedbackCount] = await Promise.all([
    getOrCreatePreferences(userId),
    buildUserContext(userId, role, {}),
    RecommendationFeedback.countDocuments({ ownerUserId: userId }),
  ])

  const profile = await UserProfile.findOne({ userId }).lean()

  return {
    dataUsed: [
      { id: 'profile', label: 'Profile & career preferences', enabled: true, source: 'PROFILE' },
      { id: 'goals', label: 'Goals & roadmap progress', enabled: true, source: 'GOAL' },
      { id: 'memory', label: 'Saved AI memory (authorized)', enabled: ctx.memory?.authorized > 0, source: 'MEMORY' },
      { id: 'activity', label: 'Recent career activity', enabled: true, source: 'ACTIVITY' },
      { id: 'opportunities', label: 'Opportunity matching signals', enabled: role === 'student', source: 'OPPORTUNITY' },
    ],
    memoryCount: ctx.memory?.authorized || 0,
    temporaryContextCount: (prefs.temporaryContext || []).length,
    feedbackCount,
    notificationPreferences: profile?.notifications || {},
    recommendationCategories: prefs.recommendationCategories
      ? Object.fromEntries(prefs.recommendationCategories)
      : {},
    controls: {
      canEditMemory: true,
      canDismissRecommendations: true,
      canDisableCategories: true,
    },
  }
}

async function updatePreferences(userId, payload = {}) {
  const prefs = await getOrCreatePreferences(userId)

  if (payload.recommendationCategories && typeof payload.recommendationCategories === 'object') {
    for (const [k, v] of Object.entries(payload.recommendationCategories)) {
      prefs.recommendationCategories.set(k, v !== false)
    }
  }
  if (payload.dashboardMode) prefs.dashboardMode = String(payload.dashboardMode)
  if (payload.explicitPreference?.key) {
    const existing = prefs.explicitPreferences.find((p) => p.key === payload.explicitPreference.key)
    if (existing) {
      existing.value = sanitizeText(payload.explicitPreference.value)
      existing.updatedAt = new Date()
    } else {
      prefs.explicitPreferences.push({
        key: payload.explicitPreference.key,
        value: sanitizeText(payload.explicitPreference.value),
        source: 'EXPLICIT_USER',
      })
    }
  }

  prefs.lastRefreshedAt = new Date()
  await prefs.save()
  return prefs.toObject()
}

async function setSessionContext(userId, payload = {}) {
  const prefs = await getOrCreatePreferences(userId)
  prefs.sessionContext = {
    page: sanitizeText(payload.page || ''),
    entityType: sanitizeText(payload.entityType || ''),
    entityId: sanitizeText(payload.entityId || ''),
    task: sanitizeText(payload.task || ''),
    currentInstruction: sanitizeText(payload.currentInstruction || payload.instruction || ''),
    expiresAt: new Date(Date.now() + CONTEXT_EXPIRATION.SESSION),
  }
  await prefs.save()
  return prefs.sessionContext
}

async function setTemporaryContext(userId, { key, value, ttl = 'TEMPORARY' } = {}) {
  if (!key || !value) {
    const err = new Error('key and value required for temporary context')
    err.statusCode = 400
    throw err
  }
  if (isProtectedInference(value)) {
    const err = new Error('Cannot store sensitive inferred attributes')
    err.statusCode = 403
    throw err
  }

  const prefs = await getOrCreatePreferences(userId)
  const ms = CONTEXT_EXPIRATION[ttl] || CONTEXT_EXPIRATION.TEMPORARY
  prefs.temporaryContext.push({
    key: sanitizeText(key),
    value: sanitizeText(value),
    source: 'EXPLICIT_USER',
    expiresAt: new Date(Date.now() + ms),
  })
  prefs.temporaryContext = prefs.temporaryContext.slice(-10)
  await prefs.save()
  return prefs.temporaryContext
}

async function recordFeedback(userId, { recommendationKey, recommendationType, feedback, metadata } = {}) {
  if (!recommendationKey || !FEEDBACK_TYPES.includes(feedback)) {
    const err = new Error('recommendationKey and valid feedback required')
    err.statusCode = 400
    throw err
  }

  const entry = await RecommendationFeedback.create({
    ownerUserId: userId,
    recommendationKey,
    recommendationType: recommendationType || '',
    feedback,
    metadata: metadata || {},
  })

  if (feedback === 'DISMISS' || feedback === 'NOT_RELEVANT') {
    const prefs = await getOrCreatePreferences(userId)
    if (!isDismissed(prefs, recommendationKey)) {
      prefs.dismissedRecommendations.push({
        key: recommendationKey,
        type: recommendationType || '',
        dismissedAt: new Date(),
      })
      await prefs.save()
    }
  }

  return entry.toObject()
}

async function handleMemoryConsent(userId, { action, text, key } = {}) {
  if (action === 'forget') {
    const prefs = await getOrCreatePreferences(userId)
    if (key) {
      prefs.temporaryContext = prefs.temporaryContext.filter((t) => t.key !== key)
      prefs.explicitPreferences = prefs.explicitPreferences.filter((p) => p.key !== key)
      await prefs.save()
    }
    return { stored: false, action: 'forgotten' }
  }

  if (action !== 'remember' || !text) {
    const err = new Error('Explicit remember action with text required')
    err.statusCode = 400
    throw err
  }

  const safe = sanitizeText(text)
  if (isProtectedInference(safe)) {
    const err = new Error('Cannot store sensitive attributes')
    err.statusCode = 403
    throw err
  }

  await setTemporaryContext(userId, {
    key: key || `pref-${Date.now()}`,
    value: safe,
    ttl: 'LONG_TERM',
  })

  const MJPreference = mongoose.models.MJPreference
  if (MJPreference) {
    await MJPreference.create({
      userId,
      category: 'general',
      key: key || 'user_preference',
      value: safe,
      visibility: 'private',
      source: 'EXPLICIT_USER',
    }).catch(() => null)
  }

  return { stored: true, action: 'remembered', value: safe }
}

async function refreshPersonalization(userId, eventType) {
  const prefs = await getOrCreatePreferences(userId)
  prefs.lastRefreshedAt = new Date()
  if (eventType === 'career_goal_changed') prefs.dashboardMode = 'EXPLORING'
  if (eventType === 'application_updated') prefs.dashboardMode = 'APPLYING'
  await prefs.save()
  return { refreshed: true, eventType, at: prefs.lastRefreshedAt }
}

module.exports = {
  sanitizeText,
  buildUserContext,
  getContextForAgent,
  getNextBestActions,
  getAdaptiveDashboard,
  getPersonalizedHome,
  getPrivacyCenter,
  updatePreferences,
  setSessionContext,
  setTemporaryContext,
  recordFeedback,
  handleMemoryConsent,
  refreshPersonalization,
  getOrCreatePreferences,
  buildExplanation,
}
