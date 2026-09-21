const express = require('express')
const auth = require('../middleware/auth')
const { studentDashboard } = require('../controllers/studentDashboardController')

const router = express.Router()
const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Student dashboard access only.' })
  return next()
}

router.get('/student', auth, requireStudent, studentDashboard)

module.exports = router
