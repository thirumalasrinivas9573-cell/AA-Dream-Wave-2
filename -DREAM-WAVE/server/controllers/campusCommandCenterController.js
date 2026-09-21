const campusService = require('../services/campusCommandCenterService')
const { CAMPUS_AI_INTENTS } = require('../constants/campusCommandCenter')

function resolveInstitution(req) {
  return req.institution?._id?.toString()
}

exports.getOverview = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const data = await campusService.getCampusCommandCenter(institutionId, req.query)
    res.json({ success: true, commandCenter: data })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDailyBrief = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const center = await campusService.getCampusCommandCenter(institutionId, req.query)
    res.json({ success: true, brief: center.dailyBrief, generatedAt: center.generatedAt })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getWeeklyReport = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const report = await campusService.getWeeklyReport(institutionId, req.query)
    res.json({ success: true, report })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiIntents = (_req, res) => {
  res.json({ success: true, intents: CAMPUS_AI_INTENTS })
}

exports.getAiInsight = async (req, res) => {
  try {
    const institutionId = resolveInstitution(req)
    const intent = req.body?.intent || 'DAILY_BRIEF'
    const result = await campusService.getCampusAiInsight(institutionId, intent, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
