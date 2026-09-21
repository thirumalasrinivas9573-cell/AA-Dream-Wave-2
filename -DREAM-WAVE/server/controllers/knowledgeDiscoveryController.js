const discovery = require('../services/knowledgeDiscoveryService')

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

exports.search = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const data = await discovery.globalSearch({
      userId,
      role,
      organizationId: orgId,
      query: req.query.q || req.query.query || '',
      type: req.query.type || 'all',
      limit: parseInt(req.query.limit, 10) || 20,
      useSemantic: req.query.semantic !== 'false',
    })
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.suggest = async (req, res) => {
  try {
    const { userId, role } = resolveContext(req)
    const suggestions = await discovery.getSuggestions(userId, role, {
      prefix: req.query.prefix || '',
      page: req.query.page || '',
    })
    res.json({ success: true, suggestions })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.research = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const result = await discovery.runResearchMode({
      userId,
      role,
      organizationId: orgId,
      question: req.body?.question || req.body?.query || '',
    })
    res.status(201).json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getResearch = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const session = await discovery.getResearchSession(req.params.id, userId)
    res.json({ success: true, session })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.index = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const result = await discovery.indexDocument(userId, role, orgId, req.body || {})
    res.status(201).json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.recent = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const recent = await discovery.getRecentSearches(userId)
    res.json({ success: true, recent })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.saved = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const saved = await discovery.getSavedSearches(userId)
    res.json({ success: true, saved })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.saveSearch = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const entry = await discovery.saveSearch(userId, req.body?.query || '')
    res.status(201).json({ success: true, entry })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.clearRecent = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const result = await discovery.clearRecentSearches(userId)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.graphExpand = async (req, res) => {
  try {
    const { userId, orgId, role } = resolveContext(req)
    const graph = await discovery.expandGraph(req.query.entity || '', userId, role, orgId)
    res.json({ success: true, graph })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.feedback = async (req, res) => {
  try {
    const { userId } = resolveContext(req)
    const result = await discovery.recordSearchFeedback(userId, req.body || {})
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
