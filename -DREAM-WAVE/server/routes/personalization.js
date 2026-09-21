const express = require('express');
const ctrl = require('../controllers/personalizationController');
const { protect } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/profile', ctrl.getProfile);
router.post('/refresh', ctrl.refresh);
router.patch('/privacy', zodValidate(schemas.personalizationPrivacy), ctrl.updatePrivacy);
router.patch('/preferences', zodValidate(schemas.personalizationPreferences), ctrl.updatePreferences);

router.get('/dashboard', ctrl.dashboard);
router.get('/surfaces', ctrl.surfaces);
router.get('/next-best', ctrl.nextBest);
router.get('/recommendations', ctrl.recommendations);
router.get('/progress', ctrl.progress);
router.post('/sync', ctrl.sync);

router.get('/mentor-context', ctrl.mentorContext);

router.get('/events', ctrl.listEvents);
router.post('/events', zodValidate(schemas.platformEvent), ctrl.ingestEvent);

router.get('/analytics', ctrl.analytics);

module.exports = router;
