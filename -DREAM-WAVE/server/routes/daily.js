const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const { getDailyAdvice } = require('../controllers/dailyController')

router.get('/',  auth, getDailyAdvice)   // GET  /api/daily   — used by Dashboard
router.post('/', auth, getDailyAdvice)   // POST /api/daily   — used by legacy calls

module.exports = router
