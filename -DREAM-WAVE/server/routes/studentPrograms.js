const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const studentProgramController = require('../controllers/studentProgramController')

const studentAuth = [auth, requireRole('student')]

router.get('/discover', studentAuth, studentProgramController.discover)
router.get('/my', studentAuth, studentProgramController.myPrograms)
router.get('/:id', studentAuth, studentProgramController.getProgram)
router.post('/:id/register', studentAuth, studentProgramController.register)
router.get('/:id/dashboard', studentAuth, studentProgramController.getStudentDashboard)
router.post('/:id/ai/insights', studentAuth, studentProgramController.getAiInsights)

module.exports = router
