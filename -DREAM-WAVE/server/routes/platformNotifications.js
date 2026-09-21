const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const platformNotificationController = require('../controllers/platformNotificationController')

router.use(auth, requireRole('institution', 'company', 'student'))

router.get('/preferences', platformNotificationController.getPreferences)
router.patch('/preferences', platformNotificationController.updatePreferences)
router.get('/unread-count', platformNotificationController.unreadCount)
router.post('/read-all', platformNotificationController.markAllRead)
router.get('/', platformNotificationController.list)
router.get('/:id/link', platformNotificationController.resolveLink)
router.get('/:id', platformNotificationController.getOne)
router.patch('/:id/read', platformNotificationController.markRead)
router.delete('/:id', platformNotificationController.remove)

if (process.env.NODE_ENV !== 'production') {
  router.post('/verify-dispatch', platformNotificationController.verifyDispatch)
}

module.exports = router
