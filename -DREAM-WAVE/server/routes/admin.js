const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { getStats } = require('../controllers/analyticsController');
const ap = require('../controllers/adminPortalController');

router.use(auth, requireRole('admin'));
router.get('/stats', getStats);
router.get('/overview', ap.getOverview);
router.get('/analytics', ap.getAnalytics);
router.get('/logs', ap.listLogs);
router.get('/users', ap.listUsers);
router.patch('/users/:id/suspend', ap.suspendUser);
router.patch('/users/:id/access', ap.updateUserAccess);

router.get('/institutions', ap.listInstitutions);
router.patch('/institutions/:id/approve', ap.approveInstitution);
router.patch('/institutions/:id/suspend', ap.suspendInstitution);

router.get('/companies', ap.listCompanies);
router.patch('/companies/:id/approve', ap.approveCompany);
router.patch('/companies/:id/suspend', ap.suspendCompany);

router.get('/promotions', ap.listPromotions);
router.patch('/promotions/:id/approve', ap.approvePromotion);
router.patch('/promotions/:id/reject', ap.rejectPromotion);

router.get('/reviews', ap.listReviews);
router.patch('/reviews/:id', ap.moderateReview);

router.get('/books', ap.listBooks);
router.patch('/books/:id/archive', ap.archiveBook);

router.get('/jobs', ap.listJobs);
router.patch('/jobs/:id/close', ap.closeJob);
router.get('/internships', ap.listInternships);
router.get('/courses', ap.listCourses);
router.get('/events', ap.listEvents);
router.get('/scholarships', ap.listScholarships);

router.get('/reports', ap.listContentReports);
router.patch('/reports/:id', ap.resolveContentReport);
router.get('/career-reports', ap.listCareerReports);

router.post('/notifications/broadcast', ap.broadcastNotification);

module.exports = router;
