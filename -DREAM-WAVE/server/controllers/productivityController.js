const Workspace = require('../models/Workspace');
const ProductivityNote = require('../models/ProductivityNote');
const FocusSession = require('../models/FocusSession');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const PlannerEvent = require('../models/PlannerEvent');
const productivity = require('../services/productivityIntelligenceService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick } = require('../utils/helpers');
const { orgCreateStamp, orgListFilter, findAccessible } = require('../utils/orgScope');
const { auditFromRequest } = require('../utils/audit');

/* ——— Workspace ——— */

exports.getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await productivity.getOrCreateWorkspace(req.user);
  res.json({ success: true, data: { workspace } });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await productivity.buildWorkspaceDashboard(req.user);
  res.json({ success: true, data: dashboard });
});

exports.updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await productivity.getOrCreateWorkspace(req.user);
  Object.assign(
    workspace,
    pick(req.body, ['name', 'layout', 'theme', 'pinnedNoteIds'])
  );
  if (req.body.preferences && typeof req.body.preferences === 'object') {
    const prefs = pick(req.body.preferences, [
      'defaultView',
      'focusMinutes',
      'breakMinutes',
      'longBreakMinutes',
      'pomodorosUntilLongBreak',
      'workStartHour',
      'workEndHour',
      'quietHoursStart',
      'quietHoursEnd',
      'taskReminders',
      'goalReminders',
      'studyReminders',
      'calendarNotifications',
      'smartAlerts',
      'weekStartsOn',
    ]);
    workspace.preferences = {
      ...(workspace.preferences.toObject?.() || workspace.preferences),
      ...prefs,
    };
    workspace.markModified('preferences');
  }
  await workspace.save();
  await auditFromRequest(req, {
    action: 'workspace.update',
    resource: 'Workspace',
    resourceId: workspace._id,
  });
  res.json({ success: true, data: { workspace } });
});

exports.updateWidgets = asyncHandler(async (req, res) => {
  const workspace = await productivity.getOrCreateWorkspace(req.user);
  const widgets = Array.isArray(req.body.widgets) ? req.body.widgets : null;
  if (!widgets) throw new AppError('widgets array required', 400);
  workspace.widgets = widgets.map((w, i) => ({
    id: String(w.id || w.type || `w${i}`),
    type: w.type,
    title: w.title || '',
    visible: w.visible !== false,
    order: typeof w.order === 'number' ? w.order : i,
    size: ['sm', 'md', 'lg'].includes(w.size) ? w.size : 'md',
    config: w.config || {},
  }));
  await workspace.save();
  res.json({ success: true, data: { workspace } });
});

exports.resetWidgets = asyncHandler(async (req, res) => {
  const workspace = await productivity.getOrCreateWorkspace(req.user);
  workspace.widgets = Workspace.defaultWidgets();
  await workspace.save();
  res.json({ success: true, data: { workspace } });
});

/* ——— Tasks intelligence (extends Task model; CRUD stays on /api/tasks) ——— */

exports.prioritizeTasks = asyncHandler(async (req, res) => {
  const tasks = await productivity.prioritizeTasks(req.user, { persist: true });
  await auditFromRequest(req, {
    action: 'productivity.prioritize_tasks',
    resource: 'Task',
    resourceId: req.user._id,
  });
  res.json({ success: true, data: { tasks } });
});

exports.smartSchedule = asyncHandler(async (req, res) => {
  const result = await productivity.smartScheduleTasks(req.user, { date: req.body.date });
  await auditFromRequest(req, {
    action: 'productivity.smart_schedule',
    resource: 'PlannerEvent',
    resourceId: req.user._id,
    meta: { count: result.scheduled.length },
  });
  res.json({ success: true, data: result });
});

exports.processRecurring = asyncHandler(async (req, res) => {
  const created = await productivity.processRecurringTasks(req.user);
  res.json({ success: true, data: { created } });
});

exports.taskProgress = asyncHandler(async (req, res) => {
  const task = await findAccessible(Task, req.user, req.params.id);
  if (!task) throw new AppError('Task not found', 404);
  if (req.body.progress != null) task.progress = Math.min(100, Math.max(0, Number(req.body.progress)));
  if (req.body.loggedMinutes != null) {
    task.loggedMinutes = Math.max(0, Number(req.body.loggedMinutes));
  }
  if (task.progress === 100 && task.status !== 'done') {
    task.status = 'done';
    task.completedAt = new Date();
  }
  await task.save();
  res.json({ success: true, data: { task } });
});

exports.setDependencies = asyncHandler(async (req, res) => {
  const task = await findAccessible(Task, req.user, req.params.id);
  if (!task) throw new AppError('Task not found', 404);
  const deps = Array.isArray(req.body.dependsOn) ? req.body.dependsOn : [];
  if (deps.map(String).includes(String(task._id))) {
    throw new AppError('Task cannot depend on itself', 400);
  }
  task.dependsOn = deps;
  const blockers = await Task.find({
    _id: { $in: deps },
    status: { $ne: 'done' },
  }).select('_id');
  if (blockers.length && task.status !== 'done') task.status = 'blocked';
  else if (task.status === 'blocked') task.status = 'todo';
  await task.save();
  res.json({ success: true, data: { task } });
});

/* ——— Goals intelligence ——— */

exports.goalAnalytics = asyncHandler(async (req, res) => {
  const analytics = await productivity.goalAnalytics(req.user);
  res.json({ success: true, data: { analytics } });
});

exports.goalCategories = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  const cats = await Goal.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
    { $sort: { count: -1 } },
  ]);
  res.json({
    success: true,
    data: {
      categories: cats.map((c) => ({
        category: c._id || 'general',
        count: c.count,
        avgProgress: Math.round(c.avgProgress || 0),
      })),
    },
  });
});

/* ——— Calendar ——— */

exports.calendar = asyncHandler(async (req, res) => {
  const view = req.query.view || 'week';
  const data = await productivity.calendarView(req.user, view, {
    type: req.query.type,
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

exports.studyCalendar = asyncHandler(async (req, res) => {
  const data = await productivity.calendarView(req.user, req.query.view || 'month', {
    type: 'study',
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

exports.assignmentCalendar = asyncHandler(async (req, res) => {
  const data = await productivity.calendarView(req.user, req.query.view || 'month', {
    type: 'assignment',
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

exports.interviewCalendar = asyncHandler(async (req, res) => {
  const data = await productivity.calendarView(req.user, req.query.view || 'month', {
    type: 'interview',
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

/* ——— Notes ——— */

exports.listNotes = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user, { archived: req.query.archived === 'true' });
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = req.query.tag;
  const q = req.query.q ? String(req.query.q).slice(0, 200).trim() : '';
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { content: rx }, { tags: rx }, { category: rx }];
  }
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const [notes, total] = await Promise.all([
    ProductivityNote.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    ProductivityNote.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { notes, pagination: paginationMeta(page, limit, total) },
  });
});

exports.createNote = asyncHandler(async (req, res) => {
  const note = await ProductivityNote.create({
    ...pick(req.body, [
      'title',
      'content',
      'format',
      'category',
      'tags',
      'pinned',
      'relatedTask',
      'relatedGoal',
      'attachments',
    ]),
    ...orgCreateStamp(req.user),
  });
  await auditFromRequest(req, {
    action: 'productivity.note_create',
    resource: 'ProductivityNote',
    resourceId: note._id,
  });
  res.status(201).json({ success: true, data: { note } });
});

exports.getNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ProductivityNote, req.user, req.params.id);
  if (!note) throw new AppError('Note not found', 404);
  res.json({ success: true, data: { note } });
});

exports.updateNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ProductivityNote, req.user, req.params.id);
  if (!note) throw new AppError('Note not found', 404);
  Object.assign(
    note,
    pick(req.body, [
      'title',
      'content',
      'format',
      'category',
      'tags',
      'pinned',
      'archived',
      'relatedTask',
      'relatedGoal',
      'attachments',
    ])
  );
  await note.save();
  res.json({ success: true, data: { note } });
});

exports.removeNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ProductivityNote, req.user, req.params.id);
  if (!note) throw new AppError('Note not found', 404);
  await note.deleteOne();
  res.json({ success: true, message: 'Note deleted' });
});

exports.summarizeNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ProductivityNote, req.user, req.params.id);
  if (!note) throw new AppError('Note not found', 404);
  const updated = await productivity.summarizeNote(req.user, note, req);
  res.json({ success: true, data: { note: updated } });
});

/* ——— Focus ——— */

exports.startFocus = asyncHandler(async (req, res) => {
  const session = await productivity.startFocusSession(req.user, req.body);
  res.status(201).json({ success: true, data: { session } });
});

exports.pauseFocus = asyncHandler(async (req, res) => {
  const session = await findAccessible(FocusSession, req.user, req.params.id);
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'active') throw new AppError('Session is not active', 400);
  session.status = 'paused';
  session.pausedAt = new Date();
  await session.save();
  res.json({ success: true, data: { session } });
});

exports.resumeFocus = asyncHandler(async (req, res) => {
  const session = await findAccessible(FocusSession, req.user, req.params.id);
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'paused') throw new AppError('Session is not paused', 400);
  if (session.pausedAt) {
    session.pauseTotalMs += Date.now() - new Date(session.pausedAt).getTime();
  }
  session.pausedAt = undefined;
  session.status = 'active';
  await session.save();
  res.json({ success: true, data: { session } });
});

exports.completeFocus = asyncHandler(async (req, res) => {
  const session = await findAccessible(FocusSession, req.user, req.params.id);
  if (!session) throw new AppError('Session not found', 404);
  if (['completed', 'abandoned'].includes(session.status)) {
    throw new AppError('Session already closed', 400);
  }
  if (req.body.interruptions != null) session.interruptions = Number(req.body.interruptions) || 0;
  if (req.body.notes) session.notes = String(req.body.notes).slice(0, 2000);
  const updated = await productivity.completeFocusSession(session);
  res.json({ success: true, data: { session: updated } });
});

exports.abandonFocus = asyncHandler(async (req, res) => {
  const session = await findAccessible(FocusSession, req.user, req.params.id);
  if (!session) throw new AppError('Session not found', 404);
  session.status = 'abandoned';
  session.endedAt = new Date();
  await session.save();
  res.json({ success: true, data: { session } });
});

exports.listFocus = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  if (req.query.status) filter.status = req.query.status;
  const sessions = await FocusSession.find(filter).sort({ startedAt: -1 }).limit(50);
  res.json({ success: true, data: { sessions } });
});

exports.focusStats = asyncHandler(async (req, res) => {
  const analytics = await productivity.computeProductivityAnalytics(
    req.user,
    req.query.range || 'weekly'
  );
  const ws = await productivity.getOrCreateWorkspace(req.user);
  const dayFilter = await orgListFilter(req.user, {
    status: 'completed',
    startedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  });
  const today = await FocusSession.find(dayFilter).limit(100).lean();
  const breakRec = productivity.breakRecommendation(ws, today);
  res.json({
    success: true,
    data: {
      stats: analytics.focus,
      productivityScore: analytics.productivityScore,
      breakRecommendation: breakRec,
      todaySessions: today.length,
    },
  });
});

exports.activeFocus = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user, { status: { $in: ['active', 'paused'] } });
  const session = await FocusSession.findOne(filter).sort({ startedAt: -1 });
  res.json({ success: true, data: { session } });
});

/* ——— Analytics & AI ——— */

exports.analytics = asyncHandler(async (req, res) => {
  const range = ['daily', 'weekly', 'monthly'].includes(req.query.range)
    ? req.query.range
    : 'weekly';
  const analytics = await productivity.computeProductivityAnalytics(req.user, range);
  res.json({ success: true, data: { analytics } });
});

exports.aiDailyPlan = asyncHandler(async (req, res) => {
  const data = await productivity.aiDailyPlanner(req.user, req);
  res.json({ success: true, data });
});

exports.aiWeeklyPlan = asyncHandler(async (req, res) => {
  const data = await productivity.aiWeeklyPlanner(req.user, req);
  res.json({ success: true, data });
});

exports.aiScheduleSuggestions = asyncHandler(async (req, res) => {
  const data = await productivity.aiScheduleSuggestions(req.user, req);
  res.json({ success: true, data });
});

exports.aiGoalSuggestions = asyncHandler(async (req, res) => {
  const data = await productivity.aiGoalSuggestions(req.user, req);
  res.json({ success: true, data });
});

exports.aiTimeOptimization = asyncHandler(async (req, res) => {
  const data = await productivity.aiTimeOptimization(req.user, req);
  res.json({ success: true, data });
});

/* ——— Notifications / reminders ——— */

exports.processReminders = asyncHandler(async (req, res) => {
  const notifications = await productivity.processReminders(req.user);
  await auditFromRequest(req, {
    action: 'productivity.process_reminders',
    resource: 'Notification',
    resourceId: req.user._id,
    meta: { count: notifications.length },
  });
  res.json({ success: true, data: { notifications, count: notifications.length } });
});

exports.createReminderEvent = asyncHandler(async (req, res) => {
  if (!req.body.title?.trim() || !req.body.start) {
    throw new AppError('title and start are required', 400);
  }
  const event = await PlannerEvent.create({
    ...pick(req.body, [
      'title',
      'description',
      'start',
      'end',
      'allDay',
      'priority',
      'relatedTask',
      'relatedGoal',
      'reminderAt',
    ]),
    type: req.body.type || 'reminder',
    ...orgCreateStamp(req.user),
  });
  res.status(201).json({ success: true, data: { event } });
});
