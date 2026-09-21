const personalization = require('../services/contextPersonalizationService')

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

exports.getContext = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const ctx = await personalization.buildUserContext(userId, role, { organizationId: orgId })
    res.json({ success: true, context: ctx })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getHome = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const home = await personalization.getPersonalizedHome(userId, role, { organizationId: orgId })
    res.json({ success: true, home })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const dashboard = await personalization.getAdaptiveDashboard(userId, role, { organizationId: orgId })
    res.json({ success: true, dashboard })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getNextActions = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const actions = await personalization.getNextBestActions(userId, role, { organizationId: orgId })
    res.json({ success: true, actions })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPrivacyCenter = async (req, res) => {
  try {
    const { userId, role } = resolveContext(req)
    const privacy = await personalization.getPrivacyCenter(userId, role)
    res.json({ success: true, privacy })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPreferences = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const prefs = await personalization.getOrCreatePreferences(userId)
    res.json({ success: true, preferences: prefs.toObject() })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updatePreferences = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const preferences = await personalization.updatePreferences(userId, req.body || {})
    res.json({ success: true, preferences })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.setSessionContext = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const sessionContext = await personalization.setSessionContext(userId, req.body || {})
    res.json({ success: true, sessionContext })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.setTemporaryContext = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const temporaryContext = await personalization.setTemporaryContext(userId, req.body || {})
    res.json({ success: true, temporaryContext })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.recordFeedback = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const feedback = await personalization.recordFeedback(userId, req.body || {})
    res.json({ success: true, feedback })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.memoryConsent = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const result = await personalization.handleMemoryConsent(userId, req.body || {})
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.refresh = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const result = await personalization.refreshPersonalization(userId, req.body?.eventType)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAgentContext = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const agentContext = await personalization.getContextForAgent(userId, role, {
      intent: req.query.intent,
      query: req.query.query,
      organizationId: orgId,
    })
    res.json({ success: true, agentContext })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
