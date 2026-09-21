const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const ic = require('../controllers/interactionController');

router.get('/reviews', ic.getReviews);

router.use(auth, requireRole('student'));
router.post('/follow', ic.follow);
router.post('/bookmark', ic.bookmark);
router.post('/jobs/:id/apply', ic.applyJob);
router.post('/internships/:id/apply', ic.applyInternship);
router.post('/reviews', ic.createReview);
router.post('/reviews/:id/report', ic.reportReview);
router.get('/follows', ic.myFollows);
router.get('/bookmarks', ic.myBookmarks);
router.get('/applications', ic.myApplications);
router.get('/status', ic.followStatus);
router.post('/institutions/:id/apply', ic.applyAdmission);

module.exports = router;
