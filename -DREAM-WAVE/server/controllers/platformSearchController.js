const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { Book } = require('../models/Book');
const MediaItem = require('../models/MediaItem');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Document = require('../models/Document');
const ResearchProject = require('../models/ResearchProject');
const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const { orgListFilter } = require('../utils/orgScope');
const knowledgeGraph = require('../services/knowledgeGraphService');

function escapeRx(q) {
  return new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/**
 * Unified cross-platform search facade — aggregates existing module surfaces.
 */
exports.unifiedSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) throw new AppError('Query q is required', 400);
  const limit = Math.min(15, Math.max(1, parseInt(req.query.limit, 10) || 8));
  const types = String(req.query.types || 'all')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const want = (t) => types.includes('all') || types.includes(t);
  const rx = escapeRx(q);
  const filter = await orgListFilter(req.user);
  const results = {};
  const jobs = [];

  if (want('books')) {
    const access = [
      { scope: 'public' },
      { scope: 'personal', uploadedBy: req.user._id },
    ];
    if (req.user.organizationId) {
      access.push({
        organizationId: req.user.organizationId,
        scope: { $in: ['institution', 'company'] },
      });
    }
    jobs.push(
      Book.find({
        $and: [{ $or: access }, { $or: [{ title: rx }, { author: rx }, { subject: rx }, { tags: rx }] }],
      })
        .limit(limit)
        .select('title author subject scope coverUrl')
        .lean()
        .then((books) => {
          results.books = books;
        })
        .catch(() => {
          results.books = [];
        })
    );
  }

  if (want('media')) {
    const access = [{ scope: 'public' }, { uploadedBy: req.user._id }];
    if (req.user.organizationId) access.push({ organizationId: req.user.organizationId });
    jobs.push(
      MediaItem.find({
        $and: [
          { $or: access },
          { $or: [{ title: rx }, { subject: rx }, { topics: rx }, { tags: rx }] },
        ],
      })
        .limit(limit)
        .select('title type subject scope')
        .lean()
        .then((media) => {
          results.media = media;
        })
        .catch(() => {
          results.media = [];
        })
    );
  }

  if (want('goals')) {
    jobs.push(
      Goal.find({ ...filter, $or: [{ title: rx }, { description: rx }, { tags: rx }] })
        .limit(limit)
        .select('title status progress category')
        .lean()
        .then((goals) => {
          results.goals = goals;
        })
        .catch(() => {
          results.goals = [];
        })
    );
  }

  if (want('tasks')) {
    jobs.push(
      Task.find({ ...filter, $or: [{ title: rx }, { description: rx }, { tags: rx }] })
        .limit(limit)
        .select('title status priority dueDate')
        .lean()
        .then((tasks) => {
          results.tasks = tasks;
        })
        .catch(() => {
          results.tasks = [];
        })
    );
  }

  if (want('documents')) {
    jobs.push(
      Document.find({ ...filter, $or: [{ title: rx }, { originalName: rx }] })
        .limit(limit)
        .select('title originalName mimeType')
        .lean()
        .then((documents) => {
          results.documents = documents;
        })
        .catch(() => {
          results.documents = [];
        })
    );
  }

  if (want('research')) {
    jobs.push(
      ResearchProject.find({ ...filter, $or: [{ title: rx }, { description: rx }, { tags: rx }] })
        .limit(limit)
        .select('title status tags')
        .lean()
        .then((research) => {
          results.research = research;
        })
        .catch(() => {
          results.research = [];
        })
    );
  }

  if (want('community')) {
    const communityAccess = [
      { type: 'public' },
      { 'members.user': req.user._id },
      { createdBy: req.user._id },
    ];
    if (req.user.organizationId) {
      communityAccess.push({ organizationId: req.user.organizationId });
    }
    jobs.push(
      Community.find({
        isArchived: { $ne: true },
        $and: [
          { $or: communityAccess },
          { $or: [{ name: rx }, { description: rx }, { tags: rx }] },
        ],
      })
        .limit(limit)
        .select('name slug type memberCount tags')
        .lean()
        .then((communities) => {
          results.communities = communities;
        })
        .catch(() => {
          results.communities = [];
        })
    );
    jobs.push(
      (async () => {
        try {
          const discussions = await Discussion.find({
            status: 'open',
            $or: [{ title: rx }, { body: rx }, { tags: rx }],
          })
            .limit(limit * 2)
            .select('title tags community replyCount')
            .lean();
          const ids = discussions.map((d) => d.community).filter(Boolean);
          const allowed = await Community.find({
            _id: { $in: ids },
            $or: communityAccess,
          })
            .select('_id')
            .lean();
          const allowSet = new Set(allowed.map((c) => String(c._id)));
          results.discussions = discussions
            .filter((d) => allowSet.has(String(d.community)))
            .slice(0, limit);
        } catch {
          results.discussions = [];
        }
      })()
    );
  }

  if (want('graph')) {
    jobs.push(
      knowledgeGraph
        .intelligentSearch(req.user, q, { limit })
        .then((graph) => {
          results.graph = graph;
        })
        .catch(() => {
          results.graph = { results: [] };
        })
    );
  }

  await Promise.all(jobs);

  const totalHits = Object.values(results).reduce((n, v) => {
    if (Array.isArray(v)) return n + v.length;
    if (v?.results && Array.isArray(v.results)) return n + v.results.length;
    return n;
  }, 0);

  res.json({
    success: true,
    data: { query: q, totalHits, results },
  });
});
