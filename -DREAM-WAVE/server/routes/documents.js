const express = require('express');
const ctrl = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { uploadDocument } = require('../middleware/upload');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);
router.get('/', ctrl.list);
router.post('/upload', uploadDocument.single('file'), ctrl.upload);
router.get('/:id', ctrl.getOne);
router.post(
  '/:id/analyze',
  requireVerifiedEmail,
  zodValidate(schemas.documentAnalyze),
  ctrl.analyze
);
router.post('/:id/quiz', requireVerifiedEmail, ctrl.generateQuiz);
router.delete('/:id', ctrl.remove);

module.exports = router;
