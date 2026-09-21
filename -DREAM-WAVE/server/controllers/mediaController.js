const path = require('path');
const fs = require('fs');
const MediaItem = require('../models/MediaItem');
const MediaProgress = require('../models/MediaProgress');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const mediaAccess = require('../services/mediaAccessService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { escapeRegex, pick, parsePagination, paginationMeta } = require('../utils/helpers');
const { toAssetUrl, filenameFromUrl } = require('../utils/assetUrl');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { getOrgRole, isOrgAdminRole } = require('../utils/orgScope');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const MEDIA_FIELDS = [
  'title',
  'description',
  'type',
  'category',
  'subject',
  'grade',
  'topics',
  'tags',
  'language',
  'durationSec',
  'allowDownload',
  'book',
  'chapterId',
  'course',
  'thumbnailUrl',
];

function detectMediaType(mime, originalName, forced) {
  if (forced && ['animation', 'video', 'audio'].includes(forced)) return forced;
  const ext = path.extname(originalName || '').toLowerCase();
  if (/^audio\//.test(mime) || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(ext)) return 'audio';
  if (/\.(gif|lottie|json)$/i.test(ext) || mime === 'image/gif') return 'animation';
  return 'video';
}

function buildListFilter(query) {
  const extra = {};
  if (query.type) extra.type = String(query.type);
  if (query.category) extra.category = String(query.category);
  if (query.subject) extra.subject = String(query.subject);
  if (query.grade) extra.grade = String(query.grade);
  if (query.status) extra.status = String(query.status);
  if (query.book) extra.book = query.book;
  if (query.course) extra.course = query.course;
  if (query.topic) extra.topics = String(query.topic);
  if (query.q) {
    const q = escapeRegex(String(query.q).slice(0, 80));
    extra.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { searchIndex: { $regex: q, $options: 'i' } },
      { topics: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ];
  }
  return extra;
}

exports.list = asyncHandler(async (req, res) => {
  const extra = buildListFilter(req.query);
  const filter = await mediaAccess.accessibleMediaFilter(req.user, extra);
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const sort =
    req.query.sort === 'views'
      ? { views: -1 }
      : req.query.sort === 'title'
        ? { title: 1 }
        : { createdAt: -1 };

  const [items, total] = await Promise.all([
    MediaItem.find(filter)
      .select('-searchIndex -versionHistory')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    MediaItem.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { media: items, pagination: paginationMeta(page, limit, total) },
  });
});

exports.libraryMeta = asyncHandler(async (req, res) => {
  const filter = await mediaAccess.accessibleMediaFilter(req.user, { status: 'published' });
  const [categories, subjects, grades, types, topics] = await Promise.all([
    MediaItem.distinct('category', filter),
    MediaItem.distinct('subject', filter),
    MediaItem.distinct('grade', filter),
    MediaItem.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    MediaItem.aggregate([
      { $match: filter },
      { $unwind: { path: '$topics', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 40 },
    ]),
  ]);
  res.json({
    success: true,
    data: {
      categories: categories.filter(Boolean).sort(),
      subjects: subjects.filter(Boolean).sort(),
      grades: grades.filter(Boolean).sort(),
      types: types.map((t) => ({ type: t._id, count: t.count })),
      topics: topics.map((t) => ({ topic: t._id, count: t.count })),
    },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  const progress = await MediaProgress.findOne({ user: req.user._id, media: media._id }).lean();
  media.views += 1;
  await media.save();
  res.json({ success: true, data: { media, progress } });
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Media file is required', 400);
  const type = detectMediaType(req.file.mimetype, req.file.originalname, req.body.type);
  const scope = mediaAccess.resolveScopeForUser(req.user, req.body.scope);
  const topics = Array.isArray(req.body.topics)
    ? req.body.topics
    : String(req.body.topics || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 30);
  const tags = Array.isArray(req.body.tags)
    ? req.body.tags
    : String(req.body.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20);

  const oid = (v) => (v && v !== 'null' && v !== 'undefined' ? v : null);

  const media = new MediaItem({
    title: (req.body.title || req.file.originalname).slice(0, 240),
    description: (req.body.description || '').slice(0, 5000),
    type,
    category: (req.body.category || 'General').slice(0, 80),
    subject: (req.body.subject || '').slice(0, 120),
    grade: (req.body.grade || '').slice(0, 40),
    topics,
    tags,
    language: (req.body.language || 'en').slice(0, 16),
    status: req.body.publish === 'true' || req.body.publish === true ? 'published' : 'draft',
    scope,
    organizationId: scope === 'personal' ? null : req.user.organizationId || null,
    uploadedBy: req.user._id,
    fileUrl: toAssetUrl(req.file.filename),
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    durationSec: Math.max(0, Number(req.body.durationSec) || 0),
    thumbnailUrl: req.body.thumbnailUrl || '',
    allowDownload: req.body.allowDownload === 'true' || req.body.allowDownload === true,
    book: oid(req.body.book),
    chapterId: req.body.chapterId || '',
    course: oid(req.body.course),
    quizTrigger: {
      enabled: req.body.quizTriggerEnabled === 'true' || req.body.quizTriggerEnabled === true,
      quizId: oid(req.body.quizId),
      prompt: (req.body.quizPrompt || '').slice(0, 500),
    },
    version: req.body.version || '1.0',
  });
  if (req.fileThumb) {
    media.thumbnailUrl = toAssetUrl(req.fileThumb.filename);
  }
  media.rebuildSearchIndex();
  await media.save();

  res.status(201).json({ success: true, data: { media } });
});

exports.update = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanManageMedia(req.user, media);

  const data = pick(req.body, MEDIA_FIELDS);
  if (data.book === '' || data.book === 'null') data.book = null;
  if (data.course === '' || data.course === 'null') data.course = null;
  Object.assign(media, data);
  if (req.body.topics !== undefined && !Array.isArray(req.body.topics)) {
    media.topics = String(req.body.topics)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  if (req.body.tags !== undefined && !Array.isArray(req.body.tags)) {
    media.tags = String(req.body.tags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (req.body.quizTrigger) {
    media.quizTrigger = {
      enabled: Boolean(req.body.quizTrigger.enabled),
      quizId: req.body.quizTrigger.quizId || null,
      prompt: String(req.body.quizTrigger.prompt || '').slice(0, 500),
    };
  }
  if (req.body.scope) {
    media.scope = mediaAccess.resolveScopeForUser(req.user, req.body.scope);
    media.organizationId = media.scope === 'personal' ? null : req.user.organizationId || null;
  }
  if (req.file) {
    media.versionHistory.push({
      version: media.version,
      fileUrl: media.fileUrl,
      fileName: media.fileName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      durationSec: media.durationSec,
      note: 'Replaced on update',
    });
    media.fileUrl = toAssetUrl(req.file.filename);
    media.fileName = req.file.originalname;
    media.mimeType = req.file.mimetype;
    media.fileSize = req.file.size;
    media.type = detectMediaType(req.file.mimetype, req.file.originalname, req.body.type || media.type);
  }
  media.rebuildSearchIndex();
  await media.save();
  res.json({ success: true, data: { media } });
});

exports.publish = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanManageMedia(req.user, media);
  if (!media.fileUrl) throw new AppError('Cannot publish media without a file', 400);
  media.status = 'published';
  await media.save();
  res.json({ success: true, data: { media } });
});

exports.archive = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanManageMedia(req.user, media);
  media.status = 'archived';
  await media.save();
  res.json({ success: true, data: { media } });
});

exports.addVersion = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanManageMedia(req.user, media);
  if (!req.file) throw new AppError('Media file is required', 400);

  media.versionHistory.push({
    version: media.version,
    fileUrl: media.fileUrl,
    fileName: media.fileName,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    durationSec: media.durationSec,
    note: (req.body.note || 'Previous version').slice(0, 400),
  });

  const nextVersion = req.body.version || bumpVersion(media.version);
  media.version = nextVersion;
  media.fileUrl = toAssetUrl(req.file.filename);
  media.fileName = req.file.originalname;
  media.mimeType = req.file.mimetype;
  media.fileSize = req.file.size;
  if (req.body.durationSec) media.durationSec = Math.max(0, Number(req.body.durationSec) || 0);
  media.rebuildSearchIndex();
  await media.save();
  res.json({ success: true, data: { media } });
});

function bumpVersion(v) {
  const m = String(v || '1.0').match(/^(\d+)\.(\d+)$/);
  if (!m) return `${Date.now()}`;
  return `${m[1]}.${Number(m[2]) + 1}`;
}

exports.remove = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanManageMedia(req.user, media);
  await MediaProgress.deleteMany({ media: media._id });
  await media.deleteOne();
  res.json({ success: true, message: 'Media deleted' });
});

exports.updateProgress = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);

  const positionSec = Math.max(0, Number(req.body.positionSec) || 0);
  const durationSec = Math.max(0, Number(req.body.durationSec) || media.durationSec || 0);
  const deltaWatch = Math.max(0, Number(req.body.deltaWatchSec) || 0);
  const percent =
    durationSec > 0 ? Math.min(100, Math.round((positionSec / durationSec) * 100)) : Number(req.body.percent) || 0;
  const markComplete = req.body.completed === true || percent >= 90;

  let progress = await MediaProgress.findOne({ user: req.user._id, media: media._id });
  if (!progress) {
    progress = new MediaProgress({
      user: req.user._id,
      media: media._id,
      organizationId: req.user.organizationId || null,
      watchCount: 1,
    });
  } else if (positionSec < 5 && progress.positionSec > 30) {
    progress.watchCount += 1;
  }

  progress.positionSec = positionSec;
  progress.durationSec = durationSec || progress.durationSec;
  progress.percent = percent;
  progress.watchTimeSec += deltaWatch;
  progress.lastWatchedAt = new Date();

  const wasComplete = progress.completed;
  if (markComplete && !progress.completed) {
    progress.completed = true;
    progress.completedAt = new Date();
    progress.percent = 100;
    media.completions += 1;
  }
  media.totalWatchSec += deltaWatch;
  await media.save();
  await progress.save();

  let quizTrigger = null;
  if (progress.completed && !wasComplete && media.quizTrigger?.enabled) {
    quizTrigger = {
      enabled: true,
      quizId: media.quizTrigger.quizId,
      prompt: media.quizTrigger.prompt || 'Take a quick quiz on this lesson',
    };
    await Notification.create({
      user: req.user._id,
      title: 'Quiz ready',
      message: quizTrigger.prompt,
      type: 'info',
      link: media.quizTrigger.quizId ? `/learning/quizzes/${media.quizTrigger.quizId}` : '/learning',
    });
  }

  if (progress.completed && !wasComplete) {
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: media.type === 'animation' ? 'animation_completed' : 'learning_completed',
      module: 'media',
      title: media.title,
      refType: 'MediaItem',
      refId: media._id,
      payload: { mediaType: media.type, percent: progress.percent },
    });
  }

  res.json({ success: true, data: { progress, quizTrigger } });
});

exports.toggleFavorite = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  let progress = await MediaProgress.findOne({ user: req.user._id, media: media._id });
  if (!progress) {
    progress = await MediaProgress.create({
      user: req.user._id,
      media: media._id,
      organizationId: req.user.organizationId || null,
      favorite: true,
      lastWatchedAt: new Date(),
    });
  } else {
    progress.favorite = !progress.favorite;
    await progress.save();
  }
  res.json({ success: true, data: { progress } });
});

exports.markComplete = (req, res, next) => {
  req.body = {
    ...req.body,
    completed: true,
    percent: 100,
    positionSec: req.body.positionSec ?? 0,
  };
  return exports.updateProgress(req, res, next);
};

exports.continueWatching = asyncHandler(async (req, res) => {
  const rows = await MediaProgress.find({
    user: req.user._id,
    completed: false,
    percent: { $gt: 0, $lt: 95 },
  })
    .sort({ lastWatchedAt: -1 })
    .limit(20)
    .populate(
      'media',
      'title type subject category thumbnailUrl durationSec status scope organizationId uploadedBy fileUrl views completions'
    );

  const items = [];
  for (const row of rows) {
    if (!row.media) continue;
    try {
      await mediaAccess.assertCanAccessMedia(req.user, row.media);
      items.push({ media: row.media, progress: row });
    } catch {
      /* skip inaccessible */
    }
  }
  res.json({ success: true, data: { items } });
});

exports.recent = asyncHandler(async (req, res) => {
  const rows = await MediaProgress.find({ user: req.user._id })
    .sort({ lastWatchedAt: -1 })
    .limit(30)
    .populate(
      'media',
      'title type subject category thumbnailUrl durationSec status scope organizationId uploadedBy fileUrl views completions'
    );
  const items = rows.filter((r) => r.media).map((r) => ({ media: r.media, progress: r }));
  res.json({ success: true, data: { items } });
});

exports.favorites = asyncHandler(async (req, res) => {
  const rows = await MediaProgress.find({ user: req.user._id, favorite: true })
    .sort({ updatedAt: -1 })
    .limit(50)
    .populate(
      'media',
      'title type subject category thumbnailUrl durationSec status scope organizationId uploadedBy fileUrl views completions'
    );
  const items = rows.filter((r) => r.media).map((r) => ({ media: r.media, progress: r }));
  res.json({ success: true, data: { items } });
});

exports.history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { user: req.user._id };
  const [rows, total] = await Promise.all([
    MediaProgress.find(filter)
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(
      'media',
      'title type subject category thumbnailUrl durationSec status scope organizationId uploadedBy fileUrl views completions'
    ),
    MediaProgress.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: {
      history: rows.filter((r) => r.media).map((r) => ({ media: r.media, progress: r })),
      pagination: paginationMeta(page, limit, total),
    },
  });
});

exports.myAnalytics = asyncHandler(async (req, res) => {
  const [agg] = await MediaProgress.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: null,
        items: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
        watchTimeSec: { $sum: '$watchTimeSec' },
        favorites: { $sum: { $cond: ['$favorite', 1, 0] } },
        avgPercent: { $avg: '$percent' },
      },
    },
  ]);
  const byType = await MediaProgress.aggregate([
    { $match: { user: req.user._id } },
    {
      $lookup: {
        from: 'mediaitems',
        localField: 'media',
        foreignField: '_id',
        as: 'm',
      },
    },
    { $unwind: '$m' },
    { $group: { _id: '$m.type', count: { $sum: 1 }, watchTimeSec: { $sum: '$watchTimeSec' } } },
  ]);
  res.json({
    success: true,
    data: {
      engagement: {
        itemsStarted: agg?.items || 0,
        completed: agg?.completed || 0,
        completionRate: agg?.items ? Math.round((agg.completed / agg.items) * 100) : 0,
        watchTimeSec: agg?.watchTimeSec || 0,
        favorites: agg?.favorites || 0,
        avgPercent: Math.round(agg?.avgPercent || 0),
      },
      byType,
    },
  });
});

exports.orgAnalytics = asyncHandler(async (req, res) => {
  if (!req.user.organizationId) throw new AppError('Organization required', 400);
  const role = await getOrgRole(req.user);
  if (!isOrgAdminRole(role) && req.user.role !== 'admin') {
    throw new AppError('Forbidden. Admins only.', 403);
  }
  const orgId = req.user.organizationId;
  const [mediaStats] = await MediaItem.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: null,
        items: { $sum: 1 },
        published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        views: { $sum: '$views' },
        completions: { $sum: '$completions' },
        watchTimeSec: { $sum: '$totalWatchSec' },
      },
    },
  ]);
  const byType = await MediaItem.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        views: { $sum: '$views' },
        completions: { $sum: '$completions' },
      },
    },
  ]);
  const top = await MediaItem.find({ organizationId: orgId })
    .sort({ views: -1 })
    .limit(10)
    .select('title type views completions totalWatchSec status');
  res.json({
    success: true,
    data: {
      summary: mediaStats || {
        items: 0,
        published: 0,
        views: 0,
        completions: 0,
        watchTimeSec: 0,
      },
      byType,
      top,
      completionRate: mediaStats?.views
        ? Math.round((mediaStats.completions / Math.max(1, mediaStats.views)) * 100)
        : 0,
    },
  });
});

exports.recommend = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const filter = await mediaAccess.accessibleMediaFilter(req.user, { status: 'published' });
  const catalog = await MediaItem.find(filter)
    .select('title type category subject grade topics description')
    .limit(40)
    .lean();
  const focus = req.body.focus || req.user.targetCareer || 'learning';
  const prompt = `Recommend 5 educational media items for: ${focus}. Prefer from this catalog when possible and explain why.\n${catalog
    .map(
      (m) =>
        `- ${m.title} [${m.type}/${m.category}/${m.subject || '-'}] topics:${(m.topics || []).join(',')}`
    )
    .join('\n')}`;
  const recommendations = (await aiService.runMode('study', [{ role: 'user', content: prompt }])).content;
  await recordAiUsage(req.user, { ...({ mode: 'study', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { recommendations, focus, catalogSize: catalog.length } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.related = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  const filter = await mediaAccess.accessibleMediaFilter(req.user, {
    status: 'published',
    _id: { $ne: media._id },
    $or: [
      { category: media.category },
      { subject: media.subject },
      { topics: { $in: media.topics || [] } },
      { book: media.book },
      { course: media.course },
    ],
  });
  const related = await MediaItem.find(filter).select('-searchIndex -versionHistory').limit(8).lean();
  const prompt = `Suggest related learning next steps after watching "${media.title}" (${media.type}, ${media.subject}). Keep under 120 words.`;
  const advice = (await aiService.runMode('teacher', [{ role: 'user', content: prompt }])).content;
  await recordAiUsage(req.user, { ...({ mode: 'teacher', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { related, advice } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.download = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  if (!media.allowDownload) throw new AppError('Download not permitted for this media', 403);
  const filename = filenameFromUrl(media.fileUrl);
  if (!filename) throw new AppError('File missing', 404);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    throw new AppError('File not found', 404);
  }
  res.setHeader('Content-Disposition', `attachment; filename="${media.fileName || filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(filePath);
});

/** Secure progressive stream with Range support (authenticated). */
exports.stream = asyncHandler(async (req, res) => {
  const media = await MediaItem.findById(req.params.id);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  const filename = filenameFromUrl(media.fileUrl);
  if (!filename) throw new AppError('File missing', 404);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    throw new AppError('File not found', 404);
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const contentType = media.mimeType || 'application/octet-stream';
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', contentType);

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) throw new AppError('Invalid Range', 416);
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      throw new AppError('Range Not Satisfiable', 416);
    }
    const chunkEnd = Math.min(end, fileSize - 1);
    const chunkSize = chunkEnd - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${chunkEnd}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    fs.createReadStream(filePath, { start, end: chunkEnd }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', fileSize);
  fs.createReadStream(filePath).pipe(res);
});
