const express = require('express');
const router = express.Router();
const sc = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/roleGuard');
const auth = require('../middleware/auth');

router.get('/filters', sc.filterOptions);
router.get('/unified', optionalAuth, sc.unifiedSearch);
router.delete('/history', auth, sc.clearSearchHistory);
router.get('/', optionalAuth, sc.globalSearch);

module.exports = router;
