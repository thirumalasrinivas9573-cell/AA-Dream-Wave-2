const express = require('express');
const ctrl = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();

router.get('/plan', protect, ctrl.getPlan);
router.post('/checkout', protect, zodValidate(schemas.billingCheckout), ctrl.createCheckout);
router.post('/portal', protect, ctrl.createPortal);

module.exports = router;
