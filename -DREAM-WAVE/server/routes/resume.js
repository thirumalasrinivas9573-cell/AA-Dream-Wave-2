const express = require('express');
const ctrl = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);
router.get('/', ctrl.get);
router.put('/', zodValidate(schemas.resumeUpdate), ctrl.update);
router.post('/improve', requireVerifiedEmail, zodValidate(schemas.resumeImprove), ctrl.improve);

module.exports = router;
