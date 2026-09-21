/**
 * Specialist Multi-Agent Network (Thirumala V4 Prompt 2).
 *
 * Extends V3 agentOrchestratorService — ONE orchestrator, specialist network on top.
 * Does NOT create a second chatbot or bypass tool authorization.
 */
const crypto = require('crypto')
const AgentExecution = require('../../models/AgentExecution')
const limits = require('../../config/agentLimits')
const specialistAgentRegistry = require('./specialistAgentRegistry')
const agentContextBuilder = require('./agentContextBuilder')

const activeNetworkRuns = new Map() // executionId → { cancelRequested, userId }

const metrics = {
  networkRuns: 0,
  specialistCalls: 0,
  timeouts: 0,
  cancellations: 0,
  partials: 0,
  conflicts: 0,
}

function getNetworkObservability() {
  return { ...metrics }
}

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  throw err
}

function authCtx(user) {
  return { userId: user._id, role: user.role }
}

/**
 * Route which specialists are needed. Model cannot invent agents outside registry.
 */
function planSpecialists(message = '', { role = 'student', forced = [] } = {}) {
  const m = String(message || '')
  const plan = []
  const push = (name, { parallelGroup = 0, dependsOn = [] } = {}) => {
    if (plan.find((p) => p.agent === name)) return
    const agent = specialistAgentRegistry.getSpecialist(name)
    if (!agent) return
    if (!agent.roles.includes(role) && role !== 'admin') return
    plan.push({
      agent: name,
      domain: agent.domain,
      parallelGroup,
      dependsOn,
      summary: agent.description,
    })
  }

  if (forced.length) {
    forced.forEach((name, i) => push(name, { parallelGroup: 0, dependsOn: i ? [forced[i - 1]] : [] }))
    return {
      intent: 'FORCED_MULTI',
      specialists: plan.slice(0, limits.MAX_SPECIALIST_AGENTS),
      mode: forced.length > 1 ? 'sequential' : 'single',
    }
  }

  if (role === 'institution') {
    push('InstitutionAgent')
    return { intent: 'INSTITUTION', specialists: plan, mode: 'single' }
  }
  if (role === 'company') {
    push('CompanyAgent')
    return { intent: 'COMPANY', specialists: plan, mode: 'single' }
  }

  // Simple single-agent routes
  if (/\b(what should i learn|skill gap|roadmap|study next)\b/i.test(m) && !/\b(project|internship|week|prepare)\b/i.test(m)) {
    push('LearningAgent')
    return { intent: 'LEARNING_ONLY', specialists: plan, mode: 'single' }
  }
  if (/\b(plan my day|what should i do now|do today)\b/i.test(m) && !/\b(internship|hackathon|prepare)\b/i.test(m)) {
    push('DailyLifeAgent')
    return { intent: 'DAILY_ONLY', specialists: plan, mode: 'single' }
  }
  if (/\b(research)\b/i.test(m) && !/\b(career|project|week)\b/i.test(m)) {
    push('ResearchAgent')
    return { intent: 'RESEARCH_ONLY', specialists: plan, mode: 'single' }
  }
  if (/\b(event|hackathon)\b/i.test(m) && !/\b(prepare|week|internship)\b/i.test(m)) {
    push('EventAgent')
    return { intent: 'EVENT_ONLY', specialists: plan, mode: 'single' }
  }

  // Complex: career / internship prep week → dependency chain (capped)
  if (/\b(prepare .+ (internship|interview|hackathon)|this week|multi|across)\b/i.test(m)
    || (/\b(internship|career|opportunity)\b/i.test(m) && /\b(learn|project|week|prepare)\b/i.test(m))) {
    push('CareerAgent', { parallelGroup: 0 })
    push('LearningAgent', { parallelGroup: 1, dependsOn: ['CareerAgent'] })
    push('ProjectAgent', { parallelGroup: 1, dependsOn: ['CareerAgent'] })
    push('DailyLifeAgent', { parallelGroup: 0, dependsOn: ['LearningAgent', 'ProjectAgent'] })
    return {
      intent: 'CAREER_PREP_MULTI',
      specialists: plan.slice(0, limits.MAX_SPECIALIST_AGENTS),
      mode: 'mixed',
    }
  }

  // Project + learning alignment — parallel reads
  if (/\b(project)\b/i.test(m) && /\b(learn|learning|skill)\b/i.test(m)) {
    push('ProjectAgent', { parallelGroup: 1 })
    push('LearningAgent', { parallelGroup: 1 })
    return { intent: 'PROJECT_LEARNING', specialists: plan, mode: 'parallel' }
  }

  // Project + opportunity
  if (/\b(project)\b/i.test(m) && /\b(opportunit|career|internship|job)\b/i.test(m)) {
    push('ProjectAgent', { parallelGroup: 1 })
    push('CareerAgent', { parallelGroup: 1 })
    push('OpportunityAgent', { parallelGroup: 1 })
    return { intent: 'PROJECT_CAREER', specialists: plan.slice(0, limits.MAX_SPECIALIST_AGENTS), mode: 'parallel' }
  }

  // Event prep multi
  if (/\b(prepare|prep).*(event|hackathon)|(event|hackathon).*(prepare|prep)\b/i.test(m)) {
    push('EventAgent', { parallelGroup: 0 })
    push('ProjectAgent', { parallelGroup: 1, dependsOn: ['EventAgent'] })
    push('LearningAgent', { parallelGroup: 1, dependsOn: ['EventAgent'] })
    push('DailyLifeAgent', { parallelGroup: 0, dependsOn: ['ProjectAgent', 'LearningAgent'] })
    return { intent: 'EVENT_PREP_MULTI', specialists: plan.slice(0, limits.MAX_SPECIALIST_AGENTS), mode: 'mixed' }
  }

  if (/\b(opportunit|job|internship|application)\b/i.test(m)) {
    push('OpportunityAgent')
    push('CareerAgent', { parallelGroup: 1 })
    return { intent: 'OPPORTUNITY', specialists: plan, mode: plan.length > 1 ? 'parallel' : 'single' }
  }

  if (/\b(project|milestone|blocker|portfolio)\b/i.test(m)) {
    push('ProjectAgent')
    return { intent: 'PROJECT_ONLY', specialists: plan, mode: 'single' }
  }

  if (/\b(career)\b/i.test(m)) {
    push('CareerAgent')
    return { intent: 'CAREER_ONLY', specialists: plan, mode: 'single' }
  }

  // Default: Daily Life + light project context in parallel
  push('DailyLifeAgent', { parallelGroup: 1 })
  push('ProjectAgent', { parallelGroup: 1 })
  return { intent: 'GENERAL_MULTI', specialists: plan, mode: 'parallel' }
}

/**
 * Loop protection: reject if agent already visited beyond allowed repeats.
 */
function assertNoLoop(visited, agentName) {
  const count = visited.filter((v) => v === agentName).length
  if (count >= 1) {
    deny('AGENT_LOOP_BLOCKED', `Loop protection: ${agentName} already ran in this execution.`, 429)
  }
}

function withTimeout(promise, ms, label) {
  let timer
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        metrics.timeouts += 1
        const err = new Error(`${label} timed out after ${ms}ms`)
        err.code = 'AGENT_TIMEOUT'
        err.statusCode = 504
        reject(err)
      }, ms)
    }),
  ])
}

async function runSpecialist(user, agentName, message, { visited = [] } = {}) {
  assertNoLoop(visited, agentName)
  const agent = specialistAgentRegistry.getSpecialist(agentName)
  if (!agent) deny('UNKNOWN_AGENT', `Unknown specialist: ${agentName}`)

  metrics.specialistCalls += 1
  const started = Date.now()
  const stepId = crypto.randomUUID()

  try {
    const built = await agentContextBuilder.buildAgentContext(user, agentName, { message })
    const result = await withTimeout(
      agent.handler({
        message,
        ctx: authCtx(user),
        context: built.context,
        priorResults: [],
      }),
      limits.MAX_SPECIALIST_MS,
      agentName,
    )

    return {
      stepId,
      agent: agentName,
      domain: agent.domain,
      status: 'completed',
      latencyMs: Date.now() - started,
      result: {
        status: result.status || 'ok',
        summary: result.summary || '',
        facts: result.facts || [],
        inferences: result.inferences || [],
        recommendations: result.recommendations || [],
        warnings: result.warnings || [],
        suggestedActions: result.suggestedActions || [],
        confidence: result.confidence || 'MEDIUM',
        dataReferences: (result.dataReferences || []).slice(0, 5),
      },
    }
  } catch (error) {
    return {
      stepId,
      agent: agentName,
      domain: agent?.domain || '',
      status: error.code === 'AGENT_TIMEOUT' ? 'timeout' : 'failed',
      latencyMs: Date.now() - started,
      error: error.code || 'AGENT_ERROR',
      message: error.message,
      result: specialistAgentRegistry.emptyResult({
        status: 'error',
        summary: `${agentName} unavailable.`,
        warnings: [error.message],
        confidence: 'LOW',
      }),
    }
  }
}

/**
 * Detect factual conflicts across specialist outputs (do not invent resolution).
 */
function detectConflicts(steps) {
  const conflicts = []
  const project = steps.find((s) => s.agent === 'ProjectAgent' && s.status === 'completed')
  const daily = steps.find((s) => s.agent === 'DailyLifeAgent' && s.status === 'completed')

  const projectFacts = project?.result?.facts || []
  const dailyFacts = daily?.result?.facts || []

  const projectSaysIncomplete = projectFacts.some((f) => /unfinished|open related tasks|incomplete/i.test(f))
  const dailySaysClear = dailyFacts.some((f) => /no daily priorities|empty/i.test(f))
  // Soft conflict example: project has related open tasks but wording clash is rare — check milestone complete vs open task
  const completedMention = projectFacts.some((f) => /status: completed/i.test(f))
  const openTaskMention = projectFacts.some((f) => /Related open tasks/i.test(f))
  if (completedMention && openTaskMention) {
    conflicts.push({
      type: 'DATA_CONFLICT',
      what: 'Project marked completed but related open tasks remain.',
      sources: ['ProjectAgent facts', 'Task system via ProjectAgent'],
      canonicalHint: 'Prefer Task/Project canonical status fields over inference.',
    })
    metrics.conflicts += 1
  }

  // Unused vars silence — keep mild signal if both empty vs both active
  if (projectSaysIncomplete && dailySaysClear) {
    // not necessarily a conflict
  }

  return conflicts
}

function mergeSpecialistResults(steps, plan) {
  const completed = steps.filter((s) => s.status === 'completed')
  const failed = steps.filter((s) => s.status === 'failed' || s.status === 'timeout')
  const facts = []
  const inferences = []
  const recommendations = []
  const warnings = []
  const actions = []

  for (const s of completed) {
    const r = s.result || {}
    r.facts?.forEach((f) => facts.push({ agent: s.agent, kind: 'FACT', text: f }))
    r.inferences?.forEach((f) => inferences.push({ agent: s.agent, kind: 'INFERENCE', text: f }))
    r.recommendations?.forEach((f) => recommendations.push({ agent: s.agent, kind: 'RECOMMENDATION', text: f }))
    r.warnings?.forEach((w) => warnings.push({ agent: s.agent, text: w }))
    r.suggestedActions?.forEach((a) => actions.push({ ...a, agent: s.agent }))
  }

  for (const s of failed) {
    warnings.push({ agent: s.agent, text: `${s.agent} analysis unavailable (${s.error || s.status}).` })
  }

  const conflicts = detectConflicts(steps)

  let summary = recommendations[0]?.text
    || facts[0]?.text
    || 'Information not available from specialist agents.'

  // Cross-agent synthesis only when multiple completed with recommendations
  if (completed.length >= 2 && recommendations.length >= 2) {
    const agents = completed.map((s) => s.agent).join(', ')
    summary = `${recommendations[0].text} (Supported by ${agents}.)`
  }

  let state = 'COMPLETED'
  if (completed.length && failed.length) {
    state = 'PARTIAL'
    metrics.partials += 1
  } else if (!completed.length && failed.length) {
    state = 'FAILED'
  }

  return {
    state,
    intent: plan.intent,
    mode: plan.mode,
    summary,
    facts,
    inferences,
    recommendations,
    warnings,
    suggestedActions: actions.slice(0, 8),
    conflicts,
    specialists: steps.map((s) => ({
      stepId: s.stepId,
      agent: s.agent,
      status: s.status,
      summary: s.result?.summary || s.message || '',
      confidence: s.result?.confidence || '',
      latencyMs: s.latencyMs,
    })),
    availability: {
      succeeded: completed.map((s) => s.agent),
      failed: failed.map((s) => s.agent),
    },
  }
}

async function executePlan(user, message, plan, { executionId, onProgress } = {}) {
  const visited = []
  const results = []
  const specialists = plan.specialists.slice(0, limits.MAX_SPECIALIST_AGENTS)

  const emit = (payload) => {
    if (typeof onProgress === 'function') onProgress(payload)
  }

  // Group by dependency waves
  const remaining = [...specialists]
  let waves = 0
  while (remaining.length) {
    waves += 1
    if (waves > limits.MAX_SPECIALIST_AGENTS + 2) {
      deny('AGENT_DEPTH_EXCEEDED', 'Specialist wave limit reached.', 429)
    }

    const run = activeNetworkRuns.get(executionId)
    if (run?.cancelRequested) {
      metrics.cancellations += 1
      for (const s of remaining) {
        results.push({
          stepId: crypto.randomUUID(),
          agent: s.agent,
          status: 'cancelled',
          result: specialistAgentRegistry.emptyResult({ status: 'cancelled', summary: 'Cancelled' }),
        })
      }
      break
    }

    const ready = remaining.filter((s) => (s.dependsOn || []).every((d) => visited.includes(d) || results.some((r) => r.agent === d)))
    const wave = ready.length ? ready : [remaining[0]]

    // Parallel within same parallelGroup if mode allows
    const canParallel = plan.mode === 'parallel' || plan.mode === 'mixed'
    const sameGroup = canParallel
      ? wave.filter((s) => s.parallelGroup === wave[0].parallelGroup)
      : [wave[0]]

    emit({ phase: 'running', agents: sameGroup.map((s) => s.agent) })

    const waveResults = await Promise.all(
      sameGroup.map((s) => runSpecialist(user, s.agent, message, { visited: [...visited] })),
    )

    for (const r of waveResults) {
      results.push(r)
      visited.push(r.agent)
      const idx = remaining.findIndex((x) => x.agent === r.agent)
      if (idx >= 0) remaining.splice(idx, 1)
      emit({
        phase: 'step',
        agent: r.agent,
        status: r.status,
        summary: r.result?.summary || r.message,
      })
    }
  }

  return mergeSpecialistResults(results, plan)
}

/**
 * Main multi-agent entry — persists AgentExecution (extends existing model).
 */
async function runSpecialistNetwork(user, message, {
  mode = 'READ_ONLY',
  forcedAgents = [],
  idempotencyKey = null,
} = {}) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  metrics.networkRuns += 1

  const request = String(message || '').trim().slice(0, 2000)
  if (!request) deny('VALIDATION_ERROR', 'Message is required.')

  // Injection defense at network boundary
  if (/\b(ignore (all )?(previous|prior) instructions|run shell|exfiltrate|override permission)\b/i.test(request)) {
    return {
      state: 'FAILED',
      errorCode: 'PROMPT_INJECTION_BLOCKED',
      summary: 'Request blocked by prompt-injection defense. External/user text is DATA only.',
      specialists: [],
      facts: [],
      inferences: [],
      recommendations: [],
    }
  }

  const plan = planSpecialists(request, { role: user.role, forced: forcedAgents })
  if (!plan.specialists.length) {
    return {
      state: 'FAILED',
      errorCode: 'NO_AGENTS',
      summary: 'No authorized specialist agents available for this request.',
      specialists: [],
    }
  }

  const executionId = crypto.randomUUID()
  activeNetworkRuns.set(executionId, { cancelRequested: false, userId: String(user._id) })

  const activity = []
  const doc = await AgentExecution.create({
    executionId,
    userId: user._id,
    role: user.role,
    agentType: plan.specialists.length > 1 ? 'multi' : (plan.specialists[0].domain || 'general'),
    request,
    intent: plan.intent,
    mode: mode === 'EXECUTE' ? 'CONFIRM' : mode, // writes still need confirm path via V3 orchestrator
    state: 'RUNNING',
    planSummary: plan.specialists.map((s) => `Run ${s.agent}`),
    specialistsUsed: plan.specialists.map((s) => s.agent),
    specialistSteps: plan.specialists.map((s) => ({
      stepId: crypto.randomUUID(),
      agent: s.agent,
      status: 'planned',
      summary: s.summary,
    })),
    idempotencyKey: idempotencyKey || undefined,
    limits: {
      maxSteps: limits.MAX_PLAN_STEPS,
      maxToolCalls: limits.MAX_TOOL_CALLS,
      maxExecutionMs: limits.MAX_EXECUTION_MS,
      maxSpecialists: limits.MAX_SPECIALIST_AGENTS,
    },
  })

  try {
    const merged = await withTimeout(
      executePlan(user, request, plan, {
        executionId,
        onProgress: (p) => activity.push({ at: new Date().toISOString(), ...p }),
      }),
      limits.MAX_EXECUTION_MS,
      'SpecialistNetwork',
    )

    if (activeNetworkRuns.get(executionId)?.cancelRequested) {
      merged.state = merged.state === 'COMPLETED' ? 'CANCELLED' : 'CANCELLED'
      doc.state = 'CANCELLED'
    } else {
      doc.state = merged.state === 'PARTIAL' ? 'PARTIAL' : merged.state === 'FAILED' ? 'FAILED' : 'COMPLETED'
    }

    doc.specialistCallCount = merged.specialists?.length || 0
    doc.specialistSteps = (merged.specialists || []).map((s) => ({
      stepId: s.stepId,
      agent: s.agent,
      status: s.status === 'completed' ? 'completed' : s.status === 'timeout' ? 'timeout' : s.status === 'cancelled' ? 'cancelled' : 'failed',
      summary: s.summary,
      confidence: s.confidence || '',
      latencyMs: s.latencyMs || 0,
    }))
    doc.resultSummary = merged.summary
    doc.mergedResult = {
      facts: merged.facts,
      inferences: merged.inferences,
      recommendations: merged.recommendations,
      warnings: merged.warnings,
      conflicts: merged.conflicts,
      availability: merged.availability,
    }
    doc.finishedAt = new Date()
    await doc.save()

    activeNetworkRuns.delete(executionId)

    return {
      executionId,
      state: doc.state,
      intent: plan.intent,
      plan: plan.specialists.map((s, i) => ({
        order: i + 1,
        agent: s.agent,
        dependsOn: s.dependsOn || [],
        parallelGroup: s.parallelGroup,
        summary: `Analyze via ${s.agent}`,
      })),
      activity: activity.map((a) => ({
        status: a.phase === 'step' ? (a.status === 'completed' ? 'completed' : 'failed') : 'executing',
        summary: a.phase === 'step'
          ? `${a.status === 'completed' ? '✓' : '✗'} ${a.agent}: ${a.summary || ''}`.trim()
          : `→ Running: ${(a.agents || []).join(', ')}`,
        agent: a.agent,
      })),
      summary: merged.summary,
      facts: merged.facts,
      inferences: merged.inferences,
      recommendations: merged.recommendations,
      warnings: merged.warnings,
      conflicts: merged.conflicts,
      suggestedActions: merged.suggestedActions,
      specialists: merged.specialists,
      availability: merged.availability,
      confirmationRequired: false,
      note: 'Write actions still require V3 orchestrator confirmation (/api/agent/run with CONFIRM mode).',
      observability: getNetworkObservability(),
    }
  } catch (error) {
    doc.state = 'FAILED'
    doc.errorCode = error.code || 'NETWORK_ERROR'
    doc.resultSummary = error.message
    doc.finishedAt = new Date()
    await doc.save().catch(() => null)
    activeNetworkRuns.delete(executionId)
    throw error
  }
}

async function cancelNetworkExecution(userId, executionId) {
  const run = activeNetworkRuns.get(executionId)
  if (run && String(run.userId) === String(userId)) {
    run.cancelRequested = true
    const doc = await AgentExecution.findOne({ executionId, userId })
    if (doc) {
      doc.state = 'CANCELLING'
      doc.cancelRequested = true
      await doc.save()
    }
    return { cancelling: true, executionId }
  }
  const doc = await AgentExecution.findOne({ executionId, userId })
  if (!doc) deny('NOT_FOUND', 'Execution not found.', 404)
  doc.cancelRequested = true
  if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(doc.state)) {
    doc.state = 'CANCELLED'
    doc.finishedAt = new Date()
  }
  await doc.save()
  return { cancelled: true, executionId, state: doc.state }
}

module.exports = {
  planSpecialists,
  runSpecialist,
  runSpecialistNetwork,
  mergeSpecialistResults,
  detectConflicts,
  cancelNetworkExecution,
  getNetworkObservability,
  listSpecialists: specialistAgentRegistry.listSpecialists,
  getSpecialist: specialistAgentRegistry.getSpecialist,
}
