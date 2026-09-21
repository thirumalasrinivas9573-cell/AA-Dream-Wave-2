const PersonalizationProfile = require('../models/PersonalizationProfile');
const PlatformEvent = require('../models/PlatformEvent');
const LearningProfile = require('../models/LearningProfile');
const CareerProfile = require('../models/CareerProfile');
const AdaptiveProfile = require('../models/AdaptiveProfile');
const RecommendationEvent = require('../models/RecommendationEvent');
const Skill = require('../models/Skill');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Roadmap = require('../models/Roadmap');
const StudyPlan = require('../models/StudyPlan');
const { UserBook, Book } = require('../models/Book');
const MediaProgress = require('../models/MediaProgress');
const MediaItem = require('../models/MediaItem');
const LearningProgress = require('../models/LearningProgress');
const ResearchProject = require('../models/ResearchProject');
const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const CollabProject = require('../models/CollabProject');
const FocusSession = require('../models/FocusSession');
const Workspace = require('../models/Workspace');
const knowledgeGraph = require('./knowledgeGraphService');
const adaptiveLearning = require('./adaptiveLearningService');
const careerIntelligence = require('./careerIntelligenceService');
const productivity = require('./productivityIntelligenceService');
const analyticsService = require('./analyticsService');
const mediaAccess = require('./mediaAccessService');
const { accessibleBookFilter } = require('./bookAccessService');
const { orgListFilter } = require('../utils/orgScope');
const { auditFromRequest } = require('../utils/audit');

/** Simple TTL cache for hot personalization payloads */
const cache = new Map();
const CACHE_TTL_MS = Math.max(5_000, Number(process.env.PERSONALIZATION_CACHE_MS) || 45_000);

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.val;
}

function cacheSet(key, val, ttl = CACHE_TTL_MS) {
  cache.set(key, { val, exp: Date.now() + ttl });
  if (cache.size > 500) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

function cacheInvalidateUser(userId) {
  const prefix = String(userId);
  for (const k of cache.keys()) {
    if (k.includes(prefix)) cache.delete(k);
  }
}

/** Serialize refresh per user to avoid VersionError races with reactive event updates. */
const refreshLocks = new Map();

async function withRefreshLock(userId, fn) {
  const key = String(userId);
  while (refreshLocks.has(key)) {
    try {
      await refreshLocks.get(key);
    } catch {
      /* prior refresh failure should not block the next caller */
    }
  }
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  refreshLocks.set(key, gate);
  try {
    return await fn();
  } finally {
    refreshLocks.delete(key);
    release();
  }
}

async function getOrCreateProfile(user) {
  let profile = await PersonalizationProfile.findOne({ user: user._id });
  if (!profile) {
    profile = await PersonalizationProfile.create({
      user: user._id,
      organizationId: user.organizationId || null,
      preferences: {
        learningStyle: 'mixed',
        pace: 'moderate',
        difficulty: 'adaptive',
        mentorTone: 'supportive',
        dashboardLayout: 'balanced',
        contentTypes: ['lesson', 'book', 'animation', 'video'],
      },
      privacy: {
        personalizationEnabled: true,
        consentedAt: new Date(),
        consentVersion: '1.0',
      },
    });
  }
  return profile;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n || 0)));
}

async function emitEvent(user, { type, module = 'system', title = '', payload = {}, refType = '', refId = '' }) {
  const event = await PlatformEvent.create({
    user: user._id,
    organizationId: user.organizationId || null,
    type,
    module,
    title: String(title || type).slice(0, 200),
    payload,
    refType,
    refId: refId ? String(refId) : '',
  });
  cacheInvalidateUser(user._id);
  return event;
}

async function collectCrossProgress(user) {
  const filter = await orgListFilter(user);
  const [
    learningDone,
    learningTotal,
    career,
    research,
    bookAvg,
    mediaAvg,
    taskStats,
    goalAvg,
    discussions,
    focusDone,
  ] = await Promise.all([
    LearningProgress.countDocuments({ user: user._id, completed: true }),
    LearningProgress.countDocuments({ user: user._id }),
    CareerProfile.findOne({ user: user._id }).lean(),
    ResearchProject.countDocuments({ ...filter }).then(async (total) => {
      const done = await ResearchProject.countDocuments({
        ...filter,
        status: { $in: ['completed', 'archived'] },
      }).catch(() => 0);
      return { total, done };
    }),
    UserBook.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          avg: {
            $avg: {
              $cond: [{ $eq: ['$status', 'done'] }, 100, { $ifNull: ['$readingProgress', 0] }],
            },
          },
        },
      },
    ]),
    MediaProgress.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          avg: {
            $avg: {
              $cond: [{ $eq: ['$completed', true] }, 100, { $ifNull: ['$percent', 0] }],
            },
          },
        },
      },
    ]),
    Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          n: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]),
    Goal.aggregate([
      { $match: filter },
      { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: { $ifNull: ['$progress', 0] } } } },
    ]),
    Discussion.countDocuments({ author: user._id }).catch(() => 0),
    FocusSession.countDocuments({ ...filter, status: 'completed' }),
  ]);

  const reading = !bookAvg[0]?.n ? 0 : clamp(bookAvg[0].avg || 0);
  const animation = !mediaAvg[0]?.n ? 0 : clamp(mediaAvg[0].avg || 0);
  const taskRate = taskStats[0]?.n
    ? clamp((taskStats[0].done / taskStats[0].n) * 100)
    : 0;
  const goalRate = goalAvg[0]?.n ? clamp(goalAvg[0].avg || 0) : 0;

  return {
    learning: learningTotal ? clamp((learningDone / learningTotal) * 100) : 0,
    career: clamp(career?.scores?.careerReadiness || career?.scores?.learningProgress || 0),
    research: research.total ? clamp((research.done / research.total) * 100) : 0,
    reading,
    animation,
    productivity: clamp(taskRate * 0.55 + goalRate * 0.35 + Math.min(100, focusDone * 5) * 0.1),
    community: clamp(Math.min(100, discussions * 12)),
  };
}

async function refreshUnifiedProfile(user, { force = false } = {}) {
  return withRefreshLock(user._id, () => refreshUnifiedProfileUnlocked(user, { force }));
}

async function refreshUnifiedProfileUnlocked(user, { force = false } = {}) {
  const cacheKey = `profile:${user._id}`;
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const profile = await getOrCreateProfile(user);
  if (!profile.privacy?.personalizationEnabled) {
    return profile;
  }

  const filter = await orgListFilter(user);
  const [
    learning,
    career,
    adaptive,
    skills,
    history,
    sync,
    events7d,
    recEvents,
    workspace,
  ] = await Promise.all([
    LearningProfile.findOne({ user: user._id }).lean(),
    CareerProfile.findOne({ user: user._id }).lean(),
    AdaptiveProfile.findOne({ user: user._id }).lean(),
    Skill.find(filter).sort({ mastery: -1 }).limit(40).lean(),
    knowledgeGraph.collectUserHistory(user),
    collectCrossProgress(user),
    PlatformEvent.countDocuments({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 7 * 864e5) },
    }),
    RecommendationEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(40).lean(),
    Workspace.findOne({ user: user._id }).lean(),
  ]);

  const interestMap = new Map();
  const bump = (topic, weight = 1, source = 'inferred') => {
    if (!topic) return;
    const k = String(topic).toLowerCase().trim().slice(0, 120);
    if (!k) return;
    const prev = interestMap.get(k) || { topic: k, weight: 0, source };
    prev.weight += weight;
    interestMap.set(k, prev);
  };

  for (const i of history.interests || []) bump(i.topic, i.weight || 1, 'history');
  for (const f of learning?.focusAreas || []) bump(f, 3, 'learning');
  for (const i of career?.interests || []) bump(i, 3, 'career');
  for (const r of career?.preferredRoles || []) bump(r, 2, 'career');
  if (career?.targetRole) bump(career.targetRole, 4, 'career');
  if (user.targetCareer) bump(user.targetCareer, 4, 'user');
  if (adaptive?.weeklyFocus) bump(adaptive.weeklyFocus, 3, 'adaptive');
  for (const s of skills) bump(s.name, 1 + (s.mastery || 0) / 40, 'skill');

  profile.interests = [...interestMap.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30)
    .map((i) => ({
      topic: i.topic,
      weight: clamp(i.weight * 4, 1, 100),
      source: i.source,
    }));

  profile.skills = skills.slice(0, 30).map((s) => ({
    name: s.name,
    mastery: s.mastery || 0,
    trend: s.mastery >= 70 ? 'up' : s.mastery < 30 ? 'down' : 'flat',
  }));

  const engaged = recEvents.filter((e) => e.engaged).length;
  const dismissed = recEvents.filter((e) => e.dismissed).length;
  const completionRate = clamp(
    recEvents.length ? (engaged / Math.max(1, engaged + dismissed)) * 100 : sync.learning
  );

  const hourBuckets = {};
  for (const e of await PlatformEvent.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('createdAt module')
    .lean()) {
    const h = new Date(e.createdAt).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  }
  const preferredHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[0];

  profile.behaviour = {
    avgSessionMinutes: workspace?.preferences?.focusMinutes || user.preferences?.focusMinutes || 25,
    preferredHour: preferredHour != null ? Number(preferredHour) : 10,
    preferredDays: [1, 2, 3, 4, 5],
    completionRate,
    explorationVsFocus:
      profile.interests.length > 12 ? 'explore' : profile.interests.length < 4 ? 'focus' : 'balanced',
    lastActiveAt: new Date(),
  };

  if (learning) {
    profile.preferences.learningStyle = learning.learningStyle || profile.preferences.learningStyle;
    profile.preferences.pace = learning.preferredPace || profile.preferences.pace;
  }
  if (adaptive) {
    profile.preferences.difficulty = adaptive.difficulty || profile.preferences.difficulty;
  }

  const modulesUsed = new Set(profile.engagement?.modulesUsed || []);
  for (const m of ['learning', 'career', 'books', 'media', 'productivity', 'community', 'research']) {
    if (sync[m] > 0) modulesUsed.add(m);
  }

  const engagementScore = clamp(
    sync.learning * 0.2 +
      sync.career * 0.15 +
      sync.reading * 0.1 +
      sync.animation * 0.1 +
      sync.productivity * 0.2 +
      sync.community * 0.1 +
      Math.min(100, events7d * 4) * 0.15
  );

  profile.engagement = {
    score: engagementScore,
    streakDays: adaptive?.streak?.current || user.streak || 0,
    modulesUsed: [...modulesUsed],
    lastModules: [...modulesUsed].slice(-6),
    sessions7d: events7d,
    events7d,
  };

  profile.sync = { ...sync, lastSyncedAt: new Date() };
  profile.lastRefreshedAt = new Date();

  const decisions = await computeNextBest(user, profile, {
    learning,
    career,
    adaptive,
    history,
    skills,
  });
  profile.nextBest = { ...decisions, computedAt: new Date() };

  await profile.save();
  cacheSet(cacheKey, profile);
  if (force) {
    await emitEvent(user, {
      type: 'profile_refreshed',
      module: 'system',
      title: 'Personalization profile refreshed',
      payload: { engagement: engagementScore },
    });
  }
  return profile;
}

async function computeNextBest(user, profile, ctx = {}) {
  const interests = (profile.interests || []).map((i) => i.topic);
  const weakSkills = (profile.skills || []).filter((s) => s.mastery < 50).slice(0, 3);
  const focus = interests[0] || user.targetCareer || ctx.adaptive?.weeklyFocus || 'fundamentals';

  let intel = {};
  try {
    intel = await knowledgeGraph.learningIntelligence(user);
  } catch {
    intel = {};
  }

  let bookTitle = '';
  try {
    const bookFilter = await accessibleBookFilter(user, {
      $or: [
        { subject: new RegExp(focus.slice(0, 40), 'i') },
        { tags: focus },
        { category: new RegExp(focus.slice(0, 40), 'i') },
      ],
    });
    const books = await Book.find(bookFilter)
      .sort({ updatedAt: -1 })
      .limit(1)
      .select('title')
      .lean();
    bookTitle = books[0]?.title || '';
  } catch {
    bookTitle = '';
  }

  let animationTitle = '';
  try {
    const mediaFilter = await mediaAccess.accessibleMediaFilter(user, {
      type: 'animation',
      $or: [{ subject: new RegExp(focus.slice(0, 40), 'i') }, { topics: focus }, { skills: focus }],
    });
    const anims = await MediaItem.find(mediaFilter)
      .sort({ updatedAt: -1 })
      .limit(1)
      .select('title')
      .lean();
    animationTitle = anims[0]?.title || '';
  } catch {
    animationTitle = '';
  }

  let projectTitle = '';
  try {
    const projects = await CollabProject.find({
      $or: [{ createdBy: user._id }, { 'members.user': user._id }],
    })
      .sort({ updatedAt: -1 })
      .limit(1)
      .select('title status')
      .lean();
    projectTitle = projects[0]?.title || `Build a ${focus} portfolio project`;
  } catch {
    projectTitle = `Build a ${focus} portfolio project`;
  }

  const careerStep =
    ctx.career?.targetRole
      ? `Advance readiness for ${ctx.career.targetRole}`
      : user.targetCareer
        ? `Take next step toward ${user.targetCareer}`
        : 'Define a target role and close top skill gaps';

  const lesson =
    intel.nextBestTopic ||
    ctx.adaptive?.currentPath?.find((p) => !p.completed)?.topic ||
    weakSkills[0]?.name ||
    focus;

  let action = `Study next lesson: ${lesson}`;
  let reason = 'Continue adaptive learning path';
  if ((profile.sync?.productivity || 0) < 40) {
    action = 'Complete your top prioritized task';
    reason = 'Productivity sync is low';
  } else if ((profile.sync?.reading || 0) < 30 && bookTitle) {
    action = `Continue reading: ${bookTitle}`;
    reason = 'Reading engagement needs attention';
  } else if ((profile.sync?.animation || 0) < 30 && animationTitle) {
    action = `Watch animation: ${animationTitle}`;
    reason = 'Visual learning underused';
  } else if ((profile.sync?.career || 0) < 50) {
    action = careerStep;
    reason = 'Career readiness below target';
  }

  const signalCount =
    (interests.length ? 1 : 0) +
    (weakSkills.length ? 1 : 0) +
    (bookTitle ? 1 : 0) +
    (animationTitle ? 1 : 0) +
    (user.targetCareer || ctx.career?.targetRole ? 1 : 0);
  const confidence = knowledgeGraph.confidenceFromSignals({
    interestHits: interests.length ? 1 : 0,
    masteryHits: weakSkills.length ? 1 : 0,
    careerHits: user.targetCareer || ctx.career?.targetRole ? 1 : 0,
    score: 40 + signalCount * 10,
  });

  return {
    action,
    lesson: String(lesson).slice(0, 200),
    book: (bookTitle || `Find a book on ${focus}`).slice(0, 200),
    project: String(projectTitle).slice(0, 200),
    animation: (animationTitle || `Find an animation on ${focus}`).slice(0, 200),
    careerStep: String(careerStep).slice(0, 200),
    reason,
    confidence,
  };
}

async function buildPersonalizedSurfaces(user) {
  const cacheKey = `surfaces:${user._id}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const profile = await refreshUnifiedProfile(user);
  if (!profile.privacy?.personalizationEnabled || !profile.privacy?.allowRecommendations) {
    return {
      profile,
      dashboard: { widgets: [], message: 'Personalization disabled by privacy settings' },
      recommendations: {},
      nextBest: profile.nextBest,
    };
  }

  const [graphRecs, adaptiveRecs, careerProfile, communities, booksLib, studyPlans] =
    await Promise.all([
      knowledgeGraph.buildRecommendations(user, { limit: 8 }).catch(() => ({ items: [] })),
      adaptiveLearning.adaptiveRecommendations(user).catch(() => ({})),
      careerIntelligence.getOrCreateCareerProfile(user).catch(() => null),
      Community.find({
        isArchived: { $ne: true },
        $or: [{ type: 'public' }, { 'members.user': user._id }, { createdBy: user._id }],
      })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select('name description tags memberCount type subject')
        .lean()
        .catch(() => []),
      UserBook.find({ user: user._id })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('book', 'title subject category')
        .lean(),
      StudyPlan.find(await orgListFilter(user)).sort({ updatedAt: -1 }).limit(5).lean(),
    ]);

  const interestTopics = (profile.interests || []).map((i) => i.topic);
  const scoreText = (text) => {
    const t = String(text || '').toLowerCase();
    return interestTopics.reduce((s, i) => (t.includes(String(i).toLowerCase()) ? s + 1 : s), 0);
  };

  const rankedCommunities = [...communities].sort(
    (a, b) => scoreText(`${a.name} ${(a.tags || []).join(' ')}`) - scoreText(`${b.name}`)
  ).reverse();

  const certifications = (careerProfile?.certifications || [])
    .filter((c) => c.status !== 'completed')
    .slice(0, 5);

  const graphItems = flattenGraphRecommendations(graphRecs);
  const courses = graphItems.filter((r) => r.kind === 'course' || r.itemType === 'course');
  const videos = graphItems.filter((r) => r.kind === 'video' || r.itemType === 'video');

  const dashboard = {
    layout: profile.preferences?.dashboardLayout || 'balanced',
    engagement: profile.engagement,
    sync: profile.sync,
    nextBest: profile.nextBest,
    widgets: [
      { id: 'next_action', type: 'action', title: 'Next best action', data: profile.nextBest },
      { id: 'learning', type: 'progress', title: 'Learning', value: profile.sync.learning },
      { id: 'career', type: 'progress', title: 'Career', value: profile.sync.career },
      { id: 'productivity', type: 'progress', title: 'Productivity', value: profile.sync.productivity },
      { id: 'reading', type: 'progress', title: 'Reading', value: profile.sync.reading },
      { id: 'interests', type: 'chips', title: 'Interests', data: profile.interests.slice(0, 8) },
    ],
  };

  const surfaces = {
    profile,
    dashboard,
    learningPlans: studyPlans,
    books: booksLib.map((b) => b.book).filter(Boolean),
    courses,
    videos,
    animations: adaptiveRecs.animations || adaptiveRecs.practice || [],
    projects: [{ title: profile.nextBest.project, reason: 'Aligned to your focus' }],
    certifications,
    communities: rankedCommunities,
    recommendations: {
      graph: graphRecs,
      adaptive: adaptiveRecs,
      ranked: graphItems.slice(0, 12),
    },
    nextBest: profile.nextBest,
    mentorContext: buildMentorContext(user, profile),
  };

  cacheSet(cacheKey, surfaces);
  return surfaces;
}

function flattenGraphRecommendations(graphRecs) {
  const rec = graphRecs?.recommendations || graphRecs || {};
  if (Array.isArray(graphRecs?.items)) return graphRecs.items;
  const out = [];
  for (const [kind, list] of Object.entries(rec)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      out.push({
        ...item,
        kind: item.kind || kind,
        itemType: item.itemType || item.kind || kind,
        title: item.title || item.label,
      });
    }
  }
  return out.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function buildMentorContext(user, profile) {
  if (!profile?.privacy?.allowMentorContext || !profile?.privacy?.personalizationEnabled) {
    return '';
  }
  const interests = (profile.interests || [])
    .slice(0, 6)
    .map((i) => i.topic)
    .join(', ');
  const skills = (profile.skills || [])
    .slice(0, 5)
    .map((s) => `${s.name}:${s.mastery}`)
    .join(', ');
  return [
    `Learner profile: style=${profile.preferences?.learningStyle}, pace=${profile.preferences?.pace}, tone=${profile.preferences?.mentorTone}.`,
    `Career target: ${user.targetCareer || profile.nextBest?.careerStep || 'unspecified'}.`,
    `Top interests: ${interests || 'general growth'}.`,
    `Skills: ${skills || 'building foundation'}.`,
    `Next best action: ${profile.nextBest?.action || 'continue learning'}.`,
    `Engagement score: ${profile.engagement?.score || 0}.`,
  ].join(' ');
}

async function getMentorPersonalizationContext(user) {
  const profile = await getOrCreateProfile(user);
  if (!profile.lastRefreshedAt || Date.now() - new Date(profile.lastRefreshedAt) > CACHE_TTL_MS) {
    await refreshUnifiedProfile(user).catch(() => null);
  }
  const fresh = await PersonalizationProfile.findOne({ user: user._id });
  return buildMentorContext(user, fresh || profile);
}

async function nextBestActions(user) {
  const profile = await refreshUnifiedProfile(user);
  return {
    ...profile.nextBest,
    alternatives: [
      { kind: 'lesson', value: profile.nextBest.lesson },
      { kind: 'book', value: profile.nextBest.book },
      { kind: 'project', value: profile.nextBest.project },
      { kind: 'animation', value: profile.nextBest.animation },
      { kind: 'career', value: profile.nextBest.careerStep },
    ],
  };
}

async function improvedRecommendations(user, { limit = 12 } = {}) {
  const cacheKey = `recs:${user._id}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const profile = await refreshUnifiedProfile(user);
  if (!profile.privacy?.allowRecommendations) {
    return { items: [], disabled: true };
  }

  const [graph, adaptive, books, media] = await Promise.all([
    knowledgeGraph.buildRecommendations(user, { limit }).catch(() => ({ items: [] })),
    adaptiveLearning.adaptiveRecommendations(user).catch(() => ({})),
    accessibleBookFilter(user)
      .then((filter) =>
        Book.find(filter)
          .sort({ updatedAt: -1 })
          .limit(20)
          .select('title subject category tags')
          .lean()
      )
      .catch(() => []),
    mediaAccess
      .accessibleMediaFilter(user, { type: { $in: ['animation', 'video'] }, status: 'published' })
      .then((filter) =>
        MediaItem.find(filter)
          .sort({ updatedAt: -1 })
          .limit(20)
          .select('title type subject topics skills')
          .lean()
      )
      .catch(() => []),
  ]);

  const interestSet = new Set((profile.interests || []).map((i) => i.topic.toLowerCase()));
  const skillGaps = new Set(
    (profile.skills || []).filter((s) => s.mastery < 55).map((s) => s.name.toLowerCase())
  );

  const items = [];
  const push = (item) => {
    if (!item?.title && !item?.label && !item?.itemKey) return;
    const score = clamp(item.score || 50);
    items.push({
      ...item,
      score,
      confidence:
        item.confidence != null
          ? item.confidence
          : knowledgeGraph.confidenceFromSignals({
              interestHits: item.reason?.includes('interest') ? 1 : 0,
              masteryHits: item.reason?.includes('gap') || item.reason?.includes('skill') ? 1 : 0,
              coldStart: item.source === 'catalog',
              score,
            }),
      reason: item.reason || 'Personalized match',
    });
  };

  for (const r of flattenGraphRecommendations(graph)) {
    push({
      ...r,
      source: r.source || 'graph',
      score: clamp(
        (r.score || 50) +
          (interestSet.has(String(r.key || r.itemKey || r.label || '').toLowerCase()) ? 15 : 0)
      ),
    });
  }

  for (const b of books) {
    const hay = `${b.title} ${b.subject} ${(b.tags || []).join(' ')}`.toLowerCase();
    let score = 20;
    let hits = 0;
    for (const i of interestSet) if (hay.includes(i)) { score += 12; hits += 1; }
    for (const g of skillGaps) if (hay.includes(g)) { score += 10; hits += 1; }
    if (score > 20) {
      push({
        itemType: 'book',
        itemId: String(b._id),
        title: b.title,
        score: clamp(score),
        reason: hits ? 'Matches interests / skill gaps' : 'Catalog relevance',
        source: 'personalization',
        confidence: knowledgeGraph.confidenceFromSignals({
          interestHits: hits,
          score,
        }),
      });
    }
  }

  for (const m of media) {
    const hay = `${m.title} ${m.subject} ${(m.topics || []).join(' ')} ${(m.skills || []).join(' ')}`.toLowerCase();
    let score = 18;
    let hits = 0;
    for (const i of interestSet) if (hay.includes(i)) { score += 12; hits += 1; }
    if (score > 18) {
      push({
        itemType: m.type === 'animation' ? 'animation' : 'video',
        itemId: String(m._id),
        title: m.title,
        score: clamp(score),
        reason: 'Aligned to learning interests',
        source: 'personalization',
        confidence: knowledgeGraph.confidenceFromSignals({ interestHits: hits, score }),
      });
    }
  }

  if (adaptive.practice) {
    for (const p of adaptive.practice.slice(0, 5)) {
      push({
        itemType: 'lesson',
        title: p.title || p.topic || p.label || p.prompt,
        score: p.score || 70,
        confidence: p.confidence || 60,
        reason: p.reason || 'Adaptive practice',
        source: 'adaptive',
      });
    }
  }

  items.sort((a, b) => (b.score || 0) - (a.score || 0));
  let ranked = knowledgeGraph.diversifyByKind(items, { maxPerKind: 3, limit });
  if (!ranked.length) {
    ranked = [
      {
        itemType: 'topic',
        title: profile.nextBest?.lesson || user.targetCareer || 'fundamentals',
        score: 45,
        confidence: 30,
        reason: 'Cold-start personalization fallback',
        source: 'catalog',
      },
    ];
  }
  knowledgeGraph.logRecommendationImpressions(user, ranked, 'personalization').catch(() => {});
  const result = {
    items: ranked,
    nextBest: profile.nextBest,
    interests: profile.interests.slice(0, 10),
    meta: { diversified: true, coldStart: items.length === 0 },
  };
  cacheSet(cacheKey, result, 30_000);
  return result;
}

async function syncCrossPlatform(user) {
  const profile = await refreshUnifiedProfile(user, { force: true });
  return {
    sync: profile.sync,
    engagement: profile.engagement,
    nextBest: profile.nextBest,
    refreshedAt: profile.lastRefreshedAt,
  };
}

async function updatePrivacy(user, body, req) {
  const profile = await getOrCreateProfile(user);
  profile.privacy = {
    ...profile.privacy.toObject?.() || profile.privacy,
    ...pickPrivacy(body),
  };
  if (body.consented === true || body.personalizationEnabled === true) {
    profile.privacy.consentedAt = new Date();
    if (body.consentVersion) profile.privacy.consentVersion = String(body.consentVersion).slice(0, 20);
  }
  profile.markModified('privacy');
  await profile.save();
  cacheInvalidateUser(user._id);
  await emitEvent(user, {
    type: 'consent_updated',
    module: 'system',
    title: 'Personalization consent updated',
    payload: { privacy: profile.privacy },
  });
  if (req) {
    await auditFromRequest(req, {
      action: 'personalization.privacy_update',
      resource: 'PersonalizationProfile',
      resourceId: profile._id,
      meta: { privacy: profile.privacy },
    });
  }
  return profile;
}

function pickPrivacy(body = {}) {
  const out = {};
  for (const k of [
    'personalizationEnabled',
    'shareWithOrg',
    'useCrossModuleData',
    'useBehaviourTracking',
    'allowMentorContext',
    'allowRecommendations',
    'consentVersion',
  ]) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

async function updatePreferences(user, body) {
  const profile = await getOrCreateProfile(user);
  profile.preferences = {
    ...profile.preferences.toObject?.() || profile.preferences,
    ...pickPrefs(body),
  };
  if (Array.isArray(body.contentTypes)) {
    profile.preferences.contentTypes = body.contentTypes.slice(0, 12);
  }
  profile.markModified('preferences');
  await profile.save();
  cacheInvalidateUser(user._id);
  return profile;
}

function pickPrefs(body = {}) {
  const out = {};
  for (const k of ['learningStyle', 'pace', 'difficulty', 'mentorTone', 'dashboardLayout']) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

async function listEvents(user, { type, module, limit = 40, page = 1 } = {}) {
  const { paginationMeta } = require('../utils/pagination');
  const filter = { user: user._id };
  if (user.organizationId && false) {
    /* personal events stay user-scoped; org isolation via user ACL */
  }
  if (type) filter.type = type;
  if (module) filter.module = module;
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;
  const [events, total] = await Promise.all([
    PlatformEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    PlatformEvent.countDocuments(filter),
  ]);
  return { events, pagination: paginationMeta(safePage, safeLimit, total) };
}

async function ingestEvent(user, body, req) {
  const event = await emitEvent(user, {
    type: body.type,
    module: body.module || 'system',
    title: body.title || '',
    payload: body.payload || {},
    refType: body.refType || '',
    refId: body.refId || '',
  });

  // Lightweight reactive updates
  if (['learning_completed', 'book_finished', 'animation_completed', 'goal_achieved', 'career_milestone', 'task_completed', 'focus_completed'].includes(body.type)) {
    setImmediate(() => {
      refreshUnifiedProfile(user, { force: true }).catch(() => {});
    });
  }

  if (body.type === 'recommendation_engaged' || body.type === 'recommendation_dismissed') {
    await RecommendationEvent.create({
      user: user._id,
      organizationId: user.organizationId || null,
      itemType: body.payload?.itemType || 'topic',
      itemId: body.refId || body.payload?.itemId || '',
      itemKey: body.payload?.itemKey || '',
      score: body.payload?.score || 0,
      reason: body.title || '',
      engaged: body.type === 'recommendation_engaged',
      dismissed: body.type === 'recommendation_dismissed',
      source: 'personalization',
    }).catch(() => null);
  }

  if (req) {
    await auditFromRequest(req, {
      action: `personalization.event.${body.type}`,
      resource: 'PlatformEvent',
      resourceId: event._id,
    });
  }
  return event;
}

async function processUnprocessedEvents(limit = 50) {
  const events = await PlatformEvent.find({ processed: false })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('_id')
    .lean();
  if (!events.length) return { processed: 0 };
  const ids = events.map((e) => e._id);
  const result = await PlatformEvent.updateMany(
    { _id: { $in: ids }, processed: false },
    { $set: { processed: true, processedAt: new Date() } }
  );
  return { processed: result.modifiedCount || 0 };
}

async function analytics(user) {
  const profile = await getOrCreateProfile(user);
  const since = new Date(Date.now() - 30 * 864e5);
  const [events, recs, baseStats] = await Promise.all([
    PlatformEvent.find({ user: user._id, createdAt: { $gte: since } })
      .select('type module createdAt')
      .limit(500)
      .lean(),
    RecommendationEvent.find({ user: user._id, createdAt: { $gte: since } })
      .select('engaged dismissed score')
      .limit(500)
      .lean(),
    analyticsService.getUserStats(user._id),
  ]);

  const engaged = recs.filter((r) => r.engaged).length;
  const dismissed = recs.filter((r) => r.dismissed).length;
  const shown = recs.length;
  const feedbackSample = engaged + dismissed;
  const recommendationEffectiveness = feedbackSample
    ? clamp((engaged / feedbackSample) * 100)
    : shown
      ? clamp((engaged / shown) * 100)
      : 0;
  const personalizationAccuracy = feedbackSample
    ? clamp((engaged / feedbackSample) * 100)
    : clamp(profile.engagement?.score || 0);

  const byModule = {};
  const byType = {};
  for (const e of events) {
    byModule[e.module] = (byModule[e.module] || 0) + 1;
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  const activeDays = new Set(events.map((e) => new Date(e.createdAt).toISOString().slice(0, 10)));
  const retention = {
    activeDays30: activeDays.size,
    events30: events.length,
    returning: activeDays.size >= 3,
  };

  const learningSuccess = {
    learningProgress: profile.sync?.learning || 0,
    careerProgress: profile.sync?.career || 0,
    goalAvg: baseStats.avgGoalProgress || 0,
    tasksDone: baseStats.tasksDone || 0,
    tasksTotal: baseStats.tasksTotal || 0,
  };

  return {
    personalizationAccuracy,
    recommendationEffectiveness,
    userEngagement: profile.engagement?.score || 0,
    retention,
    learningSuccess,
    byModule,
    byType,
    sync: profile.sync,
    sampleSize: { events: events.length, recommendations: shown },
  };
}

module.exports = {
  getOrCreateProfile,
  refreshUnifiedProfile,
  buildPersonalizedSurfaces,
  getMentorPersonalizationContext,
  buildMentorContext,
  nextBestActions,
  improvedRecommendations,
  syncCrossPlatform,
  updatePrivacy,
  updatePreferences,
  listEvents,
  ingestEvent,
  emitEvent,
  processUnprocessedEvents,
  analytics,
  collectCrossProgress,
  cacheInvalidateUser,
};
