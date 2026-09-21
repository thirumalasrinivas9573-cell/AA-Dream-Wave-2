const express = require('express')
const auth = require('../middleware/auth')
const { recent } = require('../controllers/activityController')

const router = express.Router()

const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Student activity access only.' })
  }
  return next()
}

router.get('/recent', auth, requireStudent, recent)

module.exports = router
