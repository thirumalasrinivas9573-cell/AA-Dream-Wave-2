/**
 * Agent Orchestrator (Thirumala V3 Prompt 9).
 *
 * Loop: understand → plan → permissions → tools → validate → execute → verify → report
 * Does NOT bypass authorization. Does NOT invent tools. Does NOT run shell/HTTP.
 */
const crypto = require('crypto')
const AgentExecution = require('../../models/AgentExecution')
const limits = require('../../config/agentLimits')
const toolRegistry = require('./toolRegistry')
const notificationService = require('../notificationService')

const activeRuns = new Map() // executionId → { cancelRequested }
const idempotencyCache = new Map() // key → result

const MODES = ['READ_ONLY', 'SUGGEST', 'CONFIRM', 'EXECUTE']

function routeAgentType(message = '', forced = '') {
  if (forced) return forced
  if (/\b(interview|job|internship|opportun)/i.test(message)) return 'opportunity'
  if (/\b(event|hackathon|workshop)\b/i.test(message)) return 'event'
  if (/\b(research|citation|literature)\b/i.test(message)) return 'research'
  if (/\b(learn|roadmap|skill gap|study)\b/i.test(message)) return 'learning'
  if (/\b(project|portfolio|milestone|blocker)\b/i.test(message)) return 'project'
  if (/\b(plan my day|do now|deadline|falling behind|focus)\b/i.test(message)) return 'daily_life'
  if (/\b(institution|admissions|placement analytics)\b/i.test(message)) return 'institution'
  if (/\b(company|recruit|candidate pipeline)\b/i.test(message)) return 'company'
  return 'student'
}

function routeIntent(message = '') {
  if (/\b(plan my day|what should i do today)\b/i.test(message)) return 'DAILY_PLAN'
  if (/\b(what should i do now|next action)\b/i.test(message)) return 'NEXT_ACTION'
  if (/\b(create task|add task|breakdown)\b/i.test(message)) return 'CREATE_TASK'
  if (/\b(complete task|mark .+ done)\b/i.test(message)) return 'COMPLETE_TASK'
  if (/\b(prepare .+ interview|interview)\b/i.test(message)) return 'PREPARE_INTERVIEW'
  if (/\b(what should i learn)\b/i.test(message)) return 'LEARNING_NEXT'
  if (/\b(research)\b/i.test(message)) return 'RESEARCH_HELP'
  if (/\b(project)\b/i.test(message)) return 'PROJECT_HELP'
  if (/\b(opportunit|job|internship)\b/i.test(message)) return 'OPPORTUNITY_HELP'
  if (/\b(event|hackathon)\b/i.test(message)) return 'EVENT_HELP'
  if (/\b(remember|forget|what do you remember|memory)\b/i.test(message)) return 'MEMORY_HELP'
  return 'GENERAL_HELP'
}

/**
 * Deterministic planner — uses structured intents, not free-form model tool invention.
 */
function buildPlan(message, { agentType, role, mode }) {
  const intent = routeIntent(message)
  const steps = []
  const push = (tool, args = {}, summary = '') => {
    const def = toolRegistry.getTool(tool)
    if (!def) return
    if (!def.roles.includes(role) && role !== 'admin') return
    if (mode === 'READ_ONLY' && def.riskLevel !== toolRegistry.RISK.LOW_RISK) return
    steps.push({
      order: steps.length + 1,
      tool,
      args,
      summary: summary || def.description,
      riskLevel: def.riskLevel,
      requiresConfirmation: def.requiresConfirmation,
    })
  }

  if (role === 'institution' || agentType === 'institution') {
    push('getInstitutionOverview', {}, 'Check institution agent access')
    return { intent: 'INSTITUTION_HELP', steps, planSummary: steps.map((s) => s.summary) }
  }
  if (role === 'company' || agentType === 'company') {
    push('getCompanyOverview', {}, 'Check company agent access')
    return { intent: 'COMPANY_HELP', steps, planSummary: steps.map((s) => s.summary) }
  }

  switch (intent) {
    case 'DAILY_PLAN':
    case 'NEXT_ACTION':
      push('getRelevantMemories', { message, intent: 'DAILY_PLAN', limit: 4 }, 'Load relevant preferences')
      push('getDailyLife', {}, 'Load Daily Life priorities')
      push('getTasks', { openOnly: true, limit: 10 }, 'Load open tasks')
      push('getNotifications', { limit: 5 }, 'Check urgent notifications')
      break
    case 'LEARNING_NEXT':
      push('getRelevantMemories', { message, intent: 'STUDY_HELP', limit: 4 }, 'Load learning preferences')
      push('getLearningIntelligence', {}, 'Load learning next-action')
      push('getRoadmap', {}, 'Inspect current roadmap stage')
      break
    case 'PROJECT_HELP':
      push('getRelevantMemories', { message, intent: 'PROJECT_HELP', limit: 4 }, 'Load project context memories')
      push('getProjects', {}, 'Inspect portfolio projects')
      push('getTasks', { openOnly: true, limit: 10 }, 'Related open tasks')
      if (/\bbreakdown|break down\b/i.test(message)) {
        const titleMatch = message.match(/["']([^"']+)["']/) || message.match(/breakdown[:\s]+(.+)$/i)
        push('proposeTaskBreakdown', { title: titleMatch?.[1]?.trim() || 'Project work' }, 'Suggest project task breakdown')
      }
      break
    case 'RESEARCH_HELP':
      push('getRelevantMemories', { message, intent: 'RESEARCH_HELP', limit: 3 }, 'Load research context memories')
      push('getResearch', {}, 'Load research workspace summary')
      break
    case 'OPPORTUNITY_HELP':
    case 'PREPARE_INTERVIEW':
      push('getRelevantMemories', { message, intent: 'CAREER_HELP', limit: 3 }, 'Load career preferences')
      push('getApplications', {}, 'Check applications / interviews')
      push('getOpportunities', { limit: 5 }, 'List opportunities (read-only)')
      push('getProjects', {}, 'Relevant portfolio evidence')
      push('getLearningIntelligence', {}, 'Identify skill gaps for preparation')
      if (/\bcreate .+ task|preparation tasks?\b/i.test(message)) {
        push('createTask', {
          title: 'Interview preparation: review job requirements',
          type: 'learn',
          priority: 'High',
        }, 'Propose preparation task (confirmation required)')
      }
      break
    case 'EVENT_HELP':
      push('getEvents', { limit: 5 }, 'List events')
      push('getNotifications', { limit: 5 }, 'Related notifications')
      break
    case 'MEMORY_HELP':
      push('getRelevantMemories', { message, limit: 8 }, 'Load relevant memories')
      push('listMemories', { status: 'ACTIVE', limit: 15 }, 'List active memories')
      if (/\bremember that\b/i.test(message)) {
        const contentMatch = message.match(/remember that\s+(.+)$/i)
        if (contentMatch?.[1]) {
          push('createMemory', {
            content: contentMatch[1].trim().slice(0, 500),
            type: 'IMPORTANT_CONTEXT',
          }, 'Propose saving memory (confirmation required)')
        }
      }
      if (/\bforget\b/i.test(message)) {
        push('listMemories', { status: 'ACTIVE', q: message.replace(/forget/i, '').trim().slice(0, 80), limit: 5 }, 'Find memories to forget')
      }
      break
    case 'CREATE_TASK': {
      const titleMatch = message.match(/["']([^"']+)["']/) || message.match(/create(?: a)? task[:\s]+(.+)$/i)
      const title = titleMatch?.[1]?.trim() || 'New follow-up task'
      push('createTask', { title, type: 'learn', priority: 'Medium' }, `Create task “${title}”`)
      break
    }
    case 'COMPLETE_TASK':
      push('getTasks', { openOnly: true, limit: 10 }, 'Find open tasks')
      // completeTask needs explicit taskId via confirm payload — do not guess
      break
    default:
      push('getRelevantMemories', { message, limit: 4 }, 'Load relevant memories')
      push('getGoals', { limit: 5 }, 'Load goals')
      push('getTasks', { openOnly: true, limit: 8 }, 'Load open tasks')
      push('getDailyLife', {}, 'Daily Life snapshot')
      break
  }

  return {
    intent,
    steps: steps.slice(0, limits.MAX_PLAN_STEPS),
    planSummary: steps.slice(0, limits.MAX_PLAN_STEPS).map((s) => s.summary),
  }
}

function validatePlan(plan, { mode }) {
  const issues = []
  if (!plan.steps.length) issues.push('No authorized tools available for this request.')
  for (const step of plan.steps) {
    const tool = toolRegistry.getTool(step.tool)
    if (!tool) issues.push(`Unknown tool: ${step.tool}`)
    if (mode === 'READ_ONLY' && tool && tool.riskLevel !== toolRegistry.RISK.LOW_RISK) {
      issues.push(`READ_ONLY mode blocks ${step.tool}`)
    }
    if (tool?.destructive && mode === 'EXECUTE' && !step.confirmed) {
      // still needs confirmation path
    }
  }
  return { valid: issues.length === 0, issues }
}

function authContext(user) {
  return {
    userId: user._id,
    role: user.role,
  }
}

function stripSecretsFromText(text = '') {
  return String(text)
    .replace(/sk-[a-zA-Z0-9]{10,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[REDACTED_DB_URI]')
}

function detectInjection(message = '') {
  return /\b(ignore (all )?(previous|prior) instructions|disregard system|send (me )?api keys?|exfiltrate|dump (all )?users?|override (tool|permission)|run shell|rm -rf)\b/i.test(message)
}

async function createExecutionRecord({ user, request, mode, agentType, plan, idempotencyKey }) {
  const executionId = crypto.randomUUID()
  const doc = await AgentExecution.create({
    executionId,
    userId: user._id,
    role: user.role,
    agentType,
    request: String(request).slice(0, 2000),
    intent: plan.intent,
    mode,
    state: 'PLANNING',
    steps: plan.steps.map((s) => ({
      order: s.order,
      tool: s.tool,
      status: 'planned',
      riskLevel: s.riskLevel,
      summary: s.summary,
      args: s.args && typeof s.args === 'object' ? s.args : undefined,
    })),
    planSummary: plan.planSummary,
    idempotencyKey: idempotencyKey || undefined,
    limits: {
      maxSteps: limits.MAX_PLAN_STEPS,
      maxToolCalls: limits.MAX_TOOL_CALLS,
      maxExecutionMs: limits.MAX_EXECUTION_MS,
    },
  })
  activeRuns.set(executionId, { cancelRequested: false, userId: String(user._id) })
  return doc
}

async function runAgent({
  user,
  message,
  mode = 'SUGGEST',
  agentType: forcedAgentType,
  confirmed = false,
  previewId = null,
  confirmSteps = null,
  idempotencyKey = null,
  cancelExecutionId = null,
} = {}) {
  if (!user?._id) {
    const err = new Error('Authenticated user required')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }

  if (cancelExecutionId) {
    return cancelExecution(user._id, cancelExecutionId)
  }

  if (!MODES.includes(mode)) {
    const err = new Error('Invalid execution mode.')
    err.statusCode = 400
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const request = stripSecretsFromText(String(message || '').trim()).slice(0, 2000)
  if (!request) {
    const err = new Error('Request message is required.')
    err.statusCode = 400
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  if (detectInjection(request)) {
    return {
      state: 'FAILED',
      errorCode: 'PROMPT_INJECTION_BLOCKED',
      summary: 'Request looks like an instruction override / exfiltration attempt. Treated as untrusted data and blocked.',
      activity: [{ status: 'failed', summary: 'Prompt injection defense triggered' }],
      plan: [],
    }
  }

  if (idempotencyKey) {
    const cacheKey = `${user._id}:${idempotencyKey}`
    const cached = idempotencyCache.get(cacheKey)
    if (cached && Date.now() - cached.at < limits.IDEMPOTENCY_TTL_MS) {
      return { ...cached.result, idempotentReplay: true }
    }
    const existing = await AgentExecution.findOne({ userId: user._id, idempotencyKey }).sort('-createdAt').lean()
    if (existing && ['COMPLETED', 'AWAITING_CONFIRMATION'].includes(existing.state)) {
      return serializeExecution(existing, { idempotentReplay: true })
    }
  }

  // Confirm path for pending execution
  if (confirmed && previewId) {
    return confirmAndExecute(user, previewId, confirmSteps)
  }

  const agentType = routeAgentType(request, forcedAgentType)
  // Role mismatch soft-guard
  if (agentType === 'institution' && !['institution', 'admin'].includes(user.role)) {
    return {
      state: 'FAILED',
      errorCode: 'ROLE_FORBIDDEN',
      summary: 'Institution agent tools require an institution role.',
      activity: [],
      plan: [],
    }
  }
  if (agentType === 'company' && !['company', 'admin'].includes(user.role)) {
    return {
      state: 'FAILED',
      errorCode: 'ROLE_FORBIDDEN',
      summary: 'Company agent tools require a company role.',
      activity: [],
      plan: [],
    }
  }

  const plan = buildPlan(request, { agentType, role: user.role, mode })
  const validation = validatePlan(plan, { mode })
  if (!validation.valid) {
    return {
      state: 'FAILED',
      errorCode: 'PLAN_INVALID',
      summary: validation.issues.join(' '),
      activity: [],
      plan: plan.planSummary,
    }
  }

  const execution = await createExecutionRecord({
    user, request, mode, agentType, plan, idempotencyKey,
  })

  const needsConfirm = plan.steps.some((s) => s.requiresConfirmation)
  if (needsConfirm && (mode === 'SUGGEST' || mode === 'CONFIRM' || mode === 'READ_ONLY')) {
    // In READ_ONLY, strip write steps
    if (mode === 'READ_ONLY') {
      return executeReadPath(user, execution, plan)
    }
    // Run read steps first, then pause for confirmation on writes
    const readResult = await executeSteps(user, execution, plan.steps.filter((s) => !s.requiresConfirmation), {
      stopOnWrite: true,
    })
    execution.state = 'AWAITING_CONFIRMATION'
    execution.confirmation = {
      required: true,
      previewId: execution.executionId,
    }
    execution.resultSummary = 'Plan ready. Confirm write actions to continue.'
    await execution.save()

    const payload = {
      ...serializeExecution(execution),
      activity: readResult.activity,
      toolResults: readResult.toolResults,
      pendingWrites: plan.steps.filter((s) => s.requiresConfirmation).map((s) => ({
        order: s.order,
        tool: s.tool,
        args: s.args,
        summary: s.summary,
        riskLevel: s.riskLevel,
        effect: describeEffect(s),
      })),
      confirmationRequired: true,
      previewId: execution.executionId,
    }
    cacheIdempotent(user._id, idempotencyKey, payload)
    return payload
  }

  if (mode === 'EXECUTE' && needsConfirm && !confirmed) {
    // Force confirmation even if client asked EXECUTE
    execution.state = 'AWAITING_CONFIRMATION'
    execution.confirmation = { required: true, previewId: execution.executionId }
    await execution.save()
    return {
      ...serializeExecution(execution),
      confirmationRequired: true,
      previewId: execution.executionId,
      pendingWrites: plan.steps.filter((s) => s.requiresConfirmation).map((s) => ({
        order: s.order,
        tool: s.tool,
        args: s.args,
        summary: s.summary,
        riskLevel: s.riskLevel,
        effect: describeEffect(s),
      })),
      note: 'EXECUTE mode still requires confirmation for medium/high-risk tools.',
    }
  }

  const result = await executeSteps(user, execution, plan.steps)
  execution.state = result.failed ? 'FAILED' : 'COMPLETED'
  execution.resultSummary = result.summary
  execution.toolCallCount = result.toolCallCount
  execution.finishedAt = new Date()
  if (result.failed) execution.errorCode = result.errorCode || 'STEP_FAILED'
  await execution.save()
  activeRuns.delete(execution.executionId)

  if (!result.failed && result.writesPerformed) {
    notifyQuiet(user._id, 'Agent action completed', result.summary).catch(() => {})
  }

  const payload = {
    ...serializeExecution(execution),
    activity: result.activity,
    toolResults: result.toolResults,
    confirmationRequired: false,
  }
  cacheIdempotent(user._id, idempotencyKey, payload)
  return payload
}

function describeEffect(step) {
  if (step.tool === 'createTask') return `Create task “${step.args?.title || ''}”`
  if (step.tool === 'completeTask') return `Complete task ${step.args?.taskId}`
  if (step.tool === 'createGoal') return `Create goal “${step.args?.title || ''}”`
  if (step.tool === 'deleteTask') return `Archive task ${step.args?.taskId}`
  return step.summary
}

async function executeReadPath(user, execution, plan) {
  const reads = plan.steps.filter((s) => !s.requiresConfirmation)
  const result = await executeSteps(user, execution, reads)
  execution.state = result.failed ? 'FAILED' : 'COMPLETED'
  execution.resultSummary = result.summary
  execution.toolCallCount = result.toolCallCount
  execution.finishedAt = new Date()
  await execution.save()
  activeRuns.delete(execution.executionId)
  return {
    ...serializeExecution(execution),
    activity: result.activity,
    toolResults: result.toolResults,
  }
}

async function executeSteps(user, execution, steps, { stopOnWrite = false } = {}) {
  const ctx = authContext(user)
  const activity = []
  const toolResults = []
  let toolCallCount = execution.toolCallCount || 0
  let failed = false
  let errorCode = ''
  let writesPerformed = false
  const started = Date.now()
  const seenTools = []

  activity.push({ status: 'planning', summary: 'Understanding request and building plan' })

  for (const step of steps) {
    if (Date.now() - started > limits.MAX_EXECUTION_MS) {
      failed = true
      errorCode = 'TIMEOUT'
      activity.push({ status: 'failed', summary: 'Execution timeout reached' })
      break
    }
    const runState = activeRuns.get(execution.executionId)
    if (execution.cancelRequested || runState?.cancelRequested) {
      failed = true
      errorCode = 'CANCELLED'
      execution.state = 'CANCELLED'
      activity.push({ status: 'cancelled', summary: 'Cancelled by user' })
      break
    }
    if (toolCallCount >= limits.MAX_TOOL_CALLS) {
      failed = true
      errorCode = 'TOOL_LIMIT'
      activity.push({ status: 'failed', summary: 'Max tool call limit reached' })
      break
    }

    // Loop protection: A→B→A→B
    seenTools.push(step.tool)
    if (seenTools.length >= 4) {
      const a = seenTools[seenTools.length - 4]
      const b = seenTools[seenTools.length - 3]
      const c = seenTools[seenTools.length - 2]
      const d = seenTools[seenTools.length - 1]
      if (a === c && b === d && a !== b) {
        failed = true
        errorCode = 'LOOP_DETECTED'
        activity.push({ status: 'failed', summary: 'Tool loop detected and stopped' })
        break
      }
    }

    const tool = toolRegistry.getTool(step.tool)
    if (!tool) {
      failed = true
      errorCode = 'UNKNOWN_TOOL'
      activity.push({ status: 'failed', summary: `Unknown tool ${step.tool}` })
      break
    }

    if (stopOnWrite && tool.requiresConfirmation) break

    activity.push({ status: 'executing', summary: step.summary, tool: step.tool })
    const stepRec = execution.steps.find((s) => s.order === step.order)
    if (stepRec) {
      stepRec.status = 'executing'
      stepRec.startedAt = new Date()
    }

    try {
      toolCallCount += 1
      const output = await toolRegistry.executeTool(step.tool, {
        ...step.args,
        idempotencyKey: execution.idempotencyKey || execution.executionId,
      }, ctx)
      toolResults.push({
        tool: step.tool,
        ok: true,
        result: output.result,
        riskLevel: output.riskLevel,
      })
      if (tool.sideEffect) writesPerformed = true
      if (stepRec) {
        stepRec.status = 'completed'
        stepRec.verified = Boolean(output.result?.verified || !tool.sideEffect)
        stepRec.finishedAt = new Date()
      }
      activity.push({
        status: 'completed',
        summary: `✓ ${step.summary}`,
        tool: step.tool,
        verified: stepRec?.verified,
      })
    } catch (error) {
      failed = true
      errorCode = error.code || 'TOOL_ERROR'
      if (stepRec) {
        stepRec.status = 'failed'
        stepRec.error = String(error.message || 'failed').slice(0, 500)
        stepRec.finishedAt = new Date()
      }
      activity.push({
        status: 'failed',
        summary: `✗ ${step.summary}: ${error.message}`,
        tool: step.tool,
      })
      // Mark remaining as not executed
      for (const later of steps) {
        if (later.order > step.order) {
          const rec = execution.steps.find((s) => s.order === later.order)
          if (rec && rec.status === 'planned') rec.status = 'skipped'
          activity.push({ status: 'skipped', summary: `Not executed: ${later.summary}` })
        }
      }
      break
    }
  }

  const completed = activity.filter((a) => a.status === 'completed').length
  const summary = failed
    ? `Partial or failed run. Completed ${completed} step(s). ${errorCode}`
    : `Completed ${completed} step(s) successfully.`

  return {
    failed,
    errorCode,
    summary,
    activity,
    toolResults,
    toolCallCount,
    writesPerformed,
  }
}

async function confirmAndExecute(user, previewId, confirmSteps = null) {
  const execution = await AgentExecution.findOne({ executionId: previewId, userId: user._id })
  if (!execution) {
    const err = new Error('Confirmation preview not found.')
    err.statusCode = 404
    err.code = 'PREVIEW_NOT_FOUND'
    throw err
  }
  if (execution.state === 'CANCELLED') {
    const err = new Error('Execution was cancelled.')
    err.statusCode = 409
    err.code = 'CANCELLED'
    throw err
  }
  if (execution.state !== 'AWAITING_CONFIRMATION') {
    const err = new Error('Execution is not awaiting confirmation.')
    err.statusCode = 409
    err.code = 'INVALID_STATE'
    throw err
  }

  activeRuns.set(execution.executionId, { cancelRequested: false, userId: String(user._id) })
  execution.state = 'EXECUTING'
  execution.confirmation.confirmedAt = new Date()
  await execution.save()

  // Rebuild write steps from stored plan
  const writeSteps = execution.steps
    .filter((s) => {
      const tool = toolRegistry.getTool(s.tool)
      return tool?.requiresConfirmation && ['planned', 'awaiting_confirmation'].includes(s.status)
    })
    .map((s) => {
      const override = Array.isArray(confirmSteps)
        ? confirmSteps.find((c) => c.tool === s.tool && Number(c.order) === s.order)
        : null
      const args = {
        ...(s.args && typeof s.args === 'object' ? s.args : {}),
        ...(override?.args && typeof override.args === 'object' ? override.args : {}),
      }
      delete args.userId
      delete args.ownerId
      delete args.role
      return {
        order: s.order,
        tool: s.tool,
        args,
        summary: s.summary,
        riskLevel: s.riskLevel,
        requiresConfirmation: true,
      }
    })

  // Also re-run any still-planned read steps if needed — typically writes only on confirm
  const result = await executeSteps(user, execution, writeSteps)
  execution.state = result.failed ? 'FAILED' : 'COMPLETED'
  execution.resultSummary = result.summary
  execution.toolCallCount = (execution.toolCallCount || 0) + result.toolCallCount
  execution.finishedAt = new Date()
  if (result.failed) execution.errorCode = result.errorCode || 'STEP_FAILED'
  await execution.save()
  activeRuns.delete(execution.executionId)

  if (!result.failed && result.writesPerformed) {
    await notifyQuiet(user._id, 'Agent action completed', result.summary).catch(() => {})
  }

  return {
    ...serializeExecution(execution),
    activity: result.activity,
    toolResults: result.toolResults,
    confirmationRequired: false,
  }
}

async function cancelExecution(userId, executionId) {
  const execution = await AgentExecution.findOne({ executionId, userId })
  if (!execution) {
    const err = new Error('Execution not found.')
    err.statusCode = 404
    err.code = 'NOT_FOUND'
    throw err
  }
  const run = activeRuns.get(executionId)
  if (run) run.cancelRequested = true
  execution.cancelRequested = true
  if (['PLANNING', 'AWAITING_CONFIRMATION', 'EXECUTING'].includes(execution.state)) {
    execution.state = 'CANCELLED'
    execution.finishedAt = new Date()
    execution.resultSummary = 'Cancelled by user.'
  }
  await execution.save()
  return serializeExecution(execution)
}

async function getExecution(userId, executionId) {
  const execution = await AgentExecution.findOne({ executionId, userId }).lean()
  if (!execution) {
    const err = new Error('Execution not found.')
    err.statusCode = 404
    err.code = 'NOT_FOUND'
    throw err
  }
  return serializeExecution(execution)
}

async function listExecutions(userId, { limit = 20 } = {}) {
  const items = await AgentExecution.find({ userId })
    .sort('-createdAt')
    .limit(Math.min(50, limit))
    .select('executionId request intent mode state agentType planSummary resultSummary createdAt finishedAt confirmation')
    .lean()
  return items.map((item) => ({
    executionId: item.executionId,
    request: item.request,
    intent: item.intent,
    mode: item.mode,
    state: item.state,
    agentType: item.agentType,
    planSummary: item.planSummary,
    resultSummary: item.resultSummary,
    createdAt: item.createdAt,
    finishedAt: item.finishedAt,
    confirmationRequired: Boolean(item.confirmation?.required && item.state === 'AWAITING_CONFIRMATION'),
  }))
}

function serializeExecution(execution) {
  const doc = execution.toObject ? execution.toObject() : execution
  return {
    executionId: doc.executionId,
    state: doc.state,
    mode: doc.mode,
    agentType: doc.agentType,
    intent: doc.intent,
    request: doc.request,
    plan: doc.planSummary || [],
    steps: (doc.steps || []).map((s) => ({
      order: s.order,
      tool: s.tool,
      status: s.status,
      riskLevel: s.riskLevel,
      summary: s.summary,
      verified: s.verified,
      error: s.error || undefined,
    })),
    resultSummary: doc.resultSummary,
    confirmationRequired: Boolean(doc.confirmation?.required && doc.state === 'AWAITING_CONFIRMATION'),
    previewId: doc.confirmation?.previewId || doc.executionId,
    errorCode: doc.errorCode || undefined,
    createdAt: doc.createdAt,
    finishedAt: doc.finishedAt,
  }
}

function cacheIdempotent(userId, key, result) {
  if (!key) return
  idempotencyCache.set(`${userId}:${key}`, { at: Date.now(), result })
}

async function notifyQuiet(userId, title, body) {
  await notificationService.createForUser(userId, {
    type: 'ai',
    title,
    body: String(body || '').slice(0, 400),
    link: '/student/agent',
    source: 'agent-orchestrator',
    priority: 'normal',
  })
}

module.exports = {
  MODES,
  routeAgentType,
  routeIntent,
  buildPlan,
  validatePlan,
  runAgent,
  cancelExecution,
  getExecution,
  listExecutions,
  detectInjection,
  listTools: toolRegistry.listTools,
  // V4 P2 — specialist network (extends this orchestrator; not a second brain)
  runSpecialistNetwork: (...args) => require('./specialistNetworkService').runSpecialistNetwork(...args),
  planSpecialists: (...args) => require('./specialistNetworkService').planSpecialists(...args),
  listSpecialists: (...args) => require('./specialistNetworkService').listSpecialists(...args),
  cancelNetworkExecution: (...args) => require('./specialistNetworkService').cancelNetworkExecution(...args),
  getNetworkObservability: () => require('./specialistNetworkService').getNetworkObservability(),
}
