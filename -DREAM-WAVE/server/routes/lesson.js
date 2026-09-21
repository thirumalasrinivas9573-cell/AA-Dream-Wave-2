const express  = require('express')
const router   = express.Router()
const auth     = require('../middleware/auth')
const { generateLesson, getSuggestedTopics, generateVideoScript } = require('../controllers/lessonController')

router.post('/generate',      auth, generateLesson)
router.post('/video-script',  auth, generateVideoScript)
router.get('/suggestions',    auth, getSuggestedTopics)

module.exports = router
