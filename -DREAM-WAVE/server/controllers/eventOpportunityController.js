const eventOpportunityService = require('../services/eventOpportunityService')
const eventAiService = require('../services/eventAiService')

function parseFilters(query = {}) {
  return {
    q: query.q,
    category: query.category,
    source: query.source,
    eventType: query.eventType,
    mode: query.mode,
    skill: query.skill,
    hackathon: query.hackathon,
    upcoming: query.upcoming,
    period: query.period,
    page: query.page,
    limit: query.limit,
  }
}

exports.browse = async (req, res) => {
  try {
    const result = await eventOpportunityService.browseEvents(req.user._id, parseFilters(req.query))
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getDetails = async (req, res) => {
  try {
    const event = await eventOpportunityService.getEventDetails(
      req.user._id,
      req.params.source,
      req.params.id,
    )
    res.json({ success: true, event })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getEligibility = async (req, res) => {
  try {
    const eligibility = await eventOpportunityService.checkEligibility(
      req.user._id,
      req.params.source,
      req.params.id,
    )
    res.json({ success: true, eligibility })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.register = async (req, res) => {
  try {
    const registration = await eventOpportunityService.register(
      req.user._id,
      req.user.name,
      req.user.email,
      req.params.source,
      req.params.id,
    )
    res.status(201).json({ success: true, registration })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getMyEvents = async (req, res) => {
  try {
    const dashboard = await eventOpportunityService.getMyEvents(req.user._id)
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.toggleSaved = async (req, res) => {
  try {
    const result = await eventOpportunityService.toggleSaved(
      req.user._id,
      req.params.source,
      req.params.id,
    )
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.createTeam = async (req, res) => {
  try {
    const team = await eventOpportunityService.createTeam(
      req.user._id,
      req.user.name,
      req.params.source,
      req.params.id,
      req.body || {},
    )
    res.status(201).json({ success: true, team })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.inviteTeamMember = async (req, res) => {
  try {
    const team = await eventOpportunityService.inviteTeamMember(
      req.user._id,
      req.params.teamId,
      req.body.inviteeUserId,
      req.body.inviteeName || 'Team member',
    )
    res.json({ success: true, team })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.respondTeamInvite = async (req, res) => {
  try {
    const team = await eventOpportunityService.respondTeamInvite(
      req.user._id,
      req.params.teamId,
      req.body.accept === true,
    )
    res.json({ success: true, team })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.submitProject = async (req, res) => {
  try {
    const submission = await eventOpportunityService.submitProject(
      req.user._id,
      req.params.source,
      req.params.id,
      req.body || {},
    )
    res.json({ success: true, submission })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getOrganizerDashboard = async (req, res) => {
  try {
    const dashboard = await eventOpportunityService.getOrganizerDashboard(
      req.institution._id,
      req.query,
    )
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: eventAiService.EVENT_AI_INTENTS })
}

exports.getAiInsights = async (req, res) => {
  try {
    const { intent, source, sourceId, ...rest } = req.body || {}
    const insights = await eventAiService.generateEventInsights(req.user._id, intent, {
      source,
      sourceId,
      ...rest,
    })
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.setSubmissionResult = async (req, res) => {
  try {
    const submission = await eventOpportunityService.setSubmissionResult(
      req.institution._id,
      req.params.submissionId,
      req.user._id,
      req.body.result,
      req.body.resultNotes,
    )
    res.json({ success: true, submission })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}
