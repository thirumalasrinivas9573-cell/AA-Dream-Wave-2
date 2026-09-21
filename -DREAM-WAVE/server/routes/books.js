const express = require('express');
const ctrl = require('../controllers/bookController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { uploadDocument } = require('../middleware/upload');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/', zodValidate({ query: schemas.paginationQuery }), ctrl.list);
router.get('/search', zodValidate({ query: schemas.paginationQuery }), ctrl.search);
router.get('/categories', ctrl.categories);
router.get('/subjects', ctrl.subjects);
router.get('/authors', ctrl.authors);
router.get('/library', ctrl.myLibrary);
router.get('/library/:scope', zodValidate({ query: schemas.paginationQuery }), ctrl.libraryByScope);
router.get('/favorites', ctrl.favorites);
router.get('/recent', ctrl.recentlyViewed);

router.post('/', zodValidate(schemas.bookCreate), ctrl.create);
router.post('/upload', uploadDocument.single('file'), zodValidate(schemas.bookUpload), ctrl.upload);
router.post('/recommend', requireVerifiedEmail, zodValidate(schemas.booksRecommend), ctrl.recommend);

router.get('/:id', ctrl.getOne);
router.put('/:id', zodValidate(schemas.bookUpdate), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/reprocess', ctrl.reprocess);
router.post('/:id/prepare-ai', requireVerifiedEmail, ctrl.prepareAi);

router.get('/:id/chapters', ctrl.listChapters);
router.post('/:id/chapters', zodValidate(schemas.bookChapter), ctrl.upsertChapter);
router.get('/:id/chapters/:chapterId', ctrl.getChapter);
router.put('/:id/chapters/:chapterId', zodValidate(schemas.bookChapter), ctrl.upsertChapter);
router.put('/:id/topics', zodValidate(schemas.bookTopics), ctrl.setTopics);
router.put('/:id/related', zodValidate(schemas.bookRelated), ctrl.setRelated);

router.post('/:id/bookmark', ctrl.bookmark);
router.post('/:id/favorite', ctrl.toggleFavorite);
router.patch('/:id/progress', zodValidate(schemas.bookProgress), ctrl.updateProgress);
router.post('/:id/highlights', zodValidate(schemas.bookHighlight), ctrl.addHighlight);
router.post('/:id/notes', zodValidate(schemas.bookNote), ctrl.addNote);
router.delete('/:id/:kind(highlights|notes)/:annotationId', ctrl.removeAnnotation);

router.post(
  '/:id/ai/explain',
  requireVerifiedEmail,
  zodValidate(schemas.bookAiQuestion),
  ctrl.aiExplain
);
router.post('/:id/chapters/:chapterId/ai/summary', requireVerifiedEmail, ctrl.aiSummarizeChapter);
router.post('/:id/chapters/:chapterId/ai/concepts', requireVerifiedEmail, ctrl.aiKeyConcepts);
router.post(
  '/:id/ai/concepts',
  requireVerifiedEmail,
  zodValidate(schemas.bookAiQuestion),
  ctrl.aiKeyConcepts
);
router.post(
  '/:id/ai/flashcards',
  requireVerifiedEmail,
  zodValidate(schemas.bookAiQuestion),
  ctrl.aiFlashcards
);
router.post(
  '/:id/ai/quiz',
  requireVerifiedEmail,
  zodValidate(schemas.bookAiQuestion),
  ctrl.aiQuiz
);

module.exports = router;
