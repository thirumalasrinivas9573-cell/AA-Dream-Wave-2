const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const ecosystemController = require('../controllers/ecosystemIntelligenceController')

router.get('/summary', auth, requireRole('student'), ecosystemController.getStudentSummary)

module.exports = router
