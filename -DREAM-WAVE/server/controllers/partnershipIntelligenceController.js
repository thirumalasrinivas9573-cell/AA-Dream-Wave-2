const intelligenceService = require('../services/partnershipIntelligenceService')
const { PARTNERSHIP_AI_INTENTS } = require('../constants/partnershipIntelligence')
const { generateCollaborationInsight, AI_INTENTS } = require('../services/partnershipAiService')

function resolveOrg(req) {
  const role = req.user.role
  if (role === 'institution') return { orgId: req.institution._id.toString(), role }
  if (role === 'company') return { orgId: req.company._id.toString(), role }
  return null
}

function actorFromReq(req) {
  return {
    userId: req.user._id,
    role: req.user.role,
    institution: req.institution,
    company: req.company,
  }
}

exports.getHub = async (req, res) => {
  try {
    const org = resolveOrg(req)
    if (!org) return res.status(403).json({ success: false, message: 'Organization required' })
    const hub = await intelligenceService.getCollaborationHub(org.orgId, org.role)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getMatches = async (req, res) => {
  try {
    const org = resolveOrg(req)
    if (!org) return res.status(403).json({ success: false, message: 'Organization required' })
    const data = await intelligenceService.getRecommendedPartners(org.orgId, org.role, req.query)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getFeed = async (req, res) => {
  try {
    const org = resolveOrg(req)
    if (!org) return res.status(403).json({ success: false, message: 'Organization required' })
    const feed = await intelligenceService.getCollaborationFeed(org.orgId, org.role, req.query)
    res.json({ success: true, feed })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const org = resolveOrg(req)
    if (!org) return res.status(403).json({ success: false, message: 'Organization required' })
    const analytics = await intelligenceService.getPartnershipAnalytics(org.orgId, org.role, req.query)
    res.json({ success: true, analytics })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getBrief = async (req, res) => {
  try {
    const brief = await intelligenceService.getPartnershipBrief(req.params.id, actorFromReq(req))
    res.json({ success: true, brief })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getRenewal = async (req, res) => {
  try {
    const renewal = await intelligenceService.getRenewalIntelligence(req.params.id, actorFromReq(req))
    res.json({ success: true, renewal })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.buildProposalDraft = async (req, res) => {
  try {
    const org = resolveOrg(req)
    const orgContext =
      org?.role === 'institution'
        ? { type: req.institution?.type, industry: req.institution?.departments?.[0] }
        : { industry: req.company?.industry }
    const draft = intelligenceService.buildProposalDraft(req.body || {}, orgContext)
    res.json({ success: true, draft })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: [...new Set([...PARTNERSHIP_AI_INTENTS, ...AI_INTENTS])] })
}

exports.getHubAiInsight = async (req, res) => {
  try {
    const org = resolveOrg(req)
    if (!org) return res.status(403).json({ success: false, message: 'Organization required' })
    const intent = req.body?.intent || 'COLLABORATION_BRIEF'
    const hub = await intelligenceService.getCollaborationHub(org.orgId, org.role)
    let insight = { observation: 'Information not available.', source: 'Partnership Intelligence' }

    if (intent === 'COLLABORATION_BRIEF') {
      insight = {
        observation: `${hub.counts.activePartnerships} active partnership(s); ${hub.potentialPartners.length} potential partner(s)`,
        why: hub.alerts[0]?.detail || 'Based on partnership activity records',
        nextStep: hub.alerts[0]?.title || 'Review collaboration hub activity',
        source: 'Collaboration Hub',
      }
    } else if (intent === 'PARTNER_MATCH') {
      const top = hub.potentialPartners[0]
      insight = top
        ? {
            observation: `Top match: ${top.name} (${top.fitLevel})`,
            why: top.companyNeeds?.join('; ') || top.overlappingAreas?.join(', '),
            missing: top.missingInformation,
            source: 'Partnership matching engine',
          }
        : { observation: 'No potential partners in current data set', source: 'Partnership matching engine' }
    } else if (intent === 'RENEWAL_REVIEW') {
      insight = {
        observation: hub.alerts.length ? `${hub.alerts.length} alert(s) require attention` : 'No renewal alerts',
        source: 'Renewal intelligence',
      }
    }

    res.json({ success: true, intent, source: 'rule', insight, limitation: 'Advisory only. Does not auto-send or auto-renew.' })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPartnershipAiInsight = async (req, res) => {
  try {
    const intent = req.body?.intent || 'PARTNERSHIP_SUMMARY'
    if (['PARTNER_MATCH', 'COLLABORATION_BRIEF', 'PROPOSAL_DRAFT'].includes(intent) && !req.params.id) {
      return exports.getHubAiInsight(req, res)
    }
    if (intent === 'PROPOSAL_DRAFT') {
      const draft = intelligenceService.buildProposalDraft(req.body || {}, {})
      return res.json({ success: true, intent, source: 'rule', insight: { draft }, limitation: 'Draft requires human review before sending.' })
    }
    if (intent === 'RENEWAL_REVIEW' || intent === 'PARTNERSHIP_HEALTH') {
      const renewal = await intelligenceService.getRenewalIntelligence(req.params.id, actorFromReq(req))
      return res.json({
        success: true,
        intent,
        source: 'rule',
        insight: {
          observation: renewal.health?.explanation || renewal.recommendedAction,
          health: renewal.health,
          recommendedAction: renewal.recommendedAction,
        },
      })
    }
    const result = await generateCollaborationInsight({
      partnershipId: req.params.id,
      actor: actorFromReq(req),
      intent,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
