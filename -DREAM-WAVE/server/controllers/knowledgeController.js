const KnowledgeNode = require('../models/KnowledgeNode');
const KnowledgeEdge = require('../models/KnowledgeEdge');
const graph = require('../services/knowledgeGraphService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { auditFromRequest } = require('../utils/audit');

exports.rebuild = asyncHandler(async (req, res) => {
  const result = await graph.rebuildGraph({ user: req.user, organizationId: req.user.organizationId });
  await auditFromRequest(req, {
    action: 'graph.rebuild',
    resource: 'KnowledgeNode',
    meta: result,
  });
  res.json({ success: true, data: { rebuild: result } });
});

exports.listNodes = asyncHandler(async (req, res) => {
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.user.role === 'admin') {
    /* platform admin may list all */
  } else if (req.user.organizationId) {
    filter.$or = [{ organizationId: req.user.organizationId }, { organizationId: null }];
  } else {
    // Never expose other organizations' nodes to personal accounts.
    filter.organizationId = null;
  }
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 120) };
  const [nodes, total] = await Promise.all([
    KnowledgeNode.find(filter).sort({ weight: -1, updatedAt: -1 }).skip(skip).limit(limit),
    KnowledgeNode.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { nodes, pagination: paginationMeta(page, limit, total) },
  });
});

exports.getNode = asyncHandler(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const node =
    (await KnowledgeNode.findOne({ key })) ||
    (await KnowledgeNode.findById(req.params.key).catch(() => null));
  if (!node) throw new AppError('Knowledge node not found', 404);
  if (req.user.role !== 'admin') {
    if (node.organizationId) {
      if (
        !req.user.organizationId ||
        String(node.organizationId) !== String(req.user.organizationId)
      ) {
        throw new AppError('Knowledge node not found', 404);
      }
    } else if (req.user.organizationId) {
      // Org members may read global/null nodes produced by rebuild for their context
    }
  }
  const n = await graph.neighbors(node.key, {
    organizationId: req.user.organizationId,
    limit: 40,
  });
  res.json({ success: true, data: { node, neighbors: n } });
});

exports.createNode = asyncHandler(async (req, res) => {
  const key = req.body.key || graph.normKey(req.body.kind, req.body.label);
  const node = await graph.upsertNode({
    key,
    label: req.body.label,
    kind: req.body.kind,
    organizationId: req.user.organizationId,
    refType: req.body.refType,
    refId: req.body.refId,
    aliases: req.body.aliases,
    weight: req.body.weight,
    meta: req.body.meta,
    searchText: req.body.searchText,
  });
  res.status(201).json({ success: true, data: { node } });
});

exports.createEdge = asyncHandler(async (req, res) => {
  const edge = await graph.upsertEdge({
    from: req.body.from,
    to: req.body.to,
    type: req.body.type || 'related',
    weight: req.body.weight,
    organizationId: req.user.organizationId,
    meta: req.body.meta,
  });
  if (!edge) throw new AppError('Invalid edge', 400);
  res.status(201).json({ success: true, data: { edge } });
});

exports.listEdges = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.from) filter.from = req.query.from;
  if (req.query.to) filter.to = req.query.to;
  if (req.query.type) filter.type = req.query.type;
  if (req.user.role === 'admin') {
    /* unrestricted */
  } else if (req.user.organizationId) {
    filter.$or = [{ organizationId: req.user.organizationId }, { organizationId: null }];
  } else {
    filter.organizationId = null;
  }
  const edges = await KnowledgeEdge.find(filter).sort({ weight: -1 }).limit(100);
  res.json({ success: true, data: { edges } });
});

exports.neighbors = asyncHandler(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const data = await graph.neighbors(key, {
    direction: req.query.direction || 'both',
    types: req.query.type ? [req.query.type] : undefined,
    organizationId: req.user.organizationId,
    limit: Math.min(50, parseInt(req.query.limit, 10) || 40),
  });
  res.json({ success: true, data });
});

exports.traverse = asyncHandler(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const data = await graph.traverse(key, {
    depth: Math.min(4, parseInt(req.query.depth, 10) || 2),
    limit: Math.min(80, parseInt(req.query.limit, 10) || 50),
    organizationId: req.user.organizationId,
    edgeTypes: req.query.type ? [req.query.type] : undefined,
  });
  res.json({ success: true, data });
});

exports.dependencies = asyncHandler(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const data = await graph.neighbors(key, {
    direction: 'both',
    types: ['requires', 'leads_to', 'prepares_for'],
    organizationId: req.user.organizationId,
  });
  res.json({ success: true, data: { dependencies: data } });
});

exports.recommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit, 10) || 8);
  // Ensure graph has baseline data for this user/org
  const nodeCount = await KnowledgeNode.countDocuments({
    $or: [{ organizationId: req.user.organizationId || null }, { organizationId: null }],
  });
  if (nodeCount < 20) {
    await graph.rebuildGraph({ user: req.user });
  }
  const data = await graph.buildRecommendations(req.user, { limit });
  res.json({ success: true, data });
});

exports.feed = asyncHandler(async (req, res) => {
  const data = await graph.buildRecommendations(req.user, {
    limit: Math.min(20, parseInt(req.query.limit, 10) || 12),
  });
  res.json({
    success: true,
    data: {
      feed: data.feed,
      interests: data.interests,
      next: data.gap,
    },
  });
});

exports.history = asyncHandler(async (req, res) => {
  const history = await graph.collectUserHistory(req.user);
  res.json({ success: true, data: history });
});

exports.intelligence = asyncHandler(async (req, res) => {
  const data = await graph.learningIntelligence(req.user);
  res.json({ success: true, data: { intelligence: data } });
});

exports.related = asyncHandler(async (req, res) => {
  const seed = req.query.q || req.params.key || req.body?.seed;
  if (!seed) throw new AppError('seed or q required', 400);
  const data = await graph.relatedContent(decodeURIComponent(String(seed)), {
    organizationId: req.user.organizationId,
    limit: Math.min(20, parseInt(req.query.limit, 10) || 12),
  });
  res.json({ success: true, data });
});

exports.search = asyncHandler(async (req, res) => {
  const q = req.query.q || req.body?.q;
  if (!q) throw new AppError('q required', 400);
  const nodeCount = await KnowledgeNode.countDocuments({});
  if (nodeCount < 10) await graph.rebuildGraph({ user: req.user });
  const data = await graph.intelligentSearch(req.user, q, {
    limit: Math.min(40, parseInt(req.query.limit, 10) || 20),
  });
  res.json({ success: true, data });
});

exports.suggestions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    const { interests } = await graph.collectUserHistory(req.user);
    return res.json({
      success: true,
      data: { suggestions: interests.slice(0, 10).map((i) => i.topic) },
    });
  }
  const data = await graph.intelligentSearch(req.user, q, { limit: 8 });
  res.json({ success: true, data: { suggestions: data.suggestions, results: data.results.slice(0, 5) } });
});

exports.feedback = asyncHandler(async (req, res) => {
  const event = await graph.recordRecommendationFeedback(req.user, req.body);
  res.status(201).json({ success: true, data: { event } });
});

exports.analytics = asyncHandler(async (req, res) => {
  const nodeCount = await KnowledgeNode.countDocuments({});
  if (nodeCount < 10) await graph.rebuildGraph({ user: req.user });
  const analytics = await graph.analytics(req.user);
  res.json({ success: true, data: { analytics } });
});
