const MediaItem = require('../models/MediaItem');
const LearningProgress = require('../models/LearningProgress');
const adaptive = require('../services/adaptiveLearningService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { auditFromRequest } = require('../utils/audit');

exports.getProfile = asyncHandler(async (req, res) => {
  const { profile } = await adaptive.refreshAdaptiveState(req.user);
  res.json({ success: true, data: { profile } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await adaptive.getOrCreateAdaptiveProfile(req.user);
  for (const f of ['difficulty', 'dailyGoalMinutes', 'dailyGoalTopics', 'weeklyFocus', 'learningSpeed']) {
    if (req.body[f] !== undefined) profile[f] = req.body[f];
  }
  await profile.save();
  await auditFromRequest(req, {
    action: 'adaptive.profile.update',
    resource: 'AdaptiveProfile',
    resourceId: profile._id,
  });
  res.json({ success: true, data: { profile } });
});

exports.refresh = asyncHandler(async (req, res) => {
  const data = await adaptive.refreshAdaptiveState(req.user);
  res.json({
    success: true,
    data: {
      profile: data.profile,
      intelligence: data.intel,
      weaknesses: data.weaknesses,
      strengths: data.strengths,
    },
  });
});

exports.path = asyncHandler(async (req, res) => {
  const { profile, intel } = await adaptive.refreshAdaptiveState(req.user);
  res.json({
    success: true,
    data: {
      path: profile.currentPath,
      lessonSequence: profile.lessonSequence,
      difficulty: profile.detectedDifficulty,
      nextBestTopic: intel.nextBestTopic,
    },
  });
});

exports.dailyGoal = asyncHandler(async (req, res) => {
  const goal = await adaptive.dailyGoal(req.user);
  res.json({ success: true, data: { goal } });
});

exports.weeklyPlan = asyncHandler(async (req, res) => {
  const plan = await adaptive.weeklyPlan(req.user);
  res.json({ success: true, data: { plan } });
});

exports.listProgress = asyncHandler(async (req, res) => {
  const { orgListFilter } = require('../utils/orgScope');
  const filter = await orgListFilter(req.user);
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.completed === 'true') filter.completed = true;
  if (req.query.completed === 'false') filter.completed = false;
  const items = await LearningProgress.find(filter).sort({ updatedAt: -1 }).limit(100);
  res.json({ success: true, data: { progress: items } });
});

exports.upsertProgress = asyncHandler(async (req, res) => {
  try {
    const item = await adaptive.upsertProgress(req.user, req.body);
    res.json({ success: true, data: { progress: item } });
  } catch (err) {
    throw new AppError(err.message || 'Progress update failed', err.statusCode || 400);
  }
});

exports.completeProgress = asyncHandler(async (req, res) => {
  const item = await adaptive.upsertProgress(req.user, {
    ...req.body,
    percent: 100,
    completed: true,
  });
  const { safeEmit } = require('../utils/platformEvents');
  await safeEmit(req.user, {
    type: req.body.kind === 'animation' ? 'animation_completed' : 'learning_completed',
    module: 'adaptive',
    title: item.label || item.key || 'Progress completed',
    refType: item.refType || 'LearningProgress',
    refId: item.refId || item._id,
    payload: { kind: item.kind, key: item.key },
  });
  res.json({ success: true, data: { progress: item } });
});

exports.achievements = asyncHandler(async (req, res) => {
  const profile = await adaptive.getOrCreateAdaptiveProfile(req.user);
  res.json({
    success: true,
    data: { achievements: profile.achievements || [], streak: profile.streak },
  });
});

exports.animations = asyncHandler(async (req, res) => {
  const limit = Math.min(30, parseInt(req.query.limit, 10) || 10);
  const query = {
    type: 'animation',
    status: 'published',
    $or: [
      { scope: 'public' },
      { uploadedBy: req.user._id },
    ],
  };
  if (req.query.topic) query.topics = req.query.topic;
  if (req.query.skill) query.skills = req.query.skill;
  if (req.query.bookId) query.book = req.query.bookId;
  if (req.query.courseId) query.course = req.query.courseId;
  const items = await MediaItem.find(query).sort({ views: -1, createdAt: -1 }).limit(limit).lean();
  res.json({
    success: true,
    data: {
      capability: 'recommended_media',
      status: 'AVAILABLE',
      message: 'These results are recommended or mapped learning animations/media. This endpoint does not generate new animations from a provider.',
      animations: items,
    },
  });
});

exports.mapAnimation = asyncHandler(async (req, res) => {
  const item = await MediaItem.findById(req.params.mediaId);
  if (!item) throw new AppError('Media not found', 404);
  const isOwner = String(item.uploadedBy) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) throw new AppError('Forbidden', 403);
  if (Array.isArray(req.body.topics)) item.topics = req.body.topics.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 12);
  if (Array.isArray(req.body.skills)) item.skills = req.body.skills.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 12);
  if (req.body.bookId !== undefined) item.book = req.body.bookId || null;
  if (req.body.courseId !== undefined) item.course = req.body.courseId || null;
  if (req.body.difficulty !== undefined) item.difficulty = req.body.difficulty || '';
  if (Array.isArray(req.body.learningObjectives)) item.learningObjectives = req.body.learningObjectives.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 12);
  item.rebuildSearchIndex?.();
  await item.save();
  res.json({
    success: true,
    data: {
      capability: 'mapped_media',
      message: 'The media item was mapped to learning metadata. No provider-backed animation generation was performed.',
      media: item,
    },
  });
});

exports.animationProgress = asyncHandler(async (req, res) => {
  const MediaProgress = require('../models/MediaProgress');
  const mediaAccess = require('../services/mediaAccessService');
  const media = await MediaItem.findById(req.params.mediaId);
  if (!media) throw new AppError('Media not found', 404);
  await mediaAccess.assertCanAccessMedia(req.user, media);
  const progress = await MediaProgress.findOne({ user: req.user._id, media: media._id });
  if (progress?.completed || (progress?.percent || 0) >= 100) {
    await adaptive.upsertProgress(req.user, {
      kind: 'animation',
      key: String(media._id),
      label: media.title,
      percent: 100,
      completed: true,
      refType: 'MediaItem',
      refId: media._id,
    });
  }
  res.json({
    success: true,
    data: {
      capability: 'playback_progress',
      mediaProgress: progress,
      mappings: {
        topics: media.topics,
        skills: media.skills,
        book: media.book,
        course: media.course,
        difficulty: media.difficulty,
      },
    },
  });
});

exports.recommendations = asyncHandler(async (req, res) => {
  const recommendations = await adaptive.adaptiveRecommendations(req.user);
  res.json({ success: true, data: { recommendations } });
});

exports.adaptiveQuiz = asyncHandler(async (req, res) => {
  const useAi = req.body.useAi !== false;
  if (useAi) await consumeAiCredit(req.user, 1);
  try {
    const data = await adaptive.adaptiveQuiz(req.user, {
      topic: req.body.topic,
      useAi,
    });
    if (useAi && data.usedAi) {
      await recordAiUsage(req.user, {
        mode: 'quiz',
        source: 'adaptive',
        creditsUsed: 1,
        success: true,
      });
    } else if (useAi && !data.usedAi) {
      await refundAiCredit(req.user, 1);
      await recordAiUsage(req.user, {
        mode: 'quiz',
        source: 'adaptive',
        creditsUsed: 0,
        success: true,
        errorCode: 'local_fallback',
      });
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (useAi) await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.analytics = asyncHandler(async (req, res) => {
  const analytics = await adaptive.analytics(req.user);
  res.json({ success: true, data: { analytics } });
});
