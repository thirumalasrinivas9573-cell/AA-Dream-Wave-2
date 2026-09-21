/**
 * Lasya V5 Prompt 3 — Knowledge Discovery + Hybrid Search + RAG Research
 * Composes domain search, personalization, indexed chunks — evidence-first.
 */
const mongoose = require('mongoose')
const SearchIndexEntry = require('../models/SearchIndexEntry')
const SearchQuery = require('../models/SearchQuery')
const ResearchSession = require('../models/ResearchSession')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const {
  SEARCH_INTENTS,
  SOURCE_AUTHORITY,
  SEARCH_LIMITS,
  QUERY_SYNONYMS,
  INJECTION_PATTERNS,
  FACT_LABELS,
} = require('../constants/knowledgeDiscovery')
const { searchCompanies, searchInstitutions } = require('./partnershipService')
const { searchEcosystem } = require('./ecosystemIntelligenceService')
const { getStudentFeed } = require('./opportunityMatchingService')
const contextPersonalization = require('./contextPersonalizationService')

let openaiProvider = null
try {
  const { OpenAIProvider } = require('../src/mj/ai/providers/OpenAIProvider')
  openaiProvider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
} catch {
  openaiProvider = null
}

const cache = new Map()

function sanitizeQuery(q = '') {
  let str = String(q || '').trim().slice(0, SEARCH_LIMITS.MAX_QUERY_LENGTH)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

function detectIntent(query, typeFilter) {
  const q = query.toLowerCase()
  if (typeFilter && typeFilter !== 'all') {
    const map = {
      document: 'DOCUMENT',
      research: 'RESEARCH',
      opportunity: 'OPPORTUNITY',
      company: 'COMPANY',
      institution: 'INSTITUTION',
      project: 'PROJECT',
      course: 'LEARNING',
      book: 'LEARNING',
    }
    if (map[typeFilter]) return map[typeFilter]
  }
  if (/research|paper|study|literature|evidence/.test(q)) return 'RESEARCH'
  if (/internship|job|opportunity|apply|hiring/.test(q)) return 'OPPORTUNITY'
  if (/company|employer|corp/.test(q)) return 'COMPANY'
  if (/university|college|institution|campus/.test(q)) return 'INSTITUTION'
  if (/learn|course|book|tutorial|study/.test(q)) return 'LEARNING'
  if (/career|roadmap|skill gap|resume/.test(q)) return 'CAREER'
  if (/project|portfolio|build/.test(q)) return 'PROJECT'
  if (q.length < 4) return 'LOOKUP'
  return 'GENERAL_KNOWLEDGE'
}

function expandQuery(query) {
  const terms = new Set([query])
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  for (const w of words) {
    const syns = QUERY_SYNONYMS[w]
    if (syns) syns.forEach((s) => terms.add(s))
  }
  return [...terms]
}

function buildRegex(terms) {
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(escaped.join('|'), 'i')
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function dedupeResults(results) {
  const seen = new Set()
  return results.filter((r) => {
    const key = `${r.type}:${r.sourceId || r.id}:${r.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function scoreResult(result, { terms, personalization, intent }) {
  let score = result.baseScore || 50
  const text = `${result.title} ${result.description || ''}`.toLowerCase()
  for (const t of terms) {
    if (text.includes(t.toLowerCase())) score += 15
  }
  if (personalization?.careerGoal && text.includes(String(personalization.careerGoal).toLowerCase())) {
    score += 20
    result.personalized = true
    result.explanation = result.explanation || `Relevant to your career goal: ${personalization.careerGoal}`
  }
  if (personalization?.topSkills?.length) {
    for (const skill of personalization.topSkills) {
      if (text.includes(String(skill).toLowerCase())) {
        score += 8
        result.personalized = true
        result.explanation = result.explanation || `Matches your ${skill} skill evidence`
      }
    }
  }
  if (result.authority) score += result.authority * 0.1
  if (result.date) {
    const age = Date.now() - new Date(result.date).getTime()
    if (age < 30 * 24 * 60 * 60 * 1000) score += 5
  }
  if (intent === 'OPPORTUNITY' && result.type === 'OPPORTUNITY') score += 25
  if (intent === 'RESEARCH' && result.type === 'RESEARCH') score += 25
  result.score = score
  return result
}

async function searchIndexedChunks(userId, role, orgId, terms, { semanticQuery = null } = {}) {
  const visibilityFilter = [{ visibility: 'public' }]
  if (userId) visibilityFilter.push({ ownerUserId: userId, visibility: 'private' })
  if (orgId && role === 'institution') {
    visibilityFilter.push({ organizationId: orgId, visibility: 'institution' })
  }

  const regex = buildRegex(terms)
  const keywordHits = await SearchIndexEntry.find({
    $and: [
      { $or: visibilityFilter },
      { $or: [{ chunkText: regex }, { title: regex }, { keywords: { $in: terms } }] },
    ],
  })
    .select('sourceType sourceId title chunkText section page authority visibility')
    .limit(SEARCH_LIMITS.MAX_RAG_CHUNKS * 2)
    .lean()

  let semanticHits = []
  if (semanticQuery && openaiProvider && process.env.OPENAI_API_KEY) {
    const emb = await openaiProvider.embeddings(semanticQuery).catch(() => null)
    if (emb?.embeddings?.length) {
      const candidates = await SearchIndexEntry.find({ $or: visibilityFilter })
        .select('+embedding sourceType sourceId title chunkText section page authority')
        .limit(100)
        .lean()
      semanticHits = candidates
        .filter((c) => c.embedding?.length)
        .map((c) => ({ ...c, semanticScore: cosineSimilarity(emb.embeddings, c.embedding) }))
        .filter((c) => c.semanticScore >= SEARCH_LIMITS.SEMANTIC_MIN_SCORE)
        .sort((a, b) => b.semanticScore - a.semanticScore)
        .slice(0, SEARCH_LIMITS.MAX_RAG_CHUNKS)
    }
  }

  const merged = [...semanticHits, ...keywordHits]
  return merged.map((hit) => ({
    type: 'DOCUMENT',
    id: hit._id.toString(),
    sourceId: hit.sourceId,
    title: hit.title || hit.chunkText.slice(0, 80),
    description: hit.chunkText.slice(0, 200),
    excerpt: hit.chunkText.slice(0, 400),
    section: hit.section,
    page: hit.page,
    authority: hit.authority || SOURCE_AUTHORITY.USER_MATERIAL,
    sourceType: hit.sourceType,
    href: hit.sourceType === 'research' ? `/research/${hit.sourceId}` : undefined,
    baseScore: hit.semanticScore ? 70 + hit.semanticScore * 30 : 55,
    searchMethod: hit.semanticScore ? 'semantic' : 'keyword',
  }))
}

async function searchStudentDomains(userId, terms, regex, filters) {
  const results = []
  const type = filters.type || 'all'

  if (type === 'all' || type === 'opportunity') {
    const feed = await getStudentFeed(userId, { limit: 10 }).catch(() => ({ items: [] }))
    for (const item of feed.items || []) {
      const text = `${item.title} ${item.description || ''} ${(item.skills || []).join(' ')}`
      if (regex.test(text)) {
        results.push({
          type: 'OPPORTUNITY',
          id: `${item.source}-${item.sourceId}`,
          sourceId: item.sourceId,
          title: item.title,
          description: item.description || item.matchReason,
          date: item.deadline || item.updatedAt,
          authority: SOURCE_AUTHORITY.CANONICAL_RECORD,
          href: item.href || `/opportunities/${item.source}/${item.sourceId}`,
          baseScore: 65,
        })
      }
    }
  }

  if (type === 'all' || type === 'company') {
    const companies = await searchCompanies({ q: terms[0], limit: 5 }).catch(() => ({ items: [] }))
    for (const c of companies.items || []) {
      results.push({
        type: 'COMPANY',
        id: c._id.toString(),
        sourceId: c._id.toString(),
        title: c.name,
        description: c.industry || c.description || '',
        authority: SOURCE_AUTHORITY.COMPANY_OFFICIAL,
        href: `/company/profile`,
        baseScore: 60,
      })
    }
  }

  if (type === 'all' || type === 'institution') {
    const insts = await searchInstitutions({ q: terms[0], limit: 5 }).catch(() => ({ items: [] }))
    for (const i of insts.items || []) {
      results.push({
        type: 'INSTITUTION',
        id: i._id.toString(),
        sourceId: i._id.toString(),
        title: i.name,
        description: (i.programs || []).slice(0, 3).join(', '),
        authority: SOURCE_AUTHORITY.INSTITUTION_OFFICIAL,
        href: i.slug ? `/institutions/${i.slug}` : '/institutions',
        baseScore: 60,
      })
    }
  }

  return results
}

async function searchOrgDomains(orgId, role, terms, regex, filters) {
  const results = []
  const eco = await searchEcosystem(orgId, role, { q: terms[0], type: filters.type || 'all', limit: 15 })
  for (const r of eco.results || []) {
    const typeMap = {
      program: 'PROGRAM',
      partnership: 'INSTITUTION',
      job: 'OPPORTUNITY',
    }
    results.push({
      type: typeMap[r.kind] || 'RESEARCH',
      id: r.id,
      sourceId: r.id,
      title: r.title,
      description: r.subtitle || r.status || '',
      authority: SOURCE_AUTHORITY.CANONICAL_RECORD,
      href: r.href,
      baseScore: 62,
    })
  }

  if (role === 'institution') {
    const projects = await InstitutionResearchProject.find({
      institutionId: orgId,
      $or: [{ title: regex }, { abstract: regex }, { researchArea: regex }],
    })
      .select('title abstract researchArea status')
      .limit(8)
      .lean()
    for (const p of projects) {
      results.push({
        type: 'RESEARCH',
        id: p._id.toString(),
        sourceId: p._id.toString(),
        title: p.title,
        description: p.abstract?.slice(0, 160) || p.researchArea,
        authority: SOURCE_AUTHORITY.VERIFIED_RESEARCH,
        href: '/institution/research',
        baseScore: 70,
      })
    }
  }

  return results
}

async function globalSearch({
  userId,
  role,
  organizationId,
  query,
  type = 'all',
  limit = 20,
  useSemantic = true,
}) {
  const safeQuery = sanitizeQuery(query)
  if (!safeQuery) {
    return { results: [], intent: 'LOOKUP', query: '', zeroResults: true, suggestions: ['Try a topic, skill, or company name'] }
  }

  const cacheKey = `${userId}:${role}:${organizationId}:${safeQuery}:${type}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < SEARCH_LIMITS.CACHE_TTL_MS) {
    return cached.data
  }

  const intent = detectIntent(safeQuery, type)
  const terms = expandQuery(safeQuery)
  const regex = buildRegex(terms)

  let personalization = null
  try {
    personalization = await contextPersonalization.getContextForAgent(userId, role, {
      query: safeQuery,
      organizationId,
    })
  } catch {
    personalization = null
  }

  const [indexed, domainResults] = await Promise.all([
    searchIndexedChunks(userId, role, organizationId, terms, {
      semanticQuery: useSemantic ? safeQuery : null,
    }),
    role === 'student'
      ? searchStudentDomains(userId, terms, regex, { type })
      : organizationId
        ? searchOrgDomains(organizationId, role, terms, regex, { type })
        : [],
  ])

  let all = dedupeResults([...indexed, ...domainResults])
  all = all
    .map((r) => scoreResult(r, { terms, personalization, intent }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.min(limit, SEARCH_LIMITS.MAX_RESULTS))

  if (type !== 'all') {
    const typeMap = {
      document: 'DOCUMENT',
      research: 'RESEARCH',
      opportunity: 'OPPORTUNITY',
      company: 'COMPANY',
      institution: 'INSTITUTION',
      project: 'PROJECT',
      course: 'COURSE',
      book: 'BOOK',
      program: 'PROGRAM',
    }
    const want = typeMap[type] || type.toUpperCase()
    all = all.filter((r) => r.type === want)
  }

  await SearchQuery.create({
    ownerUserId: userId,
    query: safeQuery,
    intent,
    filters: { type },
    resultCount: all.length,
  }).catch(() => null)

  const recentQueries = await SearchQuery.find({ ownerUserId: userId, saved: false })
    .sort({ createdAt: -1 })
    .limit(SEARCH_LIMITS.MAX_RECENT)
    .select('query intent createdAt')
    .lean()

  const payload = {
    results: all,
    intent,
    query: safeQuery,
    terms,
    zeroResults: all.length === 0,
    suggestions: all.length === 0
      ? ['Broaden your search', 'Remove filters', `Try related: ${terms.slice(1, 3).join(', ') || 'machine learning'}`]
      : [],
    ambiguous: terms.length > 1 && safeQuery.split(' ').length === 1
      ? [`${safeQuery} — Programming`, `${safeQuery} — Courses`, `${safeQuery} — Opportunities`]
      : [],
    recent: recentQueries.map((q) => q.query),
    searchMethods: {
      keyword: true,
      semantic: Boolean(useSemantic && openaiProvider && process.env.OPENAI_API_KEY),
      hybrid: true,
    },
  }

  cache.set(cacheKey, { at: Date.now(), data: payload })
  return payload
}

async function getSuggestions(userId, role, { prefix = '', page = '' } = {}) {
  const p = sanitizeQuery(prefix)
  const base = ['machine learning projects', 'AI internships', 'Python courses', 'career roadmap', 'research papers']
  let personalized = []
  try {
    const ctx = await contextPersonalization.buildUserContext(userId, role, {})
    if (ctx.career?.goal && ctx.career.goal !== 'UNKNOWN') {
      personalized.push(`Resources for ${ctx.career.goal}`)
    }
    if (page.includes('career')) personalized.push('skill gaps for my career goal')
    if (page.includes('opportunit')) personalized.push('matching internships')
  } catch {
    personalized = []
  }
  const combined = [...personalized, ...base]
  if (!p) return combined.slice(0, 6)
  return combined.filter((s) => s.toLowerCase().includes(p.toLowerCase())).slice(0, 6)
}

function buildResearchPlan(question, intent) {
  return [
    { order: 1, step: 'Understand research question', agentId: 'RESEARCH_AGENT' },
    { order: 2, step: 'Retrieve authorized sources', agentId: 'RESEARCH_AGENT' },
    { order: 3, step: intent === 'CAREER' ? 'Connect findings to career context' : 'Rank and validate sources', agentId: intent === 'CAREER' ? 'CAREER_AGENT' : 'RESEARCH_AGENT' },
    { order: 4, step: 'Synthesize evidence with citations', agentId: 'RESEARCH_AGENT' },
  ]
}

function synthesizeFromSources(question, sources) {
  if (!sources.length) {
    return {
      answer: 'Insufficient information in the available sources.',
      keyFindings: [],
      limitations: ['No matching authorized sources were found for this question.'],
      nextActions: ['Broaden your search terms', 'Index relevant documents', 'Try a more specific question'],
      synthesisUsedAi: false,
    }
  }

  const keyFindings = sources.slice(0, 5).map((s, i) => ({
    label: 'SOURCE_FACT',
    text: `${s.title}: ${(s.excerpt || s.description || '').slice(0, 180)}`,
    citationIndex: i,
  }))

  const synthesis = {
    label: 'SYNTHESIS',
    text: `Across ${sources.length} source(s), recurring themes include: ${sources.map((s) => s.title).slice(0, 3).join('; ')}.`,
  }

  const inference = sources.length >= 2 ? {
    label: 'INFERENCE',
    text: 'Multiple sources reference similar topics — this may indicate aligned relevance to your question.',
  } : null

  const recommendation = {
    label: 'RECOMMENDATION',
    text: 'Review the cited sources directly and verify details before acting on this summary.',
  }

  return {
    answer: `Based on ${sources.length} retrieved source(s), here is an evidence-first summary for: "${question}". See key findings and citations below. This is a SOURCE-BASED summary — not a guarantee of completeness.`,
    keyFindings: [...keyFindings, synthesis, ...(inference ? [inference] : []), recommendation],
    limitations: [
      'Summary derived only from authorized retrieved sources',
      'Does not include sources you cannot access',
      ...(sources.length < 3 ? ['Limited source count — consider broadening the search'] : []),
    ],
    nextActions: ['Review source panel', 'Save useful sources', 'Ask a follow-up research question'],
    synthesisUsedAi: false,
  }
}

async function runResearchMode({ userId, role, organizationId, question }) {
  const safeQ = sanitizeQuery(question)
  if (!safeQ) {
    const err = new Error('Research question required')
    err.statusCode = 400
    throw err
  }

  const intent = detectIntent(safeQ, 'all')
  const session = await ResearchSession.create({
    ownerUserId: userId,
    organizationId: organizationId || null,
    role,
    question: safeQ,
    intent,
    plan: buildResearchPlan(safeQ, intent),
    status: 'RETRIEVING',
  })

  const search = await globalSearch({
    userId,
    role,
    organizationId,
    query: safeQ,
    limit: SEARCH_LIMITS.MAX_RAG_CHUNKS,
    useSemantic: true,
  })

  const sources = search.results.map((r) => ({
    sourceType: r.sourceType || r.type,
    sourceId: r.sourceId || r.id,
    title: r.title,
    section: r.section || '',
    page: r.page || null,
    excerpt: r.excerpt || r.description || '',
    authority: r.authority || SOURCE_AUTHORITY.GENERAL_CONTENT,
    href: r.href || '',
  }))

  session.sources = sources
  session.status = 'SYNTHESIZING'

  const synthesized = synthesizeFromSources(safeQ, search.results)
  session.answer = synthesized.answer
  session.keyFindings = synthesized.keyFindings
  session.limitations = synthesized.limitations
  session.nextActions = synthesized.nextActions
  session.synthesisUsedAi = synthesized.synthesisUsedAi
  session.status = 'COMPLETED'
  await session.save()

  return {
    session: session.toObject(),
    searchIntent: intent,
    resultCount: sources.length,
  }
}

async function indexDocument(userId, role, orgId, payload) {
  const { sourceType, sourceId, title, text, section, page, visibility = 'private' } = payload
  if (!text || !sourceType) {
    const err = new Error('sourceType and text required')
    err.statusCode = 400
    throw err
  }

  const chunks = String(text).match(/[\s\S]{1,800}/g) || [String(text)]
  let embedding = null
  if (openaiProvider && process.env.OPENAI_API_KEY) {
    const emb = await openaiProvider.embeddings(chunks[0].slice(0, 500)).catch(() => null)
    embedding = emb?.embeddings || null
  }

  const entries = []
  for (let i = 0; i < chunks.length; i += 1) {
    const entry = await SearchIndexEntry.create({
      ownerUserId: userId,
      organizationId: orgId || null,
      tenantRole: role,
      sourceType,
      sourceId: sourceId || '',
      title: title || `Document chunk ${i + 1}`,
      chunkText: chunks[i],
      section: section || '',
      page: page ?? null,
      visibility,
      authority: visibility === 'public' ? SOURCE_AUTHORITY.GENERAL_CONTENT : SOURCE_AUTHORITY.USER_MATERIAL,
      embedding: i === 0 ? embedding : null,
      keywords: expandQuery(title || ''),
    })
    entries.push(entry)
  }

  return { indexed: entries.length, entries: entries.map((e) => ({ id: e._id, title: e.title })) }
}

async function expandGraph(entity, userId, role, orgId) {
  const term = sanitizeQuery(entity)
  if (!term) return { nodes: [], edges: [] }

  const search = await globalSearch({ userId, role, organizationId: orgId, query: term, limit: 12 })
  const nodes = [{ id: term, label: term, type: 'SKILL' }]
  const edges = []

  for (const r of search.results) {
    nodes.push({ id: r.id, label: r.title, type: r.type })
    edges.push({ from: term, to: r.id, relation: 'related_to' })
  }

  return { nodes: dedupeResults(nodes.map((n) => ({ ...n, id: n.id, title: n.label }))).slice(0, 15), edges: edges.slice(0, 20) }
}

async function getRecentSearches(userId) {
  return SearchQuery.find({ ownerUserId: userId, saved: false })
    .sort({ createdAt: -1 })
    .limit(SEARCH_LIMITS.MAX_RECENT)
    .lean()
}

async function getSavedSearches(userId) {
  return SearchQuery.find({ ownerUserId: userId, saved: true })
    .sort({ updatedAt: -1 })
    .limit(SEARCH_LIMITS.MAX_SAVED)
    .lean()
}

async function saveSearch(userId, query) {
  const safe = sanitizeQuery(query)
  return SearchQuery.create({ ownerUserId: userId, query: safe, saved: true })
}

async function clearRecentSearches(userId) {
  await SearchQuery.deleteMany({ ownerUserId: userId, saved: false })
  return { cleared: true }
}

async function getResearchSession(sessionId, userId) {
  const session = await ResearchSession.findById(sessionId).lean()
  if (!session) {
    const err = new Error('Research session not found')
    err.statusCode = 404
    throw err
  }
  if (session.ownerUserId.toString() !== userId.toString()) {
    const err = new Error('Not authorized for this research session')
    err.statusCode = 403
    throw err
  }
  return session
}

async function recordSearchFeedback(userId, { resultId, feedback, query }) {
  return { recorded: true, resultId, feedback, query: sanitizeQuery(query) }
}

module.exports = {
  sanitizeQuery,
  detectIntent,
  expandQuery,
  globalSearch,
  getSuggestions,
  runResearchMode,
  indexDocument,
  expandGraph,
  getRecentSearches,
  getSavedSearches,
  saveSearch,
  clearRecentSearches,
  getResearchSession,
  recordSearchFeedback,
  synthesizeFromSources,
}
