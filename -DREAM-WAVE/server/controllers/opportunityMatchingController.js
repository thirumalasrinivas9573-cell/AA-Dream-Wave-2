const opportunityMatchingService = require('../services/opportunityMatchingService')
const opportunityAiService = require('../services/opportunityAiService')
const { OPPORTUNITY_AI_INTENTS, FEEDBACK_ACTIONS } = require('../constants/opportunityMatching')

exports.getFeed = async (req, res) => {
  try {
    const feed = await opportunityMatchingService.getStudentFeed(req.user._id, req.query)
    res.json({ success: true, feed })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getMatch = async (req, res) => {
  try {
    const result = await opportunityMatchingService.getMatchExplanation(
      req.user._id,
      req.params.source,
      req.params.id,
    )
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.compare = async (req, res) => {
  try {
    const items = req.body?.items || []
    const comparison = await opportunityMatchingService.compareOpportunities(req.user._id, items)
    res.json({ success: true, comparison })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.prepare = async (req, res) => {
  try {
    const plan = await opportunityMatchingService.buildPreparationPlan(
      req.user._id,
      req.params.source,
      req.params.id,
    )
    res.json({ success: true, plan })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.discover = async (req, res) => {
  try {
    const query = req.body?.query || req.query?.q || ''
    const result = await opportunityMatchingService.parseNaturalLanguageQuery(req.user._id, query)
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.feedback = async (req, res) => {
  try {
    const { source, sourceId, action, metadata } = req.body || {}
    if (!source || !sourceId || !action) throw new Error('source, sourceId, and action are required')
    if (!FEEDBACK_ACTIONS.includes(action)) throw new Error('Invalid feedback action')
    const result = await opportunityMatchingService.recordFeedback(req.user._id, {
      source,
      sourceId,
      action,
      metadata: metadata || {},
    })
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getAiIntents = async (_req, res) => {
  res.json({ success: true, intents: OPPORTUNITY_AI_INTENTS })
}

exports.getAiInsights = async (req, res) => {
  try {
    const { intent, source, sourceId, query, compareItems, filters } = req.body || {}
    const insights = await opportunityAiService.generateOpportunityInsights(req.user._id, intent, {
      source,
      sourceId,
      query,
      compareItems,
      filters,
    })
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getOrganizerInsights = async (req, res) => {
  try {
    const eventOpportunityService = require('../services/eventOpportunityService')
    const Institution = require('../models/Institution')
    const inst = await Institution.findOne({ ownerUserId: req.user._id }).lean()
    if (!inst) {
      const e = new Error('Institution not found')
      e.statusCode = 404
      throw e
    }
    const dashboard = await eventOpportunityService.getOrganizerDashboard(inst._id, req.query)
    const insights = {
      mode: 'rule_based',
      observation: `${dashboard.totals?.events || 0} event(s); ${dashboard.totals?.registrations || 0} registration(s).`,
      evidence: {
        totals: dashboard.totals,
        events: (dashboard.events || []).slice(0, 5).map((e) => ({
          title: e.title,
          registrations: e.registrationCount,
          capacity: e.capacity,
        })),
      },
      interpretation: 'Registration activity reflects actual organizer data.',
      limitation: 'Individual student recommendation context is not exposed to organizers.',
      aiGenerated: false,
    }
    res.json({ success: true, insights })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}
