const express = require('express');
const ctrl = require('../controllers/mediaController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { uploadMedia } = require('../middleware/upload');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

const mediaUpload = uploadMedia.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

function mapMediaFiles(req, _res, next) {
  if (req.files?.file?.[0]) req.file = req.files.file[0];
  if (req.files?.thumbnail?.[0]) req.fileThumb = req.files.thumbnail[0];
  next();
}

router.get('/', ctrl.list);
router.get('/meta', ctrl.libraryMeta);
router.get('/continue', ctrl.continueWatching);
router.get('/recent', ctrl.recent);
router.get('/favorites', ctrl.favorites);
router.get('/history', ctrl.history);
router.get('/analytics/me', ctrl.myAnalytics);
router.get('/analytics/org', ctrl.orgAnalytics);
router.post('/recommend', requireVerifiedEmail, zodValidate(schemas.mediaRecommend), ctrl.recommend);

router.post('/', mediaUpload, mapMediaFiles, zodValidate(schemas.mediaCreateMeta), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', mediaUpload, mapMediaFiles, zodValidate(schemas.mediaUpdate), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/publish', ctrl.publish);
router.post('/:id/archive', ctrl.archive);
router.post('/:id/versions', mediaUpload, mapMediaFiles, ctrl.addVersion);
router.post('/:id/progress', zodValidate(schemas.mediaProgress), ctrl.updateProgress);
router.post('/:id/complete', ctrl.markComplete);
router.post('/:id/favorite', ctrl.toggleFavorite);
router.get('/:id/related', requireVerifiedEmail, ctrl.related);
router.get('/:id/stream', ctrl.stream);
router.get('/:id/download', ctrl.download);

module.exports = router;
