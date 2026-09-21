const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const ic = require('../controllers/institutionController');

router.get('/public', ic.listPublic);
router.get('/public/filters', ic.filterOptions);
router.get('/public/compare', ic.compareInstitutions);
router.get('/public/:slug', ic.getPublicProfile);
router.get('/public/:slug/insights', ic.getPublicInsights);
router.post('/public/:slug/track', ic.trackPublicView);
router.post('/public/:slug/contact', ic.publicContact);
router.get('/sitemap.xml', ic.sitemap);

router.use(auth, requireRole('institution'));
router.post('/bootstrap', ic.bootstrap);
router.get('/me', ic.getMine);
router.put('/me', ic.updateMine);
router.get('/dashboard', ic.getDashboard);
router.get('/analytics', ic.getAnalytics);
router.get('/reports', ic.getReports);
router.get('/inquiries', ic.listContactInquiries);

router.get('/departments', ic.listDepartments);
router.post('/departments', ic.createDepartment);
router.put('/departments/:id', ic.updateDepartment);
router.delete('/departments/:id', ic.deleteDepartment);

router.get('/courses', ic.listCourses);
router.post('/courses', ic.createCourse);
router.put('/courses/:id', ic.updateCourse);
router.delete('/courses/:id', ic.deleteCourse);
router.get('/courses/:id/insights', ic.getCourseInsights);

router.get('/faculty', ic.listFaculty);
router.post('/faculty', ic.createFaculty);
router.put('/faculty/:id', ic.updateFaculty);
router.delete('/faculty/:id', ic.deleteFaculty);

router.get('/students', ic.listStudents);
router.post('/students', ic.createStudent);
router.put('/students/:id', ic.updateStudent);
router.delete('/students/:id', ic.deleteStudent);

router.get('/placements', ic.listPlacements);
router.post('/placements', ic.createPlacement);
router.put('/placements/:id', ic.updatePlacement);
router.delete('/placements/:id', ic.deletePlacement);

router.get('/events', ic.listEvents);
router.post('/events', ic.createEvent);
router.put('/events/:id', ic.updateEvent);
router.delete('/events/:id', ic.deleteEvent);

router.get('/promotions', ic.listPromotions);
router.post('/promotions', ic.createPromotion);
router.put('/promotions/:id', ic.updatePromotion);
router.delete('/promotions/:id', ic.deletePromotion);

router.get('/gallery', ic.listGallery);
router.post('/gallery', ic.createGallery);
router.delete('/gallery/:id', ic.deleteGallery);

router.get('/admissions', ic.listAdmissions);
router.post('/admissions', ic.createAdmission);
router.put('/admissions/:id', ic.updateAdmission);
router.delete('/admissions/:id', ic.deleteAdmission);
router.put('/applications/:id', ic.updateInboundApplication);

router.get('/certificates', ic.listCertificates);
router.post('/certificates', ic.createCertificate);
router.delete('/certificates/:id', ic.deleteCertificate);

router.get('/scholarships', ic.listScholarships);
router.post('/scholarships', ic.createScholarship);
router.put('/scholarships/:id', ic.updateScholarship);
router.delete('/scholarships/:id', ic.deleteScholarship);

router.get('/research', ic.listResearch);
router.post('/research', ic.createResearch);
router.put('/research/:id', ic.updateResearch);
router.delete('/research/:id', ic.deleteResearch);

module.exports = router;
