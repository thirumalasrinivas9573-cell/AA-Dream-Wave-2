/**
 * Research Intelligence layer (Thirumala V3 Prompt 6).
 * Extends the existing Research Workspace — does not replace researchService / grounding.
 *
 * Labels matter:
 * - SOURCE EVIDENCE / SOURCE_EXTRACTED
 * - AI INTERPRETATION / AI_GENERATED / AI SUGGESTION
 * - USER NOTE / USER_WRITTEN / USER VERIFIED (claim status verified)
 *
 * Never invents sources, citations, or page numbers.
 */
const ResearchSource = require('../models/ResearchSource')
const ResearchNote = require('../models/ResearchNote')
const ResearchClaim = require('../models/ResearchClaim')
const ResearchSourceChunk = require('../models/ResearchSourceChunk')
const researchService = require('./researchService')
const researchDocumentService = require('./researchDocumentService')
const knowledgeGraphService = require('./knowledgeGraphService')
const StudentProfile = require('../models/StudentProfile')
const { openai } = require('../utils/openaiClient')

const RESEARCH_INTENTS = [
  'RESEARCH_QUESTION',
  'SOURCE_SUMMARY',
  'SOURCE_COMPARISON',
  'EVIDENCE_EXTRACTION',
  'RESEARCH_GAP',
  'NOTE_GENERATION',
  'FINDING_REVIEW',
  'CITATION_HELP',
  'RESEARCH_PLAN',
  'REPORT_OUTLINE',
]

const INTENT_KEYWORDS = {
  SOURCE_COMPARISON: /\b(compare|comparison|versus|vs\.?|contrast)\b/i,
  RESEARCH_GAP: /\b(gaps?|missing|what.?s missing|under.?researched|lack of)\b/i,
  SOURCE_SUMMARY: /\b(summarize|summary|what does .+ say)\b/i,
  EVIDENCE_EXTRACTION: /\b(extract|evidence|quote|passage|excerpt)\b/i,
  FINDING_REVIEW: /\b(finding|claim|conclusion|verify)\b/i,
  CITATION_HELP: /\b(citation|cite|reference|bibliography)\b/i,
  RESEARCH_PLAN: /\b(research plan|plan my research|methodology)\b/i,
  REPORT_OUTLINE: /\b(report|outline|write.?up|paper structure)\b/i,
  NOTE_GENERATION: /\b(note|observation|annotate)\b/i,
  RESEARCH_QUESTION: /\b(research question|refine (my )?question|help me ask)\b/i,
}

function routeResearchIntent(message = '', action = '') {
  if (action === 'compare-sources') return 'SOURCE_COMPARISON'
  if (action === 'find-gaps') return 'RESEARCH_GAP'
  if (action === 'summarize-source') return 'SOURCE_SUMMARY'
  if (action === 'propose-plan') return 'RESEARCH_PLAN'
  if (action === 'report-outline') return 'REPORT_OUTLINE'
  if (action === 'refine-question') return 'RESEARCH_QUESTION'
  for (const [intent, pattern] of Object.entries(INTENT_KEYWORDS)) {
    if (pattern.test(message)) return intent
  }
  return 'RESEARCH_QUESTION'
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3)
}

function overlapScore(a, b) {
  const stem = (t) => t.replace(/(?:ing|ed|es|s)$/i, '')
  const A = new Set(tokenize(a).map(stem))
  const B = new Set(tokenize(b).map(stem))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const t of A) if (B.has(t)) hit += 1
  return hit / Math.max(A.size, B.size)
}

async function loadOwnedBundle(studentId, projectId) {
  const project = await researchService.getOwnedProject(studentId, projectId)
  const [sources, notes, claims, chunkCount] = await Promise.all([
    ResearchSource.find({ studentId, projectId }).sort('-updatedAt').lean(),
    ResearchNote.find({ studentId, projectId }).sort('-updatedAt').limit(80).lean(),
    ResearchClaim.find({ studentId, projectId }).sort('-updatedAt').limit(80).lean(),
    ResearchSourceChunk.countDocuments({ studentId, projectId }),
  ])
  return { project, sources, notes, claims, chunkCount }
}

/**
 * Progress from real counts — not invented percentages.
 * Stages: IDEA → PLANNING → RESEARCHING → ANALYSIS → DRAFTING → COMPLETED
 */
function deriveLifecycle(project, counts) {
  if (project.status === 'COMPLETED') return 'COMPLETED'
  if (project.status === 'ARCHIVED') return 'ARCHIVED'
  if (project.report?.sections?.length || project.synthesis) return 'DRAFTING'
  if (counts.claims > 0 || project.findings) return 'ANALYSIS'
  if (counts.sources > 0 || counts.chunks > 0) return 'RESEARCHING'
  if (project.researchPlan?.length) return 'PLANNING'
  return 'IDEA'
}

function computeProgress(project, counts) {
  const checks = [
    Boolean(project.question?.trim()),
    Boolean(project.objective?.trim() || project.description?.trim()),
    counts.sources > 0,
    counts.chunks > 0,
    counts.notes > 0,
    counts.claims > 0,
    Boolean(project.researchPlan?.length),
    Boolean(project.synthesis || project.report?.sections?.length),
  ]
  const done = checks.filter(Boolean).length
  return {
    completedSteps: done,
    totalSteps: checks.length,
    ratio: done / checks.length,
    label: `${done}/${checks.length} workspace steps filled`,
  }
}

function detectPotentialGaps({ project, sources, claims, notes, chunkCount }) {
  const gaps = []
  if (!project.question?.trim()) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: 'Missing research question',
      detail: 'Define a clear question before treating AI output as research direction.',
    })
  }
  if (!sources.length) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: 'No sources collected',
      detail: 'Add books, papers, or pasted source text so answers can be grounded.',
    })
  }
  if (sources.length && chunkCount === 0) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: 'Sources not indexed',
      detail: 'Sources exist but have no searchable text excerpts yet. Paste or attach source content.',
    })
  }
  if (sources.length && !claims.length) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: 'No evidence-backed claims',
      detail: 'Extract findings with citations so conclusions stay traceable to sources.',
    })
  }
  const unverifiedClaims = claims.filter((c) => c.status === 'draft' || c.aiSuggested)
  if (unverifiedClaims.length) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: `${unverifiedClaims.length} unverified claim(s)`,
      detail: 'Review AI-suggested or draft claims before treating them as verified findings.',
    })
  }
  if (sources.length >= 1 && !notes.length) {
    gaps.push({
      type: 'POTENTIAL_RESEARCH_GAP',
      label: 'No researcher notes',
      detail: 'Capture observations separately from AI interpretation.',
    })
  }
  // Topic coverage heuristic from question tokens vs source titles/excerpts
  const qTokens = tokenize(project.question)
  if (qTokens.length && sources.length) {
    const corpus = sources.map((s) => `${s.title} ${s.excerpt || ''} ${s.author || ''}`).join(' ')
    const missing = qTokens.filter((t) => !corpus.toLowerCase().includes(t)).slice(0, 5)
    if (missing.length >= 2) {
      gaps.push({
        type: 'POTENTIAL_RESEARCH_GAP',
        label: 'Question terms under-covered by sources',
        detail: `Your question mentions terms that rarely appear in source metadata/excerpts: ${missing.join(', ')}. This is a potential gap — not a proven gap.`,
      })
    }
  }
  return gaps
}

/**
 * Lightweight contradiction heuristic on claim texts — labeled POTENTIAL CONFLICT only.
 */
function detectPotentialConflicts(claims = []) {
  const conflicts = []
  const active = claims.filter((c) => c.text && c.status !== 'disputed').slice(0, 20)
  const NEG = /\b(not|no|never|limited|fail|ineffective|does not|cannot|unable|no evidence)\b/i
  const POS = /\b(improve[sd]?|effective|increase[sd]?|significant|successful|positive|helps?)\b/i

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]
      const b = active[j]
      const overlap = overlapScore(a.text, b.text)
      if (overlap < 0.2) continue
      const aNeg = NEG.test(a.text)
      const bNeg = NEG.test(b.text)
      const aPos = POS.test(a.text)
      const bPos = POS.test(b.text)
      // Polarity clash on related claims
      if ((aNeg && bPos && !aPos) || (bNeg && aPos && !bPos) || (aNeg !== bNeg && overlap >= 0.4)) {
        conflicts.push({
          type: 'POTENTIAL_CONFLICT',
          label: 'Sources/claims may report different conclusions',
          claimA: { id: String(a._id), text: a.text, status: a.status },
          claimB: { id: String(b._id), text: b.text, status: b.status },
          guidance: 'Review both claims and their citations. Dream Wave does not decide which is correct.',
        })
      }
    }
  }
  return conflicts.slice(0, 5)
}

function buildKnowledgeMap({ project, sources, notes, claims }) {
  const nodes = [
    { id: `project:${project._id}`, type: 'QUESTION', label: project.question || project.title },
  ]
  if (project.topics?.length) {
    project.topics.slice(0, 8).forEach((topic, i) => {
      nodes.push({ id: `topic:${i}`, type: 'TOPIC', label: topic })
    })
  }
  sources.forEach((s) => {
    nodes.push({
      id: `source:${s._id}`,
      type: 'SOURCE',
      label: s.title,
      meta: { sourceType: s.sourceType, author: s.author || null, url: s.url || null },
    })
  })
  claims.forEach((c) => {
    nodes.push({
      id: `finding:${c._id}`,
      type: c.status === 'verified' ? 'VERIFIED_FINDING' : 'FINDING',
      label: c.text.slice(0, 120),
      meta: {
        status: c.status,
        origin: c.aiSuggested ? 'AI_GENERATED' : 'USER_WRITTEN',
        citations: (c.citations || []).length,
      },
    })
  })
  notes.slice(0, 20).forEach((n) => {
    nodes.push({
      id: `note:${n._id}`,
      type: 'NOTE',
      label: (n.title || n.content || 'Note').slice(0, 80),
      meta: { noteType: n.noteType || 'GENERAL', origin: n.origin || 'USER_WRITTEN' },
    })
  })
  if (project.portfolioProjectId) {
    nodes.push({
      id: `portfolio:${project.portfolioProjectId}`,
      type: 'PROJECT',
      label: 'Linked portfolio project',
    })
  }
  if (project.goalId) {
    nodes.push({ id: `goal:${project.goalId}`, type: 'GOAL', label: 'Linked learning goal' })
  }

  const edges = []
  sources.forEach((s) => {
    edges.push({ from: `project:${project._id}`, to: `source:${s._id}`, relation: 'HAS_SOURCE' })
  })
  claims.forEach((c) => {
    edges.push({ from: `project:${project._id}`, to: `finding:${c._id}`, relation: 'HAS_FINDING' })
    ;(c.citations || []).forEach((cit) => {
      if (cit.sourceId) edges.push({ from: `finding:${c._id}`, to: `source:${cit.sourceId}`, relation: 'CITED_IN' })
    })
  })
  notes.forEach((n) => {
    edges.push({ from: `project:${project._id}`, to: `note:${n._id}`, relation: 'HAS_NOTE' })
    if (n.sourceId) edges.push({ from: `note:${n._id}`, to: `source:${n.sourceId}`, relation: 'ABOUT_SOURCE' })
  })
  if (project.portfolioProjectId) {
    edges.push({ from: `project:${project._id}`, to: `portfolio:${project.portfolioProjectId}`, relation: 'APPLIES_TO_PROJECT' })
  }
  if (project.goalId) {
    edges.push({ from: `project:${project._id}`, to: `goal:${project.goalId}`, relation: 'SUPPORTS_GOAL' })
  }
  project.topics?.slice(0, 8).forEach((_, i) => {
    edges.push({ from: `project:${project._id}`, to: `topic:${i}`, relation: 'HAS_TOPIC' })
  })

  return { nodes, edges, generatedAt: new Date().toISOString() }
}

async function compareSources(studentId, projectId, sourceIds = []) {
  const { project, sources } = await loadOwnedBundle(studentId, projectId)
  const ids = (Array.isArray(sourceIds) ? sourceIds : String(sourceIds || '').split(','))
    .map(String)
    .map((id) => id.trim())
    .filter(Boolean)
  const selected = []
  if (ids.length) {
    for (const id of ids) {
      const found = sources.find((s) => String(s._id) === String(id))
      if (found) selected.push(found)
    }
  } else {
    selected.push(...sources.slice(0, 2))
  }

  if (selected.length < 2) {
    return {
      label: 'SOURCE_COMPARISON',
      message: 'Select at least two sources with content to compare.',
      sources: selected.map(summarizeSourceMeta),
      comparison: null,
    }
  }

  const [a, b] = selected
  const chunksA = await researchDocumentService.retrieveProjectChunks(project._id, project.question || a.title, {
    limit: 4,
    sourceIds: [a._id],
  })
  const chunksB = await researchDocumentService.retrieveProjectChunks(project._id, project.question || b.title, {
    limit: 4,
    sourceIds: [b._id],
  })

  const comparison = {
    sourceA: {
      ...summarizeSourceMeta(a),
      availableExcerpts: chunksA.length,
      sampleExcerpts: chunksA.slice(0, 2).map((c) => c.text.slice(0, 280)),
    },
    sourceB: {
      ...summarizeSourceMeta(b),
      availableExcerpts: chunksB.length,
      sampleExcerpts: chunksB.slice(0, 2).map((c) => c.text.slice(0, 280)),
    },
    observable: {
      sameType: a.sourceType === b.sourceType,
      bothHaveText: Boolean((a.rawText || '').length > 40 && (b.rawText || '').length > 40),
      overlapHint: overlapScore(
        `${a.title} ${a.excerpt || ''} ${chunksA.map((c) => c.text).join(' ')}`,
        `${b.title} ${b.excerpt || ''} ${chunksB.map((c) => c.text).join(' ')}`,
      ),
    },
    disclaimer: 'Comparison uses available source metadata and indexed excerpts only. Missing details are not invented.',
  }

  return { label: 'SOURCE_COMPARISON', sources: selected.map(summarizeSourceMeta), comparison }
}

function summarizeSourceMeta(source) {
  return {
    id: String(source._id),
    title: source.title,
    sourceType: source.sourceType,
    author: source.author || null,
    url: source.url || null,
    indexed: Boolean(source.indexedAt),
    chunkCount: source.chunkCount || 0,
    // Observable only — not a credibility score
    observables: {
      hasAuthor: Boolean(source.author),
      hasUrl: Boolean(source.url),
      hasIndexedText: Boolean(source.indexedAt && source.chunkCount > 0),
      addedAt: source.createdAt,
    },
  }
}

async function refineQuestionSuggestion(project) {
  const seed = project.question || project.title || ''
  const suggestion = {
    label: 'AI SUGGESTION',
    original: seed,
    refined: null,
    disclaimer: 'AI suggestion only — you remain the researcher. Not a verified research question.',
  }

  if (!seed.trim()) {
    suggestion.refined = 'What specific outcome, population, and method should this research investigate?'
    return suggestion
  }

  if (!process.env.OPENAI_API_KEY) {
    suggestion.refined = `How does ${seed.replace(/\?$/, '')} affect measurable outcomes, and what evidence supports or limits that claim?`
    suggestion.aiReady = false
    return suggestion
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: 'Refine the student research question into one clearer question. Do not invent sources. Reply with only the refined question.',
        },
        { role: 'user', content: seed },
      ],
    })
    suggestion.refined = String(completion.choices[0]?.message?.content || '').trim().slice(0, 400)
    suggestion.aiReady = true
  } catch {
    suggestion.refined = `What evidence exists regarding: ${seed}`
    suggestion.aiReady = false
  }
  return suggestion
}

async function summarizeSource(studentId, projectId, sourceId) {
  const project = await researchService.getOwnedProject(studentId, projectId)
  const source = await ResearchSource.findOne({ _id: sourceId, studentId, projectId }).lean()
  if (!source) throw Object.assign(new Error('Source not found.'), { statusCode: 404, code: 'NOT_FOUND' })

  const chunks = await ResearchSourceChunk.find({ studentId, projectId, sourceId })
    .sort('order')
    .limit(12)
    .lean()

  if (!chunks.length && !(source.rawText || '').trim()) {
    return {
      label: 'SOURCE_SUMMARY',
      source: summarizeSourceMeta(source),
      summary: null,
      message: 'Source content is unavailable. Add or paste text before requesting a summary.',
      origin: 'UNAVAILABLE',
    }
  }

  const excerpt = chunks.map((c) => c.text).join('\n').slice(0, 6000) || String(source.rawText || '').slice(0, 6000)

  if (!process.env.OPENAI_API_KEY) {
    return {
      label: 'SOURCE_SUMMARY',
      source: summarizeSourceMeta(source),
      summary: excerpt.slice(0, 800),
      origin: 'SOURCE_EXTRACTED',
      disclaimer: 'Excerpt preview only (AI offline). Not an interpretive summary.',
      aiReady: false,
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'Summarize ONLY from the provided source text. Label clearly. Do not invent citations or page numbers. Start with "AI INTERPRETATION (from provided source text):"',
        },
        { role: 'user', content: `Title: ${source.title}\n\nSOURCE TEXT:\n${excerpt}` },
      ],
    })
    return {
      label: 'SOURCE_SUMMARY',
      source: summarizeSourceMeta(source),
      summary: String(completion.choices[0]?.message?.content || '').slice(0, 4000),
      origin: 'AI_GENERATED',
      disclaimer: 'AI interpretation of provided source text — not a verified finding.',
      aiReady: true,
    }
  } catch {
    return {
      label: 'SOURCE_SUMMARY',
      source: summarizeSourceMeta(source),
      summary: null,
      message: 'Summary temporarily unavailable.',
      origin: 'UNAVAILABLE',
    }
  }
}

async function getPortfolioLink(studentId, portfolioProjectId) {
  if (!portfolioProjectId) return null
  const profile = await StudentProfile.findOne({ userId: studentId }).select('projects').lean()
  const item = profile?.projects?.find((p) => String(p._id) === String(portfolioProjectId))
  if (!item) return null
  return {
    id: String(item._id),
    title: item.title,
    status: item.status,
    visibility: item.visibility,
    technologies: item.technologies || [],
  }
}

async function buildIntelligence(studentId, projectId) {
  const { project, sources, notes, claims, chunkCount } = await loadOwnedBundle(studentId, projectId)
  const counts = {
    sources: sources.length,
    notes: notes.length,
    claims: claims.length,
    chunks: chunkCount,
    verifiedClaims: claims.filter((c) => c.status === 'verified').length,
  }
  const lifecycle = deriveLifecycle(project, counts)
  const progress = computeProgress(project, counts)
  const gaps = detectPotentialGaps({ project, sources, claims, notes, chunkCount })
  const conflicts = detectPotentialConflicts(claims)
  const knowledgeMap = buildKnowledgeMap({ project, sources, notes, claims })
  const portfolio = await getPortfolioLink(studentId, project.portfolioProjectId)

  let graph = null
  if (knowledgeGraphService.isEnabled()) {
    graph = await knowledgeGraphService.getRelatedContext(studentId, {
      entityType: 'research_project',
      entityId: project._id,
      limit: 12,
    }).catch(() => [])
  }

  const evidenceLedger = {
    sourceExtracted: sources.filter((s) => s.chunkCount > 0).length,
    userNotes: notes.filter((n) => (n.origin || 'USER_WRITTEN') === 'USER_WRITTEN').length,
    aiNotes: notes.filter((n) => n.origin === 'AI_GENERATED').length,
    userClaims: claims.filter((c) => !c.aiSuggested).length,
    aiSuggestedClaims: claims.filter((c) => c.aiSuggested).length,
    verifiedClaims: counts.verifiedClaims,
  }

  const nextActions = []
  if (!project.question?.trim()) nextActions.push({ label: 'Define research question', why: 'Anchors sources and findings.' })
  else if (!sources.length) nextActions.push({ label: 'Add first source', why: 'Ground answers in evidence.' })
  else if (!chunkCount) nextActions.push({ label: 'Index source text', why: 'Enable grounded retrieval.' })
  else if (!claims.length) nextActions.push({ label: 'Extract a claim with citation', why: 'Separate findings from interpretation.' })
  else if (conflicts.length) nextActions.push({ label: 'Review potential conflicts', why: 'Claims may disagree — resolve with citations.' })
  else if (!project.synthesis) nextActions.push({ label: 'Run source-grounded synthesis', why: 'Organize understanding before reporting.' })
  else nextActions.push({ label: 'Draft report sections', why: 'Convert verified context into documentation.' })

  return {
    project: {
      id: String(project._id),
      title: project.title,
      question: project.question,
      objective: project.objective || '',
      status: project.status,
      lifecycle,
      goalId: project.goalId || null,
      roadmapId: project.roadmapId || null,
      portfolioProjectId: project.portfolioProjectId || '',
    },
    counts,
    progress,
    gaps,
    potentialConflicts: conflicts,
    knowledgeMap,
    evidenceLedger,
    nextActions,
    portfolioProject: portfolio,
    learningConnections: project.connections || { skills: [], careerRoles: [], learningActions: [] },
    graphRelations: graph || [],
    labels: {
      AI_GENERATED: 'AI-generated content — not verified evidence',
      SOURCE_EXTRACTED: 'Extracted from source material',
      USER_WRITTEN: 'Written by the researcher',
      USER_VERIFIED: 'Claim marked verified by the researcher',
      POTENTIAL_RESEARCH_GAP: 'Potential gap — not a proven gap',
      POTENTIAL_CONFLICT: 'Potential conflict — review required',
    },
    generatedAt: new Date().toISOString(),
  }
}

async function buildResearchContextBlock(studentId, projectId, { message = '', action = '' } = {}) {
  const intent = routeResearchIntent(message, action)
  const intel = await buildIntelligence(studentId, projectId)
  const lines = [
    'RESEARCH WORKSPACE CONTEXT (private, ownership-scoped)',
    `Intent focus: ${intent}`,
    `Project: ${intel.project.title}`,
    intel.project.question ? `Question: ${intel.project.question}` : null,
    `Lifecycle: ${intel.project.lifecycle} · Status: ${intel.project.status}`,
    `Progress: ${intel.progress.label}`,
    `Sources: ${intel.counts.sources} · Indexed chunks: ${intel.counts.chunks} · Notes: ${intel.counts.notes} · Claims: ${intel.counts.claims}`,
    intel.gaps.length ? `Potential gaps: ${intel.gaps.map((g) => g.label).join('; ')}` : null,
    intel.potentialConflicts.length ? `Potential conflicts: ${intel.potentialConflicts.length} (review required)` : null,
    intel.nextActions[0] ? `Suggested next step: ${intel.nextActions[0].label} — ${intel.nextActions[0].why}` : null,
    'LABEL RULES: Never treat AI INTERPRETATION as SOURCE EVIDENCE. Never invent citations.',
  ].filter(Boolean)

  return {
    intent,
    text: lines.join('\n'),
    intelligence: intel,
  }
}

module.exports = {
  RESEARCH_INTENTS,
  routeResearchIntent,
  buildIntelligence,
  compareSources,
  refineQuestionSuggestion,
  summarizeSource,
  buildResearchContextBlock,
  detectPotentialGaps,
  detectPotentialConflicts,
  buildKnowledgeMap,
  deriveLifecycle,
  computeProgress,
}
