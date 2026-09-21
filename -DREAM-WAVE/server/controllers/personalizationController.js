const personalization = require('../services/personalizationIntelligenceService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { auditFromRequest } = require('../utils/audit');

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await personalization.getOrCreateProfile(req.user);
  res.json({ success: true, data: { profile } });
});

exports.refresh = asyncHandler(async (req, res) => {
  const profile = await personalization.refreshUnifiedProfile(req.user, { force: true });
  await auditFromRequest(req, {
    action: 'personalization.refresh',
    resource: 'PersonalizationProfile',
    resourceId: profile._id,
  });
  res.json({ success: true, data: { profile } });
});

exports.dashboard = asyncHandler(async (req, res) => {
  const surfaces = await personalization.buildPersonalizedSurfaces(req.user);
  res.json({
    success: true,
    data: {
      dashboard: surfaces.dashboard,
      nextBest: surfaces.nextBest,
      sync: surfaces.profile.sync,
      engagement: surfaces.profile.engagement,
    },
  });
});

exports.surfaces = asyncHandler(async (req, res) => {
  const surfaces = await personalization.buildPersonalizedSurfaces(req.user);
  res.json({ success: true, data: surfaces });
});

exports.nextBest = asyncHandler(async (req, res) => {
  const decisions = await personalization.nextBestActions(req.user);
  res.json({ success: true, data: { nextBest: decisions } });
});

exports.recommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const data = await personalization.improvedRecommendations(req.user, { limit });
  res.json({ success: true, data });
});

exports.sync = asyncHandler(async (req, res) => {
  const data = await personalization.syncCrossPlatform(req.user);
  res.json({ success: true, data });
});

exports.progress = asyncHandler(async (req, res) => {
  const sync = await personalization.collectCrossProgress(req.user);
  res.json({ success: true, data: { progress: sync } });
});

exports.updatePrivacy = asyncHandler(async (req, res) => {
  const profile = await personalization.updatePrivacy(req.user, req.body, req);
  res.json({ success: true, data: { profile } });
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  const profile = await personalization.updatePreferences(req.user, req.body);
  res.json({ success: true, data: { profile } });
});

exports.mentorContext = asyncHandler(async (req, res) => {
  const context = await personalization.getMentorPersonalizationContext(req.user);
  res.json({ success: true, data: { context } });
});

exports.listEvents = asyncHandler(async (req, res) => {
  const data = await personalization.listEvents(req.user, {
    type: req.query.type,
    module: req.query.module,
    limit: parseInt(req.query.limit, 10) || 40,
    page: parseInt(req.query.page, 10) || 1,
  });
  res.json({ success: true, data });
});

exports.ingestEvent = asyncHandler(async (req, res) => {
  if (!req.body?.type) throw new AppError('Event type is required', 400);
  const event = await personalization.ingestEvent(req.user, req.body, req);
  res.status(201).json({ success: true, data: { event } });
});

exports.analytics = asyncHandler(async (req, res) => {
  const analytics = await personalization.analytics(req.user);
  res.json({ success: true, data: { analytics } });
});
