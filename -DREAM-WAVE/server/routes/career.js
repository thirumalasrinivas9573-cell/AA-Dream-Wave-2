const express = require('express')
const auth = require('../middleware/auth')
const career = require('../controllers/careerController')

const router = express.Router()
const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Career Hub is available to students only.' })
  return next()
}

router.get('/public/resumes/:token.pdf', career.publicResume)

router.use(auth, requireStudent)
router.get('/dashboard', career.getDashboard)
router.get('/profile', career.getProfile)
router.put('/profile', career.updateProfile)
router.get('/readiness', career.getReadiness)
router.get('/notifications', career.getNotifications)
router.get('/opportunities', career.getOpportunities)
router.get('/opportunity-filters', career.getOpportunityFilters)
router.post('/opportunities/:type(job|internship)/:id/apply', career.apply)
router.get('/applications', career.getApplications)
router.post('/applications/:id/withdraw', career.withdrawApplication)
router.get('/resumes', career.listResumes)
router.post('/resumes', career.createResume)
router.get('/resumes/:id', career.getResume)
router.put('/resumes/:id', career.updateResume)
router.delete('/resumes/:id', career.deleteResume)
router.post('/resumes/:id/analyze', career.analyzeResume)
router.get('/resumes/:id/pdf', career.downloadResume)

module.exports = router
