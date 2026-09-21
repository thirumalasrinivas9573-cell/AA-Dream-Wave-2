const Skill = require('../models/Skill');
const StudyPlan = require('../models/StudyPlan');
const Quiz = require('../models/Quiz');
const Roadmap = require('../models/Roadmap');
const Goal = require('../models/Goal');
const { Book } = require('../models/Book');
const MediaItem = require('../models/MediaItem');
const MediaProgress = require('../models/MediaProgress');
const LearningProfile = require('../models/LearningProfile');
const aiService = require('./aiService');
const { orgListFilter, orgCreateStamp } = require('../utils/orgScope');
const mediaAccess = require('./mediaAccessService');

const STYLE_KEYS = ['visual', 'auditory', 'reading', 'kinesthetic'];

function normalizeStyleScores(raw = {}) {
  const scores = {};
  let total = 0;
  for (const key of STYLE_KEYS) {
    const n = Math.max(0, Number(raw[key]) || 0);
    scores[key] = n;
    total += n;
  }
  if (total <= 0) {
    return { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 };
  }
  for (const key of STYLE_KEYS) {
    scores[key] = Math.round((scores[key] / total) * 100);
  }
  return scores;
}

function dominantStyle(scores) {
  const entries = STYLE_KEYS.map((k) => [k, scores[k] || 0]).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] - entries[1][1] < 8) return 'mixed';
  return entries[0][0];
}

function detectStyleFromAnswers(answers = []) {
  const tally = { visual: 0, auditory: 0, reading: 0, kinesthetic: 0 };
  for (const a of answers) {
    const v = String(a || '').toLowerCase();
    if (/diagram|video|image|map|visual|watch/.test(v)) tally.visual += 2;
    else if (/listen|podcast|discuss|audio|speak/.test(v)) tally.auditory += 2;
    else if (/read|notes|write|text|article/.test(v)) tally.reading += 2;
    else if (/practice|build|lab|hands|project|code/.test(v)) tally.kinesthetic += 2;
    else tally.reading += 1;
  }
  return normalizeStyleScores(tally);
}

async function getOrCreateProfile(user) {
  let profile = await LearningProfile.findOne({ user: user._id });
  if (profile) return profile;
  profile = await LearningProfile.create({
    ...orgCreateStamp(user),
    careerGoal: user.targetCareer || '',
  });
  return profile;
}

async function analyzeSkills(user) {
  const filter = await orgListFilter(user);
  const skills = await Skill.find(filter)
    .sort({ mastery: 1 })
    .select('name mastery targetMastery level')
    .limit(200)
    .lean();
  const strengths = skills
    .filter((s) => s.mastery >= 70)
    .slice(-5)
    .reverse()
    .map((s) => ({
      skill: s.name,
      score: s.mastery,
      evidence: `Mastery ${s.mastery}% (target ${s.targetMastery || 80}%)`,
    }));
  const weaknesses = skills
    .filter((s) => s.mastery < (s.targetMastery || 80))
    .slice(0, 8)
    .map((s) => ({
      skill: s.name,
      score: s.mastery,
      evidence: `Below target — gap ${Math.max(0, (s.targetMastery || 80) - s.mastery)}%`,
    }));
  return { skills, strengths, weaknesses };
}

async function runSkillAssessment(user, { answers = [], selfRatings = [] } = {}) {
  const styleScores = detectStyleFromAnswers(answers);
  const learningStyle = dominantStyle(styleScores);
  const { strengths, weaknesses, skills } = await analyzeSkills(user);

  // Merge self-ratings into skill notes if provided
  for (const rating of selfRatings.slice(0, 20)) {
    if (!rating?.name) continue;
    const mastery = Math.min(100, Math.max(0, Number(rating.mastery) || 0));
    await Skill.findOneAndUpdate(
      { user: user._id, name: String(rating.name).slice(0, 120) },
      {
        ...orgCreateStamp(user),
        mastery,
        level: mastery >= 80 ? 'advanced' : mastery >= 50 ? 'intermediate' : 'beginner',
        lastPracticed: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const refreshed = await analyzeSkills(user);
  const avg =
    refreshed.skills.length > 0
      ? Math.round(refreshed.skills.reduce((s, x) => s + x.mastery, 0) / refreshed.skills.length)
      : Math.round(
          selfRatings.reduce((s, r) => s + (Number(r.mastery) || 0), 0) /
            Math.max(1, selfRatings.length)
        );

  let summary = `Learning style: ${learningStyle}. Avg mastery: ${avg}%.`;
  try {
    const ai = await aiService.runMode(
      'study',
      [
        {
          role: 'user',
          content: `Summarize this learner assessment in 3 bullets. Style=${learningStyle}. Strengths=${JSON.stringify(
            refreshed.strengths
          )}. Weaknesses=${JSON.stringify(refreshed.weaknesses)}. Career=${user.targetCareer || 'general'}.`,
        },
      ],
      ''
    );
    if (ai?.content) summary = ai.content.slice(0, 1000);
  } catch {
    /* keep local summary */
  }

  const profile = await getOrCreateProfile(user);
  profile.learningStyle = learningStyle;
  profile.styleScores = styleScores;
  profile.strengths = refreshed.strengths;
  profile.weaknesses = refreshed.weaknesses;
  profile.focusAreas = refreshed.weaknesses.map((w) => w.skill).slice(0, 5);
  profile.careerGoal = user.targetCareer || profile.careerGoal || '';
  profile.lastAssessedAt = new Date();
  profile.assessmentHistory.push({
    type: 'skill_assessment',
    score: avg,
    summary,
    at: new Date(),
  });
  if (profile.assessmentHistory.length > 30) {
    profile.assessmentHistory = profile.assessmentHistory.slice(-30);
  }
  await profile.save();

  return { profile, skills: refreshed.skills, summary };
}

async function personalizedRecommendations(user) {
  const profile = await getOrCreateProfile(user);
  const { strengths, weaknesses } = await analyzeSkills(user);
  const bookFilter = await (async () => {
    const clauses = [{ scope: 'public' }];
    if (user.organizationId) clauses.push({ organizationId: user.organizationId });
    return { $or: clauses };
  })();
  const [books, mediaFilter, roadmaps, plans] = await Promise.all([
    Book.find(bookFilter).select('title author category subject').limit(20).lean(),
    mediaAccess.accessibleMediaFilter(user, { status: 'published' }),
    Roadmap.find(await orgListFilter(user, { status: 'active' }))
      .select('title career progress')
      .limit(5)
      .lean(),
    StudyPlan.find(await orgListFilter(user, { status: 'active' }))
      .select('title topic progress')
      .limit(5)
      .lean(),
  ]);
  const media = await MediaItem.find(mediaFilter)
    .select('title type category subject topics')
    .limit(20)
    .lean();

  const weak = weaknesses.map((w) => w.skill).slice(0, 5);
  const focus = weak[0] || user.targetCareer || 'fundamentals';
  const tokenMatch = (hay, skill) => {
    const h = String(hay || '').toLowerCase();
    const s = String(skill || '').toLowerCase().trim();
    if (!s || s.length < 2) return false;
    if (h.includes(s)) return true;
    const parts = s.split(/[\s/_-]+/).filter((p) => p.length >= 4);
    return parts.some((p) => h.includes(p));
  };

  const catalog = {
    courses: weak.map((w) => ({
      title: `${w} Foundations Course`,
      reason: `Addresses weak skill: ${w}`,
      type: 'course',
    })),
    books: books
      .filter((b) => weak.some((w) => tokenMatch(`${b.title} ${b.category} ${b.subject}`, w)))
      .slice(0, 4)
      .map((b) => ({
        id: b._id,
        title: b.title,
        author: b.author,
        reason: 'Matched to your skill gaps / interests',
        type: 'book',
      })),
    videos: media
      .filter((m) => m.type === 'video')
      .map((m) => {
        const hits = weak.filter((w) =>
          tokenMatch(`${m.title} ${m.subject} ${m.category} ${(m.topics || []).join(' ')}`, w)
        ).length;
        return { m, hits };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 4)
      .map(({ m, hits }) => ({
        id: m._id,
        title: m.title,
        reason: hits
          ? `Video matched to skill gap (${hits} hit${hits > 1 ? 's' : ''})`
          : `Video for ${m.subject || m.category}`,
        type: 'video',
      })),
    animations: media
      .filter((m) => m.type === 'animation')
      .map((m) => {
        const hits = weak.filter((w) =>
          tokenMatch(`${m.title} ${m.subject} ${(m.topics || []).join(' ')}`, w)
        ).length;
        return { m, hits };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 4)
      .map(({ m, hits }) => ({
        id: m._id,
        title: m.title,
        reason: hits
          ? 'Animation matched to weak topics'
          : 'Animation suited to visual/kinesthetic practice',
        type: 'animation',
      })),
    practice: weak.map((w) => ({
      title: `${w} practice set`,
      reason: 'Targeted drills for weak topics',
      type: 'practice',
    })),
    certifications: strengths.slice(0, 3).map((s) => ({
      title: `${s.skill} proficiency pathway`,
      reason: `You are strong here (${s.score}%) — certify and teach`,
      type: 'certification',
    })),
  };

  if (!catalog.books.length && books.length) {
    catalog.books = books.slice(0, 3).map((b) => ({
      id: b._id,
      title: b.title,
      author: b.author,
      reason: 'Popular catalog pick for your learning path',
      type: 'book',
    }));
  }

  let narrative = '';
  try {
    const ai = await aiService.runMode(
      'study',
      [
        {
          role: 'user',
          content: `Write a short personalized learning recommendation (under 120 words) for style=${profile.learningStyle}, focus=${focus}, career=${profile.careerGoal || user.targetCareer || 'general'}.`,
        },
      ],
      ''
    );
    narrative = ai.content || '';
  } catch {
    narrative = `Focus on ${focus}. Prefer ${profile.learningStyle} study methods and keep daily consistency.`;
  }

  return {
    profile: {
      learningStyle: profile.learningStyle,
      preferredPace: profile.preferredPace,
      focusAreas: profile.focusAreas,
      careerGoal: profile.careerGoal,
    },
    strengths,
    weaknesses,
    activeRoadmaps: roadmaps,
    activePlans: plans,
    narrative,
    catalog,
  };
}

function buildDependencies(skills = []) {
  const deps = [];
  for (let i = 1; i < skills.length; i++) {
    deps.push({
      skill: skills[i].name,
      dependsOn: skills[i - 1].name,
      reason: 'Sequential mastery path',
    });
  }
  return deps;
}

function buildMilestones(roadmap) {
  const milestones = (roadmap.timeline || []).map((phase, idx) => ({
    key: `phase-${phase.phase || idx + 1}`,
    title: phase.title || `Phase ${idx + 1}`,
    dueHint: phase.duration || '',
    completed: Boolean(phase.completed),
    topics: phase.topics || [],
    weight: Math.round(100 / Math.max(1, roadmap.timeline.length)),
  }));
  return milestones;
}

async function adaptRoadmap(user, roadmap) {
  const { weaknesses, strengths } = await analyzeSkills(user);
  const weakNames = new Set(weaknesses.map((w) => w.skill.toLowerCase()));
  let changed = false;

  for (const skill of roadmap.skills || []) {
    if (weakNames.has(String(skill.name).toLowerCase()) && skill.progress > 20) {
      // Slow progress on weak skills — keep but flag by lowering effective level
      if (skill.level === 'advanced') {
        skill.level = 'intermediate';
        changed = true;
      }
    }
    const strong = strengths.find((s) => s.skill.toLowerCase() === String(skill.name).toLowerCase());
    if (strong && strong.score >= 85 && skill.progress < strong.score) {
      skill.progress = Math.min(100, Math.max(skill.progress, strong.score - 5));
      changed = true;
    }
  }

  // Insert a remediation phase if weak topics exist and not already present
  const weakTopic = weaknesses[0]?.skill;
  if (weakTopic) {
    const hasRemediation = (roadmap.timeline || []).some((p) =>
      String(p.title || '')
        .toLowerCase()
        .includes('remediation')
    );
    if (!hasRemediation) {
      roadmap.timeline.unshift({
        phase: 0,
        title: `Remediation: ${weakTopic}`,
        duration: '1 week',
        topics: [weakTopic, 'Foundational drills', 'Quick quiz'],
        completed: false,
      });
      // renumber
      roadmap.timeline.forEach((p, i) => {
        p.phase = i + 1;
      });
      changed = true;
    }
  }

  if (!roadmap.skills?.length && weakTopic) {
    roadmap.skills.push({ name: weakTopic, level: 'beginner', progress: 0 });
    changed = true;
  }

  const dependencies = buildDependencies(roadmap.skills || []);
  const milestones = buildMilestones(roadmap);
  if (changed) await roadmap.save();

  let advice = 'Continue the current path with weekly reviews.';
  try {
    const ai = await aiService.runMode(
      'roadmap',
      [
        {
          role: 'user',
          content: `Adapt learning path advice for career ${roadmap.career}. Weak: ${weaknesses
            .map((w) => w.skill)
            .join(', ')}. Keep under 100 words.`,
        },
      ],
      ''
    );
    advice = ai.content || advice;
  } catch {
    /* fallback advice */
  }

  return { roadmap, dependencies, milestones, advice, changed };
}

async function generateHorizonPlan(user, { topic, horizon = 'weekly' }) {
  const days = horizon === 'daily' ? 1 : horizon === 'monthly' ? 30 : 7;
  const generated = await aiService.generateStudyPlan(topic, days);
  const plan = await StudyPlan.create({
    ...orgCreateStamp(user),
    title: generated.title || `${horizon} plan — ${topic}`,
    topic: generated.topic || topic,
    durationDays: generated.durationDays || days,
    goals: generated.goals || [],
    schedule: generated.schedule || [],
    horizon,
  });
  return plan;
}

async function adjustStudyPlan(user, plan) {
  const done = plan.schedule.filter((d) => d.completed).length;
  const remaining = plan.schedule.length - done;
  const { weaknesses } = await analyzeSkills(user);
  const focus = weaknesses[0]?.skill || plan.topic;

  if (remaining > 0 && plan.progress < 40 && plan.schedule.length > 3) {
    // Compress remaining tasks into fewer days for pace recovery
    const incomplete = plan.schedule.filter((d) => !d.completed);
    const keep = incomplete.slice(0, Math.max(2, Math.ceil(incomplete.length * 0.7)));
    plan.schedule = [...plan.schedule.filter((d) => d.completed), ...keep];
    plan.schedule.forEach((d, i) => {
      d.day = i + 1;
    });
  }

  // Inject a focus day for weakest skill
  if (focus && !plan.schedule.some((d) => String(d.focus || '').includes(focus))) {
    plan.schedule.push({
      day: plan.schedule.length + 1,
      focus: `Focus: ${focus}`,
      tasks: [`Review ${focus}`, 'Do 1 practice drill', 'Self-quiz 5 questions'],
      completed: false,
    });
  }

  const completed = plan.schedule.filter((d) => d.completed).length;
  plan.progress = plan.schedule.length ? Math.round((completed / plan.schedule.length) * 100) : 0;
  plan.durationDays = plan.schedule.length;
  await plan.save();
  return plan;
}

async function contentExplain(topic, detail = '') {
  const result = await aiService.runMode(
    'teacher',
    [
      {
        role: 'user',
        content: `Explain this lesson clearly with examples and a short check-for-understanding.\nTopic: ${topic}\nContext: ${detail}`,
      },
    ],
    '',
    {}
  );
  return result.content;
}

async function contentSummary(topic, detail = '') {
  const result = await aiService.runMode(
    'notes',
    [
      {
        role: 'user',
        content: `Summarize this topic into study notes with bullets and key terms.\nTopic: ${topic}\nContent: ${detail}`,
      },
    ],
    '',
    {}
  );
  return result.content;
}

async function contentQuestions(topic, count = 5) {
  const result = await aiService.runMode(
    'quiz',
    [
      {
        role: 'user',
        content: `Generate ${count} open-ended practice questions on ${topic} with brief ideal answers.`,
      },
    ],
    '',
    {}
  );
  return result.content;
}

async function contentAssignment(topic, level = 'intermediate') {
  const result = await aiService.runMode(
    'project',
    [
      {
        role: 'user',
        content: `Create a practical assignment for ${topic} at ${level} level with objectives, tasks, deliverable, and rubric (under 250 words).`,
      },
    ],
    '',
    {}
  );
  return result.content;
}

async function learningAnalytics(user) {
  const filter = await orgListFilter(user);
  const [skills, plans, quizzes, goals, mediaProgress, roadmaps] = await Promise.all([
    Skill.find(filter).select('name mastery targetMastery').limit(200).lean(),
    StudyPlan.find(filter).select('progress status updatedAt').limit(100).lean(),
    Quiz.find(filter).select('attempts updatedAt topic').limit(100).lean(),
    Goal.find(filter).select('status progress category').limit(100).lean(),
    MediaProgress.find({ user: user._id })
      .select('lastWatchedAt updatedAt percent completed')
      .limit(100)
      .lean(),
    Roadmap.find(filter).select('progress title').limit(50).lean(),
  ]);

  const skillProgress = skills.map((s) => ({
    name: s.name,
    mastery: s.mastery,
    target: s.targetMastery || 80,
    gap: Math.max(0, (s.targetMastery || 80) - s.mastery),
  }));

  const goalProgress = {
    active: goals.filter((g) => g.status === 'active').length,
    completed: goals.filter((g) => g.status === 'completed').length,
    avg: goals.length
      ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
      : 0,
  };

  // Heatmap: last 28 days of study activity proxies
  const heatmap = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ date: key, intensity: 0 });
  }
  const heatMap = Object.fromEntries(heatmap.map((h) => [h.date, h]));
  for (const q of quizzes) {
    for (const a of q.attempts || []) {
      const key = new Date(a.takenAt || q.updatedAt).toISOString().slice(0, 10);
      if (heatMap[key]) heatMap[key].intensity += 2;
    }
  }
  for (const p of mediaProgress) {
    const key = new Date(p.lastWatchedAt || p.updatedAt).toISOString().slice(0, 10);
    if (heatMap[key]) heatMap[key].intensity += 1;
  }
  for (const plan of plans) {
    const key = new Date(plan.updatedAt).toISOString().slice(0, 10);
    if (heatMap[key] && plan.progress > 0) heatMap[key].intensity += 1;
  }

  const weakTopics = skillProgress
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 8);

  const insights = [];
  if (weakTopics[0]) {
    insights.push(`Priority weak topic: ${weakTopics[0].name} (gap ${weakTopics[0].gap}%).`);
  }
  if (goalProgress.avg < 40 && goalProgress.active > 0) {
    insights.push('Goal progress is low — convert one goal into a weekly study plan.');
  }
  const roadmapAvg = roadmaps.length
    ? Math.round(roadmaps.reduce((s, r) => s + (r.progress || 0), 0) / roadmaps.length)
    : 0;
  if (roadmapAvg < 30 && roadmaps.length) {
    insights.push('Roadmap completion is behind — finish the current phase before adding skills.');
  }
  if (!insights.length) insights.push('Steady progress — keep the learning streak alive today.');

  return {
    skillProgress,
    goalProgress,
    roadmapProgress: roadmapAvg,
    studyPlans: {
      active: plans.filter((p) => p.status === 'active').length,
      avgProgress: plans.length
        ? Math.round(plans.reduce((s, p) => s + (p.progress || 0), 0) / plans.length)
        : 0,
    },
    quizAttempts: quizzes.reduce((n, q) => n + (q.attempts?.length || 0), 0),
    heatmap: Object.values(heatMap),
    weakTopics,
    insights,
    learningStreak: user.learningStreak || 0,
  };
}

module.exports = {
  getOrCreateProfile,
  runSkillAssessment,
  personalizedRecommendations,
  analyzeSkills,
  buildDependencies,
  buildMilestones,
  adaptRoadmap,
  generateHorizonPlan,
  adjustStudyPlan,
  contentExplain,
  contentSummary,
  contentQuestions,
  contentAssignment,
  learningAnalytics,
  detectStyleFromAnswers,
};
