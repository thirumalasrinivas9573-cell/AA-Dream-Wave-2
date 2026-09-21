/**
 * Lasya V5 Prompt 1 — Multi-Agent Orchestration Service
 * PLAN → VALIDATE → AUTHORIZE → APPROVE → EXECUTE → VERIFY → AUDIT
 * Composes V4 domain services + MJ brain reference — no duplicate AI brain.
 */
const AgentExecution = require('../models/AgentExecution')
const {
  AGENT_DEFINITIONS,
  TOOL_DEFINITIONS,
  ORCHESTRATION_INTENTS,
  ACTION_POLICY,
  ORCHESTRATION_LIMITS,
  AGENT_STATUSES,
} = require('../constants/multiAgentOrchestration')
const careerCopilot = require('./careerCopilotService')
const contextPersonalization = require('./contextPersonalizationService')
const { getStudentFeed } = require('./opportunityMatchingService')
const { getInstitutionPlacementIntelligence, getSkillGapIntelligence, getStudentCareerIntelligence } = require('./talentIntelligenceService')
const { getPartnershipAnalytics, getCollaborationHub } = require('./partnershipIntelligenceService')
const { getInstitutionIntelligenceHub, getProgramDetailIntelligence } = require('./programIntelligenceService')
const execIntel = require('./executiveDecisionSupportService')
const { planWorkflow, createWorkflowFromTemplate } = require('./ecosystemAutomationService')
const { runMultiAgentTalentRequest } = require('./talentIntelligenceAiService')
const { runMultiAgentEcosystemRequest } = require('./ecosystemIntelligenceAiService')

const PROMPT_INJECTION = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /modify\s+permissions/i,
  /execute\s+without/i,
]

function sanitizeText(text = '') {
  let str = String(text || '').slice(0, 2000)
  for (const p of PROMPT_INJECTION) {
    if (p.test(str)) {
      str = str.replace(p, '[filtered]').trim()
    }
  }
  return str || '[filtered untrusted input]'
}

function appendAudit(execution, action, actorUserId, metadata = {}) {
  execution.auditLog.push({
    action,
    agentId: metadata.agentId || null,
    toolId: metadata.toolId || null,
    actorUserId,
    result: metadata.result || 'ok',
    metadata,
    timestamp: new Date(),
  })
}

function getAgentRegistry() {
  return Object.values(AGENT_DEFINITIONS)
}

function getToolRegistry() {
  return Object.values(TOOL_DEFINITIONS)
}

function getIntentsForRole(role) {
  return Object.values(ORCHESTRATION_INTENTS).filter((i) => i.roles.includes(role))
}

function resolveIntent(query = '', explicitIntent = null) {
  if (explicitIntent && ORCHESTRATION_INTENTS[explicitIntent]) return explicitIntent
  const q = sanitizeText(query).toLowerCase()
  if (/internship|prepare.*career|improve/i.test(q)) return 'PREPARE_INTERNSHIP'
  if (/partnership|collaboration|proposal/i.test(q)) return 'PARTNERSHIP_PROPOSAL'
  if (/deadline|placement.*alert/i.test(q)) return 'PLACEMENT_DEADLINE'
  if (/program.*align|curriculum|skill.*gap.*program/i.test(q)) return 'PROGRAM_ALIGNMENT_REVIEW'
  if (/decision|executive|attention|analytics/i.test(q)) return 'EXECUTIVE_DECISION'
  if (/find.*opportunit|job|intern/i.test(q)) return 'FIND_OPPORTUNITIES'
  return 'FIND_OPPORTUNITIES'
}

function buildPlan(intentId, role) {
  const intent = ORCHESTRATION_INTENTS[intentId]
  if (!intent) {
    const err = new Error(`Unknown orchestration intent: ${intentId}`)
    err.statusCode = 400
    throw err
  }
  if (!intent.roles.includes(role)) {
    const err = new Error(`Intent ${intentId} not allowed for role ${role}`)
    err.statusCode = 403
    throw err
  }

  const plans = {
    PREPARE_INTERNSHIP: [
      { agentId: 'CAREER_AGENT', toolId: 'READ_CAREER_PROFILE', objective: 'Read authorized career goal and readiness' },
      { agentId: 'OPPORTUNITY_AGENT', toolId: 'SEARCH_OPPORTUNITIES', objective: 'Search relevant internships' },
      { agentId: 'CAREER_AGENT', toolId: 'ANALYZE_SKILLS', objective: 'Identify skill gaps for target opportunities' },
      { agentId: 'LEARNING_AGENT', toolId: 'ANALYZE_SKILLS', objective: 'Recommend skill-building focus areas' },
    ],
    FIND_OPPORTUNITIES: [
      { agentId: 'CAREER_AGENT', toolId: 'READ_CAREER_PROFILE', objective: 'Load career context' },
      { agentId: 'OPPORTUNITY_AGENT', toolId: 'SEARCH_OPPORTUNITIES', objective: 'Find matching opportunities' },
    ],
    PARTNERSHIP_PROPOSAL: [
      { agentId: 'PARTNERSHIP_AGENT', toolId: 'ANALYZE_PARTNERSHIP', objective: 'Analyze target company partnership' },
      { agentId: 'INSTITUTION_AGENT', toolId: 'ANALYZE_ANALYTICS', objective: 'Collect institution capabilities' },
      { agentId: 'PROGRAM_AGENT', toolId: 'ANALYZE_PROGRAM', objective: 'Identify relevant programs' },
      { agentId: 'ANALYTICS_AGENT', toolId: 'ANALYZE_ANALYTICS', objective: 'Gather supporting evidence' },
      { agentId: 'PARTNERSHIP_AGENT', toolId: 'PREPARE_EMAIL', objective: 'Prepare proposal preview — not sent automatically', requiresApproval: true },
    ],
    PLACEMENT_DEADLINE: [
      { agentId: 'PLACEMENT_AGENT', toolId: 'ANALYZE_PLACEMENT', objective: 'Analyze approaching deadlines' },
      { agentId: 'OPPORTUNITY_AGENT', toolId: 'SEARCH_OPPORTUNITIES', objective: 'Identify affected opportunities' },
      { agentId: 'NOTIFICATION_AGENT', toolId: 'PREPARE_NOTIFICATION', objective: 'Prepare notification preview', requiresApproval: true },
    ],
    PROGRAM_ALIGNMENT_REVIEW: [
      { agentId: 'ANALYTICS_AGENT', toolId: 'ANALYZE_ANALYTICS', objective: 'Detect alignment signals' },
      { agentId: 'PROGRAM_AGENT', toolId: 'ANALYZE_PROGRAM', objective: 'Analyze program skill coverage' },
      { agentId: 'OPPORTUNITY_AGENT', toolId: 'SEARCH_OPPORTUNITIES', objective: 'Analyze opportunity requirements' },
      { agentId: 'WORKFLOW_AGENT', toolId: 'CREATE_WORKFLOW', objective: 'Create program review workflow', requiresApproval: true },
    ],
    EXECUTIVE_DECISION: [
      { agentId: 'ANALYTICS_AGENT', toolId: 'ANALYZE_ANALYTICS', objective: 'Load decision support evidence' },
      { agentId: 'WORKFLOW_AGENT', toolId: 'CREATE_TASK', objective: 'Prepare recommended next actions' },
    ],
  }

  return (plans[intentId] || []).map((step, idx) => ({
    order: idx + 1,
    agentId: step.agentId,
    toolId: step.toolId,
    objective: step.objective,
    requiresApproval: step.requiresApproval || ACTION_POLICY[step.toolId]?.approval === 'REQUIRED',
  }))
}

function validatePlan(plan, role, userId) {
  const errors = []
  if (plan.length > ORCHESTRATION_LIMITS.MAX_STEPS) {
    errors.push(`Plan exceeds max steps (${ORCHESTRATION_LIMITS.MAX_STEPS})`)
  }

  for (const step of plan) {
    const agent = AGENT_DEFINITIONS[step.agentId]
    const tool = TOOL_DEFINITIONS[step.toolId]
    if (!agent) errors.push(`Unknown agent: ${step.agentId}`)
    if (!tool) errors.push(`Unknown tool: ${step.toolId}`)
    if (agent && !agent.allowedTools.includes(step.toolId)) {
      errors.push(`Agent ${step.agentId} cannot use tool ${step.toolId}`)
    }
    if (agent && agent.requiredPermissions.length && !agent.requiredPermissions.includes(role)) {
      errors.push(`Agent ${step.agentId} not permitted for role ${role}`)
    }
    if (tool && tool.permissions.length && !tool.permissions.includes(role)) {
      errors.push(`Tool ${step.toolId} not permitted for role ${role}`)
    }
  }

  if (errors.length) {
    const err = new Error(errors.join('; '))
    err.statusCode = 403
    throw err
  }

  return { valid: true, userId, role, stepCount: plan.length }
}

async function executeTool(toolId, agentId, context) {
  const { userId, organizationId, role, simulation, query, body } = context

  switch (toolId) {
    case 'READ_CAREER_PROFILE': {
      const hub = await careerCopilot.getCareerHub(userId)
      return {
        status: 'completed',
        summary: hub.careerState || 'Career context loaded',
        data: {
          careerState: hub.careerState,
          readiness: hub.readiness,
          targetRole: hub.targetRole,
          topSkills: hub.topSkills?.slice(0, 8) || [],
        },
        limitations: hub.dataLimitations || [],
      }
    }
    case 'SEARCH_OPPORTUNITIES': {
      if (role === 'student') {
        const feed = await getStudentFeed(userId, { limit: 10, type: 'internship' })
        return {
          status: 'completed',
          summary: `${feed.items?.length ?? 0} opportunity(ies) found`,
          data: { opportunities: (feed.items || []).slice(0, 10) },
          limitations: feed.items?.length ? [] : ['INSUFFICIENT_DATA — no matching opportunities'],
        }
      }
      const placement = organizationId
        ? await getInstitutionPlacementIntelligence(organizationId, {})
        : { placement: { activeOpportunities: 0 } }
      return {
        status: 'completed',
        summary: 'Opportunity scope analyzed',
        data: { activeOpportunities: placement.placement?.activeOpportunities ?? 0 },
        limitations: [],
      }
    }
    case 'ANALYZE_SKILLS': {
      if (role === 'student') {
        const gaps = await getSkillGapIntelligence(userId, body || {})
        return {
          status: 'completed',
          summary: gaps.gaps?.length ? `${gaps.gaps.length} potential gap(s)` : 'INSUFFICIENT_DATA',
          data: { gaps: gaps.gaps?.slice(0, 10) || [], classification: gaps.classification },
          limitations: ['Aggregate skill comparison — individual readiness not assessed as probability'],
        }
      }
      const intel = organizationId
        ? await execIntel.getSkillGapAnalytics(organizationId, {})
        : { status: 'INSUFFICIENT_DATA', gaps: [] }
      return { status: 'completed', summary: intel.classification || intel.status, data: intel, limitations: [] }
    }
    case 'ANALYZE_PLACEMENT': {
      if (!organizationId) return { status: 'failed', summary: 'Organization required', data: null, limitations: ['INSUFFICIENT_DATA'] }
      const placement = await getInstitutionPlacementIntelligence(organizationId, {})
      return { status: 'completed', summary: 'Placement pipeline analyzed', data: placement, limitations: [] }
    }
    case 'ANALYZE_PARTNERSHIP': {
      if (!organizationId) return { status: 'failed', summary: 'Organization required', data: null, limitations: [] }
      const [analytics, hub] = await Promise.all([
        getPartnershipAnalytics(organizationId, role),
        getCollaborationHub(organizationId, role).catch(() => null),
      ])
      return { status: 'completed', summary: 'Partnership intelligence loaded', data: { analytics, hub }, limitations: [] }
    }
    case 'ANALYZE_PROGRAM': {
      if (!organizationId || role !== 'institution') {
        return { status: 'skipped', summary: 'Program analysis requires institution scope', data: null, limitations: [] }
      }
      const alignment = await execIntel.getProgramAlignmentAnalytics(organizationId, {})
      const hub = await getInstitutionIntelligenceHub(organizationId, {}).catch(() => null)
      return { status: 'completed', summary: alignment.alignmentLevel || 'INSUFFICIENT_DATA', data: { alignment, hub }, limitations: [alignment.limitation] }
    }
    case 'ANALYZE_ANALYTICS': {
      if (!organizationId) return { status: 'failed', summary: 'Organization required', data: null, limitations: [] }
      const overview = role === 'institution'
        ? await execIntel.getExecutiveOverview(organizationId, {})
        : await execIntel.getCompanyExecutiveOverview(organizationId, {})
      const decision = await execIntel.getDecisionSupport(organizationId, userId, { question: query || 'What needs attention?' })
      return { status: 'completed', summary: 'Analytics evidence loaded', data: { overview, decision: decision.insight }, limitations: decision.dataLimitations || [] }
    }
    case 'PREPARE_EMAIL': {
      if (simulation) {
        return {
          status: 'preview',
          summary: 'Email preview prepared (simulation — not sent)',
          data: { to: 'Authorized contact', subject: 'Collaboration proposal', body: 'Draft proposal from partnership analysis.' },
          limitations: ['External send requires explicit approval'],
        }
      }
      return {
        status: 'blocked',
        summary: 'Email prepared — awaiting approval before send',
        data: { prepared: true, sent: false },
        limitations: ['HIGH_RISK — approval required before external send'],
        requiresApproval: true,
      }
    }
    case 'PREPARE_NOTIFICATION': {
      return {
        status: simulation ? 'preview' : 'blocked',
        summary: 'Notification preview prepared',
        data: { title: 'Placement reminder', body: 'Deadline approaching for authorized opportunity.' },
        limitations: ['Notification not sent automatically'],
        requiresApproval: !simulation,
      }
    }
    case 'CREATE_WORKFLOW': {
      if (simulation) {
        return { status: 'preview', summary: 'Workflow would be created after approval', data: { templateId: 'SKILL_GAP_REVIEW' }, limitations: [] }
      }
      if (!organizationId) return { status: 'failed', summary: 'Organization required', data: null, limitations: [] }
      const { execution, duplicate } = await createWorkflowFromTemplate({
        userId,
        organizationId,
        organizationRole: role,
        templateId: intentToTemplate(context.intent),
        context: { why: query || 'Multi-agent orchestration recommendation' },
        trigger: 'AI_PLANNER',
      })
      return { status: 'completed', summary: duplicate ? 'Workflow already exists' : 'Workflow created', data: { workflowId: execution._id }, limitations: [] }
    }
    case 'CREATE_TASK': {
      return {
        status: 'completed',
        summary: 'Review task recorded',
        data: { taskType: 'orchestration_review', title: query || 'Follow up from orchestration' },
        limitations: [],
      }
    }
    case 'GENERATE_REPORT': {
      if (!organizationId) return { status: 'skipped', summary: 'No org scope', data: null, limitations: [] }
      const overview = await execIntel.getExecutiveOverview(organizationId, {})
      return { status: 'completed', summary: 'Report summary prepared', data: { metrics: overview.summary }, limitations: overview.dataLimitations }
    }
    default: {
      const err = new Error(`Tool not in allowlist: ${toolId}`)
      err.statusCode = 400
      throw err
    }
  }
}

function intentToTemplate(intent) {
  const map = {
    PROGRAM_ALIGNMENT_REVIEW: 'PROGRAM_ALIGNMENT_REVIEW',
    PLACEMENT_DEADLINE: 'PLACEMENT_REMINDER',
    PARTNERSHIP_PROPOSAL: 'PARTNERSHIP_REVIEW',
  }
  return map[intent] || 'SKILL_GAP_REVIEW'
}

function detectLoop(seen, key) {
  if (seen.has(key)) return true
  seen.add(key)
  return false
}

async function runOrchestration({
  userId,
  organizationId,
  role,
  query,
  intent: explicitIntent,
  simulation = false,
  idempotencyKey = null,
}) {
  const safeQuery = sanitizeText(query)
  const intentId = resolveIntent(safeQuery, explicitIntent)
  const intent = ORCHESTRATION_INTENTS[intentId]

  if (idempotencyKey) {
    const existing = await AgentExecution.findOne({ idempotencyKey, ownerUserId: userId }).lean()
    if (existing) return { execution: existing, duplicate: true }
  }

  const plan = buildPlan(intentId, role)
  validatePlan(plan, role, userId)

  const requiresApproval = intent.requiresApproval || plan.some((s) => s.requiresApproval)

  const execution = await AgentExecution.create({
    ownerUserId: userId,
    organizationId: organizationId || null,
    organizationRole: role,
    intent: intentId,
    query: safeQuery,
    status: simulation ? 'SIMULATION' : requiresApproval ? 'WAITING_APPROVAL' : 'RUNNING',
    simulation,
    plan,
    steps: plan.map((p) => ({
      order: p.order,
      agentId: p.agentId,
      toolId: p.toolId,
      objective: p.objective,
      status: 'PENDING',
      requiresApproval: p.requiresApproval,
    })),
    requiresApproval,
    idempotencyKey,
    depth: plan.length,
  })

  appendAudit(execution, 'plan_created', userId, { intent: intentId, stepCount: plan.length })
  await execution.save()

  if (simulation) {
    const preview = await previewExecution(execution)
    execution.result = preview
    execution.status = 'SIMULATION'
    appendAudit(execution, 'simulation_completed', userId)
    await execution.save()
    return { execution: execution.toObject(), duplicate: false, preview }
  }

  if (requiresApproval) {
    return { execution: execution.toObject(), duplicate: false, awaitingApproval: true }
  }

  return executeOrchestration(execution._id, userId)
}

async function previewExecution(executionDoc) {
  return {
    plan: executionDoc.plan,
    agents: executionDoc.plan.map((p) => AGENT_DEFINITIONS[p.agentId]?.name || p.agentId),
    tools: executionDoc.plan.map((p) => TOOL_DEFINITIONS[p.toolId]?.name || p.toolId),
    approvalPoints: executionDoc.plan.filter((p) => p.requiresApproval).map((p) => p.objective),
    expectedResult: 'Recommendations and prepared actions — no external side effects in simulation mode.',
    simulation: true,
  }
}

async function executeOrchestration(executionId, userId, { approved = false } = {}) {
  const execution = await AgentExecution.findById(executionId)
  if (!execution) {
    const err = new Error('Execution not found')
    err.statusCode = 404
    throw err
  }

  if (execution.ownerUserId.toString() !== userId.toString()) {
    const err = new Error('Not authorized for this execution')
    err.statusCode = 403
    throw err
  }

  if (execution.requiresApproval && !approved && execution.status === 'WAITING_APPROVAL') {
    const err = new Error('Execution requires approval before running')
    err.statusCode = 403
    throw err
  }

  if (execution.status === 'COMPLETED') return { execution: execution.toObject(), duplicate: true }

  execution.status = 'RUNNING'
  if (approved) {
    execution.approvedAt = new Date()
    execution.approvedByUserId = userId
  }
  appendAudit(execution, 'execution_started', userId)
  await execution.save()

  const context = {
    userId,
    organizationId: execution.organizationId,
    role: execution.organizationRole,
    simulation: execution.simulation,
    query: execution.query,
    intent: execution.intent,
    body: {},
    personalization: null,
  }

  try {
    context.personalization = await contextPersonalization.getContextForAgent(userId, execution.organizationRole, {
      intent: execution.intent,
      query: execution.query,
      organizationId: execution.organizationId,
    })
  } catch {
    context.personalization = { dataLimitations: ['Personalization context unavailable'] }
  }

  const seen = new Set()
  const stepResults = []
  let previousAgent = null

  for (const step of execution.steps) {
    if (execution.toolCallCount >= ORCHESTRATION_LIMITS.MAX_STEPS) break

    const loopKey = `${step.agentId}:${step.toolId}:${execution.intent}`
    if (detectLoop(seen, loopKey)) {
      step.status = 'BLOCKED'
      step.error = 'Loop detected — same agent/tool/intent repeated'
      appendAudit(execution, 'loop_detected', userId, { agentId: step.agentId, toolId: step.toolId })
      break
    }

    if (step.requiresApproval && !approved) {
      step.status = 'BLOCKED'
      step.error = 'Step requires approval'
      execution.status = 'WAITING_APPROVAL'
      break
    }

    if (previousAgent && previousAgent !== step.agentId) {
      execution.handoffs.push({
        fromAgent: previousAgent,
        toAgent: step.agentId,
        objective: step.objective,
        input: { query: execution.query },
        expectedOutput: step.objective,
        permissions: AGENT_DEFINITIONS[step.agentId]?.requiredPermissions || [],
      })
    }
    previousAgent = step.agentId

    step.status = 'RUNNING'
    step.startedAt = new Date()
    execution.toolCallCount += 1

    try {
      const result = await Promise.race([
        executeTool(step.toolId, step.agentId, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Agent step timed out')), ORCHESTRATION_LIMITS.TIMEOUT_MS),
        ),
      ])

      step.output = result
      step.status = result.status === 'failed' ? 'FAILED' : result.status === 'blocked' ? 'BLOCKED' : 'COMPLETED'
      step.completedAt = new Date()
      stepResults.push(result)

      if (result.requiresApproval) {
        execution.status = 'WAITING_APPROVAL'
        execution.requiresApproval = true
        break
      }

      appendAudit(execution, 'step_completed', userId, {
        agentId: step.agentId,
        toolId: step.toolId,
        result: step.status,
      })
    } catch (e) {
      step.status = 'FAILED'
      step.error = e.message
      step.completedAt = new Date()
      execution.failureReason = e.message
      execution.status = 'FAILED'
      appendAudit(execution, 'step_failed', userId, { agentId: step.agentId, error: e.message })
      break
    }
  }

  if (execution.status === 'RUNNING') {
    execution.status = 'COMPLETED'
    execution.completedAt = new Date()
    execution.result = synthesizeResult(execution.intent, stepResults, execution.query)
    appendAudit(execution, 'execution_completed', userId)
  }

  await execution.save()
  return { execution: execution.toObject(), duplicate: false }
}

function synthesizeResult(intent, stepResults, query) {
  const summaries = stepResults.map((r) => r.summary).filter(Boolean)
  return {
    intent,
    query,
    summary: summaries.join(' · ') || 'Orchestration completed',
    sections: stepResults.map((r, i) => ({
      order: i + 1,
      summary: r.summary,
      data: r.data,
      limitations: r.limitations,
    })),
    nextActions: stepResults.flatMap((r) => (r.requiresApproval ? ['Approval required before external action'] : [])),
    causalityNote: 'Recommendations based on authorized data — causation not inferred.',
  }
}

async function approveExecution(executionId, userId) {
  return executeOrchestration(executionId, userId, { approved: true })
}

async function cancelExecution(executionId, userId) {
  const execution = await AgentExecution.findOne({ _id: executionId, ownerUserId: userId })
  if (!execution) {
    const err = new Error('Execution not found')
    err.statusCode = 404
    throw err
  }
  execution.status = 'CANCELLED'
  appendAudit(execution, 'cancelled', userId)
  await execution.save()
  return execution.toObject()
}

async function getExecution(executionId, userId) {
  const execution = await AgentExecution.findOne({ _id: executionId, ownerUserId: userId }).lean()
  if (!execution) {
    const err = new Error('Execution not found')
    err.statusCode = 404
    throw err
  }
  return execution
}

async function listExecutions(userId, { status, limit = 20 } = {}) {
  const query = { ownerUserId: userId }
  if (status) query.status = status
  return AgentExecution.find(query).sort({ createdAt: -1 }).limit(Math.min(50, limit)).lean()
}

async function getAgentHealth() {
  return Object.values(AGENT_DEFINITIONS).map((a) => ({
    agentId: a.agentId,
    name: a.name,
    status: AGENT_STATUSES[0],
    riskLevel: a.riskLevel,
  }))
}

async function getObservability(organizationId, role) {
  const query = organizationId ? { organizationId, organizationRole: role } : {}
  const [completed, failed, waiting, running] = await Promise.all([
    AgentExecution.countDocuments({ ...query, status: 'COMPLETED' }),
    AgentExecution.countDocuments({ ...query, status: 'FAILED' }),
    AgentExecution.countDocuments({ ...query, status: 'WAITING_APPROVAL' }),
    AgentExecution.countDocuments({ ...query, status: 'RUNNING' }),
  ])
  const total = completed + failed
  return {
    counts: { completed, failed, waiting, running },
    successRate: total > 0 ? Math.round((completed / total) * 100) : null,
    limits: ORCHESTRATION_LIMITS,
  }
}

async function runDomainMultiAgent(role, orgId, userId, intent, body = {}) {
  if (role === 'student') {
    return runMultiAgentTalentRequest('student', userId, intent, body)
  }
  if (role === 'institution' || role === 'company') {
    return runMultiAgentEcosystemRequest({ orgId, role, intent, query: body })
  }
  const err = new Error('Unsupported role for domain multi-agent')
  err.statusCode = 403
  throw err
}

module.exports = {
  sanitizeText,
  getAgentRegistry,
  getToolRegistry,
  getIntentsForRole,
  buildPlan,
  validatePlan,
  runOrchestration,
  executeOrchestration,
  approveExecution,
  cancelExecution,
  getExecution,
  listExecutions,
  getAgentHealth,
  getObservability,
  runDomainMultiAgent,
  previewExecution,
  resolveIntent,
  ORCHESTRATION_INTENTS,
}
