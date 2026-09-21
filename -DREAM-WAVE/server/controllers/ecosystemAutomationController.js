const ops = require('../services/ecosystemAutomationService')

function resolveOrg(req) {
  if (req.user.role === 'institution' && req.institution) {
    return { orgId: req.institution._id, role: 'institution', userId: req.user._id }
  }
  if (req.user.role === 'company' && req.company) {
    return { orgId: req.company._id, role: 'company', userId: req.user._id }
  }
  const err = new Error('Institution or company profile required')
  err.statusCode = 403
  throw err
}

exports.getDailyBrief = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const brief = await ops.getDailyOperationsBrief(orgId, role)
    res.json({ success: true, brief })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPendingActions = async (req, res) => {
  try {
    const { orgId, role, userId } = resolveOrg(req)
    const data = await ops.getPendingActionCenter(orgId, role, userId)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getWorkflowMonitor = async (req, res) => {
  try {
    const { orgId } = resolveOrg(req)
    const data = await ops.getWorkflowMonitor(orgId, req.query)
    res.json({ success: true, monitor: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getFailedWorkflows = async (req, res) => {
  try {
    const { orgId } = resolveOrg(req)
    const items = await ops.getFailedWorkflowCenter(orgId)
    res.json({ success: true, failed: items })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiSummary = async (req, res) => {
  try {
    const { orgId, role } = resolveOrg(req)
    const summary = await ops.getAiOperationsSummary(orgId, role)
    res.json({ success: true, summary })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getTemplates = async (_req, res) => {
  try {
    const templates = await ops.listWorkflowTemplates()
    res.json({ success: true, templates })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getWorkflows = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const items = await ops.listWorkflows(orgId, userId, req.query)
    res.json({ success: true, workflows: items })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getWorkflow = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const workflow = await ops.getWorkflowById(req.params.id, orgId, userId)
    if (!workflow) return res.status(404).json({ success: false, message: 'Workflow not found' })
    res.json({ success: true, workflow })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createFromTemplate = async (req, res) => {
  try {
    const { orgId, role, userId } = resolveOrg(req)
    const { templateId, context, trigger } = req.body || {}
    if (!templateId) return res.status(400).json({ success: false, message: 'templateId required' })
    const result = await ops.createWorkflowFromTemplate({
      userId,
      organizationId: orgId,
      organizationRole: role,
      templateId,
      context: context || {},
      trigger,
    })
    res.status(result.duplicate ? 200 : 201).json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.processTrigger = async (req, res) => {
  try {
    const { orgId, role, userId } = resolveOrg(req)
    const { trigger, payload } = req.body || {}
    if (!trigger) return res.status(400).json({ success: false, message: 'trigger required' })
    const result = await ops.processTrigger({
      trigger,
      organizationId: orgId,
      organizationRole: role,
      userId,
      payload: payload || {},
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.planWorkflow = async (req, res) => {
  try {
    const { orgId, role, userId } = resolveOrg(req)
    const intent = req.body?.intent || ''
    if (!intent) return res.status(400).json({ success: false, message: 'intent required' })
    const plan = await ops.planWorkflow(userId, orgId, role, intent, req.body?.context || {})
    res.json({ success: true, plan })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.approveWorkflow = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const workflow = await ops.approveWorkflow(req.params.id, userId, orgId, req.body || {})
    res.json({ success: true, workflow })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.executeWorkflow = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const result = await ops.executeApprovedWorkflow(req.params.id, userId, orgId)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.retryWorkflow = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const result = await ops.retryFailedWorkflow(req.params.id, userId, orgId)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPendingApprovals = async (req, res) => {
  try {
    const { orgId, userId } = resolveOrg(req)
    const approvals = await ops.getPendingApprovals(orgId, userId)
    res.json({ success: true, approvals })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getIntents = (_req, res) => {
  res.json({ success: true, intents: ops.OPERATIONS_AI_INTENTS })
}

exports.getMeta = (_req, res) => {
  res.json({
    success: true,
    statuses: ops.WORKFLOW_STATUSES,
    actions: ops.ACTION_TYPES,
  })
}
