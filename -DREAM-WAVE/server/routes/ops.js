const express = require('express');
const ctrl = require('../controllers/opsController');
const { protect, authorize } = require('../middleware/auth');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/health', ctrl.healthDashboard);
router.get('/ai', zodValidate({ query: schemas.opsDaysQuery }), ctrl.aiOps);
router.get('/performance', zodValidate({ query: schemas.opsDaysQuery }), ctrl.performance);
router.get('/security', zodValidate({ query: schemas.opsDaysQuery }), ctrl.security);
router.get('/trends', zodValidate({ query: schemas.opsDaysQuery }), ctrl.trends);
router.get('/jobs', ctrl.jobs);
router.post('/jobs/run', ctrl.runJobs);
router.get('/audit-logs', zodValidate({ query: schemas.opsDaysQuery }), ctrl.auditLogs);
router.post('/aggregate', ctrl.aggregate);
router.get('/readiness', ctrl.platformReadiness);

module.exports = router;
