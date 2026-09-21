const KnowledgeNode = require('../models/KnowledgeNode');
const KnowledgeEdge = require('../models/KnowledgeEdge');
const RecommendationEvent = require('../models/RecommendationEvent');
const { Book, UserBook } = require('../models/Book');
const MediaItem = require('../models/MediaItem');
const MediaProgress = require('../models/MediaProgress');
const Skill = require('../models/Skill');
const Roadmap = require('../models/Roadmap');
const StudyPlan = require('../models/StudyPlan');
const Goal = require('../models/Goal');
const Document = require('../models/Document');
const CollabProject = require('../models/CollabProject');
const learningEco = require('./learningEcosystemService');
const careerIntel = require('./careerIntelligenceService');
const mediaAccess = require('./mediaAccessService');
const researchKnowledge = require('./researchKnowledgeService');
const { orgListFilter } = require('../utils/orgScope');
const logger = require('../utils/logger');

function normKey(kind, label) {
  const slug = String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
  return `${kind}:${slug || 'unknown'}`;
}

function orgScope(organizationId) {
  return organizationId || null;
}

async function upsertNode({ key, label, kind, organizationId, refType, refId, aliases, weight, meta, searchText }) {
  return KnowledgeNode.findOneAndUpdate(
    { key, organizationId: orgScope(organizationId) },
    {
      $set: {
        label: String(label).slice(0, 240),
        kind,
        refType: refType || '',
        refId: refId || null,
        aliases: aliases || [],
        weight: weight ?? 1,
        meta: meta || {},
        searchText: (searchText || `${label} ${(aliases || []).join(' ')}`).slice(0, 8000),
      },
      $setOnInsert: { key, organizationId: orgScope(organizationId) },
    },
    { upsert: true, new: true }
  );
}

async function upsertEdge({ from, to, type = 'related', weight = 1, organizationId, meta }) {
  if (!from || !to || from === to) return null;
  return KnowledgeEdge.findOneAndUpdate(
    { from, to, type, organizationId: orgScope(organizationId) },
    {
      $set: { weight, meta: meta || {} },
      $setOnInsert: { from, to, type, organizationId: orgScope(organizationId) },
    },
    { upsert: true, new: true }
  );
}

/**
 * Rebuild / refresh global+org graph from existing content stores.
 */

function makeNodeBulkOp({ key, label, kind, organizationId, refType, refId, aliases, weight, meta, searchText }) {
  const org = orgScope(organizationId);
  return {
    updateOne: {
      filter: { key, organizationId: org },
      update: {
        $set: {
          label: String(label).slice(0, 240),
          kind,
          refType: refType || '',
          refId: refId || null,
          aliases: aliases || [],
          weight: weight ?? 1,
          meta: meta || {},
          searchText: (searchText || `${label} ${(aliases || []).join(' ')}`).slice(0, 8000),
        },
        $setOnInsert: { key, organizationId: org },
      },
      upsert: true,
    },
  };
}

function makeEdgeBulkOp({ from, to, type = 'related', weight = 1, organizationId, meta }) {
  if (!from || !to || from === to) return null;
  const org = orgScope(organizationId);
  return {
    updateOne: {
      filter: { from, to, type, organizationId: org },
      update: {
        $set: { weight, meta: meta || {} },
        $setOnInsert: { from, to, type, organizationId: org },
      },
      upsert: true,
    },
  };
}

async function flushGraphBulk(nodeOps, edgeOps) {
  const CHUNK = 250;
  let nodeWrites = 0;
  let edgeWrites = 0;
  for (let i = 0; i < nodeOps.length; i += CHUNK) {
    const chunk = nodeOps.slice(i, i + CHUNK);
    if (!chunk.length) continue;
    const r = await KnowledgeNode.bulkWrite(chunk, { ordered: false });
    nodeWrites += (r.upsertedCount || 0) + (r.modifiedCount || 0);
  }
  for (let i = 0; i < edgeOps.length; i += CHUNK) {
    const chunk = edgeOps.slice(i, i + CHUNK).filter(Boolean);
    if (!chunk.length) continue;
    const r = await KnowledgeEdge.bulkWrite(chunk, { ordered: false });
    edgeWrites += (r.upsertedCount || 0) + (r.modifiedCount || 0);
  }
  nodeOps.length = 0;
  edgeOps.length = 0;
  return { nodeWrites, edgeWrites };
}

async function rebuildGraph({ organizationId = null, user = null } = {}) {
  const orgId = organizationId || user?.organizationId || null;
  let nodesUpserted = 0;
  let edgesUpserted = 0;
  const nodeOps = [];
  const edgeOps = [];
  const enqueueNode = (p) => {
    nodeOps.push(makeNodeBulkOp(p));
  };
  const enqueueEdge = (p) => {
    const op = makeEdgeBulkOp(p);
    if (!op) return;
    edgeOps.push(op);
  };

  const bookFilter = orgId
    ? { $or: [{ scope: 'public' }, { organizationId: orgId }] }
    : { scope: 'public' };
  const books = await Book.find(bookFilter)
    .select('title author category subject tags topics chapters relatedBooks')
    .limit(200)
    .lean();

  for (const book of books) {
    const bookKey = normKey('book', `${book._id}`);
    enqueueNode({
      key: bookKey,
      label: book.title,
      kind: 'book',
      organizationId: orgId,
      refType: 'Book',
      refId: book._id,
      aliases: [book.author, book.category, book.subject].filter(Boolean),
      weight: 5,
      searchText: `${book.title} ${book.author} ${book.category} ${book.subject} ${(book.tags || []).join(' ')}`,
    });
    nodesUpserted += 1;

    if (book.subject) {
      const subKey = normKey('subject', book.subject);
      enqueueNode({
        key: subKey,
        label: book.subject,
        kind: 'subject',
        organizationId: orgId,
        weight: 3,
      });
      enqueueEdge({ from: bookKey, to: subKey, type: 'part_of', weight: 2, organizationId: orgId });
      nodesUpserted += 1;
      edgesUpserted += 1;
    }

    for (const t of book.topics || []) {
      const topicKey = normKey('topic', t.name || t);
      enqueueNode({
        key: topicKey,
        label: t.name || String(t),
        kind: 'topic',
        organizationId: orgId,
        weight: 2,
      });
      enqueueEdge({ from: bookKey, to: topicKey, type: 'teaches', weight: 2, organizationId: orgId });
      nodesUpserted += 1;
      edgesUpserted += 1;
    }

    for (const ch of book.chapters || []) {
      for (const c of ch.keyConcepts || []) {
        const conceptKey = normKey('concept', c);
        enqueueNode({
          key: conceptKey,
          label: c,
          kind: 'concept',
          organizationId: orgId,
          weight: 2,
        });
        enqueueEdge({ from: bookKey, to: conceptKey, type: 'teaches', weight: 1, organizationId: orgId });
        nodesUpserted += 1;
        edgesUpserted += 1;
      }
    }

    for (const rel of book.relatedBooks || []) {
      const relKey = normKey('book', String(rel));
      enqueueEdge({
        from: bookKey,
        to: relKey,
        type: 'related',
        weight: 3,
        organizationId: orgId,
      });
      edgesUpserted += 1;
    }
  }

  const mediaFilter = user
    ? await mediaAccess.accessibleMediaFilter(user, { status: 'published' })
    : { status: 'published', $or: [{ scope: 'public' }, ...(orgId ? [{ organizationId: orgId }] : [])] };
  const media = await MediaItem.find(mediaFilter)
    .select('title type category subject topics tags')
    .limit(200)
    .lean();

  for (const m of media) {
    const kind = m.type === 'animation' ? 'animation' : m.type === 'video' ? 'video' : 'lesson';
    const key = normKey(kind, String(m._id));
    enqueueNode({
      key,
      label: m.title,
      kind,
      organizationId: orgId,
      refType: 'MediaItem',
      refId: m._id,
      weight: 4,
      searchText: `${m.title} ${m.category} ${m.subject} ${(m.topics || []).join(' ')} ${(m.tags || []).join(' ')}`,
    });
    nodesUpserted += 1;
    for (const topic of m.topics || []) {
      const topicKey = normKey('topic', topic);
      enqueueNode({ key: topicKey, label: topic, kind: 'topic', organizationId: orgId, weight: 2 });
      enqueueEdge({ from: key, to: topicKey, type: 'teaches', weight: 2, organizationId: orgId });
      nodesUpserted += 1;
      edgesUpserted += 1;
    }
    if (m.subject) {
      const subKey = normKey('subject', m.subject);
      enqueueNode({ key: subKey, label: m.subject, kind: 'subject', organizationId: orgId, weight: 3 });
      enqueueEdge({ from: key, to: subKey, type: 'part_of', weight: 2, organizationId: orgId });
      edgesUpserted += 1;
    }
  }

  if (user) {
    const skillFilter = await orgListFilter(user);
    const skills = await Skill.find(skillFilter).limit(100).lean();
    for (const s of skills) {
      const key = normKey('skill', s.name);
      enqueueNode({
        key,
        label: s.name,
        kind: 'skill',
        organizationId: orgId,
        refType: 'Skill',
        refId: s._id,
        weight: Math.max(1, Math.round((s.mastery || 0) / 10)),
        meta: { mastery: s.mastery, level: s.level },
      });
      nodesUpserted += 1;
    }

    const roadmaps = await Roadmap.find(skillFilter).limit(30).lean();
    for (const r of roadmaps) {
      const key = normKey('roadmap', String(r._id));
      enqueueNode({
        key,
        label: r.title,
        kind: 'roadmap',
        organizationId: orgId,
        refType: 'Roadmap',
        refId: r._id,
        weight: 4,
        searchText: `${r.title} ${r.career}`,
      });
      nodesUpserted += 1;
      const careerKey = normKey('career', r.career || r.title);
      enqueueNode({
        key: careerKey,
        label: r.career || r.title,
        kind: 'career',
        organizationId: orgId,
        weight: 5,
      });
      enqueueEdge({ from: key, to: careerKey, type: 'prepares_for', weight: 3, organizationId: orgId });
      edgesUpserted += 1;
      for (const sk of r.skills || []) {
        const skillKey = normKey('skill', sk.name);
        enqueueNode({ key: skillKey, label: sk.name, kind: 'skill', organizationId: orgId, weight: 2 });
        enqueueEdge({ from: key, to: skillKey, type: 'teaches', weight: 2, organizationId: orgId });
        enqueueEdge({
          from: skillKey,
          to: careerKey,
          type: 'prepares_for',
          weight: 2,
          organizationId: orgId,
        });
        edgesUpserted += 2;
      }
    }

    const plans = await StudyPlan.find(skillFilter).limit(40).lean();
    for (const p of plans) {
      const key = normKey('course', String(p._id));
      enqueueNode({
        key,
        label: p.title || p.topic,
        kind: 'course',
        organizationId: orgId,
        refType: 'StudyPlan',
        refId: p._id,
        weight: 3,
        searchText: `${p.title} ${p.topic}`,
      });
      const topicKey = normKey('topic', p.topic);
      enqueueNode({ key: topicKey, label: p.topic, kind: 'topic', organizationId: orgId, weight: 2 });
      enqueueEdge({ from: key, to: topicKey, type: 'teaches', weight: 2, organizationId: orgId });
      nodesUpserted += 2;
      edgesUpserted += 1;
    }

    const projects = await CollabProject.find({
      $or: [{ 'members.user': user._id }, { createdBy: user._id }],
    })
      .limit(30)
      .lean();
    for (const p of projects) {
      const key = normKey('project', String(p._id));
      enqueueNode({
        key,
        label: p.title,
        kind: 'project',
        organizationId: orgId,
        refType: 'CollabProject',
        refId: p._id,
        weight: 3,
        searchText: `${p.title} ${(p.tags || []).join(' ')}`,
      });
      nodesUpserted += 1;
      for (const tag of p.tags || []) {
        const topicKey = normKey('topic', tag);
        enqueueNode({ key: topicKey, label: tag, kind: 'topic', organizationId: orgId, weight: 1 });
        enqueueEdge({ from: key, to: topicKey, type: 'uses', weight: 1, organizationId: orgId });
        edgesUpserted += 1;
      }
    }

    const docs = await Document.find({ user: user._id })
      .select('title concepts keywords topics knowledgeGraph')
      .limit(40)
      .lean();
    for (const d of docs) {
      for (const c of d.concepts || []) {
        const conceptKey = normKey('concept', c);
        enqueueNode({ key: conceptKey, label: c, kind: 'concept', organizationId: orgId, weight: 2 });
        nodesUpserted += 1;
      }
      for (const rel of d.relationships || []) {
        enqueueEdge({
          from: normKey('concept', rel.from),
          to: normKey('concept', rel.to),
          type: rel.type === 'related' ? 'related' : 'related',
          weight: rel.weight || 1,
          organizationId: orgId,
        });
        edgesUpserted += 1;
      }
    }
  }

  // Career catalog skills → dependency edges
  for (const role of careerIntel.ROLE_CATALOG) {
    const careerKey = normKey('career', role.role);
    enqueueNode({
      key: careerKey,
      label: role.role,
      kind: 'career',
      organizationId: orgId,
      weight: 6,
      meta: { industry: role.industry, growth: role.growth },
      searchText: `${role.role} ${role.industry} ${role.skills.join(' ')}`,
    });
    nodesUpserted += 1;
    for (let i = 0; i < role.skills.length; i++) {
      const skillKey = normKey('skill', role.skills[i]);
      enqueueNode({
        key: skillKey,
        label: role.skills[i],
        kind: 'skill',
        organizationId: orgId,
        weight: 3,
      });
      enqueueEdge({
        from: skillKey,
        to: careerKey,
        type: 'prepares_for',
        weight: 3,
        organizationId: orgId,
      });
      if (i > 0) {
        enqueueEdge({
          from: normKey('skill', role.skills[i - 1]),
          to: skillKey,
          type: 'leads_to',
          weight: 2,
          organizationId: orgId,
        });
        edgesUpserted += 1;
      }
      edgesUpserted += 1;
      nodesUpserted += 1;
    }
    for (const cert of careerIntel.CERT_CATALOG.filter((c) => (c.roles || []).includes(role.role))) {
      const certKey = normKey('certification', cert.name);
      enqueueNode({
        key: certKey,
        label: cert.name,
        kind: 'certification',
        organizationId: orgId,
        weight: 4,
        meta: { provider: cert.provider },
      });
      enqueueEdge({
        from: certKey,
        to: careerKey,
        type: 'prepares_for',
        weight: 3,
        organizationId: orgId,
      });
      nodesUpserted += 1;
      edgesUpserted += 1;
    }
  }

  await flushGraphBulk(nodeOps, edgeOps);
  return {
    nodesUpserted,
    edgesUpserted,
    organizationId: orgId,
  };
}

function scheduleRebuild(opts) {
  setImmediate(() => {
    rebuildGraph(opts).catch((err) => logger.warn('graph rebuild failed', { error: err.message }));
  });
}

async function neighbors(key, { direction = 'both', types, limit = 40, organizationId } = {}) {
  const orgFilter = organizationId
    ? { $or: [{ organizationId }, { organizationId: null }] }
    : {};
  const typeFilter = types?.length ? { type: { $in: types } } : {};
  const outgoing =
    direction === 'in'
      ? []
      : await KnowledgeEdge.find({ from: key, ...typeFilter, ...orgFilter })
          .sort({ weight: -1 })
          .limit(limit)
          .lean();
  const incoming =
    direction === 'out'
      ? []
      : await KnowledgeEdge.find({ to: key, ...typeFilter, ...orgFilter })
          .sort({ weight: -1 })
          .limit(limit)
          .lean();
  const keys = [
    ...outgoing.map((e) => e.to),
    ...incoming.map((e) => e.from),
  ];
  const nodes = await KnowledgeNode.find({
    key: { $in: keys },
    ...(organizationId ? { $or: [{ organizationId }, { organizationId: null }] } : {}),
  }).lean();
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.key, n]));
  return {
    outgoing: outgoing.map((e) => ({ ...e, node: nodeMap[e.to] || null })),
    incoming: incoming.map((e) => ({ ...e, node: nodeMap[e.from] || null })),
  };
}

/**
 * BFS traversal for learning dependencies / related content.
 */
async function traverse(startKey, { depth = 2, limit = 50, organizationId, edgeTypes } = {}) {
  const visited = new Set([startKey]);
  const layers = [{ key: startKey, depth: 0 }];
  const results = [];
  let frontier = [startKey];

  for (let d = 0; d < depth && frontier.length && results.length < limit; d++) {
    const next = [];
    for (const key of frontier) {
      const n = await neighbors(key, {
        direction: 'both',
        types: edgeTypes,
        limit: 20,
        organizationId,
      });
      for (const edge of [...n.outgoing, ...n.incoming]) {
        const target = edge.to === key ? edge.from : edge.to;
        const node = edge.node;
        if (!target || visited.has(target)) continue;
        visited.add(target);
        next.push(target);
        results.push({
          key: target,
          depth: d + 1,
          via: edge.type,
          weight: edge.weight,
          node,
        });
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    frontier = next;
    layers.push(...next.map((key) => ({ key, depth: d + 1 })));
  }
  return { startKey, results, visitedCount: visited.size };
}

async function collectUserHistory(user) {
  const filter = await orgListFilter(user);
  const [skills, userBooks, watch, goals, roadmaps, plans] = await Promise.all([
    Skill.find(filter).sort({ updatedAt: -1 }).limit(50).lean(),
    UserBook.find({ user: user._id }).sort({ updatedAt: -1 }).limit(30).populate('book', 'title subject tags category').lean(),
    MediaProgress.find({ user: user._id }).sort({ lastWatchedAt: -1 }).limit(30).populate('media', 'title type subject topics').lean(),
    Goal.find(filter).sort({ updatedAt: -1 }).limit(20).lean(),
    Roadmap.find(filter).sort({ updatedAt: -1 }).limit(10).lean(),
    StudyPlan.find(filter).sort({ updatedAt: -1 }).limit(10).lean(),
  ]);

  const interestWeights = new Map();
  const bump = (label, w = 1) => {
    if (!label) return;
    const k = String(label).toLowerCase().trim();
    if (!k) return;
    interestWeights.set(k, (interestWeights.get(k) || 0) + w);
  };

  for (const s of skills) {
    bump(s.name, 1 + (s.mastery || 0) / 50);
  }
  for (const ub of userBooks) {
    bump(ub.book?.subject, 2);
    bump(ub.book?.category, 1);
    for (const t of ub.book?.tags || []) bump(t, 1.5);
    if (ub.status === 'reading') bump(ub.book?.title, 2);
  }
  for (const w of watch) {
    bump(w.media?.subject, 2);
    for (const t of w.media?.topics || []) bump(t, 1.5);
    if (w.completed) bump(w.media?.title, 2);
  }
  for (const g of goals) bump(g.title, 1.5);
  for (const r of roadmaps) {
    bump(r.career, 3);
    for (const s of r.skills || []) bump(s.name, 1);
  }
  for (const p of plans) bump(p.topic, 2);
  if (user.targetCareer) bump(user.targetCareer, 4);

  const interests = [...interestWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([topic, weight]) => ({ topic, weight: Math.round(weight * 10) / 10 }));

  return {
    learningHistory: {
      skills: skills.map((s) => ({ name: s.name, mastery: s.mastery, level: s.level })),
      reading: userBooks.map((ub) => ({
        bookId: ub.book?._id,
        title: ub.book?.title,
        status: ub.status,
        progress: ub.readingProgress,
      })),
      watching: watch.map((w) => ({
        mediaId: w.media?._id,
        title: w.media?.title,
        type: w.media?.type,
        percent: w.percent,
        completed: w.completed,
      })),
      goals: goals.map((g) => ({ id: g._id, title: g.title, status: g.status, progress: g.progress })),
      roadmaps: roadmaps.map((r) => ({ id: r._id, title: r.title, career: r.career, progress: r.progress })),
      courses: plans.map((p) => ({ id: p._id, title: p.title, topic: p.topic, progress: p.progress })),
    },
    interests,
  };
}

function scoreAgainstInterests(text, interests) {
  const hay = String(text || '').toLowerCase();
  let score = 0;
  for (const i of interests) {
    if (hay.includes(String(i.topic).toLowerCase())) score += i.weight * 3;
  }
  score += researchKnowledge.scoreTextMatch(hay, interests.map((i) => i.topic).join(' '));
  return score;
}

function confidenceFromSignals({
  interestHits = 0,
  gapHits = 0,
  weaknessHits = 0,
  masteryHits = 0,
  careerHits = 0,
  weight = 0,
  coldStart = false,
  score = 0,
} = {}) {
  if (coldStart) return Math.max(20, Math.min(42, Math.round((score || 40) * 0.45) + 15));
  let c = 28;
  c += Math.min(22, interestHits * 8);
  c += Math.min(20, gapHits * 12);
  c += Math.min(14, weaknessHits * 7);
  c += Math.min(10, masteryHits * 5);
  c += Math.min(10, careerHits * 8);
  c += Math.min(10, Math.round((weight || 0) / 2));
  return Math.max(18, Math.min(95, Math.round(c)));
}

function diversifyByKind(items, { maxPerKind = 2, limit = 16 } = {}) {
  const counts = Object.create(null);
  const primary = [];
  const overflow = [];
  for (const item of items || []) {
    const k = String(item.kind || item.itemType || 'other');
    if ((counts[k] || 0) < maxPerKind) {
      counts[k] = (counts[k] || 0) + 1;
      primary.push(item);
    } else {
      overflow.push(item);
    }
  }
  return [...primary, ...overflow].slice(0, limit);
}

function normalizeRecItemType(kind) {
  const k = String(kind || 'topic').toLowerCase();
  const allowed = new Set([
    'book',
    'course',
    'video',
    'animation',
    'lesson',
    'project',
    'certification',
    'career',
    'topic',
    'skill',
    'roadmap',
  ]);
  if (allowed.has(k)) return k;
  if (k === 'role') return 'career';
  return 'topic';
}

async function logRecommendationImpressions(user, items, source = 'graph') {
  if (!user?._id || !items?.length) return 0;
  const docs = items.slice(0, 8).map((item) => ({
    user: user._id,
    organizationId: user.organizationId || null,
    itemType: normalizeRecItemType(item.kind || item.itemType),
    itemId: String(item.refId || item.itemId || item.id || '').slice(0, 120),
    itemKey: String(item.key || item.itemKey || '').slice(0, 200),
    score: Math.min(100, Math.max(0, Number(item.score) || 0)),
    reason: String(item.reason || '').slice(0, 400),
    engaged: false,
    dismissed: false,
    source: String(source || 'graph').slice(0, 40),
  }));
  try {
    const since = new Date(Date.now() - 6 * 3600 * 1000);
    const keys = docs.map((d) => d.itemId || d.itemKey).filter(Boolean);
    let fresh = docs;
    if (keys.length) {
      const recent = await RecommendationEvent.find({
        user: user._id,
        source: String(source || 'graph').slice(0, 40),
        createdAt: { $gte: since },
        $or: [{ itemId: { $in: keys } }, { itemKey: { $in: keys } }],
      })
        .select('itemId itemKey')
        .limit(40)
        .lean();
      const seen = new Set(recent.map((r) => r.itemId || r.itemKey));
      fresh = docs.filter((d) => !seen.has(d.itemId || d.itemKey));
    }
    if (!fresh.length) return 0;
    await RecommendationEvent.insertMany(fresh, { ordered: false });
    return fresh.length;
  } catch {
    return 0;
  }
}

function withCatalogConfidence(list, baseScore, reason, kind) {
  return (list || []).map((item, i) => {
    const score = Math.max(20, (item.score ?? baseScore) - i * 3);
    return {
      ...item,
      kind: item.kind || kind,
      score,
      confidence: confidenceFromSignals({ coldStart: true, score }),
      reason: item.reason || reason,
      source: item.source || 'catalog',
    };
  });
}

async function buildRecommendations(user, { limit = 8 } = {}) {
  const { interests, learningHistory } = await collectUserHistory(user);
  const { skills, weaknesses, strengths } = await learningEco.analyzeSkills(user);
  const gap = await careerIntel.analyzeSkillGap(user);
  const orgId = user.organizationId || null;
  const targetCareer = String(user.targetCareer || gap.targetRole || '').toLowerCase();
  const lowMastery = (skills || [])
    .filter((s) => (s.mastery ?? 0) < 55)
    .map((s) => ({ name: s.name || s.skill, mastery: s.mastery ?? 0 }));

  const nodeFilter = orgId
    ? { $or: [{ organizationId: orgId }, { organizationId: null }] }
    : { organizationId: null };
  const contentNodes = await KnowledgeNode.find({
    ...nodeFilter,
    kind: { $in: ['book', 'video', 'animation', 'course', 'project', 'certification', 'career', 'lesson', 'roadmap'] },
  })
    .sort({ weight: -1, updatedAt: -1 })
    .limit(120)
    .lean();

  const scored = contentNodes
    .map((n) => {
      const text = `${n.label} ${n.searchText || ''} ${(n.aliases || []).join(' ')}`;
      const hay = text.toLowerCase();
      let score = scoreAgainstInterests(text, interests);
      let interestHits = 0;
      let gapHits = 0;
      let weaknessHits = 0;
      let masteryHits = 0;
      let careerHits = 0;
      let reason = 'Graph relevance';

      for (const i of interests) {
        if (hay.includes(String(i.topic).toLowerCase())) interestHits += 1;
      }
      for (const m of gap.missing || []) {
        if (hay.includes(String(m).toLowerCase())) {
          gapHits += 1;
          score += 20;
          reason = `Closes skill gap: ${m}`;
        }
      }
      for (const w of weaknesses || []) {
        const skill = w.skill || w.name;
        if (skill && hay.includes(String(skill).toLowerCase())) {
          weaknessHits += 1;
          score += 15;
          if (reason === 'Graph relevance') reason = `Strengthens weak skill: ${skill}`;
        }
      }
      for (const s of lowMastery) {
        if (s.name && hay.includes(String(s.name).toLowerCase())) {
          masteryHits += 1;
          score += Math.min(18, Math.round((55 - s.mastery) / 3));
          if (reason === 'Graph relevance') reason = `Raises mastery: ${s.name}`;
        }
      }
      if (targetCareer && (hay.includes(targetCareer) || String(n.kind) === 'career')) {
        careerHits += 1;
        score += 12;
        if (reason === 'Graph relevance') reason = `Aligned to career: ${user.targetCareer || gap.targetRole}`;
      }
      if (interestHits && reason === 'Graph relevance' && interests[0]) {
        reason = `Matches interest: ${interests[0].topic}`;
      }

      // Recency bump (fresher nodes rank slightly higher)
      if (n.updatedAt) {
        const ageDays = Math.max(0, (Date.now() - new Date(n.updatedAt).getTime()) / 864e5);
        score += Math.max(0, 8 - Math.min(8, ageDays / 14));
      }
      score += (n.weight || 0) * 2;

      const finalScore = Math.min(100, Math.round(score));
      return {
        key: n.key,
        kind: n.kind,
        label: n.label,
        refId: n.refId,
        refType: n.refType,
        score: finalScore,
        confidence: confidenceFromSignals({
          interestHits,
          gapHits,
          weaknessHits,
          masteryHits,
          careerHits,
          weight: n.weight,
          score: finalScore,
        }),
        reason,
        source: 'graph',
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.confidence || 0) - (a.confidence || 0));

  const byKind = (kind) => scored.filter((s) => s.kind === kind).slice(0, limit);

  const learningRecs = await careerIntel.recommendLearning(user);
  const careerProfile = await careerIntel.getOrCreateCareerProfile(user);
  const careerRecs = careerIntel.recommendCareers(careerProfile, skills);
  const certs = careerIntel.recommendCertifications(careerProfile, gap.targetRole, skills);

  const recommendations = {
    books: byKind('book').length
      ? byKind('book')
      : withCatalogConfidence(
          (learningRecs.books || []).slice(0, limit).map((b) => ({
            kind: 'book',
            label: b.title,
            refId: b._id,
          })),
          70,
          'Cold-start catalog fallback',
          'book'
        ),
    courses: byKind('course').length
      ? byKind('course')
      : withCatalogConfidence(
          (learningRecs.courses || []).slice(0, limit).map((c) => ({
            kind: 'course',
            label: c.title,
            refId: c.id,
          })),
          65,
          'Active study plans / gaps',
          'course'
        ),
    videos: byKind('video').length
      ? byKind('video')
      : withCatalogConfidence(
          (learningRecs.videos || []).slice(0, limit).map((v) => ({
            kind: 'video',
            label: v.title,
            refId: v._id,
          })),
          60,
          'Media catalog',
          'video'
        ),
    animations: byKind('animation').length
      ? byKind('animation')
      : withCatalogConfidence(
          (learningRecs.animations || []).slice(0, limit).map((a) => ({
            kind: 'animation',
            label: a.title,
            refId: a._id,
          })),
          55,
          'Visual learning',
          'animation'
        ),
    lessons: byKind('lesson').slice(0, limit),
    projects: byKind('project').length
      ? byKind('project')
      : withCatalogConfidence(
          (learningRecs.projects || []).slice(0, limit).map((p) => ({
            kind: 'project',
            label: p.idea || p.skill,
          })),
          50,
          'Practice project',
          'project'
        ),
    certifications: byKind('certification').length
      ? byKind('certification')
      : withCatalogConfidence(
          certs.slice(0, limit).map((c) => ({
            kind: 'certification',
            label: c.name,
            reason: c.reason,
            score: c.score,
            confidence: c.confidence,
          })),
          60,
          'Certification path',
          'certification'
        ),
    careers: byKind('career').length
      ? byKind('career')
      : careerRecs.slice(0, limit).map((c) => ({
          kind: 'career',
          label: c.role,
          score: c.matchScore,
          confidence: c.confidence ?? confidenceFromSignals({ careerHits: 1, score: c.matchScore }),
          reason: c.reason || `Growth: ${c.growth}`,
          source: 'catalog',
        })),
    roadmaps: byKind('roadmap').slice(0, limit),
  };

  let feed = diversifyByKind(scored, { maxPerKind: 2, limit: limit * 2 });
  if (!feed.length) {
    feed = diversifyByKind(
      Object.values(recommendations).flat().filter(Boolean),
      { maxPerKind: 2, limit: limit * 2 }
    );
  }

  logRecommendationImpressions(user, feed, 'graph').catch(() => {});

  return {
    interests,
    learningHistory,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    gap: { missing: gap.missing, targetRole: gap.targetRole, readiness: gap.readiness },
    recommendations,
    feed,
    learning: learningRecs,
    meta: { coldStart: scored.length === 0, diversified: true },
  };
}

async function learningIntelligence(user) {
  const { skills, weaknesses, strengths } = await learningEco.analyzeSkills(user);
  const gap = await careerIntel.analyzeSkillGap(user);
  const { interests } = await collectUserHistory(user);

  const weakTopics = weaknesses.map((w) => ({
    topic: w.skill,
    score: w.score,
    difficulty: w.score < 30 ? 'hard' : w.score < 60 ? 'medium' : 'easy',
    evidence: w.evidence,
  }));
  const strongTopics = strengths.map((s) => ({
    topic: s.skill,
    score: s.score,
    evidence: s.evidence,
  }));

  const nextBest =
    gap.missing[0] ||
    weakTopics[0]?.topic ||
    interests[0]?.topic ||
    user.targetCareer ||
    'fundamentals';

  const sequence = [];
  const deps = await KnowledgeEdge.find({
    type: { $in: ['requires', 'leads_to'] },
    $or: [
      { to: normKey('skill', nextBest) },
      { from: normKey('skill', nextBest) },
      { to: normKey('topic', nextBest) },
      { from: normKey('topic', nextBest) },
    ],
  })
    .sort({ weight: -1 })
    .limit(12)
    .lean();

  for (const e of deps) {
    sequence.push({
      from: e.from,
      to: e.to,
      type: e.type,
      weight: e.weight,
    });
  }

  if (!sequence.length) {
    for (const m of gap.missing.slice(0, 5)) {
      sequence.push({
        from: normKey('skill', m),
        to: normKey('career', gap.targetRole),
        type: 'prepares_for',
        weight: 2,
      });
    }
  }

  const difficulty =
    weakTopics.filter((t) => t.difficulty === 'hard').length >= 2
      ? 'challenging'
      : weakTopics.length
        ? 'moderate'
        : 'comfortable';

  return {
    nextBestTopic: nextBest,
    weakTopics,
    strongTopics,
    knowledgeGaps: gap.missing,
    difficultyEstimate: difficulty,
    adaptiveSequence: sequence,
    readiness: gap.readiness,
    skillCount: skills.length,
    skills,
    weaknesses,
    strengths,
  };
}

async function relatedContent(keyOrLabel, { organizationId, limit = 12 } = {}) {
  let key = keyOrLabel;
  if (!String(keyOrLabel).includes(':')) {
    const node = await KnowledgeNode.findOne({
      $or: [
        { label: new RegExp(`^${String(keyOrLabel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { key: normKey('topic', keyOrLabel) },
        { key: normKey('skill', keyOrLabel) },
        { key: normKey('concept', keyOrLabel) },
      ],
    }).lean();
    key = node?.key || normKey('topic', keyOrLabel);
  }
  const walk = await traverse(key, { depth: 2, limit: 80, organizationId });
  const grouped = {
    books: [],
    courses: [],
    videos: [],
    animations: [],
    projects: [],
    skills: [],
    careers: [],
    topics: [],
    concepts: [],
  };
  for (const r of walk.results) {
    const kind = r.node?.kind;
    if (!kind) continue;
    const bucket =
      kind === 'book'
        ? 'books'
        : kind === 'course'
          ? 'courses'
          : kind === 'video'
            ? 'videos'
            : kind === 'animation'
              ? 'animations'
              : kind === 'project'
                ? 'projects'
                : kind === 'skill'
                  ? 'skills'
                  : kind === 'career'
                    ? 'careers'
                    : kind === 'topic'
                      ? 'topics'
                      : kind === 'concept'
                        ? 'concepts'
                        : null;
    if (bucket && grouped[bucket].length < limit) {
      grouped[bucket].push({
        key: r.key,
        label: r.node.label,
        refId: r.node.refId,
        via: r.via,
        depth: r.depth,
        score: Math.round((r.weight || 1) * 10 + (3 - r.depth) * 5),
      });
    }
  }
  return { seed: key, related: grouped };
}

async function intelligentSearch(user, q, { limit = 20 } = {}) {
  const query = String(q || '').trim().slice(0, 200);
  if (!query) return { results: [], suggestions: [], query };
  const orgId = user.organizationId || null;
  const orgClause = orgId
    ? { $or: [{ organizationId: orgId }, { organizationId: null }] }
    : {};

  let nodes = [];
  try {
    nodes = await KnowledgeNode.find(
      { $text: { $search: query }, ...orgClause },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
  } catch (_) {
    nodes = [];
  }

  if (!nodes.length) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nodes = await KnowledgeNode.find({
      ...orgClause,
      $and: [
        {
          $or: [
            { label: { $regex: safe, $options: 'i' } },
            { searchText: { $regex: safe, $options: 'i' } },
          ],
        },
      ],
    })
      .limit(limit)
      .lean();
  }

  const { interests } = await collectUserHistory(user);
  const results = nodes
    .map((n) => {
      const personal = scoreAgainstInterests(`${n.label} ${n.searchText}`, interests);
      const base = n.score || researchKnowledge.scoreTextMatch(`${n.label} ${n.searchText}`, query) * 5;
      return {
        key: n.key,
        label: n.label,
        kind: n.kind,
        refId: n.refId,
        score: Math.min(100, Math.round(Number(base) + personal)),
        reason: personal > 5 ? 'Personalized ranking' : 'Semantic/text match',
      };
    })
    .sort((a, b) => b.score - a.score);

  const related = results[0]
    ? await relatedContent(results[0].key, { organizationId: orgId, limit: 5 })
    : null;

  const suggestions = [
    ...new Set([
      ...interests.slice(0, 5).map((i) => i.topic),
      ...results.slice(0, 5).map((r) => r.label),
    ]),
  ].slice(0, 10);

  return { results, related: related?.related || null, suggestions, query };
}

async function recordRecommendationFeedback(user, body) {
  return RecommendationEvent.create({
    user: user._id,
    organizationId: user.organizationId || null,
    itemType: body.itemType,
    itemId: body.itemId || '',
    itemKey: body.itemKey || '',
    score: body.score || 0,
    reason: body.reason || '',
    engaged: !!body.engaged,
    dismissed: !!body.dismissed,
    source: body.source || 'graph',
  });
}

async function analytics(user) {
  const orgId = user.organizationId || null;
  const nodeFilter = orgId
    ? { $or: [{ organizationId: orgId }, { organizationId: null }] }
    : {};
  const [nodeCount, edgeCount, byKind, events, { interests }, intel] = await Promise.all([
    KnowledgeNode.countDocuments(nodeFilter),
    KnowledgeEdge.countDocuments(nodeFilter),
    KnowledgeNode.aggregate([
      { $match: nodeFilter },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ]),
    RecommendationEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    collectUserHistory(user),
    learningIntelligence(user),
  ]);

  const engaged = events.filter((e) => e.engaged).length;
  const dismissed = events.filter((e) => e.dismissed).length;
  const impressions = events.filter((e) => !e.engaged && !e.dismissed).length;
  const feedbackSample = engaged + dismissed;
  const acceptanceRate = feedbackSample
    ? Math.round((engaged / feedbackSample) * 100)
    : null;
  const impressionEngagement = events.length
    ? Math.round((engaged / events.length) * 100)
    : null;

  const coverageKinds = ['book', 'course', 'video', 'animation', 'skill', 'career', 'topic'];
  const kindMap = Object.fromEntries(byKind.map((k) => [k._id, k.count]));
  const coverage =
    coverageKinds.filter((k) => (kindMap[k] || 0) > 0).length / coverageKinds.length;

  return {
    knowledgeCoverage: {
      percent: Math.round(coverage * 100),
      nodes: nodeCount,
      edges: edgeCount,
      byKind: kindMap,
    },
    recommendationAccuracy: {
      percent: acceptanceRate ?? impressionEngagement,
      acceptanceRate,
      impressionEngagement,
      sampleSize: events.length,
      impressions,
      engaged,
      dismissed,
      feedbackSample,
    },
    learningPatterns: {
      nextBestTopic: intel.nextBestTopic,
      difficulty: intel.difficultyEstimate,
      weakCount: intel.weakTopics.length,
      strongCount: intel.strongTopics.length,
    },
    skillGrowth: {
      readiness: intel.readiness,
      skillCount: intel.skillCount,
      gaps: intel.knowledgeGaps.slice(0, 8),
    },
    userInterests: interests.slice(0, 15),
  };
}

function isEnabled() {
  const flag = process.env.INTELLIGENCE_V3_ENABLED
  if (flag === undefined || flag === '') return true
  return !['0', 'false', 'off', 'no'].includes(String(flag).toLowerCase())
}

/** Compatibility shims used by mentor / intelligence / personal knowledge layers. */
async function syncFromCanonical(userId, { force = false } = {}) {
  const User = require('../models/User')
  const user = await User.findById(userId).select('_id organizationId').lean()
  if (!user) return { synced: false, reason: 'USER_NOT_FOUND' }
  if (force) {
    await rebuildGraph({ user: user._id, organizationId: user.organizationId || null })
    return { synced: true, forced: true }
  }
  scheduleRebuild({ user: user._id, organizationId: user.organizationId || null })
  return { synced: true, forced: false, scheduled: true }
}

async function getGraphSummary(userId) {
  const User = require('../models/User')
  const user = await User.findById(userId).select('_id organizationId').lean()
  if (!user) return { nodes: 0, edges: 0, topics: [], skills: [] }
  const summary = await analytics(user)
  return {
    nodes: summary.nodeCount || 0,
    edges: summary.edgeCount || 0,
    byKind: summary.byKind || {},
    readiness: summary.skillGrowth?.readiness || null,
    topics: summary.learningPatterns?.nextBestTopic ? [summary.learningPatterns.nextBestTopic] : [],
    skills: summary.skillGrowth?.gaps || [],
    raw: summary,
  }
}

async function getRelatedContext(userId, { entityType, entityId, limit = 8 } = {}) {
  const label = [entityType, entityId].filter(Boolean).join(':')
  if (!label) return []
  const related = await relatedContent(label, { limit }).catch(() => [])
  return (related || []).map((item) => ({
    relation: item.type || item.kind || 'related',
    to: item.label || item.key || item.title || 'related item',
    label: item.kind || item.type || '',
    item,
  }))
}

module.exports = {
  isEnabled,
  syncFromCanonical,
  getGraphSummary,
  getRelatedContext,
  normKey,
  upsertNode,
  upsertEdge,
  rebuildGraph,
  scheduleRebuild,
  neighbors,
  traverse,
  collectUserHistory,
  buildRecommendations,
  learningIntelligence,
  relatedContent,
  intelligentSearch,
  recordRecommendationFeedback,
  analytics,
  confidenceFromSignals,
  diversifyByKind,
  logRecommendationImpressions,
  normalizeRecItemType,
};
