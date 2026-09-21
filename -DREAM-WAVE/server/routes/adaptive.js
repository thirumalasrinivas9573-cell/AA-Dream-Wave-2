const express = require('express');
const ctrl = require('../controllers/adaptiveController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/profile', ctrl.getProfile);
router.patch('/profile', zodValidate(schemas.adaptiveProfileUpdate), ctrl.updateProfile);
router.post('/refresh', ctrl.refresh);
router.get('/path', ctrl.path);
router.get('/daily-goal', ctrl.dailyGoal);
router.get('/weekly-plan', ctrl.weeklyPlan);

router.get('/progress', ctrl.listProgress);
router.post('/progress', zodValidate(schemas.adaptiveProgress), ctrl.upsertProgress);
router.post('/progress/complete', zodValidate(schemas.adaptiveProgress), ctrl.completeProgress);
router.get('/achievements', ctrl.achievements);

router.get('/animations', ctrl.animations);
router.post(
  '/animations/:mediaId/map',
  zodValidate(schemas.adaptiveAnimationMap),
  ctrl.mapAnimation
);
router.get('/animations/:mediaId/progress', ctrl.animationProgress);

router.get('/recommendations', ctrl.recommendations);
router.post(
  '/quiz',
  requireVerifiedEmail,
  zodValidate(schemas.adaptiveQuiz),
  ctrl.adaptiveQuiz
);
router.get('/analytics', ctrl.analytics);

module.exports = router;
