const Notification = require('../models/Notification');
const { UserBook } = require('../models/Book');
const Roadmap = require('../models/Roadmap');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getUserStats(req.user._id);
  stats.streak = req.user.streak;
  stats.level = req.user.level;
  stats.credits = req.user.credits;
  stats.name = req.user.name;
  let personalization = null;
  let productivity = null;
  try {
    const personalizationSvc = require('../services/personalizationIntelligenceService');
    const profile = await personalizationSvc.getOrCreateProfile(req.user);
    personalization = {
      engagement: profile.engagement,
      sync: profile.sync,
      nextBest: profile.nextBest,
    };
  } catch {
    /* optional */
  }
  try {
    const productivitySvc = require('../services/productivityIntelligenceService');
    productivity = await productivitySvc.computeProductivityAnalytics(req.user, 'weekly', {
      baseStats: stats,
    });
  } catch {
    /* optional */
  }
  res.json({ success: true, data: { stats, personalization, productivity } });
});

exports.getProgress = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getUserStats(req.user._id);
  const [library, roadmaps] = await Promise.all([
    UserBook.find({ user: req.user._id }).select('status readingProgress').limit(200).lean(),
    Roadmap.find({ user: req.user._id }).select('title progress status career').limit(50).lean(),
  ]);
  const booksReading = library.filter((b) => b.status === 'reading').length;
  const booksDone = library.filter((b) => b.status === 'done').length;
  const avgBookProgress = library.length
    ? Math.round(library.reduce((s, b) => s + (b.readingProgress || 0), 0) / library.length)
    : 0;

  const overall = Math.round(
    (stats.avgGoalProgress +
      stats.roadmapProgress +
      stats.avgSkillMastery +
      (stats.tasksTotal
        ? Math.round((stats.tasksDone / stats.tasksTotal) * 100)
        : 0) +
      avgBookProgress) /
      5
  );

  res.json({
    success: true,
    data: {
      progress: {
        overall,
        goals: {
          active: stats.goalsActive,
          completed: stats.goalsCompleted,
          avgProgress: stats.avgGoalProgress,
        },
        tasks: {
          done: stats.tasksDone,
          todo: stats.tasksTodo,
          overdue: stats.tasksOverdue,
          completedThisWeek: stats.tasksCompletedThisWeek,
          weeklyActivity: stats.weeklyActivity,
        },
        learning: {
          skills: stats.skillsCount,
          avgMastery: stats.avgSkillMastery,
          studyPlans: stats.studyPlans,
          learningStreak: req.user.learningStreak || 0,
          certificates: (req.user.certificates || []).length,
        },
        roadmaps: roadmaps.map((r) => ({
          id: r._id,
          title: r.title,
          career: r.career,
          progress: r.progress,
          status: r.status,
        })),
        books: {
          reading: booksReading,
          done: booksDone,
          avgProgress: avgBookProgress,
          librarySize: library.length,
        },
        habitsActive: stats.habitsActive,
        reports: stats.reports,
        streak: req.user.streak || 0,
        level: req.user.level || 1,
        credits: req.user.credits || 0,
      },
    },
  });
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getUserStats(req.user._id);
  let nextBest = [];
  try {
    const personalizationSvc = require('../services/personalizationIntelligenceService');
    const profile = await personalizationSvc.getOrCreateProfile(req.user);
    nextBest = Array.isArray(profile.nextBest) ? profile.nextBest.slice(0, 3) : [];
  } catch {
    /* optional */
  }
  const suggestions = await aiService.suggestActions({
    ...stats,
    nextBestActions: nextBest,
  });
  res.json({ success: true, data: { suggestions, nextBest } });
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, data: { notifications, unread } });
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, data: { notification: n } });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked read' });
});

exports.removeNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ success: true, message: 'Notification deleted' });
});

exports.clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ user: req.user._id, read: true });
  res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
});
