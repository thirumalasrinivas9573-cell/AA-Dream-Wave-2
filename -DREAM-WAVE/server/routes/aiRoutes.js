const express   = require('express')
const router    = express.Router()
const auth      = require('../middleware/authMiddleware')
const ai        = require('../controllers/aiController')
const agentCtrl = require('../controllers/agentController')
const { sanitizeInput } = require('../middleware/sanitize')

// Sanitize all inputs on AI routes
router.use(sanitizeInput)

// ── Core AI ───────────────────────────────────────────────────────────────────
router.post('/chat',           auth, ai.chat)
router.get('/history',         auth, ai.getHistory)
router.delete('/history',      auth, ai.clearHistory)
router.post('/goal-plan',      auth, ai.goalPlan)
router.post('/daily',          auth, ai.daily)
router.post('/report',         auth, ai.report)
router.post('/roadmap',        auth, ai.roadmap)
router.post('/books',          auth, ai.books)
router.get('/dashboard-stats', auth, ai.dashboardStats)

// ── Multi-agent ───────────────────────────────────────────────────────────────
router.post('/agent',          auth, agentCtrl.agentChat)

// ── Resume builder ────────────────────────────────────────────────────────────
router.post('/resume',         auth, agentCtrl.buildResume)

// ── Video script ──────────────────────────────────────────────────────────────
router.post('/video',          auth, agentCtrl.buildVideo)

// ── Smart nudge ───────────────────────────────────────────────────────────────
router.get('/nudge',           auth, agentCtrl.getNudge)

// ── Personalization profile ───────────────────────────────────────────────────
router.get('/user-profile',    auth, agentCtrl.getProfile)
router.put('/user-profile',    auth, agentCtrl.updateProfile)

module.exports = router
