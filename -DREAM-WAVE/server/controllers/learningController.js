const Skill = require('../models/Skill');
const StudyPlan = require('../models/StudyPlan');
const Quiz = require('../models/Quiz');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick } = require('../utils/helpers');
const crypto = require('crypto');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { orgCreateStamp, orgListFilter, findAccessible } = require('../utils/orgScope');

exports.dashboard = asyncHandler(async (req, res) => {
  const [skillFilter, planFilter, quizFilter] = await Promise.all([
    orgListFilter(req.user),
    orgListFilter(req.user, { status: 'active' }),
    orgListFilter(req.user),
  ]);
  const [skills, plans, quizzes] = await Promise.all([
    Skill.find(skillFilter).sort({ mastery: 1 }).limit(100).lean(),
    StudyPlan.find(planFilter).sort({ updatedAt: -1 }).limit(50).lean(),
    Quiz.find(quizFilter).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const gaps = skills.filter((s) => s.mastery < (s.targetMastery || 80)).slice(0, 5);
  const revisions = skills
    .filter((s) => s.revisionDue && new Date(s.revisionDue) <= new Date())
    .slice(0, 5);
  const recommendations = gaps.map(
    (s) => `Practice ${s.name} (${s.mastery}% mastery) — aim for ${s.targetMastery}%`
  );
  if (!recommendations.length) {
    recommendations.push('Add skills to unlock personalized gap analysis.');
  }
  res.json({
    success: true,
    data: {
      skills,
      plans,
      quizzes,
      gaps,
      revisions,
      recommendations,
      learningStreak: req.user.learningStreak || 0,
      certificates: req.user.certificates || [],
    },
  });
});

exports.listSkills = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [skills, total] = await Promise.all([
    Skill.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Skill.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { skills, pagination: paginationMeta(page, limit, total) },
  });
});

exports.upsertSkill = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['name', 'category', 'level', 'mastery', 'targetMastery', 'notes']);
  if (!data.name) throw new AppError('Skill name required', 400);
  const stamp = orgCreateStamp(req.user);
  const skill = await Skill.findOneAndUpdate(
    { user: req.user._id, name: data.name },
    {
      ...data,
      ...stamp,
      lastPracticed: new Date(),
      revisionDue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = req.user.lastStudyDate ? new Date(req.user.lastStudyDate) : null;
  if (last) last.setHours(0, 0, 0, 0);
  if (!last) req.user.learningStreak = 1;
  else {
    const diff = Math.round((today - last) / 86400000);
    if (diff === 1) req.user.learningStreak = (req.user.learningStreak || 0) + 1;
    else if (diff > 1) req.user.learningStreak = 1;
  }
  req.user.lastStudyDate = new Date();
  let earnedCert = null;
  if (skill.mastery >= 90) {
    const exists = (req.user.certificates || []).some((c) => c.skill === skill.name);
    if (!exists) {
      earnedCert = {
        title: `${skill.name} Mastery`,
        skill: skill.name,
        credentialId: 'DW-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      };
      req.user.certificates.push(earnedCert);
    }
  }
  await req.user.save({ validateBeforeSave: false });
  if (earnedCert) {
    await Notification.create({
      user: req.user._id,
      title: 'Certificate earned',
      message: `${earnedCert.title} (${earnedCert.credentialId})`,
      type: 'success',
      link: '/learn',
    });
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: 'learning_completed',
      module: 'learning',
      title: earnedCert.title,
      refType: 'Certificate',
      refId: earnedCert.credentialId,
      payload: { skill: earnedCert.skill },
    });
  }
  res.json({ success: true, data: { skill, certificates: req.user.certificates } });
});

exports.createStudyPlan = asyncHandler(async (req, res) => {
  const { topic, days } = req.body;
  if (!topic) throw new AppError('Topic required', 400);
  await consumeAiCredit(req.user, 1);
  try {
  const generated = await aiService.generateStudyPlan(topic, Number(days) || 14);
  const plan = await StudyPlan.create({
    ...orgCreateStamp(req.user),
    title: generated.title,
    topic: generated.topic || topic,
    durationDays: generated.durationDays || days || 14,
    goals: generated.goals || [],
    schedule: generated.schedule || [],
  });
  await Notification.create({
    user: req.user._id,
    title: 'Study plan ready',
    message: `"${plan.title}" is ready to start`,
    type: 'info',
    link: '/learn',
  });
  res.status(201).json({ success: true, data: { plan } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.toggleStudyDay = asyncHandler(async (req, res) => {
  const plan = await findAccessible(StudyPlan, req.user, req.params.id);
  if (!plan) throw new AppError('Study plan not found', 404);
  const day = plan.schedule.id(req.params.dayId);
  if (!day) throw new AppError('Day not found', 404);
  day.completed = !day.completed;
  const done = plan.schedule.filter((d) => d.completed).length;
  plan.progress = plan.schedule.length ? Math.round((done / plan.schedule.length) * 100) : 0;
  if (plan.progress === 100) plan.status = 'completed';
  await plan.save();
  if (plan.progress === 100) {
    await Notification.create({
      user: req.user._id,
      title: 'Study plan completed',
      message: `You finished "${plan.title}"`,
      type: 'success',
      link: '/learn',
    });
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: 'learning_completed',
      module: 'learning',
      title: plan.title,
      refType: 'StudyPlan',
      refId: plan._id,
      payload: { topic: plan.topic },
    });
  }
  res.json({ success: true, data: { plan } });
});

exports.createQuiz = asyncHandler(async (req, res) => {
  const { topic, context } = req.body;
  if (!topic) throw new AppError('Topic required', 400);
  await consumeAiCredit(req.user, 1);
  try {
  const generated = await aiService.generateQuiz(topic, context || '');
  const quiz = await Quiz.create({
    ...orgCreateStamp(req.user),
    title: generated.title || `${topic} Quiz`,
    topic,
    questions: generated.questions || [],
  });
  res.status(201).json({ success: true, data: { quiz } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.submitQuiz = asyncHandler(async (req, res) => {
  const quiz = await findAccessible(Quiz, req.user, req.params.id);
  if (!quiz) throw new AppError('Quiz not found', 404);
  const answers = req.body.answers || [];
  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (String(answers[i] || '').trim().toLowerCase() === String(q.answer || '').trim().toLowerCase()) {
      score += 1;
    }
  });
  quiz.attempts.push({ score, total: quiz.questions.length, answers });
  await quiz.save();
  await Notification.create({
    user: req.user._id,
    title: 'Quiz scored',
    message: `${quiz.title}: ${score}/${quiz.questions.length}`,
    type: 'info',
    link: '/learn',
  });
  const { safeEmit } = require('../utils/platformEvents');
  await safeEmit(req.user, {
    type: 'learning_completed',
    module: 'learning',
    title: quiz.title,
    refType: 'Quiz',
    refId: quiz._id,
    payload: { score, total: quiz.questions.length },
  });
  res.json({
    success: true,
    data: { score, total: quiz.questions.length, quiz },
  });
});

exports.listQuizzes = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quiz.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { quizzes, pagination: paginationMeta(page, limit, total) },
  });
});

const ecosystem = require('../services/learningEcosystemService');

exports.getLearningProfile = asyncHandler(async (req, res) => {
  const profile = await ecosystem.getOrCreateProfile(req.user);
  const { strengths, weaknesses, skills } = await ecosystem.analyzeSkills(req.user);
  res.json({
    success: true,
    data: { profile, strengths, weaknesses, skillsCount: skills.length },
  });
});

exports.assessLearningProfile = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const result = await ecosystem.runSkillAssessment(req.user, {
    answers: req.body.answers || [],
    selfRatings: req.body.selfRatings || [],
  });
  await recordAiUsage(req.user, { ...({ mode: 'study', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: result });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.personalizedRecommendations = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const data = await ecosystem.personalizedRecommendations(req.user);
  await recordAiUsage(req.user, { ...({ mode: 'study', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.learningAnalytics = asyncHandler(async (req, res) => {
  const analytics = await ecosystem.learningAnalytics(req.user);
  res.json({ success: true, data: { analytics } });
});

exports.contentExplain = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const topic = req.body.topic;
  if (!topic?.trim()) throw new AppError('Topic required', 400);
  const content = await ecosystem.contentExplain(topic, req.body.detail || '');
  await recordAiUsage(req.user, { ...({ mode: 'teacher', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { content, topic, kind: 'explanation' } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.contentSummary = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const topic = req.body.topic;
  if (!topic?.trim()) throw new AppError('Topic required', 400);
  const content = await ecosystem.contentSummary(topic, req.body.detail || '');
  await recordAiUsage(req.user, { ...({ mode: 'notes', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { content, topic, kind: 'summary' } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.contentQuestions = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const topic = req.body.topic;
  if (!topic?.trim()) throw new AppError('Topic required', 400);
  const content = await ecosystem.contentQuestions(topic, Number(req.body.count) || 5);
  await recordAiUsage(req.user, { ...({ mode: 'quiz', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { content, topic, kind: 'questions' } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.contentAssignment = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const topic = req.body.topic;
  if (!topic?.trim()) throw new AppError('Topic required', 400);
  const content = await ecosystem.contentAssignment(topic, req.body.level || 'intermediate');
  await recordAiUsage(req.user, { ...({ mode: 'project', source: 'specialized' }), creditsUsed: 1, success: true });
  res.json({ success: true, data: { content, topic, kind: 'assignment' } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.createHorizonPlan = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const topic = req.body.topic;
  if (!topic?.trim()) throw new AppError('Topic required', 400);
  const horizon = req.body.horizon || 'weekly';
  if (!['daily', 'weekly', 'monthly'].includes(horizon)) {
    throw new AppError('horizon must be daily, weekly, or monthly', 400);
  }
  const plan = await ecosystem.generateHorizonPlan(req.user, { topic, horizon });
  await recordAiUsage(req.user, { ...({ mode: 'study', source: 'specialized' }), creditsUsed: 1, success: true });
  await Notification.create({
    user: req.user._id,
    title: `${horizon[0].toUpperCase()}${horizon.slice(1)} study plan ready`,
    message: `"${plan.title}" is ready`,
    type: 'info',
    link: '/learn',
  });
  res.status(201).json({ success: true, data: { plan } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.adjustStudyPlan = asyncHandler(async (req, res) => {
  const plan = await findAccessible(StudyPlan, req.user, req.params.id);
  if (!plan) throw new AppError('Study plan not found', 404);
  const adjusted = await ecosystem.adjustStudyPlan(req.user, plan);
  adjusted.lastAdjustedAt = new Date();
  await adjusted.save();
  res.json({ success: true, data: { plan: adjusted } });
});
