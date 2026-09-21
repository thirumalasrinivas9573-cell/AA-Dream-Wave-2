const ResearchProject = require('../models/ResearchProject');
const ResearchNote = require('../models/ResearchNote');
const ResearchHighlight = require('../models/ResearchHighlight');
const ResearchBookmark = require('../models/ResearchBookmark');
const ResearchCollection = require('../models/ResearchCollection');
const Document = require('../models/Document');
const AiUsage = require('../models/AiUsage');
const aiService = require('../services/aiService');
const researchKnowledge = require('../services/researchKnowledgeService');
const { detectFileType, extractText } = require('../services/documentService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { toAssetUrl } = require('../utils/assetUrl');
const { runWithAiCredit } = require('../services/entitlements');
const { orgCreateStamp, orgListFilter, findAccessible } = require('../utils/orgScope');
const { auditFromRequest } = require('../utils/audit');
const { parsePagination, paginationMeta } = require('../utils/pagination');

function parsePage(req) {
  return parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
}

async function getProjectOrThrow(req, id) {
  const project = await findAccessible(ResearchProject, req.user, id);
  if (!project) throw new AppError('Research project not found', 404);
  return project;
}

async function refreshProjectStats(projectId) {
  const project = await ResearchProject.findById(projectId);
  if (!project) return null;
  const [documentCount, noteCount, highlightCount, bookmarkCount, docs] = await Promise.all([
    Document.countDocuments({ researchProject: projectId }),
    ResearchNote.countDocuments({ project: projectId }),
    ResearchHighlight.countDocuments({ project: projectId }),
    ResearchBookmark.countDocuments({ project: projectId }),
    Document.find({ researchProject: projectId }).select('readingProgress knowledgeGraph').lean(),
  ]);
  const readingAvg =
    docs.length === 0
      ? 0
      : Math.round(
          docs.reduce((s, d) => s + (d.readingProgress?.percent || 0), 0) / docs.length
        );
  const knowledgeNodes = docs.reduce((s, d) => s + (d.knowledgeGraph?.nodes?.length || 0), 0);
  project.stats = {
    documentCount,
    noteCount,
    highlightCount,
    bookmarkCount,
    knowledgeNodes,
    readingProgressAvg: readingAvg,
    lastActivityAt: new Date(),
  };
  await project.save();
  return project;
}

/* ─── Projects ─── */

exports.listProjects = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  const { page, limit, skip } = parsePage(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) {
    filter.$text = { $search: String(req.query.q).slice(0, 200) };
  }
  const [items, total] = await Promise.all([
    ResearchProject.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ResearchProject.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { projects: items, pagination: paginationMeta(page, limit, total) },
  });
});

exports.createProject = asyncHandler(async (req, res) => {
  const project = await ResearchProject.create({
    ...orgCreateStamp(req.user),
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'general',
    status: req.body.status || 'active',
    tags: req.body.tags || [],
    folderPath: req.body.folderPath || '/',
    history: [{ action: 'created', at: new Date(), meta: {} }],
  });
  await auditFromRequest(req, {
    action: 'research.project.create',
    resource: 'ResearchProject',
    resourceId: project._id,
  });
  res.status(201).json({ success: true, data: { project } });
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  res.json({ success: true, data: { project } });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const fields = ['title', 'description', 'category', 'status', 'tags', 'folderPath'];
  const changed = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      changed[f] = project[f];
      project[f] = req.body[f];
    }
  }
  if (project.status === 'archived' && !project.archivedAt) project.archivedAt = new Date();
  if (project.status !== 'archived') project.archivedAt = null;
  project.pushHistory('updated', { fields: Object.keys(changed) });
  await project.save();
  await auditFromRequest(req, {
    action: 'research.project.update',
    resource: 'ResearchProject',
    resourceId: project._id,
    meta: { fields: Object.keys(req.body) },
  });
  if (['completed', 'archived'].includes(project.status)) {
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: 'research_progress',
      module: 'research',
      title: project.title,
      refType: 'ResearchProject',
      refId: project._id,
      payload: { status: project.status },
    });
  }
  res.json({ success: true, data: { project } });
});

exports.archiveProject = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  project.status = 'archived';
  project.archivedAt = new Date();
  project.pushHistory('archived', {});
  await project.save();
  await auditFromRequest(req, {
    action: 'research.project.archive',
    resource: 'ResearchProject',
    resourceId: project._id,
  });
  const { safeEmit } = require('../utils/platformEvents');
  await safeEmit(req.user, {
    type: 'research_progress',
    module: 'research',
    title: project.title,
    refType: 'ResearchProject',
    refId: project._id,
    payload: { status: 'archived' },
  });
  res.json({ success: true, data: { project } });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const pid = project._id;
  await Promise.all([
    ResearchNote.deleteMany({ project: pid }),
    ResearchHighlight.deleteMany({ project: pid }),
    ResearchBookmark.deleteMany({ project: pid }),
    ResearchCollection.deleteMany({ project: pid }),
    Document.updateMany({ researchProject: pid }, { $set: { researchProject: null } }),
  ]);
  await project.deleteOne();
  await auditFromRequest(req, {
    action: 'research.project.delete',
    resource: 'ResearchProject',
    resourceId: pid,
  });
  res.json({ success: true, message: 'Research project deleted' });
});

exports.projectHistory = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  res.json({ success: true, data: { history: project.history || [] } });
});

exports.listCategories = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      categories: [
        'general',
        'academic',
        'literature',
        'science',
        'technology',
        'business',
        'legal',
        'medical',
        'other',
      ],
      statuses: ['draft', 'active', 'paused', 'completed', 'archived'],
    },
  });
});

/* ─── Documents (research-scoped) ─── */

exports.listProjectDocuments = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const { page, limit, skip } = parsePage(req);
  const filter = { researchProject: project._id, ...(await orgListFilter(req.user)) };
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.folderPath) filter.folderPath = req.query.folderPath;
  const [documents, total] = await Promise.all([
    Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Document.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { documents, pagination: paginationMeta(page, limit, total) },
  });
});

exports.uploadProjectDocument = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  if (!req.file) throw new AppError('File is required', 400);
  const allowed = ['pdf', 'docx', 'text'];
  const fileType = detectFileType(req.file.originalname, req.file.mimetype);
  if (!allowed.includes(fileType) && fileType !== 'other') {
    /* allow other but prefer pdf/docx/txt */
  }
  if (!['pdf', 'docx', 'text'].includes(fileType)) {
    throw new AppError('Only PDF, DOCX, and TXT files are supported for research upload', 400);
  }
  const extractedText = await extractText(req.file.path, fileType, req.file.originalname);
  const doc = await Document.create({
    ...orgCreateStamp(req.user),
    researchProject: project._id,
    title: req.body.title || req.file.originalname,
    originalName: req.file.originalname,
    fileUrl: toAssetUrl(req.file.filename),
    mimeType: req.file.mimetype,
    fileType,
    size: req.file.size,
    extractedText,
    tags: Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20),
    folderPath: req.body.folderPath || project.folderPath || '/',
    collectionId: req.body.collectionId || null,
    status: extractedText ? 'processed' : 'uploaded',
    processingStatus: 'pending',
  });
  researchKnowledge.enrichDocumentKnowledge(doc);
  await doc.save();
  project.pushHistory('document_uploaded', { documentId: String(doc._id) });
  await refreshProjectStats(project._id);
  await auditFromRequest(req, {
    action: 'research.document.upload',
    resource: 'Document',
    resourceId: doc._id,
    meta: { projectId: String(project._id), fileType },
  });
  res.status(201).json({ success: true, data: { document: doc } });
});

exports.attachDocument = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const doc = await findAccessible(Document, req.user, req.body.documentId);
  if (!doc) throw new AppError('Document not found', 404);
  doc.researchProject = project._id;
  if (!doc.chapters?.length && doc.extractedText) {
    researchKnowledge.enrichDocumentKnowledge(doc);
  }
  await doc.save();
  project.pushHistory('document_attached', { documentId: String(doc._id) });
  await refreshProjectStats(project._id);
  res.json({ success: true, data: { document: doc } });
});

exports.processDocumentKnowledge = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  researchKnowledge.enrichDocumentKnowledge(doc);
  await doc.save();
  if (doc.researchProject) await refreshProjectStats(doc.researchProject);
  res.json({ success: true, data: { document: doc } });
});

exports.getDocumentKnowledge = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  res.json({
    success: true,
    data: {
      knowledge: {
        chapters: doc.chapters || [],
        topics: doc.topics || [],
        concepts: doc.concepts || [],
        keywords: doc.keywords || [],
        relationships: doc.relationships || [],
        knowledgeGraph: doc.knowledgeGraph || { nodes: [], edges: [] },
        summary: doc.summary || '',
        processingStatus: doc.processingStatus,
      },
    },
  });
});

exports.updateReadingProgress = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  doc.readingProgress = doc.readingProgress || {};
  if (req.body.percent !== undefined) doc.readingProgress.percent = req.body.percent;
  if (req.body.lastPosition !== undefined) doc.readingProgress.lastPosition = req.body.lastPosition;
  doc.readingProgress.lastReadAt = new Date();
  await doc.save();
  if (doc.researchProject) await refreshProjectStats(doc.researchProject);
  res.json({ success: true, data: { readingProgress: doc.readingProgress } });
});

/* ─── AI Research ─── */

async function runResearchAi(req, prompt, mode = 'pdf') {
  const result = await runWithAiCredit(
    req.user,
    1,
    () => aiService.runMode(mode, [{ role: 'user', content: prompt }]),
    (ai) => ({
      mode,
      model: ai.model,
      source: 'research',
      promptChars: prompt.length,
      replyChars: (ai.content || '').length,
      success: true,
      errorCode: ai.recovered ? 'recovered_fallback' : '',
    })
  );
  return result.content;
}

exports.aiSummary = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const reply = await runResearchAi(
    req,
    `Provide a structured research summary with key findings, methods, and conclusions.\n\n${ctx.slice(0, 12000)}`
  );
  doc.summary = reply;
  await doc.save();
  res.json({ success: true, data: { result: reply, document: doc } });
});

exports.aiExplain = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const topic = req.body.topic || 'the main ideas';
  const reply = await runResearchAi(
    req,
    `Explain ${topic} clearly for a researcher.\n\nContext:\n${ctx.slice(0, 12000)}`
  );
  res.json({ success: true, data: { result: reply } });
});

exports.aiSimplify = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const reply = await runResearchAi(
    req,
    `Simplify this research text for a general audience while preserving accuracy.\n\n${ctx.slice(0, 12000)}`
  );
  res.json({ success: true, data: { result: reply } });
});

exports.aiExpand = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const topic = req.body.topic || doc.title;
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const reply = await runResearchAi(
    req,
    `Expand on "${topic}" with deeper analysis, related concepts, and research angles.\n\nContext:\n${ctx.slice(0, 10000)}`
  );
  res.json({ success: true, data: { result: reply } });
});

exports.aiQuestions = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const reply = await runResearchAi(
    req,
    `Generate 8 research and comprehension questions (mix of factual and analytical).\n\n${ctx.slice(0, 12000)}`
  );
  res.json({ success: true, data: { result: reply } });
});

exports.aiFlashcards = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const ctx = researchKnowledge.chapterContext(doc, req.body.chapterId);
  const reply = await runResearchAi(
    req,
    `Create 10 flashcards as markdown: **Q:** ... / **A:** ...\n\n${ctx.slice(0, 12000)}`
  );
  res.json({ success: true, data: { result: reply } });
});

exports.aiCitations = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.docId);
  if (!doc) throw new AppError('Document not found', 404);
  const style = req.body.style || 'APA';
  const reply = await runResearchAi(
    req,
    `Suggest ${style} citation formats and in-text citation guidance for this document titled "${doc.title}". Use available metadata and content cues.\n\nExcerpt:\n${(doc.extractedText || '').slice(0, 6000)}`
  );
  res.json({ success: true, data: { result: reply, style } });
});

exports.aiSuggestions = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const docs = await Document.find({ researchProject: project._id })
    .select('title keywords concepts topics summary')
    .limit(20)
    .lean();
  const catalog = docs
    .map(
      (d) =>
        `- ${d.title}: keywords=${(d.keywords || []).slice(0, 8).join(', ')}; concepts=${(d.concepts || []).slice(0, 8).join(', ')}`
    )
    .join('\n');
  const reply = await runResearchAi(
    req,
    `Given this research project "${project.title}" (${project.category}), suggest next research steps, related topics to explore, and gaps.\n\nDocuments:\n${catalog || '(none yet)'}\n\nDescription: ${project.description || ''}`
  );
  res.json({ success: true, data: { result: reply } });
});

/* ─── Smart Search ─── */

exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || req.body?.q || '').trim().slice(0, 200);
  const type = String(req.query.type || req.body?.type || 'all');
  const projectId = req.query.projectId || req.body?.projectId;
  const tag = req.query.tag || req.body?.tag;
  const topic = req.query.topic || req.body?.topic;
  const { page, limit, skip } = parsePage(req);
  const base = await orgListFilter(req.user);

  const results = { projects: [], documents: [], notes: [], topics: [] };

  if (!q && !tag && !topic) {
    return res.json({
      success: true,
      data: { results, pagination: paginationMeta(page, limit, 0), query: q },
    });
  }

  if (type === 'all' || type === 'project') {
    const pf = { ...base };
    if (q) pf.$text = { $search: q };
    if (req.query.status) pf.status = req.query.status;
    if (req.query.category) pf.category = req.query.category;
    results.projects = await ResearchProject.find(pf).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  if (type === 'all' || type === 'document' || type === 'keyword' || type === 'semantic' || type === 'topic') {
    const df = { ...base };
    if (projectId) df.researchProject = projectId;
    if (tag) df.tags = tag;
    if (topic) df['topics.name'] = new RegExp(String(topic).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (q) {
      if (type === 'keyword') {
        df.keywords = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      } else {
        df.$text = { $search: q };
      }
    }
    let docs = await Document.find(df).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean();
    if (type === 'semantic' && q) {
      docs = docs
        .map((d) => ({
          ...d,
          _score: researchKnowledge.scoreTextMatch(
            `${d.title} ${d.searchIndex || ''} ${(d.concepts || []).join(' ')}`,
            q
          ),
        }))
        .sort((a, b) => b._score - a._score);
    }
    results.documents = docs;
    if (type === 'topic' || type === 'all') {
      const topicHits = [];
      for (const d of docs) {
        for (const t of d.topics || []) {
          if (!topic || String(t.name).toLowerCase().includes(String(topic || q).toLowerCase())) {
            topicHits.push({ name: t.name, documentId: d._id, documentTitle: d.title });
          }
        }
      }
      results.topics = topicHits.slice(0, 40);
    }
  }

  if (type === 'all' || type === 'note') {
    const nf = { ...base };
    if (projectId) nf.project = projectId;
    if (q) nf.$text = { $search: q };
    results.notes = await ResearchNote.find(nf).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  const total =
    results.projects.length + results.documents.length + results.notes.length + results.topics.length;
  res.json({
    success: true,
    data: {
      results,
      pagination: paginationMeta(page, limit, total),
      query: q,
      type,
    },
  });
});

/* ─── Knowledge management ─── */

exports.createNote = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const note = await ResearchNote.create({
    ...orgCreateStamp(req.user),
    project: project._id,
    document: req.body.documentId || null,
    title: req.body.title,
    body: req.body.body || '',
    tags: req.body.tags || [],
    folderPath: req.body.folderPath || '/',
    collectionId: req.body.collectionId || null,
  });
  await refreshProjectStats(project._id);
  res.status(201).json({ success: true, data: { note } });
});

exports.listNotes = asyncHandler(async (req, res) => {
  await getProjectOrThrow(req, req.params.id);
  const { page, limit, skip } = parsePage(req);
  const filter = { project: req.params.id, ...(await orgListFilter(req.user)) };
  if (req.query.tag) filter.tags = req.query.tag;
  const [notes, total] = await Promise.all([
    ResearchNote.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ResearchNote.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { notes, pagination: paginationMeta(page, limit, total) },
  });
});

exports.updateNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ResearchNote, req.user, req.params.noteId);
  if (!note) throw new AppError('Note not found', 404);
  for (const f of ['title', 'body', 'tags', 'folderPath', 'document']) {
    if (req.body[f] !== undefined) note[f] = req.body[f];
  }
  if (req.body.documentId !== undefined) note.document = req.body.documentId;
  if (req.body.collectionId !== undefined) note.collectionId = req.body.collectionId;
  await note.save();
  res.json({ success: true, data: { note } });
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await findAccessible(ResearchNote, req.user, req.params.noteId);
  if (!note) throw new AppError('Note not found', 404);
  const pid = note.project;
  await note.deleteOne();
  await refreshProjectStats(pid);
  res.json({ success: true, message: 'Note deleted' });
});

exports.createHighlight = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const doc = await findAccessible(Document, req.user, req.body.documentId);
  if (!doc) throw new AppError('Document not found', 404);
  const highlight = await ResearchHighlight.create({
    ...orgCreateStamp(req.user),
    project: project._id,
    document: doc._id,
    text: req.body.text,
    color: req.body.color || 'yellow',
    startOffset: req.body.startOffset || 0,
    endOffset: req.body.endOffset || 0,
    note: req.body.note || '',
    tags: req.body.tags || [],
  });
  await refreshProjectStats(project._id);
  res.status(201).json({ success: true, data: { highlight } });
});

exports.listHighlights = asyncHandler(async (req, res) => {
  await getProjectOrThrow(req, req.params.id);
  const filter = { project: req.params.id, ...(await orgListFilter(req.user)) };
  if (req.query.documentId) filter.document = req.query.documentId;
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const [highlights, total] = await Promise.all([
    ResearchHighlight.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ResearchHighlight.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { highlights, pagination: paginationMeta(page, limit, total) },
  });
});

exports.deleteHighlight = asyncHandler(async (req, res) => {
  const highlight = await findAccessible(ResearchHighlight, req.user, req.params.highlightId);
  if (!highlight) throw new AppError('Highlight not found', 404);
  const pid = highlight.project;
  await highlight.deleteOne();
  await refreshProjectStats(pid);
  res.json({ success: true, message: 'Highlight deleted' });
});

exports.createBookmark = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const bookmark = await ResearchBookmark.create({
    ...orgCreateStamp(req.user),
    project: project._id,
    document: req.body.documentId || null,
    label: req.body.label,
    position: req.body.position || 0,
    folderPath: req.body.folderPath || '/',
    tags: req.body.tags || [],
  });
  await refreshProjectStats(project._id);
  res.status(201).json({ success: true, data: { bookmark } });
});

exports.listBookmarks = asyncHandler(async (req, res) => {
  await getProjectOrThrow(req, req.params.id);
  const bookmarks = await ResearchBookmark.find({
    project: req.params.id,
    ...(await orgListFilter(req.user)),
  }).sort({ createdAt: -1 });
  res.json({ success: true, data: { bookmarks } });
});

exports.deleteBookmark = asyncHandler(async (req, res) => {
  const bookmark = await findAccessible(ResearchBookmark, req.user, req.params.bookmarkId);
  if (!bookmark) throw new AppError('Bookmark not found', 404);
  const pid = bookmark.project;
  await bookmark.deleteOne();
  await refreshProjectStats(pid);
  res.json({ success: true, message: 'Bookmark deleted' });
});

exports.createCollection = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const collection = await ResearchCollection.create({
    ...orgCreateStamp(req.user),
    project: project._id,
    name: req.body.name,
    description: req.body.description || '',
    folderPath: req.body.folderPath || '/',
    tags: req.body.tags || [],
    documentIds: req.body.documentIds || [],
  });
  res.status(201).json({ success: true, data: { collection } });
});

exports.listCollections = asyncHandler(async (req, res) => {
  await getProjectOrThrow(req, req.params.id);
  const collections = await ResearchCollection.find({
    project: req.params.id,
    ...(await orgListFilter(req.user)),
  }).sort({ name: 1 });
  res.json({ success: true, data: { collections } });
});

exports.updateCollection = asyncHandler(async (req, res) => {
  const collection = await findAccessible(ResearchCollection, req.user, req.params.collectionId);
  if (!collection) throw new AppError('Collection not found', 404);
  for (const f of ['name', 'description', 'folderPath', 'tags', 'documentIds']) {
    if (req.body[f] !== undefined) collection[f] = req.body[f];
  }
  await collection.save();
  res.json({ success: true, data: { collection } });
});

exports.deleteCollection = asyncHandler(async (req, res) => {
  const collection = await findAccessible(ResearchCollection, req.user, req.params.collectionId);
  if (!collection) throw new AppError('Collection not found', 404);
  await collection.deleteOne();
  res.json({ success: true, message: 'Collection deleted' });
});

exports.listTags = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const [docTags, noteTags, projectTags] = await Promise.all([
    Document.distinct('tags', { researchProject: project._id }),
    ResearchNote.distinct('tags', { project: project._id }),
    Promise.resolve(project.tags || []),
  ]);
  const tags = [...new Set([...projectTags, ...docTags, ...noteTags].filter(Boolean))].sort();
  res.json({ success: true, data: { tags } });
});

exports.listFolders = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const [docFolders, noteFolders, colFolders] = await Promise.all([
    Document.distinct('folderPath', { researchProject: project._id }),
    ResearchNote.distinct('folderPath', { project: project._id }),
    ResearchCollection.distinct('folderPath', { project: project._id }),
  ]);
  const folders = [
    ...new Set(['/', project.folderPath, ...docFolders, ...noteFolders, ...colFolders].filter(Boolean)),
  ].sort();
  res.json({ success: true, data: { folders } });
});

/* ─── Analytics ─── */

exports.analytics = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const projectIdRaw = req.query.projectId;
  const projectId =
    projectIdRaw && mongoose.Types.ObjectId.isValid(String(projectIdRaw))
      ? new mongoose.Types.ObjectId(String(projectIdRaw))
      : null;
  const base = await orgListFilter(req.user);
  const projectFilter = projectId ? { ...base, _id: projectId } : base;
  const projects = await ResearchProject.find(projectFilter).select('status').lean();
  const projectIds = projects.map((p) => p._id);

  const docFilter = { ...base };
  if (projectId) docFilter.researchProject = projectId;
  else if (projectIds.length) docFilter.researchProject = { $in: projectIds };

  const [docSummary, byFileTypeRows, notes, highlights, bookmarks, aiUsage] = await Promise.all([
    Document.aggregate([
      { $match: docFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalBytes: { $sum: { $ifNull: ['$size', 0] } },
          avgReading: { $avg: { $ifNull: ['$readingProgress.percent', 0] } },
          knowledgeNodes: {
            $sum: {
              $cond: [
                { $isArray: '$knowledgeGraph.nodes' },
                { $size: '$knowledgeGraph.nodes' },
                0,
              ],
            },
          },
        },
      },
    ]),
    Document.aggregate([
      { $match: docFilter },
      { $group: { _id: { $ifNull: ['$fileType', 'other'] }, count: { $sum: 1 } } },
    ]),
    ResearchNote.countDocuments(projectId ? { project: projectId, ...base } : { project: { $in: projectIds }, ...base }),
    ResearchHighlight.countDocuments(
      projectId ? { project: projectId, ...base } : { project: { $in: projectIds }, ...base }
    ),
    ResearchBookmark.countDocuments(
      projectId ? { project: projectId, ...base } : { project: { $in: projectIds }, ...base }
    ),
    AiUsage.countDocuments({ user: req.user._id }),
  ]);

  const byStatus = {};
  for (const p of projects) byStatus[p.status] = (byStatus[p.status] || 0) + 1;

  const summary = docSummary[0] || { count: 0, totalBytes: 0, avgReading: 0, knowledgeNodes: 0 };
  const readingProgress = Math.round(summary.avgReading || 0);
  const knowledgeGrowth = summary.knowledgeNodes || 0;
  const totalBytes = summary.totalBytes || 0;
  const byFileType = Object.fromEntries(byFileTypeRows.map((r) => [r._id, r.count]));

  res.json({
    success: true,
    data: {
      analytics: {
        researchProgress: {
          projectCount: projects.length,
          byStatus,
          completed: byStatus.completed || 0,
          active: byStatus.active || 0,
          archived: byStatus.archived || 0,
        },
        readingProgress,
        aiUsage: { totalEvents: aiUsage },
        documentStatistics: {
          count: summary.count || 0,
          totalBytes,
          byFileType,
        },
        knowledgeGrowth: {
          nodes: knowledgeGrowth,
          notes,
          highlights,
          bookmarks,
        },
      },
    },
  });
});

exports.refreshStats = asyncHandler(async (req, res) => {
  const project = await getProjectOrThrow(req, req.params.id);
  const updated = await refreshProjectStats(project._id);
  res.json({ success: true, data: { project: updated } });
});
