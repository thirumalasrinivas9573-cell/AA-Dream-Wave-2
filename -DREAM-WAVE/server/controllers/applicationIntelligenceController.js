const applicationIntelligence = require('../services/applicationIntelligenceService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await applicationIntelligence.getDashboard(req.user._id, req.query)
    res.json({ success: true, dashboard })
  } catch (err) { handleError(res, err) }
}

exports.search = async (req, res) => {
  try {
    const data = await applicationIntelligence.searchWorkspaces(req.user._id, req.query)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.analytics = async (req, res) => {
  try {
    const analytics = await applicationIntelligence.getAnalytics(req.user._id)
    res.json({ success: true, analytics })
  } catch (err) { handleError(res, err) }
}

exports.profile = async (req, res) => {
  try {
    const profile = await applicationIntelligence.buildCandidateProfile(req.user._id)
    res.json({ success: true, profile })
  } catch (err) { handleError(res, err) }
}

exports.start = async (req, res) => {
  try {
    const workspace = await applicationIntelligence.startWorkspace(req.user._id, req.body)
    res.status(201).json({ success: true, ...workspace })
  } catch (err) { handleError(res, err) }
}

exports.byOpportunity = async (req, res) => {
  try {
    const { workspace } = await applicationIntelligence.getOrCreateWorkspace(
      req.user._id,
      req.params.source,
      req.params.sourceId,
    )
    const data = await applicationIntelligence.getWorkspace(req.user._id, workspace._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.get = async (req, res) => {
  try {
    const data = await applicationIntelligence.getWorkspace(req.user._id, req.params.workspaceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.resumeVersion = async (req, res) => {
  try {
    const data = await applicationIntelligence.createResumeVersion(req.user._id, req.params.workspaceId, req.body)
    res.status(201).json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.coverLetter = async (req, res) => {
  try {
    const data = await applicationIntelligence.generateCoverLetter(req.user._id, req.params.workspaceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.questionAnswer = async (req, res) => {
  try {
    const data = await applicationIntelligence.draftQuestionAnswer(req.user._id, req.params.workspaceId, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.preview = async (req, res) => {
  try {
    const data = await applicationIntelligence.getApplicationPreview(req.user._id, req.params.workspaceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.submit = async (req, res) => {
  try {
    const data = await applicationIntelligence.submitApplication(req.user._id, req.params.workspaceId, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.followUp = async (req, res) => {
  try {
    const data = await applicationIntelligence.generateFollowUpDraft(req.user._id, req.params.workspaceId, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.outcome = async (req, res) => {
  try {
    const data = await applicationIntelligence.updateOutcome(req.user._id, req.params.workspaceId, req.body)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.ats = async (req, res) => {
  try {
    const data = await applicationIntelligence.atsAnalysis(req.user._id, req.params.workspaceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.multiAgent = async (req, res) => {
  try {
    const analysis = await applicationIntelligence.multiAgentAnalysis(req.user._id, req.body)
    res.json({ success: true, analysis })
  } catch (err) { handleError(res, err) }
}

exports.coach = async (req, res) => {
  try {
    const reply = await applicationIntelligence.applicationCopilot(req.user._id, req.body)
    res.json({ success: true, ...reply })
  } catch (err) { handleError(res, err) }
}
