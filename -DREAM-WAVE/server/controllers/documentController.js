const Document = require('../models/Document');
const Quiz = require('../models/Quiz');
const aiService = require('../services/aiService');
const { detectFileType, extractText } = require('../services/documentService');
const researchKnowledge = require('../services/researchKnowledgeService');
const ResearchProject = require('../models/ResearchProject');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { toAssetUrl } = require('../utils/assetUrl');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { orgCreateStamp, orgListFilter, findAccessible } = require('../utils/orgScope');

exports.list = asyncHandler(async (req, res) => {
  const filter = await orgListFilter(req.user);
  if (req.query.researchProject) filter.researchProject = req.query.researchProject;
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [docs, total] = await Promise.all([
    Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Document.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { documents: docs, pagination: paginationMeta(page, limit, total) },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  res.json({ success: true, data: { document: doc } });
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File is required', 400);
  const fileType = detectFileType(req.file.originalname, req.file.mimetype);
  const filePath = req.file.path;
  const extractedText = await extractText(filePath, fileType, req.file.originalname);
  let researchProject = req.body.researchProjectId || req.body.researchProject || null;
  if (researchProject) {
    const project = await findAccessible(ResearchProject, req.user, researchProject);
    if (!project) throw new AppError('Research project not found', 404);
    researchProject = project._id;
  }
  const doc = await Document.create({
    ...orgCreateStamp(req.user),
    researchProject,
    title: req.body.title || req.file.originalname,
    originalName: req.file.originalname,
    fileUrl: toAssetUrl(req.file.filename),
    mimeType: req.file.mimetype,
    fileType,
    size: req.file.size,
    extractedText,
    status: extractedText ? 'processed' : 'uploaded',
    processingStatus: 'pending',
  });
  if (extractedText) {
    researchKnowledge.enrichDocumentKnowledge(doc);
    await doc.save();
  }
  if (researchProject) {
    const project = await ResearchProject.findById(researchProject);
    if (project) {
      project.pushHistory('document_uploaded', { documentId: String(doc._id), via: 'documents' });
      project.stats = project.stats || {};
      project.stats.documentCount = (project.stats.documentCount || 0) + 1;
      project.stats.lastActivityAt = new Date();
      await project.save();
    }
  }
  const { safeEmit } = require('../utils/platformEvents');
  await safeEmit(req.user, {
    type: researchProject ? 'research_progress' : 'document_uploaded',
    module: researchProject ? 'research' : 'documents',
    title: doc.title,
    refType: 'Document',
    refId: doc._id,
    payload: { fileType: doc.fileType, researchProject: researchProject || null },
  });
  res.status(201).json({ success: true, data: { document: doc } });
});

exports.analyze = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const doc = await findAccessible(Document, req.user, req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  if (!doc.extractedText) throw new AppError('Document has no extractable text', 400);
  const action = req.body.action || 'summarize';
  const question = req.body.question || '';

  const prompts = {
    summarize: `Summarize this document clearly with sections.\n\n${doc.extractedText.slice(0, 12000)}`,
    explain: `Explain difficult topics in simple language.\n\n${doc.extractedText.slice(0, 12000)}`,
    notes: `Generate structured study notes.\n\n${doc.extractedText.slice(0, 12000)}`,
    keypoints: `Extract the most important points as a markdown bullet list.\n\n${doc.extractedText.slice(0, 12000)}`,
    ask: `Answer this question using the document:\nQuestion: ${question}\n\nDocument:\n${doc.extractedText.slice(0, 12000)}`,
  };

  const prompt = prompts[action] || prompts.summarize;
  const reply = (await aiService.runMode('pdf', [{ role: 'user', content: prompt }])).content;

  if (action === 'summarize') doc.summary = reply;
  if (action === 'notes') doc.notes = reply;
  if (action === 'keypoints') {
    doc.keyPoints = reply
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  doc.status = 'processed';
  await doc.save();

  res.json({ success: true, data: { result: reply, document: doc } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.generateQuiz = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const doc = await findAccessible(Document, req.user, req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  const generated = await aiService.generateQuiz(doc.title, doc.extractedText || '');
  const quiz = await Quiz.create({
    ...orgCreateStamp(req.user),
    title: generated.title || `${doc.title} Quiz`,
    topic: doc.title,
    document: doc._id,
    questions: generated.questions || [],
  });
  doc.quizzes = generated.questions || [];
  await doc.save();
  res.status(201).json({ success: true, data: { quiz } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const doc = await findAccessible(Document, req.user, req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  await doc.deleteOne();
  res.json({ success: true, message: 'Document deleted' });
});
