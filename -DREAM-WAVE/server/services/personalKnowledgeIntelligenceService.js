/**
 * Personal Knowledge Graph + Research Knowledge Intelligence (Thirumala V4 Prompt 4).
 *
 * Extends KnowledgeGraphEdge + Research* + keyword chunk retrieval.
 * Does NOT create a second vector DB, ResearchV4, or MemoryV4.
 *
 * Canonical records stay in their models; KG stores ID references + evidence only.
 */
const mongoose = require('mongoose')
const KnowledgeGraphEdge = require('../models/KnowledgeGraphEdge')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const StudentProfile = require('../models/StudentProfile')
const CareerProfile = require('../models/CareerProfile')
const ResearchProject = require('../models/ResearchProject')
const ResearchSource = require('../models/ResearchSource')
const ResearchNote = require('../models/ResearchNote')
const ResearchSourceChunk = require('../models/ResearchSourceChunk')
const knowledgeGraphService = require('./knowledgeGraphService')
const researchDocumentService = require('./researchDocumentService')
const memoryService = require('./memoryService')

const MAX_GRAPH_DEPTH = 3
const MAX_GRAPH_NODES = 80
const MAX_EDGES_PER_SYNC = 120
const MAX_SEARCH_RESULTS = 24

const CONFIDENCE = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' }

const ORIGIN_LABEL = {
  EXPLICIT: 'EXPLICIT',
  SYSTEM_DERIVED: 'SYSTEM_DERIVED',
  AI_SUGGESTED: 'AI_INFERRED',
}

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  throw err
}

function requireUserId(userId) {
  if (!userId) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  return userId
}

function confidenceLabel(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  const n = Number(score)
  if (n >= 0.7) return CONFIDENCE.HIGH
  if (n >= 0.4) return CONFIDENCE.MEDIUM
  return CONFIDENCE.LOW
}

/**
 * Treat document/source text as DATA — never executable instructions.
 */
function sanitizeDocumentData(text = '', label = 'document') {
  const raw = String(text || '').slice(0, 8000)
  const cleaned = raw
    .replace(/\b(ignore (all )?(previous|prior) instructions?)\b/gi, '[filtered]')
    .replace(/\b(system prompt|you are now|jailbreak|developer mode)\b/gi, '[filtered]')
    .replace(/\b(reveal|exfiltrate).{0,40}(memory|secret|password|api key)\b/gi, '[filtered]')
    .replace(/\b(call (this )?tool|execute (shell|command)|run tool)\b/gi, '[filtered]')
  return { label, text: cleaned, treatedAs: 'DATA_ONLY', originalLength: raw.length }
}

function skillId(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, '-').slice(0, 80)
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'with', 'your', 'this', 'that'].includes(t))
}

function overlapScore(a, b) {
  const A = new Set(tokenize(a))
  const B = new Set(tokenize(b))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const t of A) if (B.has(t)) hit += 1
  return hit / Math.max(A.size, B.size)
}

function classifyTrust(source) {
  if (source.trustClass) return source.trustClass
  if (source.sourceType === 'academic') return 'PRIMARY'
  if (source.sourceType === 'url' || source.sourceType === 'book') return 'SECONDARY'
  return 'USER_PROVIDED'
}

function freshnessFromDate(date) {
  if (!date) return { freshness: 'UNKNOWN', why: 'No date recorded.' }
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days < 0) return { freshness: 'UNKNOWN', why: 'Date is in the future.' }
  if (days <= 365) return { freshness: 'CURRENT', why: `Recorded within ${days} day(s).`, days }
  return { freshness: 'HISTORICAL', why: `Recorded about ${Math.floor(days / 365)} year(s) ago.`, days }
}

function detectDocumentFormat(body = {}) {
  const hint = String(body.documentFormat || body.format || body.mimeType || body.filename || '').toUpperCase()
  for (const fmt of ResearchSource.DOCUMENT_FORMATS || []) {
    if (fmt !== 'UNKNOWN' && hint.includes(fmt)) return fmt
  }
  if (/\.PDF\b/.test(hint)) return 'PDF'
  if (/\.DOCX?\b/.test(hint)) return hint.includes('DOCX') ? 'DOCX' : 'DOC'
  if (/\.PPTX?\b/.test(hint)) return hint.includes('PPTX') ? 'PPTX' : 'PPT'
  if (/\.TXT\b/.test(hint)) return 'TXT'
  if (/\.CSV\b/.test(hint)) return 'CSV'
  if (body.rawText || body.content) return 'TXT'
  return 'UNKNOWN'
}

function extractTopics(text = '', limit = 6) {
  const counts = new Map()
  for (const t of tokenize(text)) {
    if (t.length < 4) continue
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t)
}

/**
 * Sync research ↔ project/skill/goal/career edges from canonical research records.
 */
async function syncResearchKnowledge(studentId, { force = false } = {}) {
  const uid = requireUserId(studentId)
  await knowledgeGraphService.syncFromCanonical(uid, { force })

  const projects = await ResearchProject.find({
    studentId: uid,
    status: { $nin: ['ARCHIVED'] },
  }).select('_id title question goalId portfolioProjectId status updatedAt').limit(20).lean()

  const profile = await StudentProfile.findOne({ userId: uid }).select('projects skills').lean()
  const career = await CareerProfile.findOne({ userId: uid }).select('targetCareer requiredSkills').lean()
  let ops = 0

  for (const rp of projects) {
    if (ops >= MAX_EDGES_PER_SYNC) break
    await knowledgeGraphService.upsertEdge(uid, {
      sourceType: 'student',
      sourceId: String(uid),
      targetType: 'research_project',
      targetId: String(rp._id),
      relationType: 'RELATED_TO',
      origin: 'EXPLICIT',
      label: rp.title,
    })
    ops += 1

    if (rp.goalId) {
      await knowledgeGraphService.upsertEdge(uid, {
        sourceType: 'research_project',
        sourceId: String(rp._id),
        targetType: 'goal',
        targetId: String(rp.goalId),
        relationType: 'SUPPORTS_GOAL',
        origin: 'EXPLICIT',
        label: rp.title,
        metadata: { evidence: 'ResearchProject.goalId' },
      })
      ops += 1
    }

    if (rp.portfolioProjectId) {
      await knowledgeGraphService.upsertEdge(uid, {
        sourceType: 'research_project',
        sourceId: String(rp._id),
        targetType: 'project',
        targetId: String(rp.portfolioProjectId),
        relationType: 'RESEARCH_SUPPORTS_PROJECT',
        origin: 'EXPLICIT',
        metadata: { evidence: 'ResearchProject.portfolioProjectId' },
      })
      ops += 1
    }

    for (const proj of profile?.projects || []) {
      if (ops >= MAX_EDGES_PER_SYNC) break
      const score = overlapScore(
        `${rp.title} ${rp.question || ''}`,
        `${proj.title} ${(proj.technologies || []).join(' ')} ${proj.description || ''}`,
      )
      if (score < 0.18) continue
      await knowledgeGraphService.upsertEdge(uid, {
        sourceType: 'research_project',
        sourceId: String(rp._id),
        targetType: 'project',
        targetId: String(proj._id),
        relationType: 'ALIGNS_WITH',
        origin: 'SYSTEM_DERIVED',
        confidence: Number(score.toFixed(3)),
        label: proj.title,
        metadata: {
          evidence: 'Title/technology textual overlap with portfolio project',
          confidenceLabel: confidenceLabel(score),
        },
      })
      ops += 1

      for (const tech of (proj.technologies || []).slice(0, 4)) {
        const sid = skillId(tech)
        if (!sid) continue
        await knowledgeGraphService.upsertEdge(uid, {
          sourceType: 'research_project',
          sourceId: String(rp._id),
          targetType: 'skill',
          targetId: sid,
          relationType: 'SUPPORTS_SKILL',
          origin: 'SYSTEM_DERIVED',
          confidence: Number(Math.min(1, score + 0.1).toFixed(3)),
          label: tech,
          metadata: { evidence: `Project technology “${tech}”` },
        })
        ops += 1
      }
    }

    if (career?.targetCareer) {
      const cScore = overlapScore(`${rp.title} ${rp.question || ''}`, career.targetCareer)
      if (cScore >= 0.12) {
        await knowledgeGraphService.upsertEdge(uid, {
          sourceType: 'research_project',
          sourceId: String(rp._id),
          targetType: 'career',
          targetId: skillId(career.targetCareer),
          relationType: 'SUPPORTS_CAREER',
          origin: 'SYSTEM_DERIVED',
          confidence: Number(cScore.toFixed(3)),
          label: career.targetCareer,
          metadata: {
            evidence: 'Overlap between research text and CareerProfile.targetCareer',
            note: 'Not a placement or employability prediction.',
          },
        })
        ops += 1
      }
    }

    const sources = await ResearchSource.find({
      studentId: uid,
      projectId: rp._id,
      processingStatus: { $nin: ['FAILED'] },
    }).select('_id title topics processingStatus trustClass sourceType').limit(15).lean()

    for (const src of sources) {
      if (ops >= MAX_EDGES_PER_SYNC) break
      await knowledgeGraphService.upsertEdge(uid, {
        sourceType: 'research_project',
        sourceId: String(rp._id),
        targetType: 'research_source',
        targetId: String(src._id),
        relationType: 'EVIDENCED_BY',
        origin: 'EXPLICIT',
        label: src.title,
        metadata: {
          trustClass: classifyTrust(src),
          processingStatus: src.processingStatus,
        },
      })
      ops += 1
      for (const topic of (src.topics || []).slice(0, 4)) {
        await knowledgeGraphService.upsertEdge(uid, {
          sourceType: 'research_source',
          sourceId: String(src._id),
          targetType: 'topic',
          targetId: skillId(topic),
          relationType: 'MENTIONS',
          origin: 'SYSTEM_DERIVED',
          label: topic,
          metadata: { evidence: 'Extracted topic tokens from indexed source text' },
        })
        ops += 1
      }
    }
  }

  return { synced: true, edgeOperations: ops, syncedAt: new Date().toISOString() }
}

/**
 * Remove edges pointing at deleted/archived research or missing projects.
 */
async function cleanupStaleRelationships(studentId) {
  const uid = requireUserId(studentId)
  const edges = await KnowledgeGraphEdge.find({
    studentId: uid,
    $or: [
      { sourceType: { $in: ['research_project', 'research_source', 'project', 'goal'] } },
      { targetType: { $in: ['research_project', 'research_source', 'project', 'goal'] } },
    ],
  }).limit(400).lean()

  let removed = 0
  const researchIds = new Set(
    (await ResearchProject.find({ studentId: uid }).select('_id status').lean())
      .filter((p) => p.status !== 'ARCHIVED')
      .map((p) => String(p._id)),
  )
  const sourceIds = new Set(
    (await ResearchSource.find({ studentId: uid }).select('_id').lean()).map((s) => String(s._id)),
  )
  const goalIds = new Set(
    (await Goal.find({ userId: uid, status: { $ne: 'archived' } }).select('_id').lean())
      .map((g) => String(g._id)),
  )
  const profile = await StudentProfile.findOne({ userId: uid }).select('projects._id').lean()
  const projectIds = new Set((profile?.projects || []).map((p) => String(p._id)))

  for (const edge of edges) {
    const check = (type, id) => {
      if (type === 'research_project') return researchIds.has(String(id))
      if (type === 'research_source') return sourceIds.has(String(id))
      if (type === 'goal') return goalIds.has(String(id))
      if (type === 'project') return projectIds.has(String(id))
      return true
    }
    if (!check(edge.sourceType, edge.sourceId) || !check(edge.targetType, edge.targetId)) {
      await KnowledgeGraphEdge.deleteOne({ _id: edge._id, studentId: uid })
      removed += 1
    }
  }
  return { removed, checked: edges.length }
}

function formatEdge(edge) {
  return {
    id: String(edge._id),
    relation: edge.relationType,
    origin: edge.origin,
    originLabel: ORIGIN_LABEL[edge.origin] || edge.origin,
    confidence: edge.confidence,
    confidenceLabel: confidenceLabel(edge.confidence),
    label: edge.label || null,
    evidence: edge.metadata?.evidence || edge.metadata?.note || null,
    metadata: edge.metadata || {},
    from: { type: edge.sourceType, id: edge.sourceId },
    to: { type: edge.targetType, id: edge.targetId },
  }
}

/**
 * Bounded BFS traversal from a seed entity.
 */
async function traverseGraph(studentId, { entityType, entityId, depth = MAX_GRAPH_DEPTH, limit = MAX_GRAPH_NODES } = {}) {
  const uid = requireUserId(studentId)
  const maxDepth = Math.min(Number(depth) || MAX_GRAPH_DEPTH, MAX_GRAPH_DEPTH)
  const maxNodes = Math.min(Number(limit) || MAX_GRAPH_NODES, MAX_GRAPH_NODES)
  const visited = new Set()
  const nodes = []
  const edges = []
  let frontier = [{ type: entityType, id: String(entityId), depth: 0 }]

  while (frontier.length && nodes.length < maxNodes) {
    const next = []
    for (const item of frontier) {
      const key = `${item.type}:${item.id}`
      if (visited.has(key)) continue
      visited.add(key)
      nodes.push({ type: item.type, id: item.id, depth: item.depth })
      if (item.depth >= maxDepth) continue

      const found = await KnowledgeGraphEdge.find({
        studentId: uid,
        $or: [
          { sourceType: item.type, sourceId: item.id },
          { targetType: item.type, targetId: item.id },
        ],
      }).limit(24).lean()

      for (const e of found) {
        edges.push(formatEdge(e))
        const other = e.sourceType === item.type && e.sourceId === item.id
          ? { type: e.targetType, id: e.targetId }
          : { type: e.sourceType, id: e.sourceId }
        const ok = `${other.type}:${other.id}`
        if (!visited.has(ok)) next.push({ ...other, depth: item.depth + 1 })
      }
    }
    frontier = next
  }

  return {
    nodes: nodes.slice(0, maxNodes),
    edges: edges.slice(0, maxNodes * 2),
    limits: { maxDepth, maxNodes },
    truncated: frontier.length > 0 || nodes.length >= maxNodes,
  }
}

async function getPersonalKnowledgeMap(studentId) {
  const uid = requireUserId(studentId)
  await syncResearchKnowledge(uid)

  const [goals, profile, career, research, summary, memories] = await Promise.all([
    Goal.find({ userId: uid, status: { $ne: 'archived' } }).sort('-updatedAt').limit(6)
      .select('title status progress requiredSkills').lean(),
    StudentProfile.findOne({ userId: uid }).select('skills projects').lean(),
    CareerProfile.findOne({ userId: uid }).select('targetCareer requiredSkills').lean(),
    ResearchProject.find({ studentId: uid, status: { $nin: ['ARCHIVED'] } }).sort('-updatedAt').limit(8)
      .select('title question status goalId portfolioProjectId').lean(),
    knowledgeGraphService.getGraphSummary(uid),
    memoryService.listMemories(uid, { status: 'ACTIVE', limit: 3 }).catch(() => ({ memories: [] })),
  ])

  const skills = (profile?.skills || []).map((s) => ({ id: String(s._id || skillId(s.name)), name: s.name }))
  const projects = (profile?.projects || []).filter((p) => p.status !== 'archived').slice(0, 8)
    .map((p) => ({ id: String(p._id), title: p.title, technologies: p.technologies || [] }))

  const seed = goals[0]
    ? { type: 'goal', id: String(goals[0]._id) }
    : projects[0]
      ? { type: 'project', id: String(projects[0]._id) }
      : research[0]
        ? { type: 'research_project', id: String(research[0]._id) }
        : { type: 'student', id: String(uid) }

  const graph = await traverseGraph(uid, { entityType: seed.type, entityId: seed.id })

  return {
    title: 'MY KNOWLEDGE',
    structure: {
      goals: goals.map((g) => ({ id: String(g._id), title: g.title, progress: g.progress })),
      skills,
      learning: graph.edges
        .filter((e) => ['SUPPORTS_LEARNING', 'RELATED_TO', 'PART_OF_ROADMAP'].includes(e.relation))
        .slice(0, 8),
      projects,
      research: research.map((r) => ({
        id: String(r._id),
        title: r.title,
        question: r.question,
        url: `/student/research/${r._id}`,
      })),
      career: career?.targetCareer
        ? { target: career.targetCareer, requiredSkills: career.requiredSkills || [] }
        : null,
    },
    graph,
    graphSummary: summary,
    memoryNote: {
      count: (memories.memories || []).length,
      separation: 'MEMORY is preference/context only — not document or research knowledge.',
      precedence: ['CANONICAL_DATA', 'DOCUMENT_KNOWLEDGE', 'RESEARCH_KNOWLEDGE', 'EXPLICIT_MEMORY', 'AI_INFERENCE'],
    },
    generatedAt: new Date().toISOString(),
  }
}

async function getProjectKnowledgeMap(studentId, projectId) {
  const uid = requireUserId(studentId)
  const profile = await StudentProfile.findOne({ userId: uid }).select('projects skills').lean()
  const project = (profile?.projects || []).find((p) => String(p._id) === String(projectId))
  if (!project) deny('NOT_FOUND', 'Project not found for this user.', 404)

  const goals = await Goal.find({ userId: uid, status: { $ne: 'archived' } }).limit(8).lean()
  const tasks = await Task.find({ userId: uid, status: { $ne: 'archived' }, completed: { $ne: true } })
    .limit(30).select('title status goalId dueDate').lean()
  const firstWord = String(project.title || '').split(/\s+/)[0] || 'zzzz'
  const research = await ResearchProject.find({
    studentId: uid,
    status: { $nin: ['ARCHIVED'] },
    $or: [
      { portfolioProjectId: project._id },
      { title: new RegExp(firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ],
  }).limit(5).select('title question').lean()

  const relatedSkills = (project.technologies || []).map((t) => ({ name: t, evidence: 'Project.technologies' }))
  const graph = await traverseGraph(uid, { entityType: 'project', entityId: String(project._id) })

  return {
    project: { id: String(project._id), title: project.title, status: project.status },
    goals: goals.filter((g) => {
      const blob = `${g.title} ${(g.requiredSkills || []).join(' ')}`
      return overlapScore(blob, `${project.title} ${(project.technologies || []).join(' ')}`) >= 0.1
        || (g.requiredSkills || []).some((s) => (project.technologies || []).map((t) => t.toLowerCase()).includes(String(s).toLowerCase()))
    }).map((g) => ({ id: String(g._id), title: g.title })),
    skills: relatedSkills,
    learning: graph.edges.filter((e) => e.relation === 'SUPPORTS_LEARNING' || e.to.type === 'topic').slice(0, 6),
    tasks: tasks.filter((t) => overlapScore(t.title, project.title) >= 0.08).slice(0, 8)
      .map((t) => ({ id: String(t._id), title: t.title })),
    research: research.map((r) => ({ id: String(r._id), title: r.title, url: `/student/research/${r._id}` })),
    documents: graph.nodes.filter((n) => n.type === 'research_source' || n.type === 'document'),
    graph,
    note: 'Map uses canonical IDs and evidenced relationships only.',
  }
}

async function getGoalKnowledgeMap(studentId, goalId) {
  const uid = requireUserId(studentId)
  const goal = await Goal.findOne({ _id: goalId, userId: uid }).lean()
  if (!goal) deny('NOT_FOUND', 'Goal not found for this user.', 404)

  const profile = await StudentProfile.findOne({ userId: uid }).select('projects skills').lean()
  const research = await ResearchProject.find({
    studentId: uid,
    status: { $nin: ['ARCHIVED'] },
  }).limit(10).select('title question goalId').lean()

  const skills = (goal.requiredSkills || goal.skills || []).map((s) => ({
    name: typeof s === 'string' ? s : s.name,
    evidence: 'Goal.requiredSkills/skills',
  }))

  const projects = (profile?.projects || []).filter((p) => {
    const techs = (p.technologies || []).map((t) => t.toLowerCase())
    return skills.some((s) => techs.includes(String(s.name).toLowerCase()))
      || overlapScore(p.title, goal.title) >= 0.12
  }).map((p) => ({ id: String(p._id), title: p.title }))

  const linkedResearch = research.filter((r) => String(r.goalId) === String(goal._id)
    || overlapScore(`${r.title} ${r.question || ''}`, goal.title) >= 0.12)

  const career = await CareerProfile.findOne({ userId: uid }).select('targetCareer requiredSkills').lean()
  const graph = await traverseGraph(uid, { entityType: 'goal', entityId: String(goal._id) })

  return {
    goal: { id: String(goal._id), title: goal.title, progress: goal.progress, status: goal.status },
    skills,
    learning: graph.edges.filter((e) => ['PART_OF_ROADMAP', 'SUPPORTS_LEARNING', 'RELATED_TO'].includes(e.relation)).slice(0, 8),
    projects,
    research: linkedResearch.map((r) => ({ id: String(r._id), title: r.title, url: `/student/research/${r._id}` })),
    careerEvidence: career ? {
      target: career.targetCareer,
      note: 'Career linkage is informational evidence only — not employability guarantee.',
      overlappingSkills: (career.requiredSkills || []).filter((s) =>
        skills.some((gs) => String(gs.name).toLowerCase() === String(s.name || s).toLowerCase())),
    } : null,
    graph,
  }
}

/**
 * Unified knowledge search — keyword + entity + relationship (no second vector DB).
 */
async function searchKnowledge(studentId, query = '', { limit = MAX_SEARCH_RESULTS } = {}) {
  const uid = requireUserId(studentId)
  const q = String(query || '').trim().slice(0, 120)
  if (!q) return { query: '', results: [], mode: 'empty' }

  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const results = []
  const cap = Math.min(Number(limit) || MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS)

  const [goals, profile, research, notes, sources, edges] = await Promise.all([
    Goal.find({ userId: uid, title: re }).limit(5).select('title status').lean(),
    StudentProfile.findOne({ userId: uid }).select('projects skills').lean(),
    ResearchProject.find({
      studentId: uid,
      status: { $nin: ['ARCHIVED'] },
      $or: [{ title: re }, { question: re }],
    }).limit(6).select('title question').lean(),
    ResearchNote.find({ studentId: uid, $or: [{ title: re }, { content: re }] })
      .limit(6).select('title content projectId').lean(),
    ResearchSource.find({
      studentId: uid,
      processingStatus: { $in: ['READY', 'PARTIAL', 'UPLOADED'] },
      $or: [{ title: re }, { excerpt: re }, { topics: re }],
    }).limit(6).select('title excerpt processingStatus trustClass projectId topics').lean(),
    KnowledgeGraphEdge.find({
      studentId: uid,
      $or: [{ label: re }, { 'metadata.evidence': re }],
    }).limit(8).lean(),
  ])

  goals.forEach((g) => results.push({
    type: 'GOAL', id: String(g._id), title: g.title, url: '/student/goals', score: 3,
  }))
  ;(profile?.projects || []).filter((p) => re.test(p.title || '')).slice(0, 5).forEach((p) => {
    results.push({ type: 'PROJECT', id: String(p._id), title: p.title, url: '/student/profile', score: 3 })
  })
  ;(profile?.skills || []).filter((s) => re.test(s.name || '')).slice(0, 5).forEach((s) => {
    results.push({ type: 'SKILL', id: String(s._id || skillId(s.name)), title: s.name, url: '/student/profile', score: 2 })
  })
  research.forEach((r) => results.push({
    type: 'RESEARCH', id: String(r._id), title: r.title, url: `/student/research/${r._id}`, score: 3,
  }))
  notes.forEach((n) => results.push({
    type: 'NOTE',
    id: String(n._id),
    title: n.title || String(n.content || '').slice(0, 80),
    url: `/student/research/${n.projectId}`,
    score: 2,
  }))
  sources.forEach((s) => {
    results.push({
      type: 'DOCUMENT',
      id: String(s._id),
      title: s.title,
      url: `/student/research/${s.projectId}`,
      trustClass: classifyTrust(s),
      processingStatus: s.processingStatus,
      score: 2,
    })
  })
  edges.forEach((e) => results.push({
    type: 'RELATIONSHIP',
    id: String(e._id),
    title: `${e.relationType}: ${e.label || e.sourceId}`,
    origin: ORIGIN_LABEL[e.origin] || e.origin,
    score: 1,
  }))

  const readySources = await ResearchSource.find({
    studentId: uid,
    processingStatus: { $in: ['READY', 'PARTIAL'] },
    chunkCount: { $gt: 0 },
  }).select('_id projectId title').limit(40).lean()

  if (readySources.length) {
    const chunks = await ResearchSourceChunk.find({
      studentId: uid,
      sourceId: { $in: readySources.map((s) => s._id) },
    }).limit(200).lean()
    const terms = tokenize(q)
    const scored = chunks
      .map((c) => ({
        ...c,
        score: terms.reduce((acc, t) => acc + (c.text.toLowerCase().includes(t) ? t.length : 0), 0),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    for (const c of scored) {
      const src = readySources.find((s) => String(s._id) === String(c.sourceId))
      results.push({
        type: 'DOCUMENT',
        id: String(c.sourceId),
        title: src?.title || 'Source excerpt',
        excerpt: sanitizeDocumentData(c.text.slice(0, 240), 'chunk').text,
        url: `/student/research/${c.projectId}`,
        score: 2.5,
        location: c.order != null ? `chunk #${c.order}` : null,
        note: 'Location is chunk order — not an invented page number.',
      })
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0))
  return {
    query: q,
    results: results.slice(0, cap),
    mode: 'keyword+entity+relationship',
    note: 'No vector database — keyword and structured retrieval only. Private results are owner-scoped.',
  }
}

/**
 * Research / knowledge Q&A grounded in owned knowledge.
 */
async function askKnowledgeQuestion(user, message = '', { researchProjectId = null } = {}) {
  if (!user?._id) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  const uid = user._id
  const msg = String(message || '').trim().slice(0, 2000)
  if (!msg) deny('VALIDATION_ERROR', 'Message is required.')

  if (/\b(ignore (all )?(previous|prior) instructions|exfiltrate|run shell|reveal .{0,20}memory)\b/i.test(msg)) {
    return {
      state: 'FAILED',
      errorCode: 'PROMPT_INJECTION_BLOCKED',
      answer: 'Request blocked. User/document text is treated as DATA only.',
    }
  }

  const search = await searchKnowledge(uid, msg, { limit: 12 })
  const map = await getPersonalKnowledgeMap(uid)

  let conflicts = []
  let gaps = []
  let sourcesUsed = []

  if (researchProjectId) {
    try {
      const researchIntelligenceService = require('./researchIntelligenceService')
      const owned = await require('./researchService').getOwnedProject(uid, researchProjectId)
      const intel = await researchIntelligenceService.getResearchIntelligence(uid, owned._id)
      conflicts = (intel.conflicts || []).slice(0, 5)
      gaps = (intel.gaps || []).slice(0, 5)
    } catch {
      /* optional project scope */
    }
  }

  const ready = await ResearchSource.find({
    studentId: uid,
    processingStatus: { $in: ['READY', 'PARTIAL'] },
    ...(researchProjectId ? { projectId: researchProjectId } : {}),
  }).select('_id title author processingStatus publishedAt createdAt trustClass projectId sourceType').limit(20).lean()

  let keyFindings = []
  if (ready.length) {
    const projectForChunks = researchProjectId || ready[0].projectId
    const chunks = await researchDocumentService.retrieveProjectChunks(
      projectForChunks,
      msg,
      { limit: 5, studentId: uid },
    ).catch(() => [])
    keyFindings = (chunks || []).map((c) => {
      const src = ready.find((s) => String(s._id) === String(c.sourceId))
      const fresh = freshnessFromDate(src?.publishedAt || src?.createdAt)
      return {
        finding: sanitizeDocumentData(c.text.slice(0, 280), 'source').text,
        source: {
          id: String(c.sourceId),
          title: src?.title || 'Source',
          author: src?.author || null,
          trustClass: src ? classifyTrust(src) : 'USER_PROVIDED',
          location: c.order != null ? `chunk #${c.order}` : null,
          freshness: fresh.freshness,
        },
        treatedAs: 'DATA_ONLY',
      }
    })
    sourcesUsed = keyFindings.map((k) => k.source)
  }

  const related = search.results.slice(0, 6)
  let answer
  if (keyFindings.length) {
    answer = `Based on ${keyFindings.length} excerpt(s) from your indexed sources (treated as data only).`
  } else if (related.length) {
    answer = `Found ${related.length} related knowledge item(s) in your authorized graph/search. No source excerpts matched strongly enough to quote.`
  } else {
    answer = 'Information not available in your current knowledge base.'
  }

  const projectTechs = (map.structure.projects || []).flatMap((p) => p.technologies || [])
  const skillNames = new Set((map.structure.skills || []).map((s) => String(s.name).toLowerCase()))
  const missing = projectTechs.filter((t) => !skillNames.has(String(t).toLowerCase()))
  if (missing.length) {
    gaps.push({
      type: 'SKILL_EVIDENCE_GAP',
      message: `There appears to be a knowledge gap: project technologies without matching skill evidence: ${[...new Set(missing)].slice(0, 3).join(', ')}.`,
      note: 'This does not claim you lack the knowledge — only that evidence is missing in current records.',
    })
  }

  const recommendations = []
  if (map.structure.research?.[0]) {
    recommendations.push({
      type: 'research_topic',
      title: `Continue “${map.structure.research[0].title}”`,
      why: 'Active research project in your workspace.',
      url: map.structure.research[0].url,
    })
  }
  const relatedProject = related.find((r) => r.type === 'PROJECT')
  if (relatedProject) {
    recommendations.push({
      type: 'project_experiment',
      title: `Relate findings to project “${relatedProject.title}”`,
      why: 'Search linked this topic to your project.',
      url: relatedProject.url,
    })
  }
  if (!keyFindings.length && !related.length) {
    recommendations.push({
      type: 'document_to_review',
      title: 'Add a research source with extractable text',
      why: 'No READY indexed sources matched this question.',
      url: '/student/research',
    })
  }

  return {
    state: 'COMPLETED',
    answer,
    structure: {
      ANSWER: answer,
      KEY_FINDINGS: keyFindings,
      SOURCE_SUPPORT: sourcesUsed,
      RELATED_KNOWLEDGE: related,
      POSSIBLE_NEXT_STEP: recommendations[0] || null,
    },
    conflicts: conflicts.length
      ? conflicts.map((c) => ({
        ...c,
        handling: 'Sources disagree — both presented; system does not silently choose one.',
      }))
      : [],
    gaps,
    recommendations,
    search,
    memorySeparation: map.memoryNote,
    safety: {
      documentsTreatedAsData: true,
      noFabricatedCitations: true,
      noInventedPageNumbers: true,
      writesRequireConfirmation: true,
    },
  }
}

async function explainRelationship(studentId, edgeId) {
  const uid = requireUserId(studentId)
  if (!mongoose.isValidObjectId(edgeId)) deny('VALIDATION_ERROR', 'Invalid relationship id.')
  const edge = await KnowledgeGraphEdge.findOne({ _id: edgeId, studentId: uid }).lean()
  if (!edge) deny('NOT_FOUND', 'Relationship not found for this user.', 404)
  return {
    relationship: edge.relationType,
    origin: ORIGIN_LABEL[edge.origin] || edge.origin,
    evidence: edge.metadata?.evidence || edge.label || 'No additional evidence stored.',
    source: {
      from: { type: edge.sourceType, id: edge.sourceId },
      to: { type: edge.targetType, id: edge.targetId },
    },
    confidenceLabel: confidenceLabel(edge.confidence),
    note: edge.origin === 'AI_SUGGESTED'
      ? 'AI-inferred relationships are informational and never silently become authoritative facts.'
      : null,
  }
}

/**
 * Ingest / re-index document text into existing ResearchSource + chunks.
 * Preserves original rawText; does not claim extraction if empty.
 */
async function processSourceDocument(studentId, sourceId, { rawText = null, documentFormat = null } = {}) {
  const uid = requireUserId(studentId)
  const source = await ResearchSource.findOne({ _id: sourceId, studentId: uid })
  if (!source) deny('NOT_FOUND', 'Source not found for this user.', 404)

  source.processingStatus = 'PROCESSING'
  source.processingError = ''
  if (documentFormat) source.documentFormat = detectDocumentFormat({ documentFormat })
  await source.save()

  try {
    const text = rawText != null ? String(rawText) : String(source.rawText || '')
    const sanitized = sanitizeDocumentData(text, 'document')
    if (sanitized.text.trim().length < 40) {
      source.processingStatus = 'FAILED'
      source.processingError = 'Text extraction produced insufficient content to index. Original file/text preserved.'
      source.chunkCount = 0
      await source.save()
      await ResearchSourceChunk.deleteMany({ sourceId: source._id, studentId: uid })
      return {
        id: String(source._id),
        processingStatus: source.processingStatus,
        processingError: source.processingError,
        searchable: false,
      }
    }

    source.rawText = text.slice(0, 200000)
    source.topics = extractTopics(sanitized.text)
    source.trustClass = classifyTrust(source)
    const indexed = await researchDocumentService.indexSourceText({
      studentId: uid,
      projectId: source.projectId,
      sourceId: source._id,
      rawText: sanitized.text,
    })
    source.chunkCount = indexed.chunkCount
    source.indexedAt = new Date()
    source.processingStatus = indexed.chunkCount > 0 ? 'READY' : 'PARTIAL'
    if (!indexed.chunkCount) {
      source.processingStatus = 'PARTIAL'
      source.processingError = 'Indexed with zero chunks after sanitization.'
    }
    await source.save()

    if (knowledgeGraphService.isEnabled()) {
      await knowledgeGraphService.upsertEdge(uid, {
        sourceType: 'research_project',
        sourceId: String(source.projectId),
        targetType: 'research_source',
        targetId: String(source._id),
        relationType: 'EVIDENCED_BY',
        origin: 'EXPLICIT',
        label: source.title,
      }).catch(() => null)
      for (const topic of (source.topics || []).slice(0, 5)) {
        await knowledgeGraphService.upsertEdge(uid, {
          sourceType: 'research_source',
          sourceId: String(source._id),
          targetType: 'topic',
          targetId: skillId(topic),
          relationType: 'DOCUMENT_SUPPORTS_TOPIC',
          origin: 'SYSTEM_DERIVED',
          label: topic,
          metadata: { evidence: 'Topic tokens extracted from indexed text' },
        }).catch(() => null)
      }
    }

    return {
      id: String(source._id),
      processingStatus: source.processingStatus,
      chunkCount: source.chunkCount,
      topics: source.topics,
      trustClass: source.trustClass,
      documentFormat: source.documentFormat,
      searchable: source.processingStatus === 'READY' || source.processingStatus === 'PARTIAL',
      treatedAs: 'DATA_ONLY',
    }
  } catch (error) {
    source.processingStatus = 'FAILED'
    source.processingError = String(error.message || 'Processing failed').slice(0, 500)
    await source.save()
    return {
      id: String(source._id),
      processingStatus: 'FAILED',
      processingError: source.processingError,
      searchable: false,
    }
  }
}

async function getKnowledgeCenter(studentId) {
  const uid = requireUserId(studentId)
  const [map, recentResearch, recentSources, summary] = await Promise.all([
    getPersonalKnowledgeMap(uid),
    ResearchProject.find({ studentId: uid, status: { $nin: ['ARCHIVED'] } }).sort('-updatedAt').limit(5)
      .select('title question updatedAt').lean(),
    ResearchSource.find({ studentId: uid }).sort('-updatedAt').limit(5)
      .select('title processingStatus trustClass projectId updatedAt').lean(),
    knowledgeGraphService.getGraphSummary(uid),
  ])

  return {
    title: 'KNOWLEDGE CENTER',
    recent: {
      projects: map.structure.projects.slice(0, 5),
      research: recentResearch.map((r) => ({
        id: String(r._id), title: r.title, url: `/student/research/${r._id}`,
      })),
      learning: map.structure.learning.slice(0, 5),
      documents: recentSources.map((s) => ({
        id: String(s._id),
        title: s.title,
        processingStatus: s.processingStatus,
        trustClass: classifyTrust(s),
        url: `/student/research/${s.projectId}`,
      })),
    },
    connected: map.structure,
    graphSummary: summary,
    personalMap: map,
  }
}

module.exports = {
  CONFIDENCE,
  ORIGIN_LABEL,
  MAX_GRAPH_DEPTH,
  MAX_GRAPH_NODES,
  sanitizeDocumentData,
  confidenceLabel,
  classifyTrust,
  freshnessFromDate,
  detectDocumentFormat,
  extractTopics,
  syncResearchKnowledge,
  cleanupStaleRelationships,
  traverseGraph,
  getPersonalKnowledgeMap,
  getProjectKnowledgeMap,
  getGoalKnowledgeMap,
  searchKnowledge,
  askKnowledgeQuestion,
  explainRelationship,
  processSourceDocument,
  getKnowledgeCenter,
  formatEdge,
}
