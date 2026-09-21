const institutionFoundationService = require('../services/institutionFoundationService')
const { recordExecutiveAudit } = require('../services/institutionExecutiveAuditService')

exports.getProfile = async (req, res) => {
  try {
    const profile = await institutionFoundationService.getProfile(req.institution._id)
    res.json({ success: true, profile })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await institutionFoundationService.updateProfile(req.institution._id, req.body)
    await recordExecutiveAudit({
      institutionId: req.institution._id,
      actorUserId: req.user._id,
      action: 'analytics_configuration_changed',
      description: 'Institution profile updated',
      metadata: { fields: Object.keys(req.body || {}) },
    }).catch(() => {})
    res.json({ success: true, profile })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await institutionFoundationService.getDashboardMetrics(req.institution._id)
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}
