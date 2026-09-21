const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole, optionalAuth } = require('../middleware/roleGuard');
const lc = require('../controllers/libraryController');
const li = require('../controllers/libraryIntelligenceController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(Object.assign(new Error('Only PDF uploads are supported.'), { statusCode: 400 }));
    }
    cb(null, true);
  },
});

router.get('/home', optionalAuth, lc.getHome);
router.get('/search', lc.searchBooks);
router.get('/filters', lc.filterOptions);
router.get('/categories', lc.listCategories);
router.get('/collections', lc.listCollections);
router.get('/collections/:id', lc.getCollection);
router.get('/books', lc.listBooks);
router.get('/books/:id', lc.getBook);

router.use(auth);
router.get('/books/:id/pdf', lc.getPdf);
router.get('/books/:id/progress', lc.getProgress);
router.put('/books/:id/progress', lc.saveProgress);
router.get('/books/:id/annotations', lc.listAnnotations);
router.post('/books/:id/annotations', lc.createAnnotation);
router.put('/books/:id/annotations/:annotationId', lc.updateAnnotation);
router.delete('/books/:id/annotations/:annotationId', lc.deleteAnnotation);
router.post('/books/:id/sessions', lc.recordReadingSession);
router.post('/books/:id/favorite', lc.toggleFavorite);
router.post('/books/:id/download', lc.trackDownload);
router.get('/continue', lc.continueReading);
router.get('/history', lc.readingHistory);
router.get('/saved', lc.savedBooks);
router.get('/books/:id/summary', lc.aiSummary);
router.get('/books/:id/ai', lc.aiTools);
router.post('/books/:id/ai', lc.aiTools);
router.get('/recommendations', lc.recommendations);
router.get('/dashboard', lc.libraryDashboard);

router.get('/my', li.getMyLibrary);
router.get('/resources/search', optionalAuth, li.searchResources);
router.post('/search/natural', auth, li.naturalLanguageSearch);
router.get('/home/enriched', auth, li.enrichedHome);
router.get('/goals/:goalId/resources', auth, li.goalResources);
router.get('/roadmaps/:roadmapId/resources', auth, li.roadmapResources);
router.post('/goals/:goalId/link', auth, li.linkGoalResource);
router.post('/roadmaps/:roadmapId/link', auth, li.linkRoadmapResource);
router.post('/books/:id/index', auth, li.indexDocument);
router.get('/books/:id/processing', auth, li.documentStatus);
router.post('/books/:id/reading-assistant', auth, li.readingAssistant);
router.post('/books/:id/practice-questions', auth, li.practiceQuestions);
router.post('/books/:id/revision-cards', auth, li.revisionCards);
router.post('/reading/schedule', auth, li.scheduleReading);
router.post('/uploads', auth, upload.single('file'), li.uploadDocument);

router.get('/org/books', requireRole('institution', 'company', 'admin'), lc.myOrgBooks);
router.get('/org/collections', requireRole('institution', 'company', 'admin'), lc.myOrgCollections);
router.post('/collections', requireRole('admin', 'institution', 'company'), lc.createCollection);
router.put('/collections/:id', requireRole('admin', 'institution', 'company'), lc.updateCollection);
router.post('/books', requireRole('admin', 'institution', 'company'), lc.createBook);
router.put('/books/:id', requireRole('admin', 'institution', 'company'), lc.updateBook);

module.exports = router;
