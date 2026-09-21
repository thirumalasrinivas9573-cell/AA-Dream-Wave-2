const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const {
  resolveCompanyMember,
  requireCompanyPermission,
} = require('../middleware/companyPermission')
const ctrl = require('../controllers/talentMarketplaceController')
const industryCtrl = require('../controllers/industryOpportunityController')

const studentAuth = [auth, requireRole('student')]
const institutionAuth = [auth, requireRole('institution'), resolveOrganization]
const companyAuth = [auth, requireRole('company'), resolveOrganization, resolveCompanyMember]

router.get('/hub', auth, industryCtrl.getHub)
router.get('/institution', institutionAuth, industryCtrl.getInstitutionMarketplace)
router.get('/company', companyAuth, industryCtrl.getCompanyMarketplace)
router.post('/compare', studentAuth, industryCtrl.compare)
router.get('/quality/:source/:id', studentAuth, industryCtrl.getQuality)
router.get('/industry/ai/intents', auth, industryCtrl.getAiIntents)
router.post('/industry/ai/insights', studentAuth, industryCtrl.getAiInsight)

router.get('/browse', studentAuth, ctrl.browse)
router.get('/feed', studentAuth, ctrl.getFeed)
router.get('/match/:source/:id', studentAuth, ctrl.getMatchDetail)
router.get('/readiness/:source/:id', studentAuth, ctrl.getReadiness)
router.get('/profile-completeness', studentAuth, ctrl.getProfileCompleteness)
router.get('/analytics', studentAuth, ctrl.getMatchingAnalytics)
router.get('/ai/intents', studentAuth, ctrl.getAiIntents)
router.post('/ai/insights', studentAuth, ctrl.getAiInsight)

router.get(
  '/recruiter/match/:roleType/:roleId',
  companyAuth,
  requireCompanyPermission('talent.discover'),
  ctrl.matchTalentToRole,
)
router.get(
  '/recruiter/gaps/:roleType/:roleId',
  companyAuth,
  requireCompanyPermission('analytics.read'),
  ctrl.analyzeRoleGaps,
)
router.get('/recruiter/ai/intents', companyAuth, ctrl.getRecruiterAiIntents)

module.exports = router
