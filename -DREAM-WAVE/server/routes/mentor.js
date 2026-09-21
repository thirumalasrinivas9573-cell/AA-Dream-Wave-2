const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const controller = require('../controllers/mentorController')

const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Student mentor access only.' })
  }
  return next()
}

router.get('/conversations', auth, requireStudent, controller.listConversations)
router.post('/conversations', auth, requireStudent, controller.createConversation)
router.get('/conversations/search', auth, requireStudent, controller.searchConversations)
router.get('/conversations/:id', auth, requireStudent, controller.getConversation)
router.patch('/conversations/:id', auth, requireStudent, controller.updateConversation)
router.delete('/conversations/:id', auth, requireStudent, controller.deleteConversation)
router.get('/context-preview', auth, requireStudent, controller.getContextPreview)
router.delete('/memory/saved/:index', auth, requireStudent, controller.removeSavedMemory)

router.post('/', auth, requireStudent, controller.getMentorAdvice)
router.post('/chat', auth, requireStudent, controller.mentorChat)
router.get('/history', auth, requireStudent, controller.getMentorHistory)
router.delete('/history', auth, requireStudent, controller.clearMentorHistory)

module.exports = router
