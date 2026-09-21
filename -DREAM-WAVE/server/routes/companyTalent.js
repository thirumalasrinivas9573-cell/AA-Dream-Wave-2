const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { resolveOrganization } = require('../middleware/resolveOrganization')
const ctrl = require('../controllers/talentIntelligenceController')

const companyAuth = [auth, requireRole('company'), resolveOrganization]

router.get('/intelligence', companyAuth, ctrl.getCompanyIntelligence)
router.get('/search', companyAuth, ctrl.companySearch)
router.get('/ai/intents', companyAuth, ctrl.getCompanyAiIntents)
router.post('/ai/insights', companyAuth, ctrl.getCompanyAiInsight)

module.exports = router
