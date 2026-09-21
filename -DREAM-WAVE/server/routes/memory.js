const express = require('express')
const auth = require('../middleware/auth')
const controller = require('../controllers/memoryController')

const router = express.Router()

const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({
      success: false,
      code: 'STUDENT_ONLY',
      message: 'Student memory access only. Institution and company roles cannot read student memory.',
    })
  }
  return next()
}

router.use(auth, requireStudent)

router.get('/meta', controller.meta)
router.get('/export', controller.exportMine)
router.get('/center', controller.center)
router.get('/settings', controller.getSettings)
router.patch('/settings', controller.updateSettings)
router.get('/adaptive-mentor', controller.adaptiveMentor)
router.get('/review', controller.review)
router.get('/relevant', controller.relevant)
router.post('/relevant', controller.relevant)
router.post('/forget', controller.forget)
router.post('/utterance', controller.utterance)
router.post('/propose', controller.propose)
router.post('/conflicts', controller.conflicts)
router.post('/bulk-delete', controller.bulkRemove)
router.get('/', controller.list)
router.post('/', controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', controller.update)
router.post('/:id/confirm', controller.confirm)
router.post('/:id/archive', controller.archive)
router.delete('/:id', controller.remove)

module.exports = router
