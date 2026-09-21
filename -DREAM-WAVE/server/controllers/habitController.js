const Habit = require('../models/Habit');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick } = require('../utils/helpers');
const { orgCreateStamp, orgListFilter, findMutable } = require('../utils/orgScope');

exports.list = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user, { active: true });
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [habits, total] = await Promise.all([
    Habit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Habit.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { habits, pagination: paginationMeta(page, limit, total) },
  });
});

exports.create = asyncHandler(async (req, res) => {
  const habit = await Habit.create({
    ...pick(req.body, ['title', 'description', 'frequency', 'targetPerWeek', 'color']),
    ...orgCreateStamp(req.user),
  });
  res.status(201).json({ success: true, data: { habit } });
});

exports.update = asyncHandler(async (req, res) => {
  const habit = await findMutable(Habit, req.user, req.params.id);
  if (!habit) throw new AppError('Habit not found', 404);
  Object.assign(habit, pick(req.body, ['title', 'description', 'frequency', 'targetPerWeek', 'color', 'active']));
  await habit.save();
  res.json({ success: true, data: { habit } });
});

exports.toggleToday = asyncHandler(async (req, res) => {
  const habit = await findMutable(Habit, req.user, req.params.id);
  if (!habit) throw new AppError('Habit not found', 404);
  const today = new Date().toISOString().slice(0, 10);
  const existing = habit.completions.find((c) => c.date === today);
  if (existing) {
    existing.completed = !existing.completed;
  } else {
    habit.completions.push({ date: today, completed: true });
  }
  let streak = 0;
  const sorted = [...habit.completions]
    .filter((c) => c.completed)
    .map((c) => c.date)
    .sort()
    .reverse();
  const cursor = new Date();
  for (const d of sorted) {
    const expected = cursor.toISOString().slice(0, 10);
    if (d === expected) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d < expected) break;
  }
  habit.streak = streak;
  const prevBest = habit.bestStreak || 0;
  habit.bestStreak = Math.max(prevBest, streak);
  await habit.save();
  if (streak > 0 && (streak === 7 || streak === 30 || (streak > prevBest && streak % 7 === 0))) {
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: 'habit_milestone',
      module: 'productivity',
      title: `${habit.title} streak ${streak}`,
      refType: 'Habit',
      refId: habit._id,
      payload: { streak, bestStreak: habit.bestStreak },
    });
  }
  res.json({ success: true, data: { habit } });
});

exports.remove = asyncHandler(async (req, res) => {
  const habit = await findMutable(Habit, req.user, req.params.id);
  if (!habit) throw new AppError('Habit not found', 404);
  habit.active = false;
  await habit.save();
  res.json({ success: true, message: 'Habit archived' });
});
