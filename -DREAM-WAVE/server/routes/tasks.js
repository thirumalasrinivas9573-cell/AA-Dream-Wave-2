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

const rateLimit = require('express-rate-limit')
const taskProgressionController = require('../controllers/taskProgressionController')

const examStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 40,
  standardHeaders: true,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', message: 'AI rate limit. Please wait.' },
})

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

// Progression routes (Step 5C - Contract v2)
router.post('/:id/progression/enable',          auth, taskProgressionController.enableWorkflow)
router.get('/:id/progression',                  auth, taskProgressionController.getProgression)
router.post('/:id/progression/verify-learning', auth, taskProgressionController.verifyLearning)
router.post('/:id/exam/start',                  auth, examStartLimiter, taskProgressionController.startExam)
router.post('/:id/exam/submit',                 auth, taskProgressionController.submitExam)
router.post('/:id/certificate/retry',           auth, taskProgressionController.retryCertification)

router.use('*', (req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Task route not found.' })
})

module.exports = router
