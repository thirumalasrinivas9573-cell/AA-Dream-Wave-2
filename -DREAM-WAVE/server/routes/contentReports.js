const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const cr = require('../controllers/contentReportController');

router.use(auth);
router.post('/', cr.createReport);
router.get('/mine', cr.myReports);

module.exports = router;
