const mongoose = require('mongoose')
const ResearchProject = require('../models/ResearchProject')
const ResearchSource = require('../models/ResearchSource')
const ResearchNote = require('../models/ResearchNote')
const ResearchClaim = require('../models/ResearchClaim')
const ResearchSourceChunk = require('../models/ResearchSourceChunk')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const researchDocumentService = require('./researchDocumentService')
const knowledgeGraphService = require('./knowledgeGraphService')

function isEnabled() {
  return process.env.RESEARCH_V3_ENABLED !== 'false'
}

function validId(value) {
  return mongoose.isValidObjectId(value)
}

async function getOwnedProject(studentId, projectId) {
  if (!validId(projectId)) {
    throw Object.assign(new Error('Invalid project ID.'), { statusCode: 400, code: 'INVALID_ID' })
  }
  const project = await ResearchProject.findOne({ _id: projectId, studentId })
  if (!project) throw Object.assign(new Error('Research project not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  return project
}

async function syncProjectGraph(studentId, project) {
  if (!knowledgeGraphService.isEnabled()) return
  await knowledgeGraphService.upsertEdge(studentId, {
    sourceType: 'student',
    sourceId: String(studentId),
    targetType: 'research_project',
    targetId: String(project._id),
    relationType: 'RELATED_TO',
    origin: 'EXPLICIT',
    label: project.title,
  }).catch(() => null)
  if (project.goalId) {
    await knowledgeGraphService.upsertEdge(studentId, {
      sourceType: 'research_project',
      sourceId: String(project._id),
      targetType: 'goal',
      targetId: String(project.goalId),
      relationType: 'SUPPORTS_GOAL',
      origin: 'EXPLICIT',
    }).catch(() => null)
  }
  if (project.bookId) {
    await knowledgeGraphService.upsertEdge(studentId, {
      sourceType: 'research_project',
      sourceId: String(project._id),
      targetType: 'book',
      targetId: String(project.bookId),
      relationType: 'READING_RESOURCE',
      origin: 'EXPLICIT',
    }).catch(() => null)
  }
}

async function validateLinks(studentId, { goalId, roadmapId }) {
  if (goalId) {
    const goal = await Goal.findOne({ _id: goalId, userId: studentId })
    if (!goal) throw Object.assign(new Error('Linked goal not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  if (roadmapId) {
    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: studentId })
    if (!roadmap) throw Object.assign(new Error('Linked roadmap not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  }
}

async function listProjects(studentId, { status, limit = 30 } = {}) {
  const filter = { studentId }
  if (status) filter.status = status
  const projects = await ResearchProject.find(filter).sort('-updatedAt').limit(limit).lean()
  const counts = await Promise.all(projects.map(async (p) => {
    const [sources, notes, claims] = await Promise.all([
      ResearchSource.countDocuments({ projectId: p._id }),
      ResearchNote.countDocuments({ projectId: p._id }),
      ResearchClaim.countDocuments({ projectId: p._id }),
    ])
    return { sources, notes, claims }
  }))
  return projects.map((p, i) => ({
    id: String(p._id),
    title: p.title,
    question: p.question,
    status: p.status,
    topics: p.topics,
    updatedAt: p.updatedAt,
    counts: counts[i],
  }))
}

async function createProject(studentId, body) {
  const title = String(body.title || '').trim()
  if (!title) throw Object.assign(new Error('Project title is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  await validateLinks(studentId, body)
  const project = await ResearchProject.create({
    studentId,
    title,
    question: String(body.question || '').trim(),
    objective: String(body.objective || '').trim(),
    description: String(body.description || '').trim(),
    status: body.status || 'DRAFT',
    topics: Array.isArray(body.topics) ? body.topics.slice(0, 20) : [],
    goalId: body.goalId || undefined,
    roadmapId: body.roadmapId || undefined,
    subjectId: body.subjectId || undefined,
    bookId: body.bookId || undefined,
    portfolioProjectId: body.portfolioProjectId ? String(body.portfolioProjectId).slice(0, 40) : '',
  })
  await syncProjectGraph(studentId, project)
  return project
}

async function updateProject(studentId, projectId, body) {
  const project = await getOwnedProject(studentId, projectId)
  const allowed = [
    'title', 'question', 'description', 'status', 'topics', 'goalId', 'roadmapId',
    'subjectId', 'bookId', 'synthesis', 'findings', 'connections', 'researchPlan', 'report',
    'objective', 'portfolioProjectId',
  ]
  if (body.goalId !== undefined || body.roadmapId !== undefined) {
    await validateLinks(studentId, { goalId: body.goalId || project.goalId, roadmapId: body.roadmapId || project.roadmapId })
  }
  for (const key of allowed) {
    if (body[key] !== undefined) project[key] = body[key]
  }
  await project.save()
  await syncProjectGraph(studentId, project)
  return project
}

async function getProjectDetail(studentId, projectId) {
  const project = await getOwnedProject(studentId, projectId)
  const [sources, notes, claims] = await Promise.all([
    ResearchSource.find({ studentId, projectId }).sort('-updatedAt').lean(),
    ResearchNote.find({ studentId, projectId }).sort('-updatedAt').limit(50).lean(),
    ResearchClaim.find({ studentId, projectId }).sort('-updatedAt').limit(50).lean(),
  ])
  return { project: project.toObject(), sources, notes, claims }
}

async function addSource(studentId, projectId, body) {
  await getOwnedProject(studentId, projectId)
  const title = String(body.title || '').trim()
  if (!title) throw Object.assign(new Error('Source title is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  const rawText = String(body.rawText || body.content || '').trim()
  const fileHash = rawText ? researchDocumentService.hashText(rawText) : ''
  const existing = fileHash
    ? await ResearchSource.findOne({ studentId, projectId, fileHash })
    : null
  if (existing) return existing

  const source = await ResearchSource.create({
    studentId,
    projectId,
    title,
    sourceType: body.sourceType || 'manual',
    url: String(body.url || '').trim(),
    bookId: body.bookId,
    rawText: rawText.slice(0, 200000),
    fileHash,
    author: String(body.author || '').trim(),
    excerpt: String(body.excerpt || rawText.slice(0, 500)).trim(),
    publication: String(body.publication || '').trim(),
    publishedAt: body.publishedAt || undefined,
    trustClass: body.trustClass || (body.sourceType === 'academic' ? 'PRIMARY' : 'USER_PROVIDED'),
    documentFormat: body.documentFormat || (rawText ? 'TXT' : 'UNKNOWN'),
    processingStatus: 'UPLOADED',
  })

  if (rawText.length >= 40) {
    source.processingStatus = 'PROCESSING'
    await source.save()
    try {
      const personalKnowledgeIntelligenceService = require('./personalKnowledgeIntelligenceService')
      const sanitized = personalKnowledgeIntelligenceService.sanitizeDocumentData(rawText, 'source')
      const indexed = await researchDocumentService.indexSourceText({
        studentId,
        projectId,
        sourceId: source._id,
        rawText: sanitized.text,
      })
      source.chunkCount = indexed.chunkCount
      source.indexedAt = new Date()
      source.topics = personalKnowledgeIntelligenceService.extractTopics(sanitized.text)
      source.processingStatus = indexed.chunkCount > 0 ? 'READY' : 'PARTIAL'
      await source.save()
    } catch (error) {
      source.processingStatus = 'FAILED'
      source.processingError = String(error.message || 'Indexing failed').slice(0, 500)
      await source.save()
    }
  } else if (rawText.length > 0) {
    source.processingStatus = 'FAILED'
    source.processingError = 'Text too short to index. Original content preserved.'
    await source.save()
  }

  if (knowledgeGraphService.isEnabled()) {
    await knowledgeGraphService.upsertEdge(studentId, {
      sourceType: 'research_project',
      sourceId: String(projectId),
      targetType: 'research_source',
      targetId: String(source._id),
      relationType: 'EVIDENCED_BY',
      origin: 'EXPLICIT',
      label: source.title,
    }).catch(() => null)
  }
  return source
}

async function addNote(studentId, body) {
  await getOwnedProject(studentId, body.projectId)
  const NOTE_TYPES = ['SOURCE_NOTE', 'IDEA', 'OBSERVATION', 'QUESTION', 'SUMMARY', 'FINDING', 'GENERAL']
  const noteType = NOTE_TYPES.includes(body.noteType) ? body.noteType : 'GENERAL'
  return ResearchNote.create({
    studentId,
    projectId: body.projectId,
    sourceId: body.sourceId,
    title: String(body.title || '').trim(),
    content: String(body.content || '').trim(),
    noteType,
    origin: body.origin === 'AI_GENERATED' ? 'AI_GENERATED' : 'USER_WRITTEN',
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
  })
}

async function addClaim(studentId, body) {
  await getOwnedProject(studentId, body.projectId)
  const text = String(body.text || '').trim()
  if (!text) throw Object.assign(new Error('Claim text is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  return ResearchClaim.create({
    studentId,
    projectId: body.projectId,
    text,
    status: body.status || 'draft',
    citations: Array.isArray(body.citations) ? body.citations.slice(0, 10) : [],
    aiSuggested: Boolean(body.aiSuggested),
  })
}

async function deleteProject(studentId, projectId) {
  const project = await getOwnedProject(studentId, projectId)
  await Promise.all([
    ResearchSource.deleteMany({ projectId }),
    ResearchSourceChunk.deleteMany({ projectId }),
    ResearchNote.deleteMany({ projectId }),
    ResearchClaim.deleteMany({ projectId }),
    project.deleteOne(),
  ])
  if (knowledgeGraphService.isEnabled()) {
    await knowledgeGraphService.removeEdgesForEntity(studentId, 'research_project', projectId).catch(() => null)
    try {
      const personalKnowledgeIntelligenceService = require('./personalKnowledgeIntelligenceService')
      await personalKnowledgeIntelligenceService.cleanupStaleRelationships(studentId)
    } catch { /* best-effort */ }
  }
  return { deleted: true }
}

async function getOverview(studentId) {
  const [active, draft, recent] = await Promise.all([
    ResearchProject.countDocuments({ studentId, status: 'ACTIVE' }),
    ResearchProject.countDocuments({ studentId, status: 'DRAFT' }),
    ResearchProject.find({ studentId }).sort('-updatedAt').limit(5).select('title question status updatedAt').lean(),
  ])
  return { active, draft, total: active + draft, recent }
}

module.exports = {
  isEnabled,
  listProjects,
  createProject,
  updateProject,
  getProjectDetail,
  getOwnedProject,
  addSource,
  addNote,
  addClaim,
  deleteProject,
  getOverview,
  syncProjectGraph,
}
