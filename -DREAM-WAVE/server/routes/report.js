const express = require('express');
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);
router.get('/', ctrl.list);
router.get('/analytics', ctrl.analytics);
router.post('/generate', requireVerifiedEmail, zodValidate(schemas.reportGenerate), ctrl.generate);
router.get('/:id', ctrl.getOne);
router.get('/:id/pdf', ctrl.downloadPdf);
router.delete('/:id', ctrl.remove);

module.exports = router;
