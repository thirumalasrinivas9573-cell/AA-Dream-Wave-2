const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createRoadmap,
  getRoadmap,
  getRoadmaps,
  initializeRoadmap,
  updateArchitecture,
  updateTaskStatus,
} = require('../controllers/roadmapController');

router.get('/', auth, getRoadmaps);
router.post('/initialize', auth, initializeRoadmap);
router.post('/generate', auth, createRoadmap);
router.get('/:goalId', auth, getRoadmap);
router.put('/:goalId/architecture', auth, updateArchitecture);
router.put('/:goalId/task', auth, updateTaskStatus);

module.exports = router;
