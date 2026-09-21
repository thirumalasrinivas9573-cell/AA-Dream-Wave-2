const industryService = require('../services/industryOpportunityMarketplaceService')
const { MARKETPLACE_AI_INTENTS } = require('../constants/industryOpportunity')

exports.getHub = async (req, res) => {
  try {
    const role = req.user.role
    if (role === 'student') {
      const hub = await industryService.getStudentMarketplaceHub(req.user._id, req.query)
      return res.json({ success: true, hub })
    }
    if (role === 'institution' && req.institution) {
      const hub = await industryService.getInstitutionMarketplaceHub(req.institution._id, req.query)
      return res.json({ success: true, hub })
    }
    if (role === 'company' && req.company) {
      const hub = await industryService.getCompanyMarketplaceHub(req.company._id, req.query)
      return res.json({ success: true, hub })
    }
    return res.status(403).json({ success: false, message: 'Organization context required' })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getInstitutionMarketplace = async (req, res) => {
  try {
    const hub = await industryService.getInstitutionMarketplaceHub(req.institution._id, req.query)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCompanyMarketplace = async (req, res) => {
  try {
    const hub = await industryService.getCompanyMarketplaceHub(req.company._id, req.query)
    res.json({ success: true, hub })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.compare = async (req, res) => {
  try {
    const data = await industryService.compareMarketplaceOpportunities(req.user._id, req.body?.items || [])
    res.json({ success: true, comparison: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getQuality = async (req, res) => {
  try {
    const data = await industryService.getOpportunityQualityForUser(req.user._id, req.params.source, req.params.id)
    res.json({ success: true, ...data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: MARKETPLACE_AI_INTENTS })
}

exports.getAiInsight = async (req, res) => {
  try {
    const intent = req.body?.intent || 'WHY_YOU_MATCH'
    const result = await industryService.getMarketplaceInsights(req.user._id, intent, {
      source: req.body?.source,
      sourceId: req.body?.sourceId,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
