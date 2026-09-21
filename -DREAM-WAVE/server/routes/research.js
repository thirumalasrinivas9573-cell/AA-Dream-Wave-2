const express = require('express');
const ctrl = require('../controllers/researchController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { uploadDocument } = require('../middleware/upload');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/categories', ctrl.listCategories);
router.get('/search', ctrl.search);
router.post('/search', zodValidate(schemas.researchSearch), ctrl.search);
router.get('/analytics', ctrl.analytics);

router.get('/projects', ctrl.listProjects);
router.post('/projects', zodValidate(schemas.researchProjectCreate), ctrl.createProject);
router.get('/projects/:id', ctrl.getProject);
router.patch('/projects/:id', zodValidate(schemas.researchProjectUpdate), ctrl.updateProject);
router.post('/projects/:id/archive', ctrl.archiveProject);
router.delete('/projects/:id', ctrl.deleteProject);
router.get('/projects/:id/history', ctrl.projectHistory);
router.post('/projects/:id/stats/refresh', ctrl.refreshStats);

router.get('/projects/:id/documents', ctrl.listProjectDocuments);
router.post(
  '/projects/:id/documents',
  uploadDocument.single('file'),
  ctrl.uploadProjectDocument
);
router.post(
  '/projects/:id/documents/attach',
  zodValidate(schemas.researchAttachDocument),
  ctrl.attachDocument
);

router.get('/documents/:docId/knowledge', ctrl.getDocumentKnowledge);
router.post('/documents/:docId/process', ctrl.processDocumentKnowledge);
router.patch(
  '/documents/:docId/reading-progress',
  zodValidate(schemas.researchReadingProgress),
  ctrl.updateReadingProgress
);

router.post(
  '/documents/:docId/ai/summary',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiSummary
);
router.post(
  '/documents/:docId/ai/explain',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiExplain
);
router.post(
  '/documents/:docId/ai/simplify',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiSimplify
);
router.post(
  '/documents/:docId/ai/expand',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiExpand
);
router.post(
  '/documents/:docId/ai/questions',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiQuestions
);
router.post(
  '/documents/:docId/ai/flashcards',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiFlashcards
);
router.post(
  '/documents/:docId/ai/citations',
  requireVerifiedEmail,
  zodValidate(schemas.researchAi),
  ctrl.aiCitations
);
router.post('/projects/:id/ai/suggestions', requireVerifiedEmail, ctrl.aiSuggestions);

router.get('/projects/:id/notes', ctrl.listNotes);
router.post('/projects/:id/notes', zodValidate(schemas.researchNote), ctrl.createNote);
router.patch('/notes/:noteId', zodValidate(schemas.researchNoteUpdate), ctrl.updateNote);
router.delete('/notes/:noteId', ctrl.deleteNote);

router.get('/projects/:id/highlights', ctrl.listHighlights);
router.post('/projects/:id/highlights', zodValidate(schemas.researchHighlight), ctrl.createHighlight);
router.delete('/highlights/:highlightId', ctrl.deleteHighlight);

router.get('/projects/:id/bookmarks', ctrl.listBookmarks);
router.post('/projects/:id/bookmarks', zodValidate(schemas.researchBookmark), ctrl.createBookmark);
router.delete('/bookmarks/:bookmarkId', ctrl.deleteBookmark);

router.get('/projects/:id/collections', ctrl.listCollections);
router.post(
  '/projects/:id/collections',
  zodValidate(schemas.researchCollection),
  ctrl.createCollection
);
router.patch(
  '/collections/:collectionId',
  zodValidate(schemas.researchCollectionUpdate),
  ctrl.updateCollection
);
router.delete('/collections/:collectionId', ctrl.deleteCollection);

router.get('/projects/:id/tags', ctrl.listTags);
router.get('/projects/:id/folders', ctrl.listFolders);

module.exports = router;
