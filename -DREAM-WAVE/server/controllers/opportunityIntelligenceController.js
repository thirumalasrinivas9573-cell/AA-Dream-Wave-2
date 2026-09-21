const opportunityIntelligence = require('../services/opportunityIntelligenceService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await opportunityIntelligence.getDashboard(req.user._id)
    res.json({ success: true, dashboard })
  } catch (err) { handleError(res, err) }
}

exports.feed = async (req, res) => {
  try {
    const feed = await opportunityIntelligence.getSmartFeed(req.user._id, req.query)
    res.json({ success: true, feed })
  } catch (err) { handleError(res, err) }
}

exports.search = async (req, res) => {
  try {
    const data = await opportunityIntelligence.searchOpportunities(req.user._id, req.query)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.detail = async (req, res) => {
  try {
    const detail = await opportunityIntelligence.getOpportunityDetail(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, detail })
  } catch (err) { handleError(res, err) }
}

exports.strategy = async (req, res) => {
  try {
    const strategy = await opportunityIntelligence.getApplicationStrategy(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, strategy })
  } catch (err) { handleError(res, err) }
}

exports.checklist = async (req, res) => {
  try {
    const data = await opportunityIntelligence.getApplicationChecklist(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.resumeMatch = async (req, res) => {
  try {
    const data = await opportunityIntelligence.getResumeMatching(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.resumeCustomize = async (req, res) => {
  try {
    const data = await opportunityIntelligence.suggestResumeCustomization(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.coverLetter = async (req, res) => {
  try {
    const data = await opportunityIntelligence.generateCoverLetterDraft(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.saved = async (req, res) => {
  try {
    const data = await opportunityIntelligence.getSavedOpportunities(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.save = async (req, res) => {
  try {
    const data = await opportunityIntelligence.saveOpportunity(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.applications = async (req, res) => {
  try {
    const data = await opportunityIntelligence.getApplications(req.user._id)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.compare = async (req, res) => {
  try {
    const data = await opportunityIntelligence.compareSelected(req.user._id, req.body.items)
    res.json({ success: true, ...data })
  } catch (err) { handleError(res, err) }
}

exports.multiAgent = async (req, res) => {
  try {
    const analysis = await opportunityIntelligence.multiAgentMatchAnalysis(req.user._id, req.body)
    res.json({ success: true, analysis })
  } catch (err) { handleError(res, err) }
}

exports.analytics = async (req, res) => {
  try {
    const analytics = await opportunityIntelligence.getMatchAnalytics(req.user._id)
    res.json({ success: true, analytics })
  } catch (err) { handleError(res, err) }
}

exports.coach = async (req, res) => {
  try {
    const reply = await opportunityIntelligence.opportunityCoach(req.user._id, req.body)
    res.json({ success: true, ...reply })
  } catch (err) { handleError(res, err) }
}

exports.match = async (req, res) => {
  try {
    const match = await opportunityIntelligence.buildMatchExplanation(req.user._id, req.params.source, req.params.sourceId)
    res.json({ success: true, match })
  } catch (err) { handleError(res, err) }
}
