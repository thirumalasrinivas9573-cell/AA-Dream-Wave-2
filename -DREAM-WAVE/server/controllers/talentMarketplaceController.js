const marketplaceService = require('../services/talentMarketplaceService')
const recruiterMatchService = require('../services/recruiterMatchTalentService')
const { analyzeProfileCompleteness } = require('../services/talentMarketplaceService')
const { buildOpportunityContext } = require('../services/opportunityContextService')
const { MARKETPLACE_AI_INTENTS, RECRUITER_MATCH_INTENTS } = require('../constants/talentMarketplace')

exports.browse = async (req, res) => {
  try {
    const data = await marketplaceService.browseMarketplace(req.user._id, req.query)
    res.json({ success: true, marketplace: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getFeed = async (req, res) => {
  try {
    const data = await marketplaceService.getPersonalizedFeed(req.user._id, req.query)
    res.json({ success: true, feed: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getMatchDetail = async (req, res) => {
  try {
    const data = await marketplaceService.getMatchDetail(req.user._id, req.params.source, req.params.id)
    res.json({ success: true, detail: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getReadiness = async (req, res) => {
  try {
    const data = await marketplaceService.getApplicationReadiness(req.user._id, req.params.source, req.params.id)
    res.json({ success: true, readiness: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProfileCompleteness = async (req, res) => {
  try {
    const context = await buildOpportunityContext(req.user._id)
    if (!context.hasInstitutionLink) {
      return res.json({ success: true, completeness: { level: 'INCOMPLETE', note: 'Institution link required' } })
    }
    const completeness = analyzeProfileCompleteness(context.student, context)
    res.json({ success: true, completeness })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getMatchingAnalytics = async (req, res) => {
  try {
    const data = await marketplaceService.getMatchingAnalytics(req.user._id)
    res.json({ success: true, analytics: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: MARKETPLACE_AI_INTENTS })
}

exports.getAiInsight = async (req, res) => {
  try {
    const intent = req.body?.intent || 'MATCH_EXPLANATION'
    const { source, sourceId } = req.body || {}
    let insight = { observation: 'Information not available.', source: 'rule' }

    if (intent === 'APPLICATION_READINESS' && source && sourceId) {
      const readiness = await marketplaceService.getApplicationReadiness(req.user._id, source, sourceId)
      insight = {
        observation: readiness.explanation?.what || readiness.state,
        why: readiness.explanation?.why,
        gaps: readiness.explanation?.gaps,
        source: 'Talent Marketplace Service',
      }
    } else if (intent === 'MATCH_EXPLANATION' && source && sourceId) {
      const detail = await marketplaceService.getMatchDetail(req.user._id, source, sourceId)
      insight = {
        observation: `${detail.match.category}: ${detail.opportunity.title}`,
        matched: detail.explanation.matched,
        missing: detail.explanation.missing,
        nextStep: detail.explanation.nextStep,
        source: detail.explanation.source,
      }
    } else if (intent === 'WHICH_INTERNSHIP' || intent === 'OPPORTUNITY_RECOMMENDATION') {
      const feed = await marketplaceService.getPersonalizedFeed(req.user._id)
      const top = feed.sections?.strongMatches?.[0]
      insight = {
        observation: top ? `Top match: ${top.title}` : 'No strong matches in current feed',
        why: top?.match?.reasons?.[0]?.label || 'Based on eligibility and skill evidence',
        source: 'Opportunity matching engine',
        limitation: 'Does not guarantee selection. User confirms before applying.',
      }
    }

    res.json({ success: true, intent, insight, mode: 'rule' })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.matchTalentToRole = async (req, res) => {
  try {
    const companyId = req.company._id
    const { roleType, roleId } = req.params
    const data = await recruiterMatchService.matchApplicationsToRole(companyId, roleType, roleId, req.query)
    res.json({ success: true, matching: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.analyzeRoleGaps = async (req, res) => {
  try {
    const companyId = req.company._id
    const { roleType, roleId } = req.params
    const data = await recruiterMatchService.analyzeRoleSkillGaps(companyId, roleType, roleId)
    res.json({ success: true, analysis: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getRecruiterAiIntents = (_req, res) => {
  res.json({ success: true, intents: RECRUITER_MATCH_INTENTS })
}
