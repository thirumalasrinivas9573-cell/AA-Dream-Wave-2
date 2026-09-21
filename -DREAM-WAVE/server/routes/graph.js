const express = require('express');
const ctrl = require('../controllers/knowledgeController');
const { protect, authorize } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.post('/rebuild', authorize('admin'), ctrl.rebuild);
router.get('/nodes', ctrl.listNodes);
router.post('/nodes', zodValidate(schemas.graphNodeCreate), ctrl.createNode);
router.get('/nodes/:key', ctrl.getNode);
router.get('/nodes/:key/neighbors', ctrl.neighbors);
router.get('/nodes/:key/traverse', ctrl.traverse);
router.get('/nodes/:key/dependencies', ctrl.dependencies);

router.get('/edges', ctrl.listEdges);
router.post('/edges', zodValidate(schemas.graphEdgeCreate), ctrl.createEdge);

router.get('/recommendations', ctrl.recommendations);
router.get('/feed', ctrl.feed);
router.get('/history', ctrl.history);
router.get('/intelligence', ctrl.intelligence);
router.get('/related', ctrl.related);
router.get('/related/:key', ctrl.related);

router.get('/search', ctrl.search);
router.get('/suggestions', ctrl.suggestions);
router.post('/feedback', zodValidate(schemas.graphFeedback), ctrl.feedback);
router.get('/analytics', ctrl.analytics);

module.exports = router;
