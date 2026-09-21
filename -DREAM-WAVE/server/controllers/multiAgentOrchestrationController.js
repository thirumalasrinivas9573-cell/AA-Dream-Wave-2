const orchestrator = require('../services/multiAgentOrchestrationService')

function resolveContext(req) {
  const userId = req.user._id
  if (req.user.role === 'institution' && req.institution) {
    return { userId, orgId: req.institution._id, role: 'institution' }
  }
  if (req.user.role === 'company' && req.company) {
    return { userId, orgId: req.company._id, role: 'company' }
  }
  if (req.user.role === 'student') {
    return { userId, orgId: null, role: 'student' }
  }
  const err = new Error('Supported roles: student, institution, company')
  err.statusCode = 403
  throw err
}

exports.getRegistry = (_req, res) => {
  res.json({
    success: true,
    agents: orchestrator.getAgentRegistry(),
    tools: orchestrator.getToolRegistry(),
  })
}

exports.getIntents = (req, res) => {
  try {
    const { role } = resolveContext(req)
    res.json({ success: true, intents: orchestrator.getIntentsForRole(role) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getHealth = async (_req, res) => {
  try {
    const health = await orchestrator.getAgentHealth()
    res.json({ success: true, health })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getObservability = (req, res) => {
  try {
    const { orgId, role } = resolveContext(req)
    orchestrator.getObservability(orgId, role).then((data) => {
      res.json({ success: true, observability: data })
    }).catch((e) => {
      res.status(e.statusCode || 500).json({ success: false, message: e.message })
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.plan = (req, res) => {
  try {
    const { role, userId } = resolveContext(req)
    const intentId = req.body?.intent || orchestrator.resolveIntent(req.body?.query || '')
    const plan = orchestrator.buildPlan(intentId, role)
    orchestrator.validatePlan(plan, role, userId)
    res.json({ success: true, intent: intentId, plan, preview: true })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.run = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const result = await orchestrator.runOrchestration({
      userId,
      organizationId: orgId,
      role,
      query: req.body?.query || '',
      intent: req.body?.intent,
      simulation: req.body?.simulation === true,
      idempotencyKey: req.body?.idempotencyKey,
    })
    res.status(result.duplicate ? 200 : 201).json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getExecution = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const execution = await orchestrator.getExecution(req.params.id, userId)
    res.json({ success: true, execution })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listExecutions = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const items = await orchestrator.listExecutions(userId, req.query)
    res.json({ success: true, executions: items })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.approve = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const result = await orchestrator.approveExecution(req.params.id, userId)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.cancel = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const execution = await orchestrator.cancelExecution(req.params.id, userId)
    res.json({ success: true, execution })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.domainMultiAgent = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const result = await orchestrator.runDomainMultiAgent(role, orgId, userId, req.body?.intent, req.body)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
