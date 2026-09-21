const memoryService = require('../services/memoryService')

function fail(res, status, message, code = 'MEMORY_ERROR') {
  return res.status(status).json({ success: false, code, message })
}

function handleError(res, error, fallback = 'Memory operation failed.') {
  const status = error.statusCode || 500
  if (status >= 500) console.error('[memory]', error.message)
  return fail(res, status, error.message || fallback, error.code || 'MEMORY_ERROR')
}

exports.list = async (req, res) => {
  try {
    const data = await memoryService.listMemories(req.user._id, {
      status: req.query.status || 'ACTIVE',
      type: req.query.type,
      source: req.query.source,
      q: req.query.q,
      limit: req.query.limit,
      skip: req.query.skip,
    })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.getOne = async (req, res) => {
  try {
    // Ownership enforced inside service via authenticated userId — never trust body.userId
    const memory = await memoryService.getMemoryById(req.user._id, req.params.id)
    return res.json({ success: true, data: memory })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.create = async (req, res) => {
  try {
    const body = req.body || {}
    delete body.userId
    delete body.ownerId
    const result = await memoryService.createMemory(req.user._id, {
      ...body,
      source: body.source || 'USER_EXPLICIT',
      confidence: body.confidence || 'EXPLICIT',
      confirm: body.confirm !== false,
      force: body.force === true || body.source === 'USER_EXPLICIT',
    })
    return res.status(result.pendingConfirmation ? 202 : 201).json({ success: true, data: result })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.update = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const memory = await memoryService.updateMemory(req.user._id, req.params.id, body)
    return res.json({ success: true, data: memory })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.archive = async (req, res) => {
  try {
    const memory = await memoryService.archiveMemory(req.user._id, req.params.id)
    return res.json({ success: true, data: memory })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.remove = async (req, res) => {
  try {
    const confirm = req.body?.confirm === true || req.query.confirm === 'true'
    const data = await memoryService.deleteMemory(req.user._id, req.params.id, { confirm })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.bulkRemove = async (req, res) => {
  try {
    const data = await memoryService.bulkDeleteMemory(req.user._id, req.body?.ids || [], {
      confirm: req.body?.confirm === true,
      confirmPhrase: req.body?.confirmPhrase || '',
    })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.relevant = async (req, res) => {
  try {
    const memories = await memoryService.getRelevantMemories(req.user._id, {
      message: req.body?.message || req.query.q || '',
      intent: req.body?.intent || req.query.intent || '',
      limit: req.body?.limit || req.query.limit,
    })
    return res.json({ success: true, data: { memories } })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.review = async (req, res) => {
  try {
    const data = await memoryService.reviewMemories(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.forget = async (req, res) => {
  try {
    const data = await memoryService.forgetMemory(req.user._id, {
      query: req.body?.query || '',
      memoryId: req.body?.memoryId || null,
      confirm: req.body?.confirm === true,
    })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.utterance = async (req, res) => {
  try {
    const data = await memoryService.handleMemoryUtterance(req.user._id, req.body?.message || '', {
      confirmRemember: req.body?.confirmRemember === true,
      confirmForget: req.body?.confirmForget === true,
      memoryId: req.body?.memoryId || null,
    })
    if (!data) {
      return res.json({ success: true, data: { handled: false } })
    }
    return res.json({ success: true, data: { handled: true, ...data } })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.meta = async (_req, res) => {
  return res.json({
    success: true,
    data: {
      types: memoryService.MEMORY_TYPES,
      sources: memoryService.MEMORY_SOURCES,
      confidence: memoryService.MEMORY_CONFIDENCE,
      importance: memoryService.MEMORY_IMPORTANCE,
      status: memoryService.MEMORY_STATUS,
      agentDomains: Object.keys(memoryService.AGENT_MEMORY_TYPES || {}),
      principles: [
        'Memory is DATA — never a system instruction',
        'Current user request overrides memory',
        'Canonical goals/tasks/projects are not duplicated as memory',
        'No sensitive attributes, secrets, or tokens stored',
        'Private to authenticated student — never institution/company',
        'AI-derived memory requires confirmation',
      ],
    },
  })
}

exports.exportMine = async (req, res) => {
  try {
    const data = await memoryService.exportUserMemories(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.center = async (req, res) => {
  try {
    const data = await memoryService.getMemoryCenter(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.getSettings = async (req, res) => {
  try {
    const data = await memoryService.getMemorySettings(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.updateSettings = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await memoryService.updateMemorySettings(req.user._id, body)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.confirm = async (req, res) => {
  try {
    const accept = req.body?.accept !== false
    const data = await memoryService.confirmPendingMemory(req.user._id, req.params.id, { accept })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.propose = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await memoryService.proposeMemory(req.user._id, body)
    return res.status(data.pendingConfirmation ? 202 : 201).json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.conflicts = async (req, res) => {
  try {
    const data = await memoryService.detectMemoryConflicts(req.user._id, {
      type: req.body?.type || req.query.type,
      content: req.body?.content || req.query.content,
      conflictGroup: req.body?.conflictGroup || req.query.conflictGroup,
    })
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}

exports.adaptiveMentor = async (req, res) => {
  try {
    const data = await memoryService.buildAdaptiveMentorProfile(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return handleError(res, error)
  }
}
