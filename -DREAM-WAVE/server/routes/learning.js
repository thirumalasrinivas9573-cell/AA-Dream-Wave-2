const express = require('express');
const ctrl = require('../controllers/learningController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/dashboard', ctrl.dashboard);
router.get('/skills', ctrl.listSkills);
router.post('/skills', zodValidate(schemas.skill), ctrl.upsertSkill);

router.get('/profile', ctrl.getLearningProfile);
router.post(
  '/profile/assess',
  requireVerifiedEmail,
  zodValidate(schemas.learningAssess),
  ctrl.assessLearningProfile
);
router.get('/recommendations', requireVerifiedEmail, ctrl.personalizedRecommendations);
router.get('/analytics', ctrl.learningAnalytics);

router.post(
  '/content/explain',
  requireVerifiedEmail,
  zodValidate(schemas.learningContent),
  ctrl.contentExplain
);
router.post(
  '/content/summary',
  requireVerifiedEmail,
  zodValidate(schemas.learningContent),
  ctrl.contentSummary
);
router.post(
  '/content/questions',
  requireVerifiedEmail,
  zodValidate(schemas.learningContent),
  ctrl.contentQuestions
);
router.post(
  '/content/assignment',
  requireVerifiedEmail,
  zodValidate(schemas.learningContent),
  ctrl.contentAssignment
);

router.post('/study-plans', requireVerifiedEmail, zodValidate(schemas.studyPlan), ctrl.createStudyPlan);
router.post(
  '/study-plans/horizon',
  requireVerifiedEmail,
  zodValidate(schemas.studyPlanHorizon),
  ctrl.createHorizonPlan
);
router.post('/study-plans/:id/adjust', requireVerifiedEmail, ctrl.adjustStudyPlan);
router.patch('/study-plans/:id/days/:dayId', ctrl.toggleStudyDay);

router.get('/quizzes', ctrl.listQuizzes);
router.post('/quizzes', requireVerifiedEmail, zodValidate(schemas.quizCreate), ctrl.createQuiz);
router.post('/quizzes/:id/submit', zodValidate(schemas.quizSubmit), ctrl.submitQuiz);

module.exports = router;
