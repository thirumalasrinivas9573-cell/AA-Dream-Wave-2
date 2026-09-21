const activityService = require('../services/activityService')

const fail = (res, status, message, code = 'ACTIVITY_ERROR') => res.status(status).json({ success: false, code, message })

exports.recent = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const items = await activityService.buildRecentActivity(req.user._id, { limit })
    return res.json({ success: true, items, count: items.length })
  } catch (error) {
    console.error('[activity.recent]', error.message)
    return fail(res, 500, 'Activity feed is temporarily unavailable')
  }
}
