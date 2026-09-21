const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const {
  getTasks,
  getTask,
  getAnalytics,
  createTask,
  updateTask,
  duplicateTask,
  deleteTask,
  startFocus,
  stopFocus,
  generateFromRoadmap,
} = require('../controllers/taskController')

router.get('/',       auth, getTasks)
router.get('/analytics', auth, getAnalytics)
router.post('/generate-from-roadmap', auth, generateFromRoadmap)
router.post('/',      auth, createTask)
router.get('/:id',    auth, getTask)
router.put('/:id',    auth, updateTask)
router.post('/:id/duplicate', auth, duplicateTask)
router.post('/:id/focus/start', auth, startFocus)
router.post('/:id/focus/stop', auth, stopFocus)
router.delete('/:id', auth, deleteTask)

router.use('*', (req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Task route not found.' })
})

module.exports = router
