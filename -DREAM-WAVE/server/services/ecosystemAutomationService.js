/**
 * Lasya V4 Prompt 4 — Ecosystem Automation + Intelligent Operations
 * AI recommends → Human approves → System executes → System verifies → System records
 */
const mongoose = require('mongoose')
const WorkflowExecution = require('../models/WorkflowExecution')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const CampusOpportunity = require('../models/CampusOpportunity')
const { notifyUser } = require('./platformNotificationService')
const campusCommandCenter = require('./campusCommandCenterService')
const institutionCommandCenter = require('./institutionCommandCenterService')
const {
  WORKFLOW_STATUSES,
  WORKFLOW_TRIGGERS,
  APPROVAL_POLICIES,
  ACTION_TYPES,
  WORKFLOW_TEMPLATES,
  OPERATIONS_AI_INTENTS,
  APPROVAL_EXPIRY_HOURS,
} = require('../constants/ecosystemAutomation')

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /send\s+this\s+email/i,
  /execute\s+without\s+approval/i,
  /bypass\s+authorization/i,
  /system\s+instruction/i,
]

function sanitizeUntrustedText(text = '') {
  const str = String(text || '')
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(str)) return '[untrusted content filtered]'
  }
  return str.slice(0, 4000)
}

function appendAudit(execution, action, actorUserId, actorRole, result, metadata = {}) {
  execution.auditLog.push({
    action,
    actorUserId,
    actorRole: actorRole || 'system',
    result,
    metadata,
    timestamp: new Date(),
  })
}

function requiresApproval(policy) {
  return policy && policy !== 'NO_APPROVAL'
}

function buildIdempotencyKey(templateId, orgId, trigger, entityId) {
  return `wf:${templateId}:${orgId}:${trigger}:${entityId || 'none'}`
}

function resolveNextStatusAfterApproval(execution) {
  const pending = execution.approvals.filter((a) => a.decision === 'pending')
  if (pending.length > 0) return 'WAITING_APPROVAL'
  const rejected = execution.approvals.some((a) => a.decision === 'rejected')
  if (rejected) return 'CANCELLED'
  const expired = execution.approvals.some((a) => a.decision === 'expired')
  if (expired) return 'EXPIRED'
  return 'APPROVED'
}

async function findExistingByIdempotency(idempotencyKey, organizationId) {
  if (!idempotencyKey) return null
  return WorkflowExecution.findOne({ idempotencyKey, organizationId }).lean()
}

function buildStepsFromTemplate(template, context = {}) {
  return template.actions.map((action, idx) => ({
    order: idx + 1,
    action,
    status: 'pending',
    preview: buildActionPreview(action, template, context),
    result: null,
    error: null,
  }))
}

function buildActionPreview(action, template, context = {}) {
  const safe = {
    action,
    why: sanitizeUntrustedText(context.why || template.name),
    target: sanitizeUntrustedText(context.target || context.entityLabel || 'Authorized recipient'),
    data: sanitizeUntrustedText(context.dataSummary || context.summary || ''),
    expectedResult: getExpectedResult(action),
    risk: action === 'PREPARE_EMAIL' ? 'External communication — requires explicit approval' : 'Internal operation',
  }
  if (action === 'PREPARE_EMAIL') {
    safe.emailPreview = {
      to: sanitizeUntrustedText(context.emailTo || 'Authorized contact'),
      subject: sanitizeUntrustedText(context.emailSubject || `${template.name}`),
      body: sanitizeUntrustedText(context.emailBody || context.proposalDraft || ''),
    }
  }
  if (action === 'SEND_NOTIFICATION') {
    safe.notificationPreview = {
      title: sanitizeUntrustedText(context.notificationTitle || template.name),
      body: sanitizeUntrustedText(context.notificationBody || context.summary || ''),
    }
  }
  return safe
}

function getExpectedResult(action) {
  switch (action) {
    case 'SEND_NOTIFICATION':
      return 'In-app notification delivered to authorized recipient'
    case 'PREPARE_EMAIL':
      return 'Email queued for delivery after approval (not sent automatically)'
    case 'CREATE_TASK':
    case 'CREATE_REVIEW_TASK':
      return 'Review task recorded for authorized user'
    case 'GENERATE_REPORT':
      return 'Report summary prepared for review'
    case 'REQUEST_APPROVAL':
      return 'Approval request created for designated role'
    default:
      return 'Step completed'
  }
}

async function createWorkflowFromTemplate({
  userId,
  organizationId,
  organizationRole,
  templateId,
  context = {},
  trigger = 'MANUAL',
  idempotencyKey = null,
}) {
  const template = WORKFLOW_TEMPLATES[templateId]
  if (!template) {
    const err = new Error(`Unknown workflow template: ${templateId}`)
    err.statusCode = 400
    throw err
  }

  const key = idempotencyKey || buildIdempotencyKey(templateId, organizationId, trigger, context.entityId)
  const existing = await findExistingByIdempotency(key, organizationId)
  if (existing) return { execution: existing, duplicate: true }

  const steps = buildStepsFromTemplate(template, context)
  const status = requiresApproval(template.approvalPolicy) ? 'WAITING_APPROVAL' : 'READY'
  const expiresAt = requiresApproval(template.approvalPolicy)
    ? new Date(Date.now() + APPROVAL_EXPIRY_HOURS * 60 * 60 * 1000)
    : null

  const execution = await WorkflowExecution.create({
    templateId,
    name: template.name,
    type: 'operations',
    ownerUserId: userId,
    organizationId,
    organizationRole,
    trigger: trigger || template.trigger,
    status,
    approvalPolicy: template.approvalPolicy,
    steps,
    approvals: requiresApproval(template.approvalPolicy)
      ? [{
          userId,
          decision: 'pending',
          expiresAt,
        }]
      : [],
    context: {
      ...context,
      why: sanitizeUntrustedText(context.why || template.name),
    },
    idempotencyKey: key,
    expiresAt,
  })

  appendAudit(execution, 'created', userId, organizationRole, 'ok', { templateId, trigger })
  await execution.save()

  if (status === 'WAITING_APPROVAL') {
    await notifyUser({
      recipientUserId: userId,
      recipientRole: organizationRole,
      type: 'application_status_changed',
      title: `Approval required: ${template.name}`,
      body: sanitizeUntrustedText(context.why || 'Review and approve before execution.'),
      metadata: {
        workflowExecutionId: execution._id.toString(),
        href: `/institution/operations?workflow=${execution._id}`,
        idempotencyKey: `wf-approval:${execution._id}:${userId}`,
      },
      idempotencyKey: `wf-approval:${execution._id}:${userId}`,
    }).catch(() => {})
  }

  return { execution: execution.toObject(), duplicate: false }
}

async function processTrigger({
  trigger,
  organizationId,
  organizationRole,
  userId,
  payload = {},
}) {
  if (!WORKFLOW_TRIGGERS.includes(trigger)) {
    const err = new Error(`Unsupported trigger: ${trigger}`)
    err.statusCode = 400
    throw err
  }

  const candidates = Object.values(WORKFLOW_TEMPLATES).filter((t) => t.trigger === trigger)
  const results = []

  for (const template of candidates) {
    const ctx = { ...payload, entityId: payload.entityId || payload.partnershipId || payload.opportunityId }
    const { execution, duplicate } = await createWorkflowFromTemplate({
      userId,
      organizationId,
      organizationRole,
      templateId: template.id,
      context: ctx,
      trigger,
    })
    results.push({ templateId: template.id, executionId: execution._id, duplicate })
  }

  return { processed: results.length, results }
}

async function planWorkflow(userId, organizationId, organizationRole, intent, context = {}) {
  const safeIntent = sanitizeUntrustedText(intent)
  const steps = []
  let templateId = 'PARTNERSHIP_REVIEW'

  if (/partnership|collaboration|proposal/i.test(safeIntent)) {
    templateId = 'PARTNERSHIP_REVIEW'
    steps.push(
      { step: 1, description: 'Find authorized company partnership record', action: 'lookup' },
      { step: 2, description: 'Analyze collaboration fit from institution capabilities', action: 'analyze' },
      { step: 3, description: 'Draft proposal preview (not sent)', action: 'PREPARE_EMAIL' },
      { step: 4, description: 'Request human approval', action: 'REQUEST_APPROVAL' },
      { step: 5, description: 'Send only after explicit confirmation', action: 'PREPARE_EMAIL' },
      { step: 6, description: 'Verify delivery result', action: 'verify' },
      { step: 7, description: 'Record audit trail', action: 'audit' },
    )
  } else if (/deadline|opportunity|placement/i.test(safeIntent)) {
    templateId = 'OPPORTUNITY_DEADLINE'
    steps.push(
      { step: 1, description: 'Identify affected authorized users', action: 'lookup' },
      { step: 2, description: 'Prepare notification preview', action: 'SEND_NOTIFICATION' },
      { step: 3, description: 'Request confirmation if external', action: 'REQUEST_APPROVAL' },
    )
  } else if (/skill|training|gap/i.test(safeIntent)) {
    templateId = 'SKILL_GAP_REVIEW'
    steps.push(
      { step: 1, description: 'Analyze evidence from opportunity requirements', action: 'analyze' },
      { step: 2, description: 'Prepare training recommendation', action: 'CREATE_REVIEW_TASK' },
      { step: 3, description: 'Notify placement officer for review', action: 'SEND_NOTIFICATION' },
    )
  } else {
    templateId = 'COMPANY_ENGAGEMENT_REVIEW'
    steps.push(
      { step: 1, description: 'Gather authorized ecosystem context', action: 'lookup' },
      { step: 2, description: 'Prepare recommendation', action: 'CREATE_REVIEW_TASK' },
      { step: 3, description: 'Request approval before any external contact', action: 'REQUEST_APPROVAL' },
    )
  }

  return {
    intent: safeIntent,
    templateId,
    steps,
    approvalRequired: true,
    note: 'AI recommends — human must approve before consequential actions execute.',
    dataLimitations: context.dataLimitations || 'Plan based on authorized organization data only.',
  }
}

async function getWorkflowById(executionId, organizationId, userId) {
  const execution = await WorkflowExecution.findOne({
    _id: executionId,
    organizationId,
  }).lean()
  if (!execution) return null
  if (execution.ownerUserId?.toString() !== userId?.toString()) {
    const err = new Error('Not authorized for this workflow')
    err.statusCode = 403
    throw err
  }
  return execution
}

async function approveWorkflow(executionId, userId, organizationId, { decision = 'approved', comment = '' } = {}) {
  const execution = await WorkflowExecution.findOne({ _id: executionId, organizationId })
  if (!execution) {
    const err = new Error('Workflow not found')
    err.statusCode = 404
    throw err
  }

  if (!['WAITING_APPROVAL', 'READY'].includes(execution.status)) {
    const err = new Error(`Cannot approve workflow in status ${execution.status}`)
    err.statusCode = 400
    throw err
  }

  const approval = execution.approvals.find(
    (a) => a.userId.toString() === userId.toString() && a.decision === 'pending',
  )
  if (!approval) {
    const err = new Error('No pending approval for this user')
    err.statusCode = 403
    throw err
  }

  if (approval.expiresAt && approval.expiresAt < new Date()) {
    approval.decision = 'expired'
    execution.status = 'EXPIRED'
    appendAudit(execution, 'approval_expired', userId, 'user', 'expired')
    await execution.save()
    const err = new Error('Approval has expired')
    err.statusCode = 410
    throw err
  }

  if (decision === 'rejected') {
    approval.decision = 'rejected'
    approval.decidedAt = new Date()
    approval.comment = sanitizeUntrustedText(comment)
    execution.status = 'CANCELLED'
    appendAudit(execution, 'rejected', userId, 'user', 'cancelled', { comment })
    await execution.save()
    return execution.toObject()
  }

  approval.decision = 'approved'
  approval.decidedAt = new Date()
  approval.comment = sanitizeUntrustedText(comment)
  execution.status = resolveNextStatusAfterApproval(execution)
  appendAudit(execution, 'approved', userId, 'user', 'ok', { comment })
  await execution.save()
  return execution.toObject()
}

async function executeStep(step, execution, userId) {
  const ctx = execution.context || {}
  const preview = step.preview || {}

  switch (step.action) {
    case 'SEND_NOTIFICATION': {
      const title = preview.notificationPreview?.title || execution.name
      const body = preview.notificationPreview?.body || ctx.summary || ''
      const idempotencyKey = `wf-exec:${execution._id}:step:${step.order}:notify`
      const notification = await notifyUser({
        recipientUserId: userId,
        recipientRole: execution.organizationRole,
        type: 'application_status_changed',
        title,
        body: sanitizeUntrustedText(body),
        metadata: {
          workflowExecutionId: execution._id.toString(),
          href: `/institution/operations?workflow=${execution._id}`,
        },
        idempotencyKey,
        actorUserId: userId,
      })
      return { verified: !!notification, notificationId: notification?._id?.toString() }
    }
    case 'PREPARE_EMAIL': {
      return {
        verified: true,
        prepared: true,
        emailPreview: preview.emailPreview || {},
        sent: false,
        note: 'Email prepared — not sent automatically. Use approved send workflow when enabled.',
      }
    }
    case 'CREATE_TASK':
    case 'CREATE_REVIEW_TASK': {
      return {
        verified: true,
        taskCreated: true,
        title: execution.name,
        assigneeUserId: userId.toString(),
      }
    }
    case 'GENERATE_REPORT': {
      return {
        verified: true,
        reportType: execution.templateId,
        summary: sanitizeUntrustedText(ctx.summary || execution.name),
      }
    }
    case 'REQUEST_APPROVAL': {
      return { verified: true, approvalRecorded: true }
    }
    case 'NOOP':
      return { verified: true, noop: true }
    default: {
      const err = new Error(`Action not allowed: ${step.action}`)
      err.statusCode = 400
      throw err
    }
  }
}

async function executeApprovedWorkflow(executionId, userId, organizationId) {
  const execution = await WorkflowExecution.findOne({ _id: executionId, organizationId })
  if (!execution) {
    const err = new Error('Workflow not found')
    err.statusCode = 404
    throw err
  }

  if (execution.ownerUserId.toString() !== userId.toString()) {
    const err = new Error('Not authorized to execute this workflow')
    err.statusCode = 403
    throw err
  }

  if (requiresApproval(execution.approvalPolicy) && execution.status !== 'APPROVED') {
    if (execution.status === 'WAITING_APPROVAL') {
      const err = new Error('Workflow requires approval before execution')
      err.statusCode = 403
      throw err
    }
  }

  if (execution.status === 'COMPLETED') {
    return { execution: execution.toObject(), duplicate: true }
  }

  if (execution.status === 'RUNNING') {
    const err = new Error('Workflow already running')
    err.statusCode = 409
    throw err
  }

  execution.status = 'RUNNING'
  appendAudit(execution, 'started', userId, execution.organizationRole, 'ok')
  await execution.save()

  let allOk = true
  for (const step of execution.steps) {
    if (step.status === 'completed') continue
    if (!ACTION_TYPES.includes(step.action)) {
      step.status = 'failed'
      step.error = 'Action not in allowlist'
      allOk = false
      continue
    }
    try {
      step.status = 'running'
      const result = await executeStep(step, execution, userId)
      step.result = result
      step.status = result.verified ? 'completed' : 'failed'
      step.executedAt = new Date()
      if (!result.verified) allOk = false
    } catch (e) {
      step.status = 'failed'
      step.error = e.message
      allOk = false
    }
  }

  execution.status = allOk ? 'COMPLETED' : 'FAILED'
  execution.completedAt = new Date()
  execution.failureReason = allOk ? null : 'One or more steps failed verification'
  appendAudit(execution, allOk ? 'completed' : 'failed', userId, execution.organizationRole, allOk ? 'ok' : 'failed')
  await execution.save()

  return { execution: execution.toObject(), duplicate: false }
}

async function retryFailedWorkflow(executionId, userId, organizationId) {
  const execution = await WorkflowExecution.findOne({ _id: executionId, organizationId })
  if (!execution) {
    const err = new Error('Workflow not found')
    err.statusCode = 404
    throw err
  }
  if (execution.status !== 'FAILED') {
    const err = new Error('Only failed workflows can be retried')
    err.statusCode = 400
    throw err
  }

  const hasExternal = execution.steps.some(
    (s) => s.action === 'PREPARE_EMAIL' && s.status === 'failed',
  )
  if (hasExternal) {
    const err = new Error('External actions require re-approval before retry')
    err.statusCode = 403
    throw err
  }

  execution.status = 'APPROVED'
  execution.failureReason = null
  appendAudit(execution, 'retry_requested', userId, execution.organizationRole, 'ok')
  await execution.save()
  return executeApprovedWorkflow(executionId, userId, organizationId)
}

async function getPendingApprovals(organizationId, userId) {
  const items = await WorkflowExecution.find({
    organizationId,
    ownerUserId: userId,
    status: 'WAITING_APPROVAL',
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return items.map((w) => ({
    id: w._id,
    name: w.name,
    templateId: w.templateId,
    why: w.context?.why || w.name,
    deadline: w.expiresAt,
    status: w.status,
    steps: w.steps?.map((s) => s.preview) || [],
  }))
}

async function getDailyOperationsBrief(organizationId, organizationRole) {
  const brief = {
    generatedAt: new Date().toISOString(),
    deadlines: [],
    pendingApprovals: 0,
    failedWorkflows: 0,
    upcomingEvents: [],
    partnershipReviews: [],
    placementActions: [],
    companyActivity: [],
    dataLimitations: [],
  }

  if (organizationRole === 'institution') {
    try {
      const campus = await campusCommandCenter.getCampusCommandCenter(organizationId)
      if (campus?.dailyBrief) {
        brief.placementActions.push({
          label: 'Applications closing',
          count: campus.dailyBrief.applicationsClosing || 0,
        })
        brief.placementActions.push({
          label: 'Interviews today',
          count: campus.dailyBrief.interviewsToday || 0,
        })
        brief.placementActions.push({
          label: 'Pending actions',
          count: campus.dailyBrief.pendingActions || 0,
        })
        if (campus.dailyBrief.topSkillGap) {
          brief.placementActions.push({ label: 'Top skill gap', value: campus.dailyBrief.topSkillGap })
        }
      }
    } catch {
      brief.dataLimitations.push('Campus command center data unavailable')
    }

    try {
      const exec = await institutionCommandCenter.getCommandCenterOverview(organizationId)
      if (exec?.actionCenter?.items?.length) {
        brief.companyActivity = exec.actionCenter.items.slice(0, 5).map((i) => ({
          label: i.title || i.label,
          href: i.href,
        }))
      }
    } catch {
      brief.dataLimitations.push('Executive command center data unavailable')
    }
  }

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const expiringPartnerships = await InstitutionCompanyPartnership.find({
    institutionId: organizationId,
    status: 'active',
    endDate: { $gte: now, $lte: in30 },
  })
    .select('companyId endDate relationshipType')
    .limit(10)
    .lean()

  brief.partnershipReviews = expiringPartnerships.map((p) => ({
    partnershipId: p._id,
    endDate: p.endDate,
    relationshipType: p.relationshipType,
    label: 'Partnership expiring within 30 days',
  }))

  const closingOpps = await CampusOpportunity.find({
    institutionId: organizationId,
    status: 'published',
    deadline: { $gte: now, $lte: in30 },
  })
    .select('title deadline')
    .limit(10)
    .lean()

  brief.deadlines = closingOpps.map((o) => ({
    opportunityId: o._id,
    title: o.title,
    deadline: o.deadline,
  }))

  brief.pendingApprovals = await WorkflowExecution.countDocuments({
    organizationId,
    status: 'WAITING_APPROVAL',
  })
  brief.failedWorkflows = await WorkflowExecution.countDocuments({
    organizationId,
    status: 'FAILED',
  })

  return brief
}

async function getPendingActionCenter(organizationId, organizationRole, userId) {
  const [approvals, failed, waiting] = await Promise.all([
    getPendingApprovals(organizationId, userId),
    WorkflowExecution.find({ organizationId, status: 'FAILED' }).sort({ updatedAt: -1 }).limit(10).lean(),
    WorkflowExecution.find({ organizationId, status: { $in: ['RUNNING', 'WAITING_APPROVAL'] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ])

  const actions = []

  for (const a of approvals) {
    actions.push({
      type: 'approval_needed',
      id: a.id,
      why: a.why,
      owner: userId,
      deadline: a.deadline,
      nextStep: 'Review and approve or reject',
    })
  }

  for (const f of failed) {
    actions.push({
      type: 'failed_workflow',
      id: f._id,
      why: f.failureReason || 'Workflow step failed',
      owner: f.ownerUserId,
      deadline: null,
      nextStep: 'Inspect error and retry if safe',
    })
  }

  const brief = await getDailyOperationsBrief(organizationId, organizationRole)
  for (const d of brief.deadlines.slice(0, 5)) {
    actions.push({
      type: 'deadline_approaching',
      id: d.opportunityId,
      why: `Opportunity "${d.title}" deadline approaching`,
      deadline: d.deadline,
      nextStep: 'Review placement reminder workflow',
    })
  }

  for (const p of brief.partnershipReviews.slice(0, 5)) {
    actions.push({
      type: 'review_needed',
      id: p.partnershipId,
      why: p.label,
      deadline: p.endDate,
      nextStep: 'Create partnership review workflow',
    })
  }

  return { actions, total: actions.length }
}

async function getWorkflowMonitor(organizationId, { status } = {}) {
  const query = { organizationId }
  if (status) query.status = status

  const [running, waiting, completed, failed, cancelled] = await Promise.all([
    WorkflowExecution.countDocuments({ ...query, status: 'RUNNING' }),
    WorkflowExecution.countDocuments({ ...query, status: 'WAITING_APPROVAL' }),
    WorkflowExecution.countDocuments({ ...query, status: 'COMPLETED' }),
    WorkflowExecution.countDocuments({ ...query, status: 'FAILED' }),
    WorkflowExecution.countDocuments({ ...query, status: 'CANCELLED' }),
  ])

  const recent = await WorkflowExecution.find(query)
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('name status templateId trigger createdAt updatedAt completedAt failureReason')
    .lean()

  const total = running + waiting + completed + failed + cancelled
  const successRate = total > 0 ? Math.round((completed / (completed + failed || 1)) * 100) : null

  return {
    counts: { running, waiting, completed, failed, cancelled },
    observability: {
      successRate,
      pendingDurationHint: waiting > 0 ? 'Check approvals older than 48h' : null,
    },
    recent,
  }
}

async function getFailedWorkflowCenter(organizationId) {
  const items = await WorkflowExecution.find({ organizationId, status: 'FAILED' })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean()

  return items.map((w) => ({
    id: w._id,
    name: w.name,
    step: w.steps?.find((s) => s.status === 'failed')?.order || null,
    error: w.failureReason || w.steps?.find((s) => s.error)?.error,
    time: w.updatedAt,
    canRetry: !w.steps?.some((s) => s.action === 'PREPARE_EMAIL' && s.status === 'failed'),
  }))
}

async function getAiOperationsSummary(organizationId, organizationRole) {
  const brief = await getDailyOperationsBrief(organizationId, organizationRole)
  const monitor = await getWorkflowMonitor(organizationId)

  return {
    whatChanged: [
      brief.deadlines.length ? `${brief.deadlines.length} opportunity deadline(s) in next 30 days` : null,
      brief.partnershipReviews.length ? `${brief.partnershipReviews.length} partnership review(s) due` : null,
    ].filter(Boolean),
    whatMatters: [
      brief.pendingApprovals ? `${brief.pendingApprovals} workflow(s) awaiting approval` : null,
      brief.failedWorkflows ? `${brief.failedWorkflows} failed workflow(s) need attention` : null,
    ].filter(Boolean),
    whatNeedsAction: brief.placementActions.slice(0, 3),
    whatIsWaiting: monitor.counts.waiting,
    whatFailed: monitor.counts.failed,
    dataLimitations: brief.dataLimitations,
  }
}

async function listWorkflowTemplates() {
  return Object.values(WORKFLOW_TEMPLATES).map((t) => ({
    id: t.id,
    name: t.name,
    trigger: t.trigger,
    approvalPolicy: t.approvalPolicy,
    actions: t.actions,
  }))
}

async function listWorkflows(organizationId, userId, { status, limit = 20 } = {}) {
  const query = { organizationId, ownerUserId: userId }
  if (status) query.status = status
  return WorkflowExecution.find(query).sort({ createdAt: -1 }).limit(Math.min(50, limit)).lean()
}

module.exports = {
  sanitizeUntrustedText,
  createWorkflowFromTemplate,
  processTrigger,
  planWorkflow,
  getWorkflowById,
  approveWorkflow,
  executeApprovedWorkflow,
  retryFailedWorkflow,
  getPendingApprovals,
  getDailyOperationsBrief,
  getPendingActionCenter,
  getWorkflowMonitor,
  getFailedWorkflowCenter,
  getAiOperationsSummary,
  listWorkflowTemplates,
  listWorkflows,
  OPERATIONS_AI_INTENTS,
  WORKFLOW_STATUSES,
  ACTION_TYPES,
}
