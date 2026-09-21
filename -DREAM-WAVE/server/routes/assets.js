const express = require('express');
const { protect } = require('../middleware/auth');
const { getAsset } = require('../controllers/assetController');

const router = express.Router();

router.get('/:filename', protect, getAsset);

module.exports = router;
