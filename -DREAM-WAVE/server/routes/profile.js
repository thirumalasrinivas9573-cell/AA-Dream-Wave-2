const express = require('express')
const multer = require('multer')
const auth = require('../middleware/auth')
const { optionalAuth } = require('../middleware/roleGuard')
const controller = require('../controllers/profileController')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
})
const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Student profile access only.' })
  }
  return next()
}

router.get('/public/:username', controller.getPublicPortfolio)
router.get('/assets/:filename', optionalAuth, controller.getProfileAsset)

router.use(auth, requireStudent)
router.get('/', controller.getProfile)
router.get('/preview/public', controller.getPublicPreview)
router.get('/completeness', controller.getCompleteness)
router.get('/share', controller.getShareInfo)
router.put('/', controller.updateProfile)
router.put('/privacy', controller.updatePrivacy)
router.put('/preferences', controller.updatePreferences)
router.put('/portfolio', controller.updatePortfolio)
router.put('/projects/reorder', controller.reorderProjects)
router.get('/summary', controller.getSummary)
router.get('/knowledge-graph', controller.getKnowledgeGraph)
router.post('/upload', upload.single('file'), controller.uploadProfileAsset)
router.post('/certificate', controller.generateCertificate)
router.post('/ai/improve-headline', controller.improveHeadline)
router.post('/ai/improve-about', controller.improveAbout)
router.post('/ai/improve-project', controller.improveProjectDescription)
router.post('/ai/portfolio-suggestions', controller.portfolioSuggestions)
router.post('/:section(skills|projects|achievements|credentials|academicJourney|experience)', controller.addEntity)
router.put('/:section(skills|projects|achievements|credentials|academicJourney|experience)/:itemId', controller.updateEntity)
router.delete('/:section(skills|projects|achievements|credentials|academicJourney|experience)/:itemId', controller.deleteEntity)

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 8 MB limit.' : error.message })
  }
  return next(error)
})

module.exports = router
