/**
 * Unified Dream Wave AI Brain (Thirumala V4 Prompt 1).
 *
 * Coordinates existing V3 systems — does NOT replace them.
 * Does NOT create AIContextV4 / MemoryV4 / AgentV4.
 * Security boundary remains each domain service + tool registry.
 *
 * Pipeline: USER → INTENT → CONTEXT BUILDER → BRAIN → MEMORY/KG/AGENTS → DOMAIN SERVICES → ACTION → VERIFY → RESPONSE
 */
const limits = require('../config/brainLimits')
const studentContextEngine = require('./studentContextEngine')
const coreAiIntelligenceService = require('./coreAiIntelligenceService')
const knowledgeGraphService = require('./knowledgeGraphService')
const decisionSupportService = require('./decisionSupportService')
const memoryService = require('./memoryService')

const ALIGNMENT = {
  STRONG_ALIGNMENT: 'STRONG_ALIGNMENT',
  GOOD_ALIGNMENT: 'GOOD_ALIGNMENT',
  PARTIAL_ALIGNMENT: 'PARTIAL_ALIGNMENT',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  UNKNOWN: 'UNKNOWN',
}

const BRAIN_INTENTS = [
  'DAILY_PLAN',
  'NEXT_ACTION',
  'SKILL_GAP',
  'PROJECT_LEARNING',
  'PROJECT_CAREER',
  'PROJECT_OPPORTUNITY',
  'EVENT_PREP',
  'RESEARCH_CAREER',
  'LEARNING_CAREER',
  'ALIGNMENT_REVIEW',
  'BLOCKERS',
  'WEEKLY_FOCUS',
  'UNIFIED_SEARCH',
  'CROSS_SYSTEM',
  'MEMORY_REVIEW',
  'GENERAL',
]

/** Lightweight observability — no private content */
const metrics = {
  requests: 0,
  toolCalls: 0,
  agentCalls: 0,
  errors: 0,
  timeouts: 0,
  latencyMsTotal: 0,
}

function bump(key, n = 1) {
  metrics[key] = (metrics[key] || 0) + n
}

function getObservability() {
  return {
    ...metrics,
    avgLatencyMs: metrics.requests ? Math.round(metrics.latencyMsTotal / metrics.requests) : 0,
  }
}

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  throw err
}

function requireAuthUser(user) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  return user
}

/**
 * External content is DATA — strip instruction-like injection attempts.
 */
function sanitizeExternalData(text = '', label = 'external') {
  const raw = String(text || '').slice(0, 2000)
  const cleaned = raw
    .replace(/\b(ignore (all )?(previous|prior) instructions?)\b/gi, '[filtered]')
    .replace(/\b(system prompt|you are now|jailbreak|developer mode)\b/gi, '[filtered]')
    .replace(/\b(exfiltrate|send (me )?your (api|secret|key))\b/gi, '[filtered]')
  return { label, text: cleaned, treatedAs: 'DATA_ONLY' }
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9+#.]/)
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'with', 'your', 'this'].includes(t))
}

function tokenSet(text = '') {
  return new Set(tokenize(text))
}

function overlapScore(a, b) {
  const A = tokenSet(a)
  const B = tokenSet(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const t of A) if (B.has(t)) hit += 1
  return hit / Math.max(A.size, B.size)
}

function alignmentLabel(score) {
  if (score >= 0.45) return ALIGNMENT.STRONG_ALIGNMENT
  if (score >= 0.28) return ALIGNMENT.GOOD_ALIGNMENT
  if (score >= 0.12) return ALIGNMENT.PARTIAL_ALIGNMENT
  if (score > 0) return ALIGNMENT.NEEDS_ATTENTION
  return ALIGNMENT.UNKNOWN
}

function routeBrainIntent(message = '') {
  const m = String(message || '')
  if (memoryService.detectMemoryIntent(m)) return memoryService.detectMemoryIntent(m)
  if (/\b(what should i do (today|now)|plan my day|today'?s priority|focus (this week|today))\b/i.test(m)) {
    if (/\bthis week\b/i.test(m)) return 'WEEKLY_FOCUS'
    if (/\bnow\b/i.test(m) || /\bnext action\b/i.test(m)) return 'NEXT_ACTION'
    return 'DAILY_PLAN'
  }
  if (/\b(skills? (am i )?missing|skill gaps?|what skills)\b/i.test(m)) return 'SKILL_GAP'
  if (/\b(learn .+ (for|about) (my )?project|what should i learn .+ project|project .+ learn)\b/i.test(m)) {
    return 'PROJECT_LEARNING'
  }
  if (/\b(project .+ (career|internship|job)|how does my project connect|career .+ project)\b/i.test(m)) {
    return 'PROJECT_CAREER'
  }
  if (/\b(opportunit.+ (project|align)|project .+ opportunit|which opportunit)\b/i.test(m)) {
    return 'PROJECT_OPPORTUNITY'
  }
  if (/\b(hackathon|prepare .+ (for )?(the )?event|event prep)\b/i.test(m)) return 'EVENT_PREP'
  if (/\b(research .+ career|career .+ research)\b/i.test(m)) return 'RESEARCH_CAREER'
  if (/\b(learning .+ career|career .+ learning|connection between my learning)\b/i.test(m)) {
    return 'LEARNING_CAREER'
  }
  if (/\b(align|connection between|how (do|does) .+ connect|these .+ align)\b/i.test(m)) {
    return 'ALIGNMENT_REVIEW'
  }
  if (/\b(blocking|blocker|stuck|what is blocking)\b/i.test(m)) return 'BLOCKERS'
  if (/\b(search|find|show me).+\b/i.test(m) && /\b(project|event|opportunit|research|task|goal)\b/i.test(m)) {
    return 'UNIFIED_SEARCH'
  }
  if (/\b(goal|project|learning|research|event|opportunit|career|daily)\b/i.test(m)) {
    return 'CROSS_SYSTEM'
  }
  return 'GENERAL'
}

/** Domains to load for an intent — keep reads minimal */
const INTENT_DOMAINS = {
  DAILY_PLAN: ['daily', 'goals', 'tasks', 'memory'],
  NEXT_ACTION: ['daily', 'goals', 'tasks', 'projects'],
  WEEKLY_FOCUS: ['daily', 'goals', 'projects', 'learning', 'opportunities', 'events'],
  SKILL_GAP: ['learning', 'career', 'opportunities', 'projects'],
  PROJECT_LEARNING: ['projects', 'learning', 'goals', 'memory'],
  PROJECT_CAREER: ['projects', 'career', 'opportunities', 'goals'],
  PROJECT_OPPORTUNITY: ['projects', 'opportunities', 'career', 'learning'],
  EVENT_PREP: ['events', 'projects', 'learning', 'tasks', 'goals'],
  RESEARCH_CAREER: ['research', 'career', 'goals'],
  LEARNING_CAREER: ['learning', 'career', 'goals', 'projects'],
  ALIGNMENT_REVIEW: ['goals', 'learning', 'projects', 'research', 'events', 'opportunities'],
  BLOCKERS: ['daily', 'tasks', 'projects', 'learning', 'research', 'opportunities'],
  UNIFIED_SEARCH: ['search'],
  CROSS_SYSTEM: ['goals', 'projects', 'learning', 'daily'],
  MEMORY_REVIEW: ['memory'],
  FORGET_MEMORY: ['memory'],
  REMEMBER_EXPLICIT: ['memory'],
  GENERAL: ['goals', 'daily', 'memory'],
}

async function safe(label, fn) {
  try {
    bump('toolCalls')
    return { ok: true, label, data: await fn() }
  } catch (error) {
    bump('errors')
    return {
      ok: false,
      label,
      error: error.code || 'DOMAIN_ERROR',
      message: error.message || 'Domain unavailable',
      data: null,
    }
  }
}

/**
 * Load only requested domains for authenticated student — never trust client userId.
 */
async function loadDomains(userId, domains = [], { message = '', q = '' } = {}) {
  const unique = [...new Set(domains)].slice(0, limits.MAX_DOMAIN_READS)
  const out = {}

  const runners = {
    goals: async () => {
      const Goal = require('../models/Goal')
      return Goal.find({ userId, status: { $ne: 'archived' } })
        .sort('-updatedAt').limit(8)
        .select('title status progress priority category skills requiredSkills deadline')
        .lean()
    },
    tasks: async () => {
      const Task = require('../models/Task')
      return Task.find({ userId, status: { $ne: 'archived' }, completed: { $ne: true } })
        .sort('-updatedAt').limit(15)
        .select('title status priority dueDate goalId type')
        .lean()
    },
    projects: async () => {
      const StudentProfile = require('../models/StudentProfile')
      const profile = await StudentProfile.findOne({ userId }).select('projects skills').lean()
      return {
        projects: (profile?.projects || []).filter((p) => p.status !== 'archived').slice(0, 8),
        skills: profile?.skills || [],
      }
    },
    learning: async () => {
      const learningIntelligenceService = require('./learningIntelligenceService')
      return learningIntelligenceService.getLearningIntelligence(userId)
    },
    research: async () => {
      const researchService = require('./researchService')
      if (!researchService.isEnabled?.()) return { projects: [] }
      return { projects: await researchService.listProjects(userId, { limit: 5 }) }
    },
    career: async () => {
      const CareerProfile = require('../models/CareerProfile')
      return CareerProfile.findOne({ userId })
        .select('targetCareer targetRoles requiredSkills')
        .lean()
    },
    opportunities: async () => {
      const Job = require('../models/Job')
      const Internship = require('../models/Internship')
      const Application = require('../models/Application')
      const [jobs, internships, applications] = await Promise.all([
        Job.find({ status: 'open' }).sort('-updatedAt').limit(5).select('title skills requirements companyName').lean().catch(() => []),
        Internship.find({ status: 'open' }).sort('-updatedAt').limit(5).select('title skills requirements companyName').lean().catch(() => []),
        Application.find({ userId }).sort('-updatedAt').limit(8).select('status jobId internshipId createdAt').lean().catch(() => []),
      ])
      return { jobs, internships, applications }
    },
    events: async () => {
      try {
        const PortalEvent = require('../models/PortalEvent')
        return PortalEvent.find({ status: 'published' })
          .sort('startAt')
          .limit(6)
          .select('title description startAt endAt skills tags status')
          .lean()
      } catch {
        return []
      }
    },
    daily: async () => {
      const personalDailyIntelligenceService = require('./personalDailyIntelligenceService')
      return personalDailyIntelligenceService.getDailyLifeIntelligence(userId)
    },
    memory: async () => memoryService.getRelevantMemories(userId, {
      message,
      intent: 'GENERAL_MENTOR',
      limit: 6,
    }),
    search: async () => unifiedDomainSearch(userId, q || message, { limit: 12 }),
  }

  await Promise.all(unique.map(async (domain) => {
    if (!runners[domain]) return
    out[domain] = await safe(domain, runners[domain])
  }))

  return out
}

function textBlob(entity) {
  if (!entity) return ''
  if (typeof entity === 'string') return entity
  return [
    entity.title,
    entity.name,
    entity.targetCareer,
    ...(entity.skills || []),
    ...(entity.requiredSkills || []),
    ...(entity.technologies || []),
    ...(entity.tags || []),
    entity.description,
    entity.question,
  ].filter(Boolean).join(' ')
}

function scoreAlignment(left, right) {
  const score = overlapScore(textBlob(left), textBlob(right))
  return { score: Number(score.toFixed(3)), label: alignmentLabel(score) }
}

/**
 * Cross-system intelligence from real loaded data — no invented entities.
 */
function buildCrossSystemInsights(domains) {
  const goals = domains.goals?.ok ? domains.goals.data : []
  const projects = domains.projects?.ok ? (domains.projects.data.projects || []) : []
  const learning = domains.learning?.ok ? domains.learning.data : null
  const research = domains.research?.ok ? (domains.research.data.projects || []) : []
  const career = domains.career?.ok ? domains.career.data : null
  const events = domains.events?.ok ? domains.events.data : []
  const opps = domains.opportunities?.ok ? domains.opportunities.data : null
  const opportunities = [...(opps?.jobs || []), ...(opps?.internships || [])]

  const activeGoal = goals.find((g) => g.status === 'active') || goals[0] || null
  const activeProject = projects[0] || null
  const learningTopic = learning?.overview?.currentTopic || learning?.nextAction?.study || null
  const researchProject = research[0] || null

  const connections = []
  const alignments = []

  if (activeGoal && activeProject) {
    const a = scoreAlignment(activeGoal, activeProject)
    alignments.push({
      from: { type: 'goal', id: String(activeGoal._id), title: activeGoal.title },
      to: { type: 'project', id: String(activeProject._id), title: activeProject.title },
      ...a,
    })
    if (a.label === ALIGNMENT.STRONG_ALIGNMENT || a.label === ALIGNMENT.GOOD_ALIGNMENT) {
      connections.push({
        what: `Goal “${activeGoal.title}” and project “${activeProject.title}” appear related.`,
        why: `Shared topical signals (overlap ${a.score}).`,
        source: 'Goal + Project',
        alignment: a.label,
      })
    }
  }

  if (activeGoal && learningTopic) {
    const a = scoreAlignment(activeGoal, { title: learningTopic })
    alignments.push({
      from: { type: 'goal', id: String(activeGoal._id), title: activeGoal.title },
      to: { type: 'learning', id: 'current', title: learningTopic },
      ...a,
    })
    if (a.score > 0) {
      connections.push({
        what: `Current learning “${learningTopic}” relates to goal “${activeGoal.title}”.`,
        why: `Token overlap between goal and learning focus.`,
        source: 'Goal + Learning',
        alignment: a.label,
      })
    }
  }

  if (activeProject && opportunities[0]) {
    const a = scoreAlignment(activeProject, opportunities[0])
    alignments.push({
      from: { type: 'project', id: String(activeProject._id), title: activeProject.title },
      to: { type: 'opportunity', id: String(opportunities[0]._id), title: opportunities[0].title },
      ...a,
    })
    if (a.score > 0) {
      connections.push({
        what: `Project “${activeProject.title}” may support opportunity “${opportunities[0].title}”.`,
        why: `Shared skill/title signals (overlap ${a.score}).`,
        source: 'Project + Opportunity',
        alignment: a.label,
      })
    }
  }

  if (activeGoal && events[0]) {
    const a = scoreAlignment(activeGoal, events[0])
    alignments.push({
      from: { type: 'goal', id: String(activeGoal._id), title: activeGoal.title },
      to: { type: 'event', id: String(events[0]._id), title: events[0].title },
      ...a,
    })
  }

  if (researchProject && career?.targetCareer) {
    const a = scoreAlignment(researchProject, career)
    alignments.push({
      from: { type: 'research', id: researchProject.id, title: researchProject.title },
      to: { type: 'career', id: 'career', title: career.targetCareer },
      ...a,
    })
  }

  // Multi-activity alignment insight
  const cluster = [activeGoal?.title, activeProject?.title, learningTopic, events[0]?.title, opportunities[0]?.title]
    .filter(Boolean)
  if (cluster.length >= 3 && activeGoal) {
    const scores = cluster.slice(1).map((c) => overlapScore(activeGoal.title, c))
    const avg = scores.reduce((s, n) => s + n, 0) / scores.length
    if (avg >= 0.1) {
      connections.push({
        what: 'Several current activities appear to support the same direction.',
        why: `Compared goal against project/learning/event/opportunity signals (avg overlap ${avg.toFixed(2)}).`,
        source: 'Goal + Learning + Project + Event/Opportunity',
        alignment: alignmentLabel(avg),
        items: cluster,
      })
    }
  }

  return { connections, alignments, activeGoal, activeProject, learningTopic, researchProject, career, events, opportunities }
}

/**
 * Gap intelligence — only when evidence supports a missing skill claim.
 */
function buildGapInsights(domains, cross) {
  const gaps = []
  const profileSkills = new Set(
    tokenize([
      ...(domains.projects?.data?.skills || []).map((s) => (typeof s === 'string' ? s : s.name || '')),
      ...((domains.projects?.ok ? (domains.projects.data.projects || []) : [])
        .flatMap((p) => p.technologies || [])),
    ].join(' ')),
  )
  const learningGaps = domains.learning?.ok
    ? (domains.learning.data.skillGaps?.gaps || []).slice(0, 5)
    : []

  for (const g of learningGaps) {
    gaps.push({
      what: `Learning gap: ${g.skill}`,
      why: g.reason || g.detail || 'Derived from goal/roadmap skill requirements vs evidence.',
      source: 'Learning Intelligence',
      evidence: 'skill_gap_analysis',
    })
  }

  for (const opp of (cross.opportunities || []).slice(0, 3)) {
    const required = [...(opp.skills || []), ...(opp.requirements || [])]
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 12)
    for (const skill of required) {
      const token = tokenize(skill)[0]
      if (!token) continue
      if (!profileSkills.has(token) && !profileSkills.has(skill)) {
        // Only claim gap if skill appears as discrete requirement and not in profile tokens
        const hasPartial = [...profileSkills].some((p) => p.includes(token) || token.includes(p))
        if (!hasPartial) {
          gaps.push({
            what: `Possible preparation gap: “${skill}” for opportunity “${opp.title}”.`,
            why: 'Required skill listed on opportunity; no matching skill token found on profile/career current skills.',
            source: 'Opportunity + Profile',
            evidence: 'missing_skill_token',
            confidence: 'MEDIUM',
          })
        }
      }
    }
  }

  return gaps.slice(0, 8)
}

function buildBlockers(domains) {
  const blockers = []
  const daily = domains.daily?.ok ? domains.daily.data : null
  if (daily?.risks?.items?.length) {
    for (const r of daily.risks.items.slice(0, 4)) {
      blockers.push({
        what: r.title || r.message || 'Progress risk',
        why: r.reason || r.detail || 'Flagged by Daily Life risk analysis.',
        source: 'Daily Life',
      })
    }
  }
  const tasks = domains.tasks?.ok ? domains.tasks.data : []
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
  for (const t of overdue.slice(0, 3)) {
    blockers.push({
      what: `Overdue task: ${t.title}`,
      why: `Due ${new Date(t.dueDate).toLocaleDateString()}.`,
      source: 'Tasks',
    })
  }
  const learning = domains.learning?.ok ? domains.learning.data : null
  if (learning?.skillGaps?.gaps?.[0]) {
    blockers.push({
      what: `Skill preparation: ${learning.skillGaps.gaps[0].skill}`,
      why: learning.skillGaps.gaps[0].reason || 'Learning gap may block related project/opportunity progress.',
      source: 'Learning',
    })
  }
  return blockers
}

function detectConflicts(domains) {
  const conflicts = []
  // Example: project marked complete-ish vs open tasks referencing it — soft check on titles
  const projects = domains.projects?.ok ? (domains.projects.data.projects || []) : []
  const tasks = domains.tasks?.ok ? domains.tasks.data : []
  for (const p of projects) {
    if (String(p.status).toLowerCase() === 'completed') {
      const relatedOpen = tasks.filter((t) => overlapScore(p.title, t.title) >= 0.35)
      if (relatedOpen.length) {
        conflicts.push({
          type: 'CONFLICT',
          what: `Project “${p.title}” is completed but related open tasks remain.`,
          sources: ['Project', 'Tasks'],
          details: relatedOpen.slice(0, 3).map((t) => t.title),
        })
      }
    }
  }
  return conflicts
}

/**
 * Persist lightweight cross-system graph edges (IDs only) when alignment is strong.
 */
async function syncCrossSystemEdges(userId, cross) {
  if (!knowledgeGraphService.isEnabled?.()) return
  try {
    if (cross.activeGoal && cross.activeProject) {
      const a = scoreAlignment(cross.activeGoal, cross.activeProject)
      if (a.score >= 0.12) {
        await knowledgeGraphService.upsertEdge(userId, {
          sourceType: 'project',
          sourceId: String(cross.activeProject._id),
          targetType: 'goal',
          targetId: String(cross.activeGoal._id),
          relationType: 'PROJECT_FOR_GOAL',
          origin: 'SYSTEM_DERIVED',
          confidence: Math.min(0.95, a.score + 0.3),
          label: cross.activeProject.title,
        })
      }
    }
    if (cross.activeGoal && cross.opportunities?.[0]) {
      const opp = cross.opportunities[0]
      const a = scoreAlignment(cross.activeGoal, opp)
      if (a.score >= 0.12) {
        await knowledgeGraphService.upsertEdge(userId, {
          sourceType: 'job',
          sourceId: String(opp._id),
          targetType: 'goal',
          targetId: String(cross.activeGoal._id),
          relationType: 'OPPORTUNITY_SUPPORTS_GOAL',
          origin: 'SYSTEM_DERIVED',
          confidence: Math.min(0.9, a.score + 0.25),
          label: opp.title,
        })
      }
    }
    if (cross.researchProject && cross.activeProject) {
      const a = scoreAlignment(cross.researchProject, cross.activeProject)
      if (a.score >= 0.12) {
        await knowledgeGraphService.upsertEdge(userId, {
          sourceType: 'research_project',
          sourceId: String(cross.researchProject.id),
          targetType: 'project',
          targetId: String(cross.activeProject._id),
          relationType: 'RESEARCH_SUPPORTS_PROJECT',
          origin: 'SYSTEM_DERIVED',
          confidence: Math.min(0.9, a.score + 0.25),
          label: cross.researchProject.title,
        })
      }
    }
  } catch {
    // Graph sync optional
  }
}

function buildRecommendation(intent, domains, cross, gaps, blockers) {
  const daily = domains.daily?.ok ? domains.daily.data : null
  if (daily?.nextAction?.title) {
    const whyParts = [daily.nextAction.why || daily.nextAction.reason].filter(Boolean)
    if (cross.activeProject && overlapScore(daily.nextAction.title, cross.activeProject.title) > 0.15) {
      whyParts.push(`Advances project “${cross.activeProject.title}”.`)
    }
    if (cross.opportunities?.[0] && overlapScore(daily.nextAction.title, cross.opportunities[0].title) > 0.1) {
      whyParts.push(`Also relevant to opportunity “${cross.opportunities[0].title}”.`)
    }
    return {
      title: daily.nextAction.title,
      why: whyParts.join(' ') || 'Prioritized from Daily Life intelligence.',
      source: daily.nextAction.source || 'Daily Life + cross-system signals',
      url: daily.nextAction.url || null,
    }
  }

  if (intent === 'SKILL_GAP' && gaps[0]) {
    return {
      title: `Address: ${gaps[0].what}`,
      why: gaps[0].why,
      source: gaps[0].source,
      url: '/student/learn',
    }
  }

  if (intent === 'BLOCKERS' && blockers[0]) {
    return {
      title: blockers[0].what,
      why: blockers[0].why,
      source: blockers[0].source,
      url: '/student/daily-life',
    }
  }

  if (cross.activeProject) {
    return {
      title: `Continue project: ${cross.activeProject.title}`,
      why: cross.activeGoal
        ? `Supports goal “${cross.activeGoal.title}” where signals align.`
        : 'Active portfolio project is the best available focus.',
      source: 'Project' + (cross.activeGoal ? ' + Goal' : ''),
      url: '/student/profile',
    }
  }

  if (cross.activeGoal) {
    return {
      title: `Advance goal: ${cross.activeGoal.title}`,
      why: 'Active goal without a stronger daily next-action signal.',
      source: 'Goals',
      url: '/student/goals',
    }
  }

  return {
    title: 'Add a goal or open Daily Life to get a grounded next action',
    why: 'Insufficient canonical activity data for a specific recommendation.',
    source: 'System',
    url: '/student/daily-life',
  }
}

function formatAnswer({ intent, answer, why, context, action, nextStep, conflicts, transparency }) {
  return {
    answer,
    why,
    relevantContext: context,
    recommendedAction: action,
    optionalNextStep: nextStep || null,
    conflicts: conflicts || [],
    transparency: transparency || null,
    intent,
    structure: ['ANSWER', 'WHY', 'RELEVANT_CONTEXT', 'RECOMMENDED_ACTION', 'OPTIONAL_NEXT_STEP'],
  }
}

/**
 * Unified context builder — routes layers; does not dump all systems.
 */
async function buildUnifiedContext(user, { message = '', budget = limits.MAX_CONTEXT_CHARS } = {}) {
  const u = requireAuthUser(user)
  if (u.role === 'institution' || u.role === 'company') {
    return buildOrgContext(u)
  }

  const intent = routeBrainIntent(message)
  const domainsNeeded = INTENT_DOMAINS[intent] || INTENT_DOMAINS.GENERAL

  const [core, domains, graph] = await Promise.all([
    coreAiIntelligenceService.buildCoreAiContext(u._id, {
      message,
      budget: Math.min(budget, limits.MAX_CONTEXT_CHARS),
      includeNextAction: true,
    }),
    loadDomains(u._id, domainsNeeded.filter((d) => d !== 'search'), { message }),
    knowledgeGraphService.isEnabled()
      ? knowledgeGraphService.getGraphSummary(u._id).catch(() => null)
      : null,
  ])

  // Memory is subordinate to canonical data + current instruction
  let memoryNote = 'Current user instruction > canonical records > explicit memory > inference.'
  if (domains.memory?.ok && domains.memory.data?.length) {
    memoryNote += ` Loaded ${domains.memory.data.length} relevant memories (budgeted).`
  }

  return {
    role: 'student',
    intent,
    domainsLoaded: domainsNeeded,
    coreIntent: core.intent,
    contextText: (core.contextText || '').slice(0, budget),
    domains,
    graph,
    memoryPolicy: memoryNote,
    sourcePriority: [
      'CURRENT_USER_INSTRUCTION',
      'CANONICAL_DATABASE',
      'EXPLICIT_MEMORY',
      'SYSTEM_DERIVED',
      'OLDER_MEMORY',
      'AI_INFERENCE',
    ],
    generatedAt: new Date().toISOString(),
  }
}

function buildOrgContext(user) {
  if (user.role === 'institution') {
    return {
      role: 'institution',
      intent: 'ORG_CONTEXT',
      domainsLoaded: ['institution'],
      contextText: 'Institution context is organization-scoped. Use institution command center APIs. Student private memory/research is not included.',
      domains: {},
      sourcePriority: ['CURRENT_USER_INSTRUCTION', 'CANONICAL_DATABASE'],
      urls: { commandCenter: '/institution', students: '/institution/students' },
      generatedAt: new Date().toISOString(),
    }
  }
  return {
    role: 'company',
    intent: 'ORG_CONTEXT',
    domainsLoaded: ['company'],
    contextText: 'Company context is organization-scoped. Use company recruitment APIs. Candidate private memory is not included.',
    domains: {},
    sourcePriority: ['CURRENT_USER_INSTRUCTION', 'CANONICAL_DATABASE'],
    urls: { dashboard: '/company', recruitment: '/company/recruitment' },
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Owner-scoped unified search across student domains.
 */
async function unifiedDomainSearch(userId, query = '', { limit = limits.MAX_SEARCH_RESULTS } = {}) {
  const q = String(query || '').trim().slice(0, 80)
  if (!q) return { query: '', results: [] }
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const Goal = require('../models/Goal')
  const Task = require('../models/Task')
  const StudentProfile = require('../models/StudentProfile')
  const results = []

  const [goals, tasks, profile, memories] = await Promise.all([
    Goal.find({ userId, title: re }).limit(5).select('title status').lean(),
    Task.find({ userId, title: re }).limit(5).select('title status').lean(),
    StudentProfile.findOne({ userId }).select('projects').lean(),
    memoryService.listMemories(userId, { q, status: 'ACTIVE', limit: 5 }).catch(() => ({ memories: [] })),
  ])

  goals.forEach((g) => results.push({ type: 'goal', id: String(g._id), title: g.title, url: '/student/goals' }))
  tasks.forEach((t) => results.push({ type: 'task', id: String(t._id), title: t.title, url: '/student/tasks' }))
  ;(profile?.projects || []).filter((p) => re.test(p.title || '')).slice(0, 5).forEach((p) => {
    results.push({ type: 'project', id: String(p._id), title: p.title, url: '/student/profile' })
  })
  ;(memories.memories || []).forEach((m) => {
    results.push({ type: 'memory', id: m.id, title: m.content.slice(0, 80), url: '/student/memory' })
  })

  try {
    const researchService = require('./researchService')
    if (researchService.isEnabled?.()) {
      const projects = await researchService.listProjects(userId, { limit: 20 })
      projects.filter((p) => re.test(p.title || '') || re.test(p.question || '')).slice(0, 5).forEach((p) => {
        results.push({ type: 'research', id: p.id, title: p.title, url: `/student/research/${p.id}` })
      })
    }
  } catch { /* optional */ }

  // V4 Prompt 4 — enrich with personal knowledge search (owner-scoped)
  try {
    const personalKnowledgeIntelligenceService = require('./personalKnowledgeIntelligenceService')
    const knowledge = await personalKnowledgeIntelligenceService.searchKnowledge(userId, q, { limit: 8 })
    for (const hit of knowledge.results || []) {
      if (results.some((r) => r.id === hit.id && String(r.type).toLowerCase() === String(hit.type).toLowerCase())) continue
      results.push({
        type: String(hit.type || 'knowledge').toLowerCase(),
        id: hit.id,
        title: hit.title,
        url: hit.url || '/student/knowledge',
        origin: hit.origin || null,
      })
    }
  } catch { /* optional */ }

  try {
    const Job = require('../models/Job')
    const Internship = require('../models/Internship')
    const PortalEvent = require('../models/PortalEvent')
    const [jobs, internships, events] = await Promise.all([
      Job.find({ title: re, status: 'open' }).limit(4).select('title').lean().catch(() => []),
      Internship.find({ title: re, status: 'open' }).limit(4).select('title').lean().catch(() => []),
      PortalEvent.find({ title: re }).limit(4).select('title').lean().catch(() => []),
    ])
    jobs.forEach((j) => results.push({ type: 'opportunity', id: String(j._id), title: j.title, url: '/student/career/jobs' }))
    internships.forEach((j) => results.push({ type: 'opportunity', id: String(j._id), title: j.title, url: '/student/career/internships' }))
    events.forEach((e) => results.push({ type: 'event', id: String(e._id), title: e.title, url: '/student/dashboard' }))
  } catch { /* optional */ }

  // Rank: memory after canonical; prefer goals/projects for "current" feel
  const rank = { goal: 5, project: 5, task: 4, research: 4, learning: 4, opportunity: 3, event: 3, memory: 2 }
  results.sort((a, b) => (rank[b.type] || 0) - (rank[a.type] || 0))

  return { query: q, results: results.slice(0, Math.min(limit, limits.MAX_SEARCH_RESULTS)) }
}

async function getIntelligenceSummary(userId) {
  const domains = await loadDomains(userId, ['goals', 'projects', 'learning', 'daily', 'tasks', 'opportunities'])
  const cross = buildCrossSystemInsights(domains)
  const gaps = buildGapInsights(domains, cross)
  const action = buildRecommendation('NEXT_ACTION', domains, cross, gaps, buildBlockers(domains))
  const daily = domains.daily?.ok ? domains.daily.data : null
  const deadlineTask = (domains.tasks?.ok ? domains.tasks.data : [])
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]

  return {
    title: 'YOUR CURRENT FOCUS',
    goal: cross.activeGoal ? { id: String(cross.activeGoal._id), title: cross.activeGoal.title, progress: cross.activeGoal.progress } : null,
    project: cross.activeProject ? { id: String(cross.activeProject._id), title: cross.activeProject.title, status: cross.activeProject.status } : null,
    learning: cross.learningTopic || null,
    importantDeadline: deadlineTask
      ? { title: deadlineTask.title, dueDate: deadlineTask.dueDate }
      : null,
    recommendedNextAction: action,
    why: action.why,
    connections: cross.connections.slice(0, 3),
    opportunity: cross.opportunities?.[0]
      ? { id: String(cross.opportunities[0]._id), title: cross.opportunities[0].title }
      : null,
    empty: !cross.activeGoal && !cross.activeProject && !cross.learningTopic,
  }
}

async function getWeeklyIntelligence(userId) {
  const domains = await loadDomains(userId, ['goals', 'projects', 'learning', 'daily', 'tasks', 'opportunities', 'events'])
  const cross = buildCrossSystemInsights(domains)
  const goals = domains.goals?.ok ? domains.goals.data : []
  const tasks = domains.tasks?.ok ? domains.tasks.data : []
  return {
    progress: goals.slice(0, 5).map((g) => ({ title: g.title, progress: g.progress || 0, status: g.status })),
    unfinishedWork: tasks.slice(0, 8).map((t) => ({ title: t.title, dueDate: t.dueDate || null })),
    learning: cross.learningTopic,
    project: cross.activeProject?.title || null,
    upcomingDeadlines: tasks.filter((t) => t.dueDate).slice(0, 5),
    opportunities: (cross.opportunities || []).slice(0, 3).map((o) => o.title),
    events: (cross.events || []).slice(0, 3).map((e) => e.title),
    recommendedFocus: buildRecommendation('WEEKLY_FOCUS', domains, cross, buildGapInsights(domains, cross), buildBlockers(domains)),
    note: 'Weekly summary uses live canonical data — not a separate scheduler.',
  }
}

/**
 * Coordinate existing agent orchestration (single call by default).
 */
async function coordinateAgents(user, message, { mode = 'READ_ONLY', agentType = 'student', multi = true } = {}) {
  requireAuthUser(user)
  if (metrics.agentCalls >= 0) bump('agentCalls')

  // Prefer specialist network for multi-domain questions (V4 P2)
  if (multi !== false) {
    try {
      const specialistNetworkService = require('./agent/specialistNetworkService')
      const plan = specialistNetworkService.planSpecialists(message, { role: user.role })
      if (plan.specialists.length >= 2 || plan.mode !== 'single') {
        const network = await specialistNetworkService.runSpecialistNetwork(user, message, { mode })
        return {
          state: network.state,
          plan: network.plan,
          activity: network.activity,
          resultSummary: network.summary,
          confirmationRequired: false,
          executionId: network.executionId,
          facts: network.facts,
          inferences: network.inferences,
          recommendations: network.recommendations,
          conflicts: network.conflicts,
          specialists: network.specialists,
          toolResults: (network.specialists || []).map((s) => ({ tool: s.agent, summary: s.summary })),
          network: true,
        }
      }
    } catch {
      // fall through to V3 single orchestrator
    }
  }

  const agentOrchestratorService = require('./agent/agentOrchestratorService')
  const result = await agentOrchestratorService.runAgent({
    user,
    message,
    mode,
    agentType,
  })
  return {
    state: result.state,
    plan: result.plan,
    activity: result.activity,
    resultSummary: result.resultSummary,
    confirmationRequired: result.confirmationRequired,
    executionId: result.executionId || result.id,
    toolResults: (result.activity || [])
      .filter((a) => a.status === 'completed')
      .map((a) => ({ tool: a.tool, summary: a.summary || a.message })),
    network: false,
  }
}

function mergeAgentAndDomainResults(domainInsights, agentResult) {
  const merged = {
    domainConnections: domainInsights.connections || [],
    agentSummary: agentResult?.resultSummary || null,
    agentTools: agentResult?.toolResults || [],
    conclusion: null,
  }

  if (domainInsights.connections?.[0] && agentResult?.resultSummary) {
    merged.conclusion = `${domainInsights.connections[0].what} Agent check: ${agentResult.resultSummary}`
  } else if (domainInsights.connections?.[0]) {
    merged.conclusion = domainInsights.connections[0].what
  } else if (agentResult?.resultSummary) {
    merged.conclusion = agentResult.resultSummary
  } else {
    merged.conclusion = 'Information not available for a stronger cross-system conclusion.'
  }
  return merged
}

/**
 * Main Brain ask entry — structured, explainable, hallucination-safe.
 */
async function ask(user, message = '', options = {}) {
  const started = Date.now()
  bump('requests')
  const u = requireAuthUser(user)
  const msg = String(message || '').trim().slice(0, 2000)
  if (!msg) deny('VALIDATION_ERROR', 'Message is required.')

  // Timeout guard
  const timeoutMs = options.timeoutMs || limits.MAX_EXECUTION_MS
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true }, timeoutMs)

  try {
    if (u.role !== 'student') {
      const org = buildOrgContext(u)
      return {
        ...formatAnswer({
          intent: org.intent,
          answer: org.contextText,
          why: 'Organization roles use scoped portals; student private systems are excluded.',
          context: org.urls || {},
          action: { title: 'Open your portal', why: 'Stay in authorized scope.', source: 'System', url: org.urls?.commandCenter || org.urls?.dashboard },
        }),
        role: u.role,
        observability: { latencyMs: Date.now() - started },
      }
    }

    // Memory utterances — delegate to memory service (no auto-save of insights)
    const memIntent = memoryService.detectMemoryIntent(msg)
    if (memIntent) {
      const handled = await memoryService.handleMemoryUtterance(u._id, msg, {
        confirmForget: options.confirmForget === true,
        memoryId: options.memoryId || null,
      })
      return {
        ...formatAnswer({
          intent: memIntent,
          answer: handled.summary || handled.prompt || handled.message || (handled.memory ? `Saved: ${handled.memory.content}` : 'Memory action processed.'),
          why: 'Handled by AI Memory policy (Prompt 10).',
          context: { memoryAction: handled },
          action: handled.pendingConfirmation
            ? { title: 'Confirm forget/remember', why: 'Explicit confirmation required.', source: 'Memory' }
            : { title: 'Open AI Memory', why: 'Review stored memories.', source: 'Memory', url: '/student/memory' },
        }),
        memoryAction: handled,
        observability: { latencyMs: Date.now() - started },
      }
    }

    const intent = routeBrainIntent(msg)
    const domainsNeeded = [...(INTENT_DOMAINS[intent] || INTENT_DOMAINS.GENERAL)]
    if (options.includeAgent && domainsNeeded.length < limits.MAX_DOMAIN_READS) {
      // agent coordinated separately
    }

    const domains = await loadDomains(u._id, domainsNeeded.filter((d) => d !== 'search'), {
      message: msg,
      q: msg,
    })
    if (timedOut) {
      bump('timeouts')
      deny('BRAIN_TIMEOUT', 'Unified Brain timed out assembling context.', 504)
    }

    let search = null
    if (intent === 'UNIFIED_SEARCH' || options.search) {
      search = await unifiedDomainSearch(u._id, msg)
    }

    const cross = buildCrossSystemInsights(domains)
    await syncCrossSystemEdges(u._id, cross)
    const gaps = buildGapInsights(domains, cross)
    const blockers = buildBlockers(domains)
    const conflicts = detectConflicts(domains)
    let action = buildRecommendation(intent, domains, cross, gaps, blockers)

    // Personal Operating Layer (V4 P3) — prefer for daily/priority/focus intents
    let personalLayer = null
    if (['DAILY_PLAN', 'NEXT_ACTION', 'WEEKLY_FOCUS', 'BLOCKERS'].includes(intent)) {
      try {
        const personalOperatingLayerService = require('./personalOperatingLayerService')
        personalLayer = await personalOperatingLayerService.getPersonalOperatingLayer(u._id, { message: msg })
        if (personalLayer?.nextAction?.title) {
          action = {
            title: personalLayer.nextAction.title,
            why: personalLayer.nextAction.why,
            source: personalLayer.nextAction.source || 'Personal AI Operating Layer',
            url: personalLayer.nextAction.url || '/student/personal-ai',
            actionType: personalLayer.nextAction.actionType,
          }
        }
      } catch {
        personalLayer = null
      }
    }

    // Optional single agent coordination for multi-domain prep/actions
    let agentResult = null
    let merged = null
    if (options.includeAgent || intent === 'EVENT_PREP' || intent === 'CROSS_SYSTEM') {
      if (limits.MAX_AGENT_CALLS > 0) {
        try {
          agentResult = await coordinateAgents(u, msg, { mode: options.mode || 'READ_ONLY' })
          merged = mergeAgentAndDomainResults(cross, agentResult)
        } catch (error) {
          bump('errors')
          agentResult = { state: 'FAILED', error: error.code || 'AGENT_ERROR', message: error.message }
        }
      }
    }

    // Prompt-injection: treat event/job descriptions as data when present in answer context
    const externalSnippets = []
    for (const e of (cross.events || []).slice(0, 2)) {
      if (e.description) externalSnippets.push(sanitizeExternalData(e.description, 'event'))
    }
    for (const o of (cross.opportunities || []).slice(0, 2)) {
      if (o.requirements) {
        externalSnippets.push(sanitizeExternalData(
          Array.isArray(o.requirements) ? o.requirements.join('; ') : String(o.requirements),
          'opportunity',
        ))
      }
    }

    const context = {
      goal: cross.activeGoal ? { title: cross.activeGoal.title, progress: cross.activeGoal.progress } : null,
      project: cross.activeProject ? { title: cross.activeProject.title } : null,
      learning: cross.learningTopic,
      research: cross.researchProject ? { title: cross.researchProject.title } : null,
      career: cross.career?.targetCareer || null,
      connections: cross.connections.slice(0, 5),
      alignments: cross.alignments.slice(0, 8),
      gaps: gaps.slice(0, 5),
      blockers: blockers.slice(0, 5),
      search: search?.results || null,
      externalData: externalSnippets,
      domainsFailed: Object.entries(domains)
        .filter(([, v]) => v && v.ok === false)
        .map(([k, v]) => ({ domain: k, error: v.error })),
    }

    let answer = ''
    let why = ''

    switch (intent) {
      case 'PROJECT_LEARNING':
        answer = cross.activeProject && cross.learningTopic
          ? `For project “${cross.activeProject.title}”, continue learning focused on “${cross.learningTopic}”.`
          : cross.activeProject
            ? `Continue project “${cross.activeProject.title}”. Specific learning focus is not recorded yet.`
            : 'Information not available: no active project found.'
        why = 'Grounded in portfolio project + learning intelligence (when present).'
        break
      case 'PROJECT_CAREER':
      case 'PROJECT_OPPORTUNITY':
        answer = cross.connections.find((c) => /project/i.test(c.source))?.what
          || (cross.activeProject && cross.opportunities?.[0]
            ? `Project “${cross.activeProject.title}” and opportunity “${cross.opportunities[0].title}” were compared using skill/title overlap.`
            : 'Information not available to connect project and career/opportunity yet.')
        why = 'Alignment uses explainable overlap labels — not invented percentages.'
        break
      case 'SKILL_GAP':
        answer = gaps.length
          ? gaps.slice(0, 3).map((g) => g.what).join(' ')
          : 'No evidenced skill gaps from current goal/roadmap/opportunity data.'
        why = 'Gaps require supporting evidence from learning analysis or opportunity skill lists.'
        break
      case 'ALIGNMENT_REVIEW':
        answer = cross.connections[0]?.what
          || 'Not enough overlapping signals across goal/learning/project/opportunity to claim alignment.'
        why = cross.connections[0]?.why || 'Compared canonical entity text signals only.'
        break
      case 'BLOCKERS':
        answer = blockers.length
          ? blockers.slice(0, 3).map((b) => b.what).join(' ')
          : 'No evidenced blockers from tasks/daily risks/learning gaps.'
        why = 'Blockers come from overdue tasks, daily risks, or documented skill gaps.'
        break
      case 'EVENT_PREP':
        answer = cross.events?.[0]
          ? `Prepare for “${cross.events[0].title}” by reviewing skills, related project work, and open tasks.`
          : 'Information not available: no upcoming event found.'
        why = 'Event prep coordinates Event + Project + Learning + Tasks via existing services.'
        break
      case 'UNIFIED_SEARCH':
        answer = search?.results?.length
          ? `Found ${search.results.length} authorized matches.`
          : 'No authorized matches.'
        why = 'Owner-scoped domain search only.'
        break
      case 'DAILY_PLAN':
      case 'NEXT_ACTION':
      case 'WEEKLY_FOCUS':
        if (personalLayer?.dailyPlan?.steps?.length && intent === 'DAILY_PLAN') {
          answer = personalLayer.dailyPlan.steps
            .slice(0, 4)
            .map((s) => `${s.order}. ${s.label}: ${s.title}`)
            .join(' ')
          why = personalLayer.dailyPlan.note || action.why
        } else if (personalLayer?.weeklyPlan && intent === 'WEEKLY_FOCUS') {
          answer = (personalLayer.weeklyPlan.recommendedFocus || []).length
            ? `This week focus: ${personalLayer.weeklyPlan.recommendedFocus.slice(0, 3).join('; ')}.`
            : action.title
          why = personalLayer.weeklyPlan.note || action.why
        } else {
          answer = action.title
          why = action.why
        }
        break
      default:
        answer = merged?.conclusion
          || cross.connections[0]?.what
          || action.title
          || 'Information not available.'
        why = cross.connections[0]?.why || action.why || 'Assembled from routed domain services.'
    }

    // Hallucination guard: never claim invented projects
    if (/I created|you have a project called|remember that you built/i.test(answer) && !cross.activeProject) {
      answer = 'Information not available.'
    }

    const transparency = action.source
      ? `Using sources: ${action.source}.`
      : null

    clearTimeout(timer)
    const latencyMs = Date.now() - started
    bump('latencyMsTotal', latencyMs)

    return {
      ...formatAnswer({
        intent,
        answer,
        why,
        context,
        action,
        nextStep: intent === 'EVENT_PREP'
          ? { title: 'Open AI Agent to create preparation tasks', url: '/student/agent', note: 'Writes require confirmation.' }
          : { title: 'Open Daily Life', url: '/student/daily-life' },
        conflicts,
        transparency,
      }),
      agent: agentResult,
      merged,
      personal: personalLayer
        ? {
            focus: personalLayer.currentFocus,
            health: personalLayer.health,
            nextAction: personalLayer.nextAction,
            overload: personalLayer.overload,
          }
        : null,
      observability: { latencyMs, domainsLoaded: domainsNeeded, metrics: getObservability() },
    }
  } catch (error) {
    clearTimeout(timer)
    bump('errors')
    throw error
  }
}

module.exports = {
  ALIGNMENT,
  BRAIN_INTENTS,
  routeBrainIntent,
  buildUnifiedContext,
  loadDomains,
  ask,
  getIntelligenceSummary,
  getWeeklyIntelligence,
  unifiedDomainSearch,
  coordinateAgents,
  mergeAgentAndDomainResults,
  sanitizeExternalData,
  buildCrossSystemInsights,
  buildGapInsights,
  detectConflicts,
  scoreAlignment,
  alignmentLabel,
  getObservability,
  INTENT_DOMAINS,
}
