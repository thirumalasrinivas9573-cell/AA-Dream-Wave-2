const researchWorkspace = require('../services/researchWorkspaceService')

function handleError(res, err) {
  const status = err.statusCode || 500
  res.status(status).json({
    success: false,
    message: err.message || 'Server error',
    ...(err.issues ? { issues: err.issues } : {}),
  })
}

exports.create = async (req, res) => {
  try {
    const workspace = await researchWorkspace.createWorkspace({
      userId: req.user._id,
      role: req.organizationContext?.role || req.user.role,
      organizationId: req.organizationContext?.organizationId,
      title: req.body.title,
      researchQuestion: req.body.researchQuestion,
      description: req.body.description,
      subquestions: req.body.subquestions,
      scope: req.body.scope,
      dateRange: req.body.dateRange,
    })
    res.status(201).json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.list = async (req, res) => {
  try {
    const data = await researchWorkspace.listWorkspaces(req.user._id, {
      status: req.query.status,
      limit: Number(req.query.limit) || 20,
      page: Number(req.query.page) || 1,
    })
    res.json({ success: true, ...data })
  } catch (err) {
    handleError(res, err)
  }
}

exports.get = async (req, res) => {
  try {
    const workspace = await researchWorkspace.getWorkspace(req.params.id, req.user._id)
    res.json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.update = async (req, res) => {
  try {
    const workspace = await researchWorkspace.updateWorkspace(req.params.id, req.user._id, req.body)
    res.json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await researchWorkspace.getDashboard(req.params.id, req.user._id)
    res.json({ success: true, dashboard })
  } catch (err) {
    handleError(res, err)
  }
}

exports.addSource = async (req, res) => {
  try {
    const result = await researchWorkspace.addSource(req.params.id, req.user._id, req.body)
    res.status(201).json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.removeSource = async (req, res) => {
  try {
    const workspace = await researchWorkspace.removeSource(req.params.id, req.user._id, req.params.sourceRefId)
    res.json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.collectSources = async (req, res) => {
  try {
    const result = await researchWorkspace.searchAndCollectSources(
      req.params.id,
      req.user._id,
      req.organizationContext?.role || req.user.role,
      req.organizationContext?.organizationId,
      req.body.query,
      Number(req.body.limit) || 12,
    )
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.extractEvidence = async (req, res) => {
  try {
    const workspace = await researchWorkspace.runEvidenceExtraction(req.params.id, req.user._id)
    res.json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.synthesize = async (req, res) => {
  try {
    const result = await researchWorkspace.runSynthesis(
      req.params.id,
      req.user._id,
      req.organizationContext?.role || req.user.role,
      req.organizationContext?.organizationId,
    )
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.generateReport = async (req, res) => {
  try {
    const result = await researchWorkspace.generateReport(req.params.id, req.user._id, {
      template: req.body.template,
      title: req.body.title,
    })
    res.status(201).json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.reviewReport = async (req, res) => {
  try {
    const result = await researchWorkspace.reviewReport(req.params.id, req.user._id, req.params.reportId)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.approveReport = async (req, res) => {
  try {
    const result = await researchWorkspace.approveReport(req.params.id, req.user._id, req.params.reportId)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.addNote = async (req, res) => {
  try {
    const workspace = await researchWorkspace.addNote(
      req.params.id,
      req.user._id,
      req.body.content,
      req.body.contentType,
    )
    res.status(201).json({ success: true, workspace })
  } catch (err) {
    handleError(res, err)
  }
}

exports.chat = async (req, res) => {
  try {
    const result = await researchWorkspace.researchChat(req.params.id, req.user._id, req.body.question)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.exportReport = async (req, res) => {
  try {
    const csv = await researchWorkspace.exportReportCsv(req.params.id, req.user._id, req.params.reportId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="research-report-${req.params.reportId}.csv"`)
    res.send(csv)
  } catch (err) {
    handleError(res, err)
  }
}
