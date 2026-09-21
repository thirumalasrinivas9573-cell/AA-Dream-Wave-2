const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const {
  createCheckoutSession,
  webhook,
  getStatus,
} = require('../controllers/paymentController')

// Webhook needs raw body -- must be before express.json() parses it
// (handled in server.js by mounting this before body-parser for /api/payment/webhook)
router.post('/webhook',                  webhook)
router.post('/create-checkout-session',  auth, createCheckoutSession)
router.get('/status',                    auth, getStatus)

module.exports = router
