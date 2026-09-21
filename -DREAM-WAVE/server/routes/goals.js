const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const {
  createGoal,
  getGoals,
  getGoal,
  getGoalAnalytics,
  updateGoal,
  deleteGoal,
  addProgressEntry,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addNote,
  generateAIPlan,
} = require('../controllers/goalController')
const intelligence = require('../controllers/goalIntelligenceController')

router.get('/intelligence/conflicts', auth, intelligence.getConflicts)
router.get('/intelligence/weekly-review', auth, intelligence.getWeeklyReview)
router.post('/intelligence/suggest', auth, intelligence.suggestGoal)
router.post('/intelligence/clarify', auth, intelligence.clarifyGoal)
router.post('/intelligence/save', auth, intelligence.saveGoalFromSuggestion)
router.post('/intelligence/validate-roadmap', auth, intelligence.validateRoadmap)
router.get('/intelligence/:goalId/progress', auth, intelligence.getProgress)
router.post('/intelligence/:goalId/progress/sync', auth, intelligence.syncProgress)
router.get('/intelligence/:goalId/next-action', auth, intelligence.getNextAction)
router.get('/intelligence/:goalId/review', auth, intelligence.getReview)
router.get('/intelligence/:goalId/adapt-roadmap', auth, intelligence.adaptRoadmapPreview)
router.post('/intelligence/:goalId/adapt-roadmap/apply', auth, intelligence.applyRoadmapAdaptation)
router.post('/intelligence/:goalId/suggest-tasks', auth, intelligence.suggestTasks)
router.post('/intelligence/:goalId/accept-tasks', auth, intelligence.acceptTasks)

router.get('/',              auth, getGoals)
router.get('/analytics',     auth, getGoalAnalytics)
router.get('/:id',           auth, getGoal)
router.post('/',             auth, createGoal)
router.put('/:id',           auth, updateGoal)
router.delete('/:id',        auth, deleteGoal)
router.post('/:id/progress', auth, addProgressEntry)
router.post('/:id/milestones', auth, addMilestone)
router.patch('/:id/milestones/:milestoneId', auth, updateMilestone)
router.delete('/:id/milestones/:milestoneId', auth, deleteMilestone)
router.post('/:id/notes',    auth, addNote)
router.post('/:id/ai-plan',  auth, generateAIPlan)

module.exports = router
