const express = require('express');
const ctrl = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.post('/contact', zodValidate(schemas.contact), ctrl.contact);
router.use(protect);
router.get('/', ctrl.getSettings);
router.put('/', zodValidate(schemas.settingsUpdate), ctrl.updateSettings);
router.delete('/account', zodValidate(schemas.deleteAccount), ctrl.deleteAccount);

module.exports = router;
