const express = require('express')

const router = express.Router()

const auth = require('../middleware/auth')

const requireRole = require('../middleware/requireRole')

const { resolveOrganization } = require('../middleware/resolveOrganization')

const {

  resolveInstitutionMember,

  requirePermission,

} = require('../middleware/institutionPermission')

const ctrl = require('../controllers/talentIntelligenceController')



const institutionAuth = [

  auth,

  requireRole('institution'),

  resolveOrganization,

  resolveInstitutionMember,

]



router.get('/intelligence', institutionAuth, requirePermission('analytics.read'), ctrl.getInstitutionIntelligence)

router.get('/search', institutionAuth, requirePermission('analytics.read'), ctrl.institutionSearch)

router.get('/ai/intents', institutionAuth, requirePermission('copilot.read'), ctrl.getInstitutionAiIntents)

router.post('/ai/insights', institutionAuth, requirePermission('copilot.read'), ctrl.getInstitutionAiInsight)



module.exports = router

