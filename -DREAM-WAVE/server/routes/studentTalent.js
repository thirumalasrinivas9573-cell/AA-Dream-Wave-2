const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const ctrl = require('../controllers/talentIntelligenceController')

const studentAuth = [auth, requireRole('student')]
const companyAuth = [auth, requireRole('company'), resolveOrganization]
const institutionAuth = [auth, requireRole('institution'), resolveOrganization]

router.get('/career', studentAuth, ctrl.getStudentCareerIntelligence)
router.get('/profile', studentAuth, ctrl.getStudentTalentProfile)
router.get('/readiness', studentAuth, ctrl.getStudentReadiness)
router.get('/gaps', studentAuth, ctrl.getStudentSkillGaps)
router.get('/pipeline', studentAuth, ctrl.getStudentPipeline)
router.get('/match/:source/:sourceId', studentAuth, ctrl.matchOpportunity)
router.get('/recommendations', studentAuth, ctrl.getStudentRecommendations)
router.get('/search', studentAuth, ctrl.studentSearch)
router.get('/ai/intents', studentAuth, ctrl.getStudentAiIntents)
router.post('/ai/insights', studentAuth, ctrl.getStudentAiInsight)
router.post('/ai/multi-agent', studentAuth, ctrl.runStudentMultiAgent)

module.exports = router
