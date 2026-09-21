const agentOrchestratorService = require('../services/agent/agentOrchestratorService')
const toolRegistry = require('../services/agent/toolRegistry')

const fail = (res, status, message, code = 'AGENT_ERROR') => res.status(status).json({ success: false, code, message })

exports.listTools = async (req, res) => {
  try {
    const agentType = String(req.query.agentType || '').trim() || undefined
    const tools = agentOrchestratorService.listTools({
      role: req.user.role,
      agentType,
    })
    return res.json({ success: true, data: { tools } })
  } catch (error) {
    console.error('[agent.listTools]', error.message)
    return fail(res, 500, 'Failed to list tools.')
  }
}

exports.run = async (req, res) => {
  try {
    const {
      message,
      mode,
      agentType,
      confirmed,
      previewId,
      confirmSteps,
      idempotencyKey,
    } = req.body || {}

    // Never trust body identity fields
    if (req.body?.userId || req.body?.ownerId || req.body?.role) {
      // ignore silently — auth context wins
    }

    const data = await agentOrchestratorService.runAgent({
      user: req.user,
      message,
      mode: mode || 'SUGGEST',
      agentType,
      confirmed: Boolean(confirmed),
      previewId,
      confirmSteps,
      idempotencyKey: idempotencyKey ? String(idempotencyKey).slice(0, 120) : null,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.run]', error.message)
    return fail(res, 500, 'Agent execution failed.')
  }
}

exports.confirm = async (req, res) => {
  try {
    const previewId = String(req.body?.previewId || '').trim()
    const confirmSteps = req.body?.confirmSteps || null
    if (!previewId) return fail(res, 400, 'previewId is required.', 'VALIDATION_ERROR')
    if (!req.body?.confirmed) return fail(res, 400, 'Confirmation required.', 'CONFIRMATION_REQUIRED')

    const data = await agentOrchestratorService.runAgent({
      user: req.user,
      message: 'confirm',
      confirmed: true,
      previewId,
      confirmSteps,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.confirm]', error.message)
    return fail(res, 500, 'Agent confirmation failed.')
  }
}

exports.cancel = async (req, res) => {
  try {
    const executionId = String(req.params.executionId || req.body?.executionId || '').trim()
    if (!executionId) return fail(res, 400, 'executionId is required.', 'VALIDATION_ERROR')
    const data = await agentOrchestratorService.cancelExecution(req.user._id, executionId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.cancel]', error.message)
    return fail(res, 500, 'Failed to cancel execution.')
  }
}

exports.getExecution = async (req, res) => {
  try {
    const data = await agentOrchestratorService.getExecution(req.user._id, req.params.executionId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.getExecution]', error.message)
    return fail(res, 500, 'Failed to load execution.')
  }
}

exports.listExecutions = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20
    const items = await agentOrchestratorService.listExecutions(req.user._id, { limit })
    return res.json({ success: true, data: { items } })
  } catch (error) {
    console.error('[agent.listExecutions]', error.message)
    return fail(res, 500, 'Failed to list executions.')
  }
}

exports.blockedProbe = async (req, res) => {
  // Explicit security probes for tests / diagnostics — always fail closed
  try {
    const name = String(req.body?.tool || '')
    if (!['runShellCommand', 'httpRequest'].includes(name)) {
      return fail(res, 400, 'Probe only supports blocked tools.', 'VALIDATION_ERROR')
    }
    await toolRegistry.executeTool(name, req.body?.args || {}, {
      userId: req.user._id,
      role: req.user.role,
    })
    return fail(res, 500, 'Blocked tool unexpectedly succeeded.', 'SECURITY_FAILURE')
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      code: error.code || 'BLOCKED',
      message: error.message,
    })
  }
}

// V4 Prompt 2 — Specialist multi-agent network (extends existing orchestrator)

exports.listSpecialists = async (req, res) => {
  try {
    const agents = agentOrchestratorService.listSpecialists({ role: req.user.role })
    return res.json({ success: true, data: { agents } })
  } catch (error) {
    console.error('[agent.listSpecialists]', error.message)
    return fail(res, 500, 'Failed to list specialists.')
  }
}

exports.planSpecialists = async (req, res) => {
  try {
    const message = String(req.body?.message || req.query.q || '').trim()
    const plan = agentOrchestratorService.planSpecialists(message, { role: req.user.role })
    return res.json({ success: true, data: plan })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Failed to plan specialists.')
  }
}

exports.runNetwork = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    delete body.role
    const data = await agentOrchestratorService.runSpecialistNetwork(req.user, body.message || '', {
      mode: body.mode || 'READ_ONLY',
      forcedAgents: Array.isArray(body.agents) ? body.agents.slice(0, 4) : [],
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey).slice(0, 120) : null,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.runNetwork]', error.message)
    return fail(res, 500, 'Specialist network execution failed.')
  }
}

exports.cancelNetwork = async (req, res) => {
  try {
    const executionId = String(req.params.executionId || req.body?.executionId || '').trim()
    if (!executionId) return fail(res, 400, 'executionId is required.', 'VALIDATION_ERROR')
    const data = await agentOrchestratorService.cancelNetworkExecution(req.user._id, executionId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Cancel failed.')
  }
}

exports.networkMetrics = async (req, res) => {
  try {
    return res.json({ success: true, data: agentOrchestratorService.getNetworkObservability() })
  } catch (error) {
    return fail(res, 500, 'Metrics unavailable.')
  }
}

// ─── Workflow Engine (V4 Prompt 5) — extends AgentExecution ───────────────────

const workflowEngineService = require('../services/agent/workflowEngineService')

exports.workflowTemplates = async (_req, res) => {
  try {
    return res.json({ success: true, data: { templates: await workflowEngineService.getTemplates() } })
  } catch (error) {
    return fail(res, 500, 'Templates unavailable.')
  }
}

exports.workflowCreate = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await workflowEngineService.createWorkflow(req.user, body.message || '', {
      template: body.template,
      userOverride: body.userOverride || '',
      idempotencyKey: body.idempotencyKey,
      autoRunReads: body.autoRunReads !== false,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.workflowCreate]', error.message)
    return fail(res, 500, 'Workflow create failed.')
  }
}

exports.workflowList = async (req, res) => {
  try {
    const data = await workflowEngineService.listWorkflows(req.user, {
      limit: Number(req.query.limit) || 20,
      state: req.query.state || null,
    })
    return res.json({ success: true, data: { workflows: data } })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow list failed.')
  }
}

exports.workflowGet = async (req, res) => {
  try {
    const data = await workflowEngineService.getWorkflow(req.user, req.params.workflowId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow fetch failed.')
  }
}

exports.workflowApprove = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await workflowEngineService.approveWorkflow(req.user, req.params.workflowId, {
      confirmed: body.confirmed === true,
      planHash: body.planHash || null,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[agent.workflowApprove]', error.message)
    return fail(res, 500, 'Workflow approve failed.')
  }
}

exports.workflowReject = async (req, res) => {
  try {
    const data = await workflowEngineService.rejectWorkflow(req.user, req.params.workflowId, req.body?.reason || '')
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow reject failed.')
  }
}

exports.workflowPause = async (req, res) => {
  try {
    const data = await workflowEngineService.pauseWorkflow(req.user, req.params.workflowId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow pause failed.')
  }
}

exports.workflowResume = async (req, res) => {
  try {
    const data = await workflowEngineService.resumeWorkflow(req.user, req.params.workflowId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow resume failed.')
  }
}

exports.workflowCancel = async (req, res) => {
  try {
    const data = await workflowEngineService.cancelWorkflow(req.user, req.params.workflowId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow cancel failed.')
  }
}

exports.workflowEdit = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await workflowEngineService.editWorkflowPlan(req.user, req.params.workflowId, {
      removeStepIds: Array.isArray(body.removeStepIds) ? body.removeStepIds : [],
      userOverride: body.userOverride || '',
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Workflow edit failed.')
  }
}
