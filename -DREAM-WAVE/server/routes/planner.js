const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const planner = require('../controllers/plannerController')

router.get('/today', auth, planner.getToday)
router.get('/week', auth, planner.getWeek)
router.get('/preferences', auth, planner.getPreferences)
router.put('/preferences', auth, planner.updatePreferences)
router.get('/schedule', auth, planner.listSchedule)
router.post('/schedule', auth, planner.createSchedule)
router.put('/schedule/:id', auth, planner.updateSchedule)
router.delete('/schedule/:id', auth, planner.deleteSchedule)
router.post('/schedule/:id/complete', auth, planner.completeSchedule)
router.post('/schedule/:id/skip', auth, planner.skipSchedule)

router.post('/plan/daily/suggest', auth, planner.suggestDaily)
router.post('/plan/weekly/suggest', auth, planner.suggestWeekly)
router.post('/plan/apply', auth, planner.applyPlan)
router.get('/tasks/:taskId/breakdown', auth, planner.suggestBreakdown)

router.get('/metrics', auth, planner.getMetrics)
router.get('/summary/daily', auth, planner.getDailySummary)
router.post('/adapt/suggest', auth, planner.suggestAdapt)
router.get('/overdue', auth, planner.getOverdue)

router.get('/focus/active', auth, planner.getActiveFocus)
router.get('/focus/history', auth, planner.getFocusHistory)
router.post('/focus/start', auth, planner.startFocus)
router.post('/focus/:id/pause', auth, planner.pauseFocus)
router.post('/focus/:id/resume', auth, planner.resumeFocus)
router.post('/focus/:id/complete', auth, planner.completeFocus)
router.post('/focus/:id/cancel', auth, planner.cancelFocus)

router.use('*', (req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Planner route not found.' })
})

module.exports = router
