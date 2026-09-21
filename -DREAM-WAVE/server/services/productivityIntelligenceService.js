const Task = require('../models/Task');
const Goal = require('../models/Goal');
const PlannerEvent = require('../models/PlannerEvent');
const Habit = require('../models/Habit');
const Workspace = require('../models/Workspace');
const ProductivityNote = require('../models/ProductivityNote');
const FocusSession = require('../models/FocusSession');
const Notification = require('../models/Notification');
const aiService = require('./aiService');
const analyticsService = require('./analyticsService');
const { orgListFilter } = require('../utils/orgScope');
const { runWithAiCredit } = require('./entitlements');
const { auditFromRequest } = require('../utils/audit');

let LearningProgress;
try {
  LearningProgress = require('../models/LearningProgress');
} catch {
  LearningProgress = null;
}

const PRIORITY_WEIGHT = { high: 30, medium: 18, low: 8 };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function scoreTask(task, now = new Date(), incompleteDepIds = null) {
  let score = PRIORITY_WEIGHT[task.priority] || 12;
  if (task.dueDate) {
    const hours = (new Date(task.dueDate) - now) / 36e5;
    if (hours < 0) score += 40;
    else if (hours < 24) score += 28;
    else if (hours < 72) score += 18;
    else if (hours < 168) score += 10;
  }
  if (task.status === 'in_progress') score += 12;
  if (task.status === 'blocked') score -= 20;
  if (task.dependsOn?.length) {
    const deps = task.dependsOn.map(String);
    const unresolved = incompleteDepIds
      ? deps.filter((id) => incompleteDepIds.has(id)).length
      : 0;
    if (incompleteDepIds) {
      if (unresolved > 0) score -= Math.min(15, unresolved * 5);
      else score += 6;
    }
  }
  if (task.goal) score += 8;
  if (task.estimatedMinutes > 0 && task.estimatedMinutes <= 30) score += 5;
  if ((task.progress || 0) >= 50 && task.status !== 'done') score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function nextOccurrence(from, frequency, interval = 1) {
  const d = new Date(from);
  const n = Math.max(1, interval || 1);
  if (frequency === 'daily') d.setDate(d.getDate() + n);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7 * n);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + n);
  else return null;
  return d;
}

async function getOrCreateWorkspace(user) {
  let ws = await Workspace.findOne({ user: user._id });
  if (!ws) {
    ws = await Workspace.create({
      user: user._id,
      organizationId: user.organizationId || null,
      widgets: Workspace.defaultWidgets(),
      preferences: {
        focusMinutes: user.preferences?.focusMinutes || 25,
      },
    });
  }
  return ws;
}

async function buildWorkspaceDashboard(user) {
  const filter = await orgListFilter(user);
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(dayStart, 7));

  const [workspace, tasks, goals, events, notes, focusActive, focusToday, habits] =
    await Promise.all([
      getOrCreateWorkspace(user),
      Task.find({ ...filter, status: { $ne: 'done' } })
        .sort({ aiPriorityScore: -1, dueDate: 1 })
        .limit(12)
        .lean(),
      Goal.find({ ...filter, status: 'active' }).sort({ priority: -1, targetDate: 1 }).limit(8).lean(),
      PlannerEvent.find({ ...filter, start: { $gte: dayStart, $lte: weekEnd } })
        .sort({ start: 1 })
        .limit(40)
        .lean(),
      ProductivityNote.find({ ...filter, archived: false })
        .sort({ pinned: -1, updatedAt: -1 })
        .limit(8)
        .lean(),
      FocusSession.findOne({ ...filter, status: { $in: ['active', 'paused'] } }).sort({
        startedAt: -1,
      }),
      FocusSession.find({
        ...filter,
        status: 'completed',
        startedAt: { $gte: dayStart, $lte: dayEnd },
      })
        .limit(100)
        .lean(),
      Habit.find({ ...filter, active: true }).limit(10).lean(),
    ]);

  workspace.lastOpenedAt = now;
  await workspace.save();

  const focusMinutesToday = focusToday.reduce((s, f) => s + (f.actualMinutes || 0), 0);
  const analytics = await computeProductivityAnalytics(user, 'weekly');

  return {
    workspace,
    widgets: (workspace.widgets || []).filter((w) => w.visible).sort((a, b) => a.order - b.order),
    snapshot: {
      openTasks: tasks.length,
      activeGoals: goals.length,
      eventsThisWeek: events.length,
      focusMinutesToday,
      productivityScore: analytics.productivityScore,
      activeFocus: focusActive,
    },
    tasks,
    goals,
    events,
    notes,
    habits,
    analytics: {
      productivityScore: analytics.productivityScore,
      daily: analytics.daily,
      focus: analytics.focus,
      goalCompletion: analytics.goalCompletion,
    },
  };
}

async function prioritizeTasks(user, { persist = true } = {}) {
  const filter = await orgListFilter(user, { status: { $ne: 'done' } });
  const tasks = await Task.find(filter)
    .select('title priority status dueDate estimatedMinutes dependsOn goal progress aiPriorityScore aiPriorityReason')
    .limit(500)
    .lean();
  const now = new Date();
  const depIds = [...new Set(tasks.flatMap((t) => (t.dependsOn || []).map(String)))];
  const incompleteDeps = depIds.length
    ? await Task.find({ _id: { $in: depIds }, status: { $ne: 'done' } }).select('_id').lean()
    : [];
  const incompleteDepIds = new Set(incompleteDeps.map((d) => String(d._id)));
  const scored = [];
  const bulk = [];
  for (const task of tasks) {
    const score = scoreTask(task, now, incompleteDepIds);
    const unresolved = (task.dependsOn || []).filter((id) => incompleteDepIds.has(String(id))).length;
    const reason =
      unresolved > 0
        ? 'Blocked by unfinished dependencies'
        : score >= 70
          ? 'Urgent due date or high priority'
          : score >= 45
            ? 'Important active work'
            : 'Lower urgency — schedule when capacity allows';
    if (persist) {
      bulk.push({
        updateOne: {
          filter: { _id: task._id },
          update: { $set: { aiPriorityScore: score, aiPriorityReason: reason } },
        },
      });
    }
    scored.push({
      _id: task._id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      aiPriorityScore: score,
      aiPriorityReason: reason,
      estimatedMinutes: task.estimatedMinutes,
    });
  }
  if (persist && bulk.length) {
    await Task.bulkWrite(bulk, { ordered: false });
  }
  scored.sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  return scored;
}

async function smartScheduleTasks(user, { date } = {}) {
  const ws = await getOrCreateWorkspace(user);
  const day = date ? startOfDay(new Date(date)) : startOfDay();
  const startHour = ws.preferences?.workStartHour ?? 9;
  const endHour = ws.preferences?.workEndHour ?? 18;
  const focusBlock = ws.preferences?.focusMinutes || 25;

  const prioritized = await prioritizeTasks(user, { persist: true });
  const filter = await orgListFilter(user);
  const existing = await PlannerEvent.find({
    ...filter,
    start: { $gte: day, $lte: endOfDay(day) },
  }).lean();

  const busy = existing.map((e) => ({
    start: new Date(e.start).getTime(),
    end: new Date(e.end || e.start).getTime() + (e.end ? 0 : focusBlock * 6e4),
  }));

  const slots = [];
  let cursor = new Date(day);
  cursor.setHours(startHour, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(endHour, 0, 0, 0);

  const scheduled = [];
  for (const t of prioritized.slice(0, 8)) {
    const mins = Math.max(focusBlock, t.estimatedMinutes || focusBlock);
    let placed = null;
    while (cursor.getTime() + mins * 6e4 <= dayEnd.getTime()) {
      const s = cursor.getTime();
      const e = s + mins * 6e4;
      const overlap = busy.some((b) => s < b.end && e > b.start);
      if (!overlap) {
        placed = { start: new Date(s), end: new Date(e) };
        busy.push({ start: s, end: e });
        cursor = new Date(e + 5 * 6e4);
        break;
      }
      cursor = new Date(cursor.getTime() + 15 * 6e4);
    }
    if (!placed) break;

    const task = await Task.findById(t._id);
    if (task) {
      task.scheduledAt = placed.start;
      if (task.status === 'todo') task.status = 'in_progress';
      await task.save();
    }

    const event = await PlannerEvent.create({
      user: user._id,
      organizationId: user.organizationId || null,
      title: `Work: ${t.title}`,
      type: 'task',
      start: placed.start,
      end: placed.end,
      priority: t.priority,
      relatedTask: t._id,
      reminderAt: new Date(placed.start.getTime() - 15 * 6e4),
    });
    scheduled.push({ task: t, event, slot: placed });
    slots.push(placed);
  }

  return { date: day, scheduled, slots, remaining: prioritized.slice(scheduled.length) };
}

async function processRecurringTasks(user) {
  const filter = await orgListFilter(user, {
    'recurrence.enabled': true,
    status: 'done',
  });
  const horizon = addDays(new Date(), 1);
  const tasks = await Task.find({
    ...filter,
    $or: [
      { 'recurrence.nextOccurrence': { $lte: horizon } },
      { 'recurrence.nextOccurrence': null },
      { 'recurrence.nextOccurrence': { $exists: false } },
    ],
  })
    .limit(50)
    .lean();
  const created = [];
  const inserts = [];
  const updates = [];
  for (const task of tasks) {
    const freq = task.recurrence?.frequency;
    if (!freq || freq === 'none') continue;
    const next =
      task.recurrence.nextOccurrence ||
      nextOccurrence(task.completedAt || task.dueDate || new Date(), freq, task.recurrence.interval);
    if (!next) continue;
    if (task.recurrence.endDate && next > task.recurrence.endDate) continue;
    if (next > horizon) continue;

    inserts.push({
      user: task.user,
      organizationId: task.organizationId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'todo',
      dueDate: next,
      estimatedMinutes: task.estimatedMinutes,
      goal: task.goal,
      tags: task.tags,
      dependsOn: [],
      recurrence: {
        enabled: true,
        frequency: freq,
        interval: task.recurrence.interval || 1,
        nextOccurrence: nextOccurrence(next, freq, task.recurrence.interval),
        endDate: task.recurrence.endDate || null,
      },
    });
    updates.push({
      updateOne: {
        filter: { _id: task._id },
        update: {
          $set: {
            'recurrence.enabled': false,
            'recurrence.nextOccurrence': nextOccurrence(next, freq, task.recurrence.interval),
          },
        },
      },
    });
  }
  if (inserts.length) {
    const docs = await Task.insertMany(inserts, { ordered: false });
    created.push(...docs);
  }
  if (updates.length) {
    await Task.bulkWrite(updates, { ordered: false });
  }
  return created;
}

async function goalAnalytics(user, goalsInput = null) {
  const goals =
    goalsInput ||
    (await Goal.find(await orgListFilter(user))
      .select('category status progress milestones')
      .limit(200)
      .lean());
  const byCategory = {};
  let completed = 0;
  let active = 0;
  let paused = 0;
  let avgProgress = 0;
  let milestonesTotal = 0;
  let milestonesDone = 0;

  for (const g of goals) {
    byCategory[g.category || 'general'] = (byCategory[g.category || 'general'] || 0) + 1;
    if (g.status === 'completed') completed += 1;
    else if (g.status === 'paused') paused += 1;
    else active += 1;
    avgProgress += g.progress || 0;
    for (const m of g.milestones || []) {
      milestonesTotal += 1;
      if (m.completed) milestonesDone += 1;
    }
  }

  return {
    total: goals.length,
    completed,
    active,
    paused,
    avgProgress: goals.length ? Math.round(avgProgress / goals.length) : 0,
    byCategory,
    milestones: { total: milestonesTotal, done: milestonesDone },
    completionRate: goals.length ? Math.round((completed / goals.length) * 100) : 0,
  };
}

async function computeProductivityAnalytics(user, range = 'weekly', { baseStats = null } = {}) {
  const now = new Date();
  let from = startOfDay(now);
  if (range === 'weekly') from = startOfDay(addDays(now, -6));
  else if (range === 'monthly') from = startOfDay(addDays(now, -29));
  else if (range === 'daily') from = startOfDay(now);

  const filter = await orgListFilter(user);
  const [tasks, goals, events, sessions, learning, resolvedStats] = await Promise.all([
    Task.find({ ...filter, $or: [{ createdAt: { $gte: from } }, { completedAt: { $gte: from } }] })
      .select('status completedAt createdAt priority')
      .limit(500)
      .lean(),
    Goal.find(filter).select('category status progress milestones').limit(200).lean(),
    PlannerEvent.find({ ...filter, start: { $gte: from, $lte: now } })
      .select('type start end')
      .limit(300)
      .lean(),
    FocusSession.find({ ...filter, startedAt: { $gte: from, $lte: now } })
      .select('status actualMinutes productivityScore')
      .limit(200)
      .lean(),
    LearningProgress
      ? LearningProgress.find({
          user: user._id,
          updatedAt: { $gte: from },
        })
          .select('percent completed kind updatedAt')
          .limit(200)
          .lean()
      : Promise.resolve([]),
    baseStats ? Promise.resolve(baseStats) : analyticsService.getUserStats(user._id),
  ]);
  const stats = resolvedStats;

  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksTotal = tasks.length || stats.tasksTotal || 0;
  const focusMinutes = sessions
    .filter((s) => s.status === 'completed')
    .reduce((s, x) => s + (x.actualMinutes || 0), 0);
  const studyEvents = events.filter((e) => e.type === 'study' || e.type === 'assignment');
  const studyMinutes = studyEvents.reduce((s, e) => {
    if (!e.end) return s + 30;
    return s + Math.max(0, (new Date(e.end) - new Date(e.start)) / 6e4);
  }, 0);

  const goalCompletion = await goalAnalytics(user, goals);
  const avgFocusScore =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((s, x) => s + (x.productivityScore || 0), 0) / sessions.length
        )
      : 0;

  const taskRate = tasksTotal ? Math.round((tasksDone / Math.max(tasksTotal, 1)) * 100) : 0;
  const productivityScore = Math.round(
    taskRate * 0.35 +
      goalCompletion.avgProgress * 0.25 +
      Math.min(100, focusMinutes / 2) * 0.25 +
      avgFocusScore * 0.15
  );

  const dailyMap = {};
  for (let i = 0; i < (range === 'monthly' ? 30 : range === 'weekly' ? 7 : 1); i++) {
    const d = startOfDay(addDays(now, -i));
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { date: key, tasksDone: 0, focusMinutes: 0, events: 0 };
  }
  for (const t of tasks) {
    if (t.status === 'done' && t.completedAt) {
      const key = startOfDay(t.completedAt).toISOString().slice(0, 10);
      if (dailyMap[key]) dailyMap[key].tasksDone += 1;
    }
  }
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = startOfDay(s.startedAt).toISOString().slice(0, 10);
    if (dailyMap[key]) dailyMap[key].focusMinutes += s.actualMinutes || 0;
  }
  for (const e of events) {
    const key = startOfDay(e.start).toISOString().slice(0, 10);
    if (dailyMap[key]) dailyMap[key].events += 1;
  }

  return {
    range,
    from,
    to: now,
    productivityScore,
    daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
    tasks: { done: tasksDone, total: tasksTotal, rate: taskRate },
    goals: goalCompletion,
    goalCompletion: goalCompletion.completionRate,
    focus: {
      sessions: sessions.filter((s) => s.status === 'completed').length,
      minutes: Math.round(focusMinutes),
      avgScore: avgFocusScore,
      interruptions: sessions.reduce((s, x) => s + (x.interruptions || 0), 0),
    },
    learningTime: {
      studyMinutes: Math.round(studyMinutes),
      learningUpdates: learning.length,
    },
    calendar: {
      events: events.length,
      study: studyEvents.length,
      interviews: events.filter((e) => e.type === 'interview').length,
      assignments: events.filter((e) => e.type === 'assignment').length,
    },
  };
}

function breakRecommendation(ws, sessionsToday) {
  const focusMin = ws.preferences?.focusMinutes || 25;
  const breakMin = ws.preferences?.breakMinutes || 5;
  const longBreak = ws.preferences?.longBreakMinutes || 15;
  const untilLong = ws.preferences?.pomodorosUntilLongBreak || 4;
  const count = sessionsToday.length;
  if (count > 0 && count % untilLong === 0) {
    return {
      type: 'long',
      minutes: longBreak,
      message: `You've completed ${count} sessions — take a ${longBreak}-minute long break.`,
    };
  }
  return {
    type: 'short',
    minutes: breakMin,
    message: `After ${focusMin} minutes of focus, take a ${breakMin}-minute break.`,
    nextPomodoroIn: untilLong - (count % untilLong),
  };
}

async function startFocusSession(user, body = {}) {
  const ws = await getOrCreateWorkspace(user);
  const filter = await orgListFilter(user, { status: { $in: ['active', 'paused'] } });
  const existing = await FocusSession.findOne(filter);
  if (existing) return existing;

  const session = await FocusSession.create({
    user: user._id,
    organizationId: user.organizationId || null,
    title: body.title || 'Focus session',
    mode: body.mode || 'pomodoro',
    plannedMinutes: body.plannedMinutes || ws.preferences?.focusMinutes || 25,
    breakMinutes: body.breakMinutes || ws.preferences?.breakMinutes || 5,
    relatedTask: body.relatedTask || null,
    relatedGoal: body.relatedGoal || null,
    notes: body.notes || '',
  });

  if (body.relatedTask) {
    await PlannerEvent.create({
      user: user._id,
      organizationId: user.organizationId || null,
      title: `Focus: ${session.title}`,
      type: 'focus',
      start: session.startedAt,
      end: new Date(session.startedAt.getTime() + session.plannedMinutes * 6e4),
      relatedTask: body.relatedTask,
      relatedGoal: body.relatedGoal || undefined,
    });
  }

  return session;
}

async function completeFocusSession(session) {
  const now = new Date();
  let elapsed = now - new Date(session.startedAt) - (session.pauseTotalMs || 0);
  if (session.status === 'paused' && session.pausedAt) {
    elapsed -= now - new Date(session.pausedAt);
  }
  const actualMinutes = Math.max(1, Math.round(elapsed / 6e4));
  session.actualMinutes = actualMinutes;
  session.endedAt = now;
  session.status = 'completed';
  const ratio = Math.min(1.2, actualMinutes / Math.max(1, session.plannedMinutes));
  const interruptPenalty = Math.min(30, (session.interruptions || 0) * 8);
  session.productivityScore = Math.max(0, Math.min(100, Math.round(ratio * 100 - interruptPenalty)));
  await session.save();

  if (session.relatedTask) {
    const task = await Task.findById(session.relatedTask);
    if (task) {
      task.loggedMinutes = (task.loggedMinutes || 0) + actualMinutes;
      if (task.status === 'todo') task.status = 'in_progress';
      if (task.estimatedMinutes > 0) {
        task.progress = Math.min(
          100,
          Math.round((task.loggedMinutes / task.estimatedMinutes) * 100)
        );
      }
      await task.save();
    }
  }

  try {
    const { safeEmit } = require('../utils/platformEvents');
    const User = require('../models/User');
    const user = await User.findById(session.user);
    if (user) {
      await safeEmit(user, {
        type: 'focus_completed',
        module: 'productivity',
        title: session.title,
        refType: 'FocusSession',
        refId: session._id,
        payload: {
          actualMinutes,
          productivityScore: session.productivityScore,
          mode: session.mode,
        },
      });
    }
  } catch {
    /* non-blocking */
  }

  return session;
}

async function calendarView(user, view = 'week', { type, from, to } = {}) {
  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);
  if (view === 'week') {
    const dow = start.getDay();
    start = startOfDay(addDays(start, -dow));
    end = endOfDay(addDays(start, 6));
  } else if (view === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }
  if (from) start = new Date(from);
  if (to) end = new Date(to);

  const filter = await orgListFilter(user, { start: { $gte: start, $lte: end } });
  if (type) filter.type = type;
  const events = await PlannerEvent.find(filter).sort({ start: 1 }).limit(500).lean();

  const byType = {};
  for (const e of events) {
    byType[e.type] = byType[e.type] || [];
    byType[e.type].push(e);
  }

  return {
    view,
    from: start,
    to: end,
    events,
    study: byType.study || [],
    assignment: byType.assignment || [],
    interview: byType.interview || [],
    focus: byType.focus || [],
    reminder: byType.reminder || [],
    byType,
  };
}

async function processReminders(user) {
  const ws = await getOrCreateWorkspace(user);
  const prefs = ws.preferences || {};
  const now = new Date();
  const windowEnd = addDays(now, 1);
  const filter = await orgListFilter(user);
  const created = [];

  if (prefs.taskReminders !== false) {
    const dueTasks = await Task.find({
      ...filter,
      status: { $ne: 'done' },
      dueDate: { $gte: now, $lte: windowEnd },
    }).limit(20);
    for (const t of dueTasks) {
      const note = await Notification.create({
        user: user._id,
        title: 'Task reminder',
        message: `"${t.title}" is due soon`,
        type: 'task',
        link: '/tasks',
      });
      created.push(note);
    }
  }

  if (prefs.goalReminders !== false) {
    const goals = await Goal.find({
      ...filter,
      status: 'active',
      targetDate: { $gte: now, $lte: addDays(now, 3) },
    }).limit(10);
    for (const g of goals) {
      created.push(
        await Notification.create({
          user: user._id,
          title: 'Goal reminder',
          message: `"${g.title}" target date is approaching (${g.progress}% done)`,
          type: 'goal',
          link: '/goals',
        })
      );
    }
  }

  if (prefs.calendarNotifications !== false) {
    const events = await PlannerEvent.find({
      ...filter,
      reminderSent: { $ne: true },
      $or: [
        { reminderAt: { $lte: now, $gte: addDays(now, -1) } },
        { start: { $gte: now, $lte: addDays(now, 0.04) } },
      ],
    }).limit(20);
    for (const e of events) {
      const nType =
        e.type === 'study' || e.type === 'assignment'
          ? 'study'
          : e.type === 'interview'
            ? 'calendar'
            : 'calendar';
      created.push(
        await Notification.create({
          user: user._id,
          title: 'Calendar reminder',
          message: `"${e.title}" starts ${new Date(e.start).toLocaleString()}`,
          type: nType,
          link: '/productivity',
        })
      );
      e.reminderSent = true;
      await e.save();
    }
  }

  if (prefs.studyReminders !== false) {
    const study = await PlannerEvent.find({
      ...filter,
      type: { $in: ['study', 'assignment'] },
      start: { $gte: now, $lte: addDays(now, 1) },
      completed: false,
    }).limit(10);
    for (const e of study) {
      created.push(
        await Notification.create({
          user: user._id,
          title: 'Study reminder',
          message: `Upcoming ${e.type}: "${e.title}"`,
          type: 'study',
          link: '/planner',
        })
      );
    }
  }

  if (prefs.smartAlerts !== false) {
    const analytics = await computeProductivityAnalytics(user, 'daily');
    if (analytics.productivityScore < 40 && analytics.focus.minutes < 25) {
      created.push(
        await Notification.create({
          user: user._id,
          title: 'Smart productivity alert',
          message: 'Focus time is low today — start a 25-minute Pomodoro to recover your score.',
          type: 'productivity',
          link: '/productivity',
        })
      );
    }
  }

  return created;
}

async function aiDailyPlanner(user, req) {
  const prioritized = await prioritizeTasks(user, { persist: true });
  const cal = await calendarView(user, 'day');
  const prompt = `Build an AI daily planner. Top tasks: ${prioritized
    .slice(0, 8)
    .map((t) => `${t.title} (score ${t.aiPriorityScore}, ${t.priority})`)
    .join('; ') || 'none'}. Existing events: ${cal.events
    .map((e) => `${e.title}@${new Date(e.start).toISOString()}`)
    .join('; ') || 'none'}.`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('daily', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'daily',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );
  if (req) {
    await auditFromRequest(req, {
      action: 'productivity.ai_daily_plan',
      resource: 'Workspace',
      resourceId: user._id,
    });
  }
  return { plan: ai.content, prioritized: prioritized.slice(0, 8), events: cal.events, provider: ai.provider };
}

async function aiWeeklyPlanner(user, req) {
  const goals = await Goal.find(await orgListFilter(user, { status: 'active' }))
    .limit(8)
    .lean();
  const analytics = await computeProductivityAnalytics(user, 'weekly');
  const prompt = `Create a weekly productivity plan. Goals: ${goals
    .map((g) => `${g.title} (${g.progress}%)`)
    .join('; ') || 'none'}. Last week score: ${analytics.productivityScore}. Focus minutes: ${analytics.focus.minutes}.`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('time', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'time',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );
  if (req) {
    await auditFromRequest(req, {
      action: 'productivity.ai_weekly_plan',
      resource: 'Workspace',
      resourceId: user._id,
    });
  }
  return { plan: ai.content, goals, analytics, provider: ai.provider };
}

async function aiGoalSuggestions(user, req) {
  const ga = await goalAnalytics(user);
  const tasks = await Task.find(await orgListFilter(user, { status: { $ne: 'done' } }))
    .limit(10)
    .lean();
  const prompt = `Suggest 3 SMART goals. Category mix: ${JSON.stringify(ga.byCategory)}. Open tasks: ${tasks
    .map((t) => t.title)
    .join(', ') || 'none'}. Career: ${user.targetCareer || 'general growth'}.`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('goals', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'goals',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );

  const suggestions = [
    {
      title: `Advance ${user.targetCareer || 'core skills'}`,
      category: 'learning',
      priority: 'high',
      milestones: ['Define weekly practice', 'Ship one portfolio artifact', 'Review progress'],
    },
    {
      title: 'Protect deep work blocks',
      category: 'personal',
      priority: 'medium',
      milestones: ['Schedule 4 focus sessions', 'Reduce context switching', 'Track focus score'],
    },
    {
      title: 'Clear priority backlog',
      category: 'project',
      priority: 'high',
      milestones: ['Triage open tasks', 'Finish top 3 MITs', 'Archive stale items'],
    },
  ];

  if (req) {
    await auditFromRequest(req, {
      action: 'productivity.ai_goal_suggestions',
      resource: 'Goal',
      resourceId: user._id,
    });
  }
  return { content: ai.content, suggestions, analytics: ga, provider: ai.provider };
}

async function aiScheduleSuggestions(user, req) {
  const schedule = await smartScheduleTasks(user);
  const prompt = `Optimize this schedule for energy and deadlines: ${schedule.scheduled
    .map((s) => `${s.task.title} @ ${s.slot.start.toISOString()}`)
    .join('; ') || 'empty'}.`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('time', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'time',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );
  if (req) {
    await auditFromRequest(req, {
      action: 'productivity.ai_schedule',
      resource: 'PlannerEvent',
      resourceId: user._id,
    });
  }
  return { content: ai.content, schedule, provider: ai.provider };
}

async function aiTimeOptimization(user, req) {
  const analytics = await computeProductivityAnalytics(user, 'weekly');
  const ws = await getOrCreateWorkspace(user);
  const prompt = `Optimize time usage. Score ${analytics.productivityScore}, focus ${analytics.focus.minutes}m, task rate ${analytics.tasks.rate}%, work hours ${ws.preferences.workStartHour}-${ws.preferences.workEndHour}.`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('time', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'time',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );
  return {
    content: ai.content,
    provider: ai.provider,
    recommendations: [
      `Protect ${ws.preferences.focusMinutes || 25}m deep-work blocks before noon`,
      `Batch admin tasks after ${Math.min(17, (ws.preferences.workEndHour || 18) - 1)}:00`,
      analytics.focus.minutes < 100
        ? 'Increase weekly focus to at least 100 minutes'
        : 'Maintain current focus cadence',
      analytics.tasks.rate < 50
        ? 'Cut WIP — finish top 3 prioritized tasks before adding new ones'
        : 'Keep completion rate above 50%',
    ],
    analytics,
  };
}

async function summarizeNote(user, note, req) {
  const text = (note.content || '').slice(0, 6000);
  const prompt = `Summarize this note in 3-5 bullet points. Title: ${note.title}\n\n${text}`;
  const ai = await runWithAiCredit(
    user,
    1,
    () => aiService.runMode('notes', [{ role: 'user', content: prompt }]),
    (r) => ({
      mode: 'notes',
      model: r.model,
      source: 'productivity',
      promptChars: prompt.length,
      replyChars: (r.content || '').length,
      success: true,
      errorCode: r.recovered ? 'recovered_fallback' : '',
    })
  );
  note.aiSummary = ai.content;
  await note.save();
  if (req) {
    await auditFromRequest(req, {
      action: 'productivity.note_summary',
      resource: 'ProductivityNote',
      resourceId: note._id,
    });
  }
  return note;
}

module.exports = {
  getOrCreateWorkspace,
  buildWorkspaceDashboard,
  prioritizeTasks,
  smartScheduleTasks,
  processRecurringTasks,
  goalAnalytics,
  computeProductivityAnalytics,
  breakRecommendation,
  startFocusSession,
  completeFocusSession,
  calendarView,
  processReminders,
  aiDailyPlanner,
  aiWeeklyPlanner,
  aiGoalSuggestions,
  aiScheduleSuggestions,
  aiTimeOptimization,
  summarizeNote,
  scoreTask,
  nextOccurrence,
};
