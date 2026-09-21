/**
 * Workflow Intelligence Engine (Thirumala V4 Prompt 5).
 *
 * Coordinates THINK → PLAN → PREPARE → APPROVE → EXECUTE → VERIFY → REPORT.
 * Extends AgentExecution — does NOT create WorkflowV4 / TaskV4 / AgentV4.
 *
 * Writes go through toolRegistry with confirmation.
 * Shell/HTTP/Git destructive ops remain blocked.
 */
const crypto = require('crypto')
const AgentExecution = require('../../models/AgentExecution')
const toolRegistry = require('./toolRegistry')
const limits = require('../../config/workflowLimits')
const notificationService = require('../notificationService')

const activeLocks = new Map()
const visitedDepth = new Map()

const TEMPLATES = {
  PROJECT_SETUP: 'PROJECT_SETUP',
  PROJECT_REVIEW: 'PROJECT_REVIEW',
  WEEKLY_REVIEW: 'WEEKLY_REVIEW',
  LEARNING_PLAN: 'LEARNING_PLAN',
  RESEARCH_PLAN: 'RESEARCH_PLAN',
  CAREER_PREPARATION: 'CAREER_PREPARATION',
  EVENT_PREPARATION: 'EVENT_PREPARATION',
  APPLICATION_PREPARATION: 'APPLICATION_PREPARATION',
  DEMO_PREPARATION: 'DEMO_PREPARATION',
  AD_HOC: 'AD_HOC',
}

const STEP_TYPES = {
  READ: 'READ', ANALYZE: 'ANALYZE', PLAN: 'PLAN', RECOMMEND: 'RECOMMEND',
  CREATE: 'CREATE', UPDATE: 'UPDATE', COMMUNICATE: 'COMMUNICATE',
  EXTERNAL_ACTION: 'EXTERNAL_ACTION', VERIFY: 'VERIFY',
}

const WRITE_TYPES = new Set(['CREATE', 'UPDATE', 'COMMUNICATE', 'EXTERNAL_ACTION'])

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  throw err
}

function requireUser(user) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  return user
}

function newId(prefix = 'wf') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
}

function hashPlan(steps = []) {
  const payload = steps.map((s) => ({
    stepId: s.stepId, tool: s.tool, type: s.type, args: s.args || {}, dependsOn: s.dependsOn || [],
  }))
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32)
}

function pushEvent(execution, type, summary, stepRef = '') {
  execution.events = execution.events || []
  execution.events.push({
    at: new Date(), type,
    summary: String(summary || '').slice(0, 400),
    stepRef: String(stepRef || '').slice(0, 64),
  })
  if (execution.events.length > 80) execution.events = execution.events.slice(-80)
}

function classifyTemplate(message = '', forced = '') {
  if (forced && TEMPLATES[forced]) return forced
  const m = String(message || '')
  if (/\b(demo|tomorrow'?s demo|prepare .+ demo)\b/i.test(m)) return TEMPLATES.DEMO_PREPARATION
  if (/\b(hackathon|event|workshop)\b/i.test(m)) return TEMPLATES.EVENT_PREPARATION
  if (/\b(internship|job|application|career)\b/i.test(m)) return TEMPLATES.CAREER_PREPARATION
  if (/\b(research)\b/i.test(m)) return TEMPLATES.RESEARCH_PLAN
  if (/\b(study|learning|learn)\b/i.test(m)) return TEMPLATES.LEARNING_PLAN
  if (/\b(weekly review|week in review)\b/i.test(m)) return TEMPLATES.WEEKLY_REVIEW
  if (/\b(project review|review (my )?project)\b/i.test(m)) return TEMPLATES.PROJECT_REVIEW
  if (/\b(setup|set up).{0,20}project\b/i.test(m)) return TEMPLATES.PROJECT_SETUP
  if (/\b(project|milestone|prepare)\b/i.test(m)) return TEMPLATES.PROJECT_REVIEW
  return TEMPLATES.AD_HOC
}

function detectInjection(message = '') {
  return /\b(ignore (all )?(previous|prior) instructions|exfiltrate|run shell|sudo |git (reset|push --force)|rm -rf)\b/i.test(message)
}

function buildWorkflowPlan(message, { template, userOverride = '' } = {}) {
  const msg = `${message} ${userOverride}`.trim()
  const steps = []
  const scope = []
  let name = 'Workflow'
  let agentType = 'student'

  const add = ({ tool, type, summary, args = {}, dependsOn = [], agent = '', approvalRequired = null }) => {
    const def = toolRegistry.getTool(tool)
    if (!def) return
    const stepId = `s${steps.length + 1}`
    const write = WRITE_TYPES.has(type) || def.requiresConfirmation
    steps.push({
      order: steps.length + 1, stepId, tool,
      type: type || (write ? STEP_TYPES.CREATE : STEP_TYPES.READ),
      summary: summary || def.description, args, dependsOn, agent,
      approvalRequired: approvalRequired != null ? approvalRequired : write,
      riskLevel: def.riskLevel, status: 'planned', requiresConfirmation: write,
    })
  }

  switch (template) {
    case TEMPLATES.DEMO_PREPARATION:
    case TEMPLATES.EVENT_PREPARATION:
      name = template === TEMPLATES.DEMO_PREPARATION ? 'Prepare Demo' : 'Prepare Event / Hackathon'
      agentType = template === TEMPLATES.DEMO_PREPARATION ? 'project' : 'event'
      scope.push('project_analysis', 'task_planning', 'deadline_awareness', 'checklist')
      add({ tool: 'getProjects', type: 'READ', summary: 'Inspect project status', agent: 'project' })
      add({ tool: 'getTasks', type: 'READ', summary: 'Inspect open tasks / milestones', args: { openOnly: true, limit: 12 }, dependsOn: ['s1'], agent: 'project' })
      add({ tool: 'getResearch', type: 'READ', summary: 'Inspect relevant research', dependsOn: ['s1'], agent: 'research' })
      add({ tool: 'getLearningIntelligence', type: 'READ', summary: 'Inspect learning gaps', dependsOn: ['s1'], agent: 'learning' })
      add({ tool: 'getEvents', type: 'READ', summary: 'Inspect event / deadline context', agent: 'event' })
      add({ tool: 'getDailyLife', type: 'ANALYZE', summary: 'Identify priorities and blockers', dependsOn: ['s2', 's5'], agent: 'daily_life' })
      add({ tool: 'proposeTaskBreakdown', type: 'RECOMMEND', summary: 'Prepare preparation task suggestions', args: { title: 'Demo / hackathon preparation' }, dependsOn: ['s6'], agent: 'project' })
      if (/\b(create task|add task|execute|confirm)\b/i.test(msg)) {
        add({ tool: 'createTask', type: 'CREATE', summary: 'Create approved preparation task (requires confirmation)', args: { title: 'Finalize demo checklist', priority: 'High' }, dependsOn: ['s7'], agent: 'project', approvalRequired: true })
      }
      add({ tool: 'getTasks', type: 'VERIFY', summary: 'Verify open task state after plan', args: { openOnly: true, limit: 5 }, agent: 'project' })
      break
    case TEMPLATES.LEARNING_PLAN:
      name = 'Learning Plan'; agentType = 'learning'
      scope.push('roadmap', 'skill_gaps', 'study_actions')
      add({ tool: 'getLearningIntelligence', type: 'READ', summary: 'Read learning roadmap / next action', agent: 'learning' })
      add({ tool: 'getRoadmap', type: 'READ', summary: 'Read current roadmap progress', agent: 'learning' })
      add({ tool: 'getTasks', type: 'READ', summary: 'Read upcoming learning tasks', args: { openOnly: true, limit: 10 }, agent: 'daily_life' })
      add({ tool: 'getProjects', type: 'ANALYZE', summary: 'Align learning with projects', dependsOn: ['s1'], agent: 'project' })
      add({ tool: 'proposeTaskBreakdown', type: 'RECOMMEND', summary: 'Propose study plan steps', args: { title: 'Weekly study plan' }, dependsOn: ['s1', 's4'], agent: 'learning' })
      if (/\b(create task|add task|persist)\b/i.test(msg)) {
        add({ tool: 'createTask', type: 'CREATE', summary: 'Create approved study task', args: { title: 'Study focus block', priority: 'Medium' }, dependsOn: ['s5'], approvalRequired: true })
      }
      add({ tool: 'getLearningIntelligence', type: 'VERIFY', summary: 'Verify learning next-action still available', agent: 'learning' })
      break
    case TEMPLATES.RESEARCH_PLAN:
      name = 'Research Plan'; agentType = 'research'
      scope.push('research_analysis', 'knowledge_retrieval', 'gap_analysis')
      add({ tool: 'getResearch', type: 'READ', summary: 'Read research workspace', agent: 'research' })
      add({ tool: 'getProjects', type: 'READ', summary: 'Read linked projects', agent: 'project' })
      add({ tool: 'getRelevantMemories', type: 'READ', summary: 'Load research preferences (not documents)', args: { message: msg, intent: 'RESEARCH_HELP', limit: 3 }, agent: 'research' })
      add({ tool: 'getLearningIntelligence', type: 'ANALYZE', summary: 'Connect research to learning gaps', dependsOn: ['s1'], agent: 'learning' })
      add({ tool: 'getResearch', type: 'RECOMMEND', summary: 'Recommend research next steps from live data', dependsOn: ['s1', 's4'], agent: 'research' })
      add({ tool: 'getResearch', type: 'VERIFY', summary: 'Verify research projects still accessible', agent: 'research' })
      break
    case TEMPLATES.CAREER_PREPARATION:
    case TEMPLATES.APPLICATION_PREPARATION:
      name = template === TEMPLATES.APPLICATION_PREPARATION ? 'Application Preparation' : 'Career / Internship Preparation'
      agentType = 'career'
      scope.push('opportunity_review', 'skill_gap', 'readiness')
      add({ tool: 'getOpportunities', type: 'READ', summary: 'Read opportunities', agent: 'opportunity' })
      add({ tool: 'getApplications', type: 'READ', summary: 'Read application status', agent: 'career' })
      add({ tool: 'getProjects', type: 'READ', summary: 'Read portfolio evidence', agent: 'project' })
      add({ tool: 'getLearningIntelligence', type: 'ANALYZE', summary: 'Identify skill gaps vs opportunity', dependsOn: ['s1', 's3'], agent: 'learning' })
      add({ tool: 'proposeTaskBreakdown', type: 'RECOMMEND', summary: 'Prepare readiness checklist (no auto-apply)', args: { title: 'Internship preparation' }, dependsOn: ['s4'], agent: 'career' })
      add({ tool: 'getApplications', type: 'VERIFY', summary: 'Verify applications unchanged (no silent submit)', agent: 'career' })
      break
    case TEMPLATES.WEEKLY_REVIEW:
      name = 'Weekly Review'; agentType = 'daily_life'
      scope.push('weekly_review', 'priorities')
      add({ tool: 'getDailyLife', type: 'READ', summary: 'Load daily / weekly intelligence', agent: 'daily_life' })
      add({ tool: 'getTasks', type: 'READ', summary: 'Load open and recent tasks', args: { openOnly: true, limit: 15 }, agent: 'daily_life' })
      add({ tool: 'getGoals', type: 'READ', summary: 'Load active goals', agent: 'student' })
      add({ tool: 'getProjects', type: 'ANALYZE', summary: 'Review project progress', agent: 'project' })
      add({ tool: 'getNotifications', type: 'READ', summary: 'Check notifications', agent: 'daily_life' })
      add({ tool: 'getDailyLife', type: 'VERIFY', summary: 'Verify daily intelligence available', agent: 'daily_life' })
      break
    case TEMPLATES.PROJECT_SETUP:
    case TEMPLATES.PROJECT_REVIEW:
    default:
      name = template === TEMPLATES.PROJECT_SETUP ? 'Project Setup' : 'Project Review'
      agentType = 'project'
      scope.push('project_analysis', 'milestone_analysis', 'blocker_detection')
      add({ tool: 'getProjects', type: 'READ', summary: 'Inspect projects', agent: 'project' })
      add({ tool: 'getTasks', type: 'READ', summary: 'Inspect tasks', args: { openOnly: true, limit: 12 }, agent: 'project' })
      add({ tool: 'getGoals', type: 'READ', summary: 'Inspect linked goals', agent: 'student' })
      add({ tool: 'getResearch', type: 'READ', summary: 'Inspect related research', agent: 'research' })
      add({ tool: 'getLearningIntelligence', type: 'ANALYZE', summary: 'Analyze skill / learning blockers', dependsOn: ['s1'], agent: 'learning' })
      add({ tool: 'proposeTaskBreakdown', type: 'RECOMMEND', summary: 'Recommend execution plan', args: { title: msg.slice(0, 80) || 'Project work' }, dependsOn: ['s2', 's5'], agent: 'project' })
      if (/\b(create task|add task)\b/i.test(msg)) {
        add({ tool: 'createTask', type: 'CREATE', summary: 'Create approved project task', args: { title: 'Project follow-up action', priority: 'High' }, dependsOn: ['s6'], approvalRequired: true })
      }
      add({ tool: 'getTasks', type: 'VERIFY', summary: 'Verify task list after execution', args: { openOnly: true, limit: 5 }, agent: 'project' })
      break
  }

  if (/\b(do|prioritize|focus on) task b\b/i.test(userOverride || msg)) {
    const rec = steps.find((s) => s.type === 'RECOMMEND')
    if (rec) rec.summary = `${rec.summary} (user override: prioritize Task B first)`
  }

  return {
    name, template, agentType,
    scope: [...new Set(scope)],
    steps: steps.slice(0, limits.MAX_WORKFLOW_STEPS),
    planSummary: steps.slice(0, limits.MAX_WORKFLOW_STEPS).map((s) => `[${s.type}] ${s.summary}`),
  }
}

async function captureContextSnapshot(userId) {
  const snap = { capturedAt: new Date().toISOString(), projects: [], goals: [], tasksOpen: 0 }
  try {
    const ctx = { userId, role: 'student', agentType: 'student', mode: 'READ_ONLY' }
    const projects = await toolRegistry.executeTool('getProjects', {}, ctx).catch(() => null)
    const goals = await toolRegistry.executeTool('getGoals', {}, ctx).catch(() => null)
    const tasks = await toolRegistry.executeTool('getTasks', { openOnly: true, limit: 20 }, ctx).catch(() => null)
    snap.projects = (projects?.projects || projects?.items || []).slice(0, 5).map((p) => ({
      id: String(p.id || p._id || ''), title: p.title, status: p.status,
    }))
    snap.goals = (goals?.goals || goals?.items || []).slice(0, 5).map((g) => ({
      id: String(g.id || g._id || ''), title: g.title, status: g.status,
    }))
    snap.tasksOpen = (tasks?.tasks || tasks?.items || []).length
    snap.fingerprint = crypto.createHash('sha256')
      .update(JSON.stringify({ p: snap.projects, g: snap.goals, t: snap.tasksOpen }))
      .digest('hex').slice(0, 24)
  } catch {
    snap.fingerprint = 'unavailable'
  }
  return snap
}

function serialize(execution) {
  const writes = (execution.steps || []).filter((s) => s.approvalRequired || WRITE_TYPES.has(s.type))
  return {
    workflowId: execution.executionId,
    executionId: execution.executionId,
    kind: execution.kind,
    name: execution.workflowName,
    template: execution.template,
    request: execution.request,
    state: execution.state,
    scope: execution.scope || [],
    agentType: execution.agentType,
    planSummary: execution.planSummary || [],
    steps: (execution.steps || []).map((s) => ({
      stepId: s.stepId, order: s.order, type: s.type, tool: s.tool, summary: s.summary,
      status: s.status, dependsOn: s.dependsOn || [], approvalRequired: Boolean(s.approvalRequired),
      riskLevel: s.riskLevel, verified: Boolean(s.verified), error: s.error || '', agent: s.agent || '',
      class: WRITE_TYPES.has(s.type) || s.approvalRequired
        ? (s.type === 'EXTERNAL_ACTION' ? 'EXTERNAL_ACTION' : 'WRITE') : 'READ',
    })),
    confirmation: {
      required: Boolean(execution.confirmation?.required),
      previewId: execution.confirmation?.previewId || '',
      expiresAt: execution.confirmation?.expiresAt || null,
      confirmedAt: execution.confirmation?.confirmedAt || null,
      rejectedAt: execution.confirmation?.rejectedAt || null,
    },
    pendingWrites: writes.filter((s) => ['planned', 'awaiting_confirmation'].includes(s.status))
      .map((s) => ({ stepId: s.stepId, summary: s.summary, tool: s.tool, type: s.type })),
    verification: execution.verification || {},
    resultSummary: execution.resultSummary || '',
    events: (execution.events || []).slice(-20),
    contextSnapshot: execution.contextSnapshot
      ? { capturedAt: execution.contextSnapshot.capturedAt, fingerprint: execution.contextSnapshot.fingerprint } : null,
    planHash: execution.planHash,
    approvedPlanHash: execution.approvedPlanHash || '',
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
    finishedAt: execution.finishedAt,
    safety: { noShell: true, noArbitraryGit: true, noSilentExternal: true, writesNeedApproval: true },
  }
}

async function acquireLock(executionId) {
  const now = Date.now()
  const until = activeLocks.get(executionId)
  if (until && until > now) deny('EXECUTION_LOCKED', 'Workflow is already running.', 409)
  activeLocks.set(executionId, now + limits.LOCK_TTL_MS)
  await AgentExecution.updateOne({ executionId }, { $set: { executionLockUntil: new Date(now + limits.LOCK_TTL_MS) } })
}

function releaseLock(executionId) { activeLocks.delete(executionId) }

async function createWorkflow(user, message = '', options = {}) {
  const u = requireUser(user)
  if (u.role !== 'student') deny('FORBIDDEN', 'Personal workflow engine is student-scoped in this release.', 403)
  const msg = String(message || '').trim().slice(0, 2000)
  if (!msg) deny('VALIDATION_ERROR', 'Message is required.')
  if (detectInjection(msg)) {
    return { state: 'FAILED', errorCode: 'PROMPT_INJECTION_BLOCKED', resultSummary: 'Request blocked. External/user text is DATA only — cannot redefine permissions or run shell/git.' }
  }

  const depthKey = `${u._id}:${classifyTemplate(msg, options.template)}`
  const depth = (visitedDepth.get(depthKey) || 0) + 1
  if (depth > limits.MAX_WORKFLOW_DEPTH) deny('LOOP_PROTECTION', 'Workflow nesting/depth limit reached.', 429)
  visitedDepth.set(depthKey, depth)
  setTimeout(() => {
    const cur = visitedDepth.get(depthKey) || 1
    if (cur <= 1) visitedDepth.delete(depthKey)
    else visitedDepth.set(depthKey, cur - 1)
  }, 60_000)

  if (options.idempotencyKey) {
    const existing = await AgentExecution.findOne({
      userId: u._id, kind: 'workflow', idempotencyKey: String(options.idempotencyKey).slice(0, 120),
    }).sort('-createdAt')
    if (existing && ['COMPLETED', 'AWAITING_APPROVAL', 'AWAITING_CONFIRMATION', 'PLANNED', 'PAUSED'].includes(existing.state)) {
      return serialize(existing)
    }
  }

  const template = classifyTemplate(msg, options.template)
  const plan = buildWorkflowPlan(msg, { template, userOverride: options.userOverride || '' })
  const snapshot = await captureContextSnapshot(u._id)
  const executionId = newId('wf')
  const planHash = hashPlan(plan.steps)
  const needsApproval = plan.steps.some((s) => s.approvalRequired)

  const execution = await AgentExecution.create({
    executionId, userId: u._id, role: u.role || 'student', kind: 'workflow',
    workflowName: plan.name, template: plan.template, scope: plan.scope, agentType: plan.agentType,
    request: msg, intent: plan.template, mode: needsApproval ? 'CONFIRM' : 'READ_ONLY', state: 'PLANNED',
    steps: plan.steps, planSummary: plan.planSummary, contextSnapshot: snapshot, planHash, depth,
    idempotencyKey: options.idempotencyKey ? String(options.idempotencyKey).slice(0, 120) : undefined,
    parentExecutionId: options.parentExecutionId || '',
    limits: { maxSteps: limits.MAX_WORKFLOW_STEPS, maxToolCalls: limits.MAX_TOOL_CALLS, maxExecutionMs: limits.MAX_WORKFLOW_MS, maxRetries: limits.MAX_WORKFLOW_RETRIES },
    confirmation: {
      required: needsApproval, previewId: needsApproval ? executionId : '',
      expiresAt: needsApproval ? new Date(Date.now() + limits.APPROVAL_TTL_MS) : undefined,
    },
  })
  pushEvent(execution, 'PLANNED', `Plan created with ${plan.steps.length} steps`)
  await execution.save()
  if (!needsApproval || options.autoRunReads !== false) return runWorkflowReads(u, execution)
  return serialize(execution)
}

async function runToolStep(user, step, execution) {
  const ctx = {
    userId: user._id, role: user.role || 'student', agentType: execution.agentType || 'student',
    mode: step.approvalRequired ? 'CONFIRM' : 'READ_ONLY', executionId: execution.executionId,
  }
  let lastErr = null
  const maxRetry = step.approvalRequired ? 0 : limits.MAX_WORKFLOW_RETRIES
  for (let attempt = 0; attempt <= maxRetry; attempt += 1) {
    try {
      const result = await toolRegistry.executeTool(step.tool, step.args || {}, ctx)
      return { ok: true, result }
    } catch (error) {
      lastErr = error
      step.retryCount = (step.retryCount || 0) + 1
      const transient = /timeout|temporar|ECONN|network/i.test(error.message || '')
      if (!transient || attempt >= maxRetry) break
    }
  }
  return { ok: false, error: lastErr }
}

function depsSatisfied(step, byId) {
  for (const dep of step.dependsOn || []) {
    const d = byId.get(dep)
    if (!d) continue
    if (d.status === 'failed') return { ok: false, reason: 'dependency_failed' }
    if (d.status === 'cancelled' || d.status === 'skipped') return { ok: false, reason: 'dependency_skipped' }
    if (d.status !== 'completed') return { ok: false, reason: 'dependency_pending' }
  }
  return { ok: true }
}

function sanitizeOutput(result) {
  if (!result || typeof result !== 'object') return { ok: true }
  const clone = {}
  for (const [k, v] of Object.entries(result)) {
    if (/secret|password|token|apiKey|authorization/i.test(k)) continue
    if (typeof v === 'string') clone[k] = v.slice(0, 400)
    else if (typeof v === 'number' || typeof v === 'boolean') clone[k] = v
    else if (Array.isArray(v)) clone[k] = { count: v.length }
    else if (v && typeof v === 'object') clone[k] = { keys: Object.keys(v).slice(0, 8) }
  }
  return clone
}

async function notify(userId, execution, kind) {
  try {
    const titles = {
      approval_required: 'Workflow needs approval', completed: 'Workflow completed',
      partial: 'Workflow partially completed', failed: 'Workflow failed',
    }
    await notificationService.createForUser(userId, {
      type: 'ai', title: titles[kind] || 'Workflow update',
      body: `${execution.workflowName}: ${execution.state}`, link: '/student/workflows',
      priority: kind === 'approval_required' ? 'high' : 'normal',
      source: 'workflow-engine', dedupeKey: `wf:${execution.executionId}:${kind}`,
    })
  } catch { /* optional */ }
}

async function verifyWorkflow(user, execution) {
  execution.state = 'VERIFYING'
  pushEvent(execution, 'VERIFYING', 'Verifying expected outcomes')
  const verifySteps = execution.steps.filter((s) => s.type === 'VERIFY')
  let passed = true
  for (const step of verifySteps) {
    if (step.status === 'completed' && step.output) step.verified = true
    else if (step.status === 'planned' || step.status === 'failed') {
      const out = await runToolStep(user, step, execution)
      step.status = out.ok ? 'completed' : 'failed'
      step.output = out.ok ? sanitizeOutput(out.result) : undefined
      step.verified = Boolean(out.ok)
      step.error = out.ok ? '' : String(out.error?.message || 'Verify failed').slice(0, 500)
      if (!out.ok) passed = false
    }
  }
  const failed = execution.steps.filter((s) => s.status === 'failed').length
  const completed = execution.steps.filter((s) => s.status === 'completed').length
  const skipped = execution.steps.filter((s) => s.status === 'skipped').length
  execution.verification = { passed: passed && failed === 0, summary: `completed=${completed} failed=${failed} skipped=${skipped}`, checkedAt: new Date() }
  execution.state = failed && completed ? 'PARTIAL' : failed ? 'FAILED' : 'COMPLETED'
  execution.resultSummary = `Verification ${execution.verification.passed ? 'passed' : 'reported issues'}. ${execution.verification.summary}`
  execution.finishedAt = new Date()
  pushEvent(execution, execution.state, execution.resultSummary)
  await notify(user._id, execution, execution.state === 'COMPLETED' ? 'completed' : execution.state === 'PARTIAL' ? 'partial' : 'failed')
}

async function runWorkflowReads(user, executionDoc) {
  const execution = typeof executionDoc.save === 'function'
    ? executionDoc
    : await AgentExecution.findOne({ executionId: executionDoc.executionId || executionDoc, userId: user._id })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  if (['CANCELLED', 'CANCELLING'].includes(execution.state)) return serialize(execution)

  await acquireLock(execution.executionId)
  const started = Date.now()
  try {
    execution.state = 'RUNNING'
    pushEvent(execution, 'RUNNING', 'Executing read/analyze steps')
    await execution.save()

    const byId = new Map(execution.steps.map((s) => [s.stepId, s]))
    const readSteps = execution.steps.filter((s) => !s.approvalRequired && !WRITE_TYPES.has(s.type))
    const writeSteps = execution.steps.filter((s) => s.approvalRequired || WRITE_TYPES.has(s.type))
    const pending = new Set(readSteps.map((s) => s.stepId))
    let failures = 0
    let completed = 0

    while (pending.size) {
      if (execution.cancelRequested) {
        execution.state = 'CANCELLED'
        pushEvent(execution, 'CANCELLED', 'Cancelled during read phase')
        break
      }
      if (Date.now() - started > limits.MAX_WORKFLOW_MS) {
        execution.state = 'PARTIAL'
        execution.errorCode = 'TIMEOUT'
        pushEvent(execution, 'TIMEOUT', 'Workflow exceeded max execution time')
        break
      }

      const ready = [...pending].map((id) => byId.get(id)).filter((s) => depsSatisfied(s, byId).ok)
      if (!ready.length) {
        for (const id of [...pending]) {
          const s = byId.get(id)
          const d = depsSatisfied(s, byId)
          if (!d.ok && (d.reason === 'dependency_failed' || d.reason === 'dependency_skipped')) {
            s.status = 'skipped'
            s.error = d.reason === 'dependency_failed' ? 'Skipped because a dependency failed.' : ''
            pending.delete(id)
            pushEvent(execution, 'STEP_SKIPPED', s.summary, s.stepId)
          }
        }
        if (![...pending].some((id) => depsSatisfied(byId.get(id), byId).ok)) break
        continue
      }

      const batch = ready.slice(0, limits.MAX_PARALLEL_READS)
      await Promise.all(batch.map(async (step) => {
        pending.delete(step.stepId)
        if (execution.toolCallCount >= limits.MAX_TOOL_CALLS) {
          step.status = 'skipped'; step.error = 'Tool call limit reached.'; return
        }
        step.status = 'executing'; step.startedAt = new Date(); execution.toolCallCount += 1
        const out = await runToolStep(user, step, execution)
        step.finishedAt = new Date()
        if (out.ok) {
          step.status = 'completed'
          step.verified = step.type === 'VERIFY' ? Boolean(out.result) : false
          step.output = sanitizeOutput(out.result)
          completed += 1
          pushEvent(execution, 'STEP_COMPLETED', step.summary, step.stepId)
        } else {
          step.status = 'failed'
          step.error = String(out.error?.message || 'Step failed').slice(0, 500)
          failures += 1
          pushEvent(execution, 'STEP_FAILED', step.error, step.stepId)
        }
      }))
      await execution.save()
    }

    const fresh = await AgentExecution.findOne({ executionId: execution.executionId }).select('cancelRequested').lean()
    if (fresh?.cancelRequested) {
      execution.cancelRequested = true; execution.state = 'CANCELLED'; execution.finishedAt = new Date()
      await execution.save(); return serialize(execution)
    }

    if (writeSteps.length) {
      for (const w of writeSteps) { if (w.status === 'planned') w.status = 'awaiting_confirmation' }
      execution.state = 'AWAITING_APPROVAL'
      execution.confirmation.required = true
      execution.confirmation.previewId = execution.executionId
      if (!execution.confirmation.expiresAt) execution.confirmation.expiresAt = new Date(Date.now() + limits.APPROVAL_TTL_MS)
      execution.resultSummary = `Read phase complete (${completed} ok, ${failures} failed). ${writeSteps.length} write step(s) await approval.`
      pushEvent(execution, 'AWAITING_APPROVAL', execution.resultSummary)
      await notify(user._id, execution, 'approval_required')
    } else if (execution.state !== 'CANCELLED' && execution.state !== 'PARTIAL') {
      execution.state = failures && completed ? 'PARTIAL' : failures ? 'FAILED' : 'VERIFYING'
      if (execution.state === 'VERIFYING' || execution.state === 'PARTIAL') await verifyWorkflow(user, execution)
    }
    await execution.save()
    return serialize(execution)
  } finally {
    releaseLock(execution.executionId)
  }
}

async function approveWorkflow(user, workflowId, { confirmed = true, planHash = null } = {}) {
  const u = requireUser(user)
  if (!confirmed) deny('VALIDATION_ERROR', 'Confirmation flag required.')
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  if (!['AWAITING_APPROVAL', 'AWAITING_CONFIRMATION', 'APPROVED', 'PLANNED'].includes(execution.state)) {
    deny('INVALID_STATE', `Cannot approve workflow in state ${execution.state}.`)
  }
  if (execution.confirmation?.expiresAt && new Date(execution.confirmation.expiresAt) < new Date()) {
    execution.state = 'FAILED'; execution.errorCode = 'APPROVAL_EXPIRED'
    execution.resultSummary = 'Approval expired. Re-plan required.'
    pushEvent(execution, 'APPROVAL_EXPIRED', execution.resultSummary)
    await execution.save()
    deny('APPROVAL_EXPIRED', 'Approval expired. Create a new plan.', 409)
  }
  const currentHash = hashPlan(execution.steps)
  if (planHash && planHash !== currentHash) deny('PLAN_CHANGED', 'Plan changed since preview. Re-approval required.', 409)
  if (execution.planHash && currentHash !== execution.planHash) {
    execution.state = 'AWAITING_APPROVAL'; execution.confirmation.required = true
    pushEvent(execution, 'PLAN_CHANGED', 'Plan hash mismatch — returning to approval')
    await execution.save()
    deny('PLAN_CHANGED', 'Plan materially changed. Re-approval required.', 409)
  }

  const freshSnap = await captureContextSnapshot(u._id)
  if (
    execution.contextSnapshot?.fingerprint && freshSnap.fingerprint
    && execution.contextSnapshot.fingerprint !== 'unavailable'
    && freshSnap.fingerprint !== execution.contextSnapshot.fingerprint
    && Math.abs((freshSnap.tasksOpen || 0) - (execution.contextSnapshot.tasksOpen || 0)) >= 3
    && !planHash
  ) {
    deny('STALE_CONTEXT', 'Important source data changed. Re-plan or confirm with planHash.', 409)
  }

  await acquireLock(execution.executionId)
  try {
    execution.state = 'APPROVED'
    execution.approvedPlanHash = currentHash
    execution.confirmation.confirmedAt = new Date()
    pushEvent(execution, 'APPROVED', 'User approved exact plan')
    await execution.save()
    execution.state = 'EXECUTING'
    await execution.save()

    const byId = new Map(execution.steps.map((s) => [s.stepId, s]))
    const writeSteps = execution.steps.filter((s) => s.approvalRequired || WRITE_TYPES.has(s.type))
    let created = 0; let failed = 0; let skipped = 0

    for (const step of writeSteps) {
      if (execution.cancelRequested) break
      const dep = depsSatisfied(step, byId)
      if (!dep.ok) { step.status = 'skipped'; skipped += 1; continue }

      if (step.tool === 'completeTask' && step.args?.taskId) {
        try {
          const tasks = await toolRegistry.executeTool('getTasks', { openOnly: false, limit: 50 }, {
            userId: u._id, role: 'student', agentType: 'project', mode: 'READ_ONLY',
          })
          const list = tasks?.tasks || tasks?.items || []
          const found = list.find((t) => String(t.id || t._id) === String(step.args.taskId))
          if (found && (found.completed || found.status === 'completed')) {
            step.status = 'skipped'; step.error = 'ALREADY_COMPLETE'; skipped += 1
            pushEvent(execution, 'ALREADY_COMPLETE', step.summary, step.stepId)
            continue
          }
        } catch { /* continue */ }
      }

      if (step.type === 'EXTERNAL_ACTION' && !(execution.scope || []).includes('external_submit')) {
        step.status = 'skipped'; step.error = 'Out of scope: external actions not in workflow scope.'; skipped += 1; continue
      }

      step.status = 'executing'; step.startedAt = new Date(); execution.toolCallCount += 1
      const out = await runToolStep(u, step, execution)
      step.finishedAt = new Date()
      if (out.ok) {
        step.status = 'completed'; step.output = sanitizeOutput(out.result)
        if (step.tool === 'createTask' && out.result?.task) {
          const id = out.result.task.id || out.result.task._id
          const ownerOk = !out.result.task.userId || String(out.result.task.userId) === String(u._id)
          step.verified = Boolean(id && ownerOk)
          if (!step.verified) { step.error = 'Verification failed: ownership/title mismatch.'; failed += 1 }
          else created += 1
        } else { step.verified = true; created += 1 }
        pushEvent(execution, 'WRITE_COMPLETED', step.summary, step.stepId)
      } else {
        step.status = 'failed'
        step.error = String(out.error?.message || 'Write failed').slice(0, 500)
        failed += 1
        pushEvent(execution, 'WRITE_FAILED', step.error, step.stepId)
      }
      await execution.save()
    }

    await verifyWorkflow(u, execution)
    if (failed && created) execution.state = 'PARTIAL'
    execution.resultSummary = `Writes: created/updated=${created} failed=${failed} skipped=${skipped}. ${execution.verification?.summary || ''}`
    await execution.save()
    return serialize(execution)
  } finally {
    releaseLock(execution.executionId)
  }
}

async function rejectWorkflow(user, workflowId, reason = '') {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  execution.state = 'CANCELLED'
  execution.confirmation.rejectedAt = new Date()
  execution.confirmation.rejectReason = String(reason || 'User rejected').slice(0, 300)
  execution.finishedAt = new Date()
  for (const s of execution.steps) {
    if (['planned', 'awaiting_confirmation'].includes(s.status)) s.status = 'cancelled'
  }
  pushEvent(execution, 'REJECTED', execution.confirmation.rejectReason)
  await execution.save()
  return serialize(execution)
}

async function pauseWorkflow(user, workflowId) {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  if (!['RUNNING', 'EXECUTING', 'AWAITING_APPROVAL', 'PLANNED'].includes(execution.state)) {
    deny('INVALID_STATE', `Cannot pause from ${execution.state}.`)
  }
  execution.state = 'PAUSED'; execution.pausedAt = new Date()
  pushEvent(execution, 'PAUSED', 'User paused workflow')
  await execution.save()
  return serialize(execution)
}

async function resumeWorkflow(user, workflowId) {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  if (execution.state !== 'PAUSED') deny('INVALID_STATE', 'Workflow is not paused.')
  const currentHash = hashPlan(execution.steps)
  if (execution.approvedPlanHash && execution.approvedPlanHash !== currentHash) {
    execution.state = 'AWAITING_APPROVAL'
    pushEvent(execution, 'REPLAN', 'Plan changed while paused — approval required')
    await execution.save()
    return serialize(execution)
  }
  if (execution.confirmation?.required && !execution.confirmation?.confirmedAt) {
    execution.state = 'AWAITING_APPROVAL'
    await execution.save()
    return runWorkflowReads(u, execution)
  }
  pushEvent(execution, 'RESUMED', 'Workflow resumed')
  await execution.save()
  if (execution.confirmation?.confirmedAt) return approveWorkflow(u, workflowId, { confirmed: true, planHash: currentHash })
  return runWorkflowReads(u, execution)
}

async function cancelWorkflow(user, workflowId) {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  execution.cancelRequested = true
  execution.state = ['RUNNING', 'EXECUTING'].includes(execution.state) ? 'CANCELLING' : 'CANCELLED'
  const remaining = execution.steps.filter((s) => ['planned', 'awaiting_confirmation', 'executing'].includes(s.status))
  for (const s of remaining) s.status = 'cancelled'
  const completed = execution.steps.filter((s) => s.status === 'completed')
  execution.resultSummary = `Cancelled. Completed: ${completed.length}. Remaining cancelled: ${remaining.length}. Already completed actions are not undone.`
  execution.finishedAt = new Date()
  execution.state = 'CANCELLED'
  pushEvent(execution, 'CANCELLED', execution.resultSummary)
  await execution.save()
  releaseLock(execution.executionId)
  return serialize(execution)
}

async function editWorkflowPlan(user, workflowId, { removeStepIds = [], userOverride = '' } = {}) {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  if (!['PLANNED', 'AWAITING_APPROVAL', 'AWAITING_CONFIRMATION', 'PAUSED', 'DRAFT'].includes(execution.state)) {
    deny('INVALID_STATE', 'Cannot edit plan while executing. Cancel and recreate.')
  }
  if (removeStepIds.length) {
    execution.steps = execution.steps.filter((s) => !removeStepIds.includes(s.stepId))
    execution.steps.forEach((s, i) => { s.order = i + 1 })
  }
  if (userOverride) {
    const rebuilt = buildWorkflowPlan(execution.request, { template: execution.template, userOverride })
    execution.steps = rebuilt.steps
    execution.planSummary = rebuilt.planSummary
    execution.scope = rebuilt.scope
  }
  execution.planHash = hashPlan(execution.steps)
  execution.approvedPlanHash = ''
  execution.confirmation.confirmedAt = undefined
  execution.confirmation.required = execution.steps.some((s) => s.approvalRequired)
  execution.confirmation.previewId = execution.confirmation.required ? execution.executionId : ''
  execution.confirmation.expiresAt = execution.confirmation.required ? new Date(Date.now() + limits.APPROVAL_TTL_MS) : undefined
  execution.state = 'AWAITING_APPROVAL'
  pushEvent(execution, 'PLAN_EDITED', 'Plan edited — re-approval required')
  await execution.save()
  return serialize(execution)
}

async function getWorkflow(user, workflowId) {
  const u = requireUser(user)
  const execution = await AgentExecution.findOne({ executionId: workflowId, userId: u._id, kind: 'workflow' })
  if (!execution) deny('NOT_FOUND', 'Workflow not found.', 404)
  return serialize(execution)
}

async function listWorkflows(user, { limit = 20, state = null } = {}) {
  const u = requireUser(user)
  const filter = { userId: u._id, kind: 'workflow' }
  if (state) filter.state = state
  const items = await AgentExecution.find(filter).sort('-createdAt').limit(Math.min(limit, 50)).lean()
  return items.map((doc) => serialize(doc))
}

async function getTemplates() {
  return Object.values(TEMPLATES).map((t) => ({ id: t, name: t.replace(/_/g, ' ') }))
}

module.exports = {
  TEMPLATES, STEP_TYPES, createWorkflow, approveWorkflow, rejectWorkflow, pauseWorkflow,
  resumeWorkflow, cancelWorkflow, editWorkflowPlan, getWorkflow, listWorkflows, getTemplates,
  buildWorkflowPlan, hashPlan, serialize, detectInjection, classifyTemplate, runWorkflowReads,
}
