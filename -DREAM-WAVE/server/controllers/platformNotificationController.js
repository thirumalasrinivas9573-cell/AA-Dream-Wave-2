const {
  listNotifications,
  getNotificationById,
  markRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  resolveDeepLink,
} = require('../services/platformNotificationService')

/** GET /api/platform-notifications */
exports.list = async (req, res) => {
  try {
    const result = await listNotifications(req.user._id, {
      page: req.query.page,
      limit: req.query.limit,
      read: req.query.read,
      type: req.query.type,
      priority: req.query.priority,
    })
    res.json({
      success: true,
      notifications: result.items,
      unreadCount: result.unreadCount,
      pagination: result,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /api/platform-notifications/unread-count */
exports.unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user._id)
    res.json({ success: true, count })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /api/platform-notifications/:id */
exports.getOne = async (req, res) => {
  try {
    const notification = await getNotificationById(req.params.id, req.user._id)
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    res.json({ success: true, notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /api/platform-notifications/:id/link */
exports.resolveLink = async (req, res) => {
  try {
    const notification = await getNotificationById(req.params.id, req.user._id)
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    res.json({ success: true, href: notification.href || resolveDeepLink(notification) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** PATCH /api/platform-notifications/:id/read */
exports.markRead = async (req, res) => {
  try {
    const notification = await markRead(req.params.id, req.user._id)
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    res.json({ success: true, notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** POST /api/platform-notifications/read-all */
exports.markAllRead = async (req, res) => {
  try {
    await markAllRead(req.user._id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** DELETE /api/platform-notifications/:id */
exports.remove = async (req, res) => {
  try {
    const deleted = await deleteNotification(req.params.id, req.user._id)
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** GET /api/platform-notifications/preferences */
exports.getPreferences = async (req, res) => {
  try {
    const preferences = await getPreferences(req.user._id)
    res.json({ success: true, preferences })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/** PATCH /api/platform-notifications/preferences */
exports.updatePreferences = async (req, res) => {
  try {
    const preferences = await updatePreferences(req.user._id, req.body || {})
    res.json({ success: true, preferences })
  } catch (error) {
    res.status(error.message?.includes('Cannot set') ? 400 : 500).json({ success: false, message: error.message })
  }
}

/** POST /api/platform-notifications/verify-dispatch — dev/verify only */
exports.verifyDispatch = async (req, res) => {
  try {
    const { notifyUser } = require('../services/platformNotificationService')
    const { type, title, body, metadata, idempotencyKey } = req.body || {}
    if (!type || !title) {
      return res.status(400).json({ success: false, message: 'type and title required' })
    }
    const notification = await notifyUser({
      recipientUserId: req.user._id,
      recipientRole: req.user.role || 'student',
      type,
      title,
      body: body || '',
      metadata: metadata || {},
      idempotencyKey: idempotencyKey || null,
    })
    res.status(201).json({ success: true, notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
