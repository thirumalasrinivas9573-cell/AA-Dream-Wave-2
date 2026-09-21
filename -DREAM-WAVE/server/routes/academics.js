const express = require('express')
const auth = require('../middleware/auth')
const controller = require('../controllers/academicController')

const router = express.Router()

const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Academic Intelligence is available to students only.' })
  }
  return next()
}

router.use(auth, requireStudent, controller.guardEnabled)

router.get('/overview', controller.overview)
router.put('/profile', controller.updateProfile)
router.post('/periods', controller.addPeriod)

router.get('/subjects', controller.listSubjects)
router.post('/subjects', controller.createSubject)
router.get('/subjects/:id', controller.getSubject)
router.put('/subjects/:id', controller.updateSubject)
router.put('/subjects/:id/syllabus', controller.applySyllabus)
router.post('/subjects/:id/syllabus/propose', controller.proposeSyllabus)
router.patch('/subjects/:id/topics/status', controller.updateTopicStatus)
router.post('/subjects/:id/question-papers', controller.uploadQuestionPaper)
router.get('/subjects/:id/question-papers/analysis', controller.analyzePapers)

router.get('/notes', controller.listNotes)
router.post('/notes', controller.createNote)

router.get('/assignments', controller.listAssignments)
router.post('/assignments', controller.createAssignment)

router.get('/exams', controller.listExams)
router.post('/exams', controller.createExam)
router.get('/exams/:id/prep', controller.getExamPrep)

router.get('/revision', controller.revisionQueue)
router.post('/concepts/:conceptId/practice', controller.recordPractice)
router.get('/revision/rapid', controller.rapidRevision)

router.get('/study-plan/daily', controller.dailyStudyPlan)
router.post('/study-plan/propose', controller.proposePlanner)
router.post('/study-plan/confirm', controller.confirmStudyPlan)
router.get('/next-action', controller.nextAcademicAction)

module.exports = router
