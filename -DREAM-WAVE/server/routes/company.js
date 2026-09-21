const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const cc = require('../controllers/companyPortalController');

router.get('/sitemap.xml', cc.sitemap);
router.get('/public', cc.listPublic);
router.get('/public/filters', cc.filterOptions);
router.get('/public/compare', cc.compareCompanies);
router.get('/public/jobs/:jobId', cc.getPublicJob);
router.get('/public/internships/:internshipId', cc.getPublicInternship);
router.get('/public/:slug', cc.getPublicProfile);
router.get('/public/:slug/insights', cc.getPublicInsights);
router.post('/public/:slug/track', cc.trackPublicView);
router.post('/public/:slug/contact', cc.publicContact);

router.use(auth, requireRole('company'));
router.post('/bootstrap', cc.bootstrap);
router.get('/me', cc.getMine);
router.put('/me', cc.updateMine);
router.get('/dashboard', cc.getDashboard);
router.get('/analytics', cc.getAnalytics);
router.get('/reports', cc.getReports);
router.get('/followers', cc.listFollowers);

router.get('/departments', cc.listDepartments);
router.post('/departments', cc.createDepartment);
router.put('/departments/:id', cc.updateDepartment);
router.delete('/departments/:id', cc.deleteDepartment);

router.get('/jobs', cc.listJobs);
router.post('/jobs', cc.createJob);
router.put('/jobs/:id', cc.updateJob);
router.delete('/jobs/:id', cc.deleteJob);

router.get('/internships', cc.listInternships);
router.post('/internships', cc.createInternship);
router.put('/internships/:id', cc.updateInternship);
router.delete('/internships/:id', cc.deleteInternship);

router.get('/employees', cc.listEmployees);
router.post('/employees', cc.createEmployee);
router.put('/employees/:id', cc.updateEmployee);
router.delete('/employees/:id', cc.deleteEmployee);

router.get('/projects', cc.listProjects);
router.post('/projects', cc.createProject);
router.put('/projects/:id', cc.updateProject);
router.delete('/projects/:id', cc.deleteProject);

router.get('/training', cc.listTraining);
router.post('/training', cc.createTraining);
router.put('/training/:id', cc.updateTraining);
router.delete('/training/:id', cc.deleteTraining);

router.get('/events', cc.listEvents);
router.post('/events', cc.createEvent);
router.put('/events/:id', cc.updateEvent);
router.delete('/events/:id', cc.deleteEvent);

router.get('/promotions', cc.listPromotions);
router.post('/promotions', cc.createPromotion);
router.put('/promotions/:id', cc.updatePromotion);
router.delete('/promotions/:id', cc.deletePromotion);

router.get('/gallery', cc.listGallery);
router.post('/gallery', cc.createGallery);
router.delete('/gallery/:id', cc.deleteGallery);

router.get('/certificates', cc.listCertificates);
router.post('/certificates', cc.createCertificate);

router.get('/applications', cc.listApplications);
router.put('/applications/:id', cc.updateApplication);

router.get('/interviews', cc.listInterviews);
router.post('/interviews', cc.createInterview);
router.put('/interviews/:id', cc.updateInterview);
router.delete('/interviews/:id', cc.deleteInterview);

module.exports = router;
