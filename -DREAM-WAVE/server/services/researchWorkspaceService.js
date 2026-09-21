/**
 * Lasya V5 Prompt 4 — Research Workspace + Evidence + Synthesis + Report Builder
 * Reuses knowledgeDiscovery, personalization — no duplicate search/RAG engines.
 */
const crypto = require('crypto')
const ResearchWorkspace = require('../models/ResearchWorkspace')
const {
  WORKSPACE_STATUSES,
  SOURCE_TYPES,
  AUTHORITY_LEVELS,
  CLAIM_TYPES,
  CLAIM_STATUSES,
  REPORT_STATUSES,
  REPORT_SECTIONS,
  INJECTION_PATTERNS,
} = require('../constants/researchWorkspace')
const knowledgeDiscovery = require('./knowledgeDiscoveryService')
const contextPersonalization = require('./contextPersonalizationService')

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 8000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

function mapSearchTypeToSourceType(type = '') {
  const t = String(type).toLowerCase()
  const map = {
    document: 'DOCUMENT',
    book: 'BOOK',
    research: 'PAPER',
    paper: 'PAPER',
    web: 'WEB_SOURCE',
    institution: 'INSTITUTION',
    company: 'COMPANY',
    opportunity: 'OPPORTUNITY',
    project: 'PROJECT',
    course: 'COURSE',
    learning: 'COURSE',
    note: 'NOTE',
    record: 'STRUCTURED_RECORD',
  }
  return map[t] || (SOURCE_TYPES.includes(type) ? type : 'STRUCTURED_RECORD')
}

function mapAuthority(raw) {
  const v = String(raw || '').toUpperCase()
  if (AUTHORITY_LEVELS.includes(v)) return v
  if (/official|canonical|verified|user|general/.test(v)) {
    if (v.includes('OFFICIAL')) return 'OFFICIAL'
    if (v.includes('CANONICAL')) return 'CANONICAL'
    if (v.includes('VERIFIED')) return 'VERIFIED'
    if (v.includes('USER')) return 'USER_PROVIDED'
    if (v.includes('GENERAL')) return 'GENERAL'
  }
  return 'UNKNOWN'
}

async function assertWorkspaceAccess(workspaceId, userId, minRole = 'viewer') {
  const ws = await ResearchWorkspace.findById(workspaceId)
  if (!ws) {
    const err = new Error('Research workspace not found')
    err.statusCode = 404
    throw err
  }
  const uidStr = userId.toString()
  const isOwner = ws.ownerUserId.toString() === uidStr
  const collab = ws.collaborators.find((c) => c.userId?.toString() === uidStr)
  if (!isOwner && !collab) {
    const err = new Error('Not authorized for this research workspace')
    err.statusCode = 403
    throw err
  }
  if (minRole === 'editor' && !isOwner && collab?.role === 'viewer') {
    const err = new Error('Editor access required')
    err.statusCode = 403
    throw err
  }
  return ws
}

function pushTimeline(ws, event, description, actorUserId, metadata = {}) {
  ws.timeline.push({ event, description, actorUserId, metadata, timestamp: new Date() })
}

async function buildResearchPlan(question, role) {
  const intent = knowledgeDiscovery.detectIntent(question, 'all')
  const base = knowledgeDiscovery.synthesizeFromSources
    ? [
      { order: 1, step: 'Understand research question', agentId: 'RESEARCH_AGENT' },
      { order: 2, step: 'Search strategy for authorized sources', agentId: 'SEARCH_AGENT' },
      { order: 3, step: 'Collect and snapshot sources', agentId: 'RESEARCH_AGENT' },
      { order: 4, step: 'Extract evidence and register claims', agentId: 'RESEARCH_AGENT' },
      { order: 5, step: 'Compare sources and detect contradictions', agentId: 'RESEARCH_AGENT' },
      { order: 6, step: 'Synthesize findings with fact/inference separation', agentId: 'RESEARCH_AGENT' },
      { order: 7, step: 'Generate structured report draft', agentId: 'REPORT_AGENT' },
    ]
    : []
  if (intent === 'CAREER' || role === 'student') {
    base.splice(3, 0, { order: 3.5, step: 'Connect ecosystem and career context', agentId: 'CAREER_AGENT' })
  }
  if (intent === 'COMPANY' || intent === 'INSTITUTION') {
    base.splice(3, 0, { order: 3.5, step: 'Analyze ecosystem entities', agentId: 'ANALYTICS_AGENT' })
  }
  return base.map((s, i) => ({ ...s, order: i + 1 }))
}

async function createWorkspace({ userId, role, organizationId, title, researchQuestion, description, subquestions, scope, dateRange }) {
  const q = sanitizeText(researchQuestion)
  if (!q) {
    const err = new Error('Research question is required')
    err.statusCode = 400
    throw err
  }
  const plan = await buildResearchPlan(q, role)
  const ws = await ResearchWorkspace.create({
    ownerUserId: userId,
    organizationId: organizationId || null,
    tenantRole: role || 'student',
    title: sanitizeText(title) || q.slice(0, 120),
    researchQuestion: q,
    description: sanitizeText(description),
    subquestions: (subquestions || []).map(sanitizeText).filter(Boolean),
    scope: sanitizeText(scope),
    dateRange: dateRange || {},
    status: 'DRAFT',
    plan,
    collaborators: [{ userId, role: 'owner' }],
  })
  pushTimeline(ws, 'WORKSPACE_CREATED', `Workspace created: ${ws.title}`, userId)
  await ws.save()
  return ws.toObject()
}

async function listWorkspaces(userId, { status, limit = 20, page = 1 } = {}) {
  const filter = {
    $or: [{ ownerUserId: userId }, { 'collaborators.userId': userId }],
  }
  if (status && WORKSPACE_STATUSES.includes(status)) filter.status = status
  const skip = (Math.max(1, page) - 1) * limit
  const [items, total] = await Promise.all([
    ResearchWorkspace.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ResearchWorkspace.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

async function getWorkspace(workspaceId, userId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  return ws.toObject()
}

async function updateWorkspace(workspaceId, userId, patch) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  if (patch.title) ws.title = sanitizeText(patch.title)
  if (patch.researchQuestion) ws.researchQuestion = sanitizeText(patch.researchQuestion)
  if (patch.description !== undefined) ws.description = sanitizeText(patch.description)
  if (patch.subquestions) ws.subquestions = patch.subquestions.map(sanitizeText).filter(Boolean)
  if (patch.scope !== undefined) ws.scope = sanitizeText(patch.scope)
  if (patch.dateRange) ws.dateRange = patch.dateRange
  if (patch.status && WORKSPACE_STATUSES.includes(patch.status)) ws.status = patch.status
  await ws.save()
  return ws.toObject()
}

async function addSourceFromSearch(workspaceId, userId, role, organizationId, searchResult) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const sourceRefId = uid('src')
  const snapshot = {
    sourceRefId,
    sourceType: mapSearchTypeToSourceType(searchResult.sourceType || searchResult.type),
    canonicalSourceId: String(searchResult.sourceId || searchResult.id || ''),
    title: searchResult.title || 'UNKNOWN',
    author: searchResult.author || 'UNKNOWN',
    organization: searchResult.organization || 'UNKNOWN',
    date: searchResult.date || 'UNKNOWN',
    url: searchResult.href || searchResult.url || '',
    page: searchResult.page ?? null,
    section: searchResult.section || '',
    authority: mapAuthority(searchResult.authority),
    excerpt: sanitizeText(searchResult.excerpt || searchResult.description || '').slice(0, 500),
    href: searchResult.href || '',
    snapshotAt: new Date(),
    addedByUserId: userId,
  }
  ws.sources.push(snapshot)
  if (ws.status === 'DRAFT') ws.status = 'RESEARCHING'
  pushTimeline(ws, 'SOURCE_ADDED', `Added source: ${snapshot.title}`, userId, { sourceRefId })
  await ws.save()
  return { workspace: ws.toObject(), sourceRefId }
}

async function addSource(workspaceId, userId, payload) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const sourceRefId = uid('src')
  const snapshot = {
    sourceRefId,
    sourceType: SOURCE_TYPES.includes(payload.sourceType) ? payload.sourceType : 'STRUCTURED_RECORD',
    canonicalSourceId: String(payload.canonicalSourceId || payload.sourceId || ''),
    title: payload.title || 'UNKNOWN',
    author: payload.author || 'UNKNOWN',
    organization: payload.organization || 'UNKNOWN',
    date: payload.date || 'UNKNOWN',
    url: payload.url || '',
    page: payload.page ?? null,
    section: payload.section || '',
    authority: mapAuthority(payload.authority),
    excerpt: sanitizeText(payload.excerpt || '').slice(0, 500),
    href: payload.href || payload.url || '',
    snapshotAt: new Date(),
    addedByUserId: userId,
  }
  ws.sources.push(snapshot)
  if (ws.status === 'DRAFT') ws.status = 'RESEARCHING'
  pushTimeline(ws, 'SOURCE_ADDED', `Added source: ${snapshot.title}`, userId, { sourceRefId })
  await ws.save()
  return { workspace: ws.toObject(), sourceRefId }
}

async function removeSource(workspaceId, userId, sourceRefId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const before = ws.sources.length
  ws.sources = ws.sources.filter((s) => s.sourceRefId !== sourceRefId)
  if (ws.sources.length === before) {
    const err = new Error('Source not found in workspace')
    err.statusCode = 404
    throw err
  }
  ws.evidence = ws.evidence.filter((e) => e.sourceRefId !== sourceRefId)
  ws.claims = ws.claims.map((c) => ({
    ...c.toObject?.() || c,
    supportingSourceRefs: (c.supportingSourceRefs || []).filter((r) => r !== sourceRefId),
  }))
  pushTimeline(ws, 'SOURCE_REMOVED', `Removed source ${sourceRefId}`, userId)
  await ws.save()
  return ws.toObject()
}

async function searchAndCollectSources(workspaceId, userId, role, organizationId, query, limit = 12) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const safeQ = knowledgeDiscovery.sanitizeQuery(query || ws.researchQuestion)
  const personalization = await contextPersonalization.buildUserContext(userId, role, { organizationId }).catch(() => null)
  const search = await knowledgeDiscovery.globalSearch({
    userId,
    role,
    organizationId,
    query: safeQ,
    limit,
    useSemantic: true,
    personalization,
  })
  const added = []
  for (const r of search.results.slice(0, limit)) {
    const { sourceRefId } = await addSourceFromSearch(workspaceId, userId, role, organizationId, r)
    added.push(sourceRefId)
  }
  const refreshed = await ResearchWorkspace.findById(workspaceId)
  refreshed.methodology = {
    searchScope: safeQ,
    sourceTypes: [...new Set(refreshed.sources.map((s) => s.sourceType))],
    sourceCount: refreshed.sources.length,
    filters: { intent: search.intent },
    generatedAt: new Date(),
  }
  await refreshed.save()
  return { workspace: refreshed.toObject(), added, searchIntent: search.intent, resultCount: search.results.length }
}

function extractEvidenceFromSources(ws) {
  const evidence = []
  const claims = []
  for (const src of ws.sources) {
    if (!src.excerpt) continue
    const claimId = uid('claim')
    const claimText = `${src.title}: ${src.excerpt.slice(0, 200)}`
    claims.push({
      claimId,
      text: claimText,
      type: 'FACT',
      supportingSourceRefs: [src.sourceRefId],
      status: 'SUPPORTED',
    })
    evidence.push({
      claimId,
      sourceRefId: src.sourceRefId,
      location: src.section || (src.page != null ? `page ${src.page}` : ''),
      page: src.page,
      section: src.section,
      excerpt: src.excerpt,
      quote: '',
      limitations: src.authority === 'UNKNOWN' ? ['Source authority unverified'] : [],
    })
  }
  return { evidence, claims }
}

async function runEvidenceExtraction(workspaceId, userId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const { evidence, claims } = extractEvidenceFromSources(ws)
  ws.evidence = evidence
  ws.claims = claims
  pushTimeline(ws, 'FINDING_GENERATED', `Extracted ${claims.length} evidence-backed claim(s)`, userId)
  await ws.save()
  return ws.toObject()
}

function detectContradictions(sources) {
  const contradictions = []
  for (let i = 0; i < sources.length; i += 1) {
    for (let j = i + 1; j < sources.length; j += 1) {
      const a = sources[i]
      const b = sources[j]
      const aText = (a.excerpt || '').toLowerCase()
      const bText = (b.excerpt || '').toLowerCase()
      const negPatterns = [
        [/\bincrease\b/, /\bdecrease\b/],
        [/\bmore\b/, /\bless\b/],
        [/\btrue\b/, /\bfalse\b/],
        [/\brequired\b/, /\boptional\b/],
      ]
      for (const [pos, neg] of negPatterns) {
        if (pos.test(aText) && neg.test(bText)) {
          contradictions.push({
            sourceA: a.sourceRefId,
            sourceB: b.sourceRefId,
            description: `Source "${a.title}" and "${b.title}" may disagree on related claims.`,
          })
          break
        }
      }
    }
  }
  return contradictions
}

function buildEvidenceMatrix(claims, sources) {
  return claims.map((c) => {
    const row = { claim: c.text, sources: {}, status: c.status }
    for (const src of sources) {
      row.sources[src.sourceRefId] = (c.supportingSourceRefs || []).includes(src.sourceRefId) ? 'SUPPORTS' : '—'
    }
    return row
  })
}

function compareSources(sources) {
  return sources.map((s) => ({
    sourceRefId: s.sourceRefId,
    title: s.title,
    authority: s.authority,
    date: s.date,
    scope: s.section || 'UNKNOWN',
    excerpt: s.excerpt?.slice(0, 160) || '',
    limitations: s.authority === 'UNKNOWN' ? ['Authority unverified'] : [],
  }))
}

async function runSynthesis(workspaceId, userId, role, organizationId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  if (!ws.sources.length) {
    const err = new Error('Add sources before synthesis')
    err.statusCode = 400
    throw err
  }

  if (!ws.claims.length) {
    const extracted = extractEvidenceFromSources(ws)
    ws.evidence = extracted.evidence
    ws.claims = extracted.claims
  }

  const searchResults = ws.sources.map((s) => ({
    title: s.title,
    excerpt: s.excerpt,
    description: s.excerpt,
    sourceType: s.sourceType,
    id: s.canonicalSourceId,
  }))
  const synthesized = knowledgeDiscovery.synthesizeFromSources(ws.researchQuestion, searchResults)
  const contradictions = detectContradictions(ws.sources)
  const gaps = []
  if (ws.sources.length < 3) gaps.push(`Only ${ws.sources.length} relevant source(s) were available for this question.`)
  const outdated = ws.sources.filter((s) => s.date && s.date !== 'UNKNOWN' && /20(1[0-8]|0[0-9])/.test(s.date))
  if (outdated.length) gaps.push(`${outdated.length} source(s) may be outdated based on publication date.`)

  const unsupported = ws.claims.filter((c) => c.type === 'FACT' && !(c.supportingSourceRefs || []).length)
  for (const c of unsupported) c.status = 'UNSUPPORTED'

  ws.synthesis = {
    keyFindings: (synthesized.keyFindings || []).map((f) => ({
      label: f.label || 'SYNTHESIS',
      text: f.text,
      sourceRefs: ws.sources.slice(0, 3).map((s) => s.sourceRefId),
    })),
    agreements: ws.sources.length >= 2
      ? [`${ws.sources.length} sources were reviewed for "${ws.researchQuestion}".`]
      : [],
    contradictions,
    gaps,
    limitations: synthesized.limitations || [],
    evidenceMatrix: buildEvidenceMatrix(ws.claims, ws.sources),
    updatedAt: new Date(),
  }
  ws.status = 'SYNTHESIZING'
  ws.methodology = {
    searchScope: ws.researchQuestion,
    sourceTypes: [...new Set(ws.sources.map((s) => s.sourceType))],
    sourceCount: ws.sources.length,
    filters: ws.methodology?.filters || {},
    generatedAt: new Date(),
  }
  pushTimeline(ws, 'SYNTHESIS_COMPLETED', 'Knowledge synthesis completed', userId)
  await ws.save()
  return { workspace: ws.toObject(), sourceComparison: compareSources(ws.sources), personalized: Boolean(role) }
}

function validateClaims(claims) {
  const issues = []
  for (const c of claims) {
    if (c.type === 'FACT' && !(c.supportingSourceRefs || []).length) {
      issues.push(`Unsupported factual claim: ${c.text.slice(0, 80)}`)
      c.status = 'UNSUPPORTED'
    }
    if (c.type === 'FACT' && (c.supportingSourceRefs || []).length) {
      c.status = 'SUPPORTED'
    }
  }
  return issues
}

function buildReportSections(ws, template = 'ACADEMIC_RESEARCH') {
  const refs = ws.sources.map((s, i) => ({
    sourceRefId: s.sourceRefId,
    citation: `[${i + 1}] ${s.title}${s.author !== 'UNKNOWN' ? ` — ${s.author}` : ''}${s.date !== 'UNKNOWN' ? ` (${s.date})` : ''}${s.url ? ` ${s.url}` : ''}`,
  }))

  const execSummary = [
    `What was studied: ${ws.researchQuestion}`,
    `What was found: ${ws.synthesis?.keyFindings?.length || 0} key finding(s) from ${ws.sources.length} source(s).`,
    `Why it matters: Structured evidence supports informed decisions on this topic.`,
    `Limitations: ${(ws.synthesis?.limitations || ['Evidence limited to collected sources']).join('; ')}`,
    `Next steps: Review contradictions and gaps; approve before sharing.`,
  ].join('\n')

  const sections = [
    { key: 'TITLE', title: 'Title', content: ws.title, citations: [] },
    { key: 'RESEARCH_QUESTION', title: 'Research Question', content: ws.researchQuestion, citations: [] },
    { key: 'EXECUTIVE_SUMMARY', title: 'Executive Summary', content: execSummary, citations: [] },
    { key: 'METHODOLOGY', title: 'Methodology', content: `Search scope: ${ws.methodology?.searchScope || ws.researchQuestion}\nSource types: ${(ws.methodology?.sourceTypes || []).join(', ') || 'N/A'}\nNumber of sources: ${ws.sources.length}`, citations: [] },
    { key: 'KEY_FINDINGS', title: 'Key Findings', content: (ws.synthesis?.keyFindings || []).map((f) => `[${f.label}] ${f.text}`).join('\n\n') || 'INSUFFICIENT_EVIDENCE', citations: ws.sources.slice(0, 3).map((s, i) => ({ sourceRefId: s.sourceRefId, label: `[Source ${i + 1}]` })) },
    { key: 'EVIDENCE', title: 'Evidence', content: ws.evidence.map((e) => `Claim ${e.claimId}: ${e.excerpt} (${e.location || 'location unknown'})`).join('\n\n') || 'No evidence extracted.', citations: [] },
    { key: 'SOURCE_COMPARISON', title: 'Source Comparison', content: compareSources(ws.sources).map((s) => `${s.title} — authority: ${s.authority}, date: ${s.date}`).join('\n'), citations: [] },
    { key: 'LIMITATIONS', title: 'Limitations', content: (ws.synthesis?.limitations || []).join('\n') || 'See methodology.', citations: [] },
    { key: 'RESEARCH_GAPS', title: 'Research Gaps', content: (ws.synthesis?.gaps || []).join('\n') || 'None identified.', citations: [] },
    { key: 'RECOMMENDATIONS', title: 'Recommendations', content: 'Review source evidence directly. Do not treat AI synthesis as verified fact. Promote only approved findings to shared knowledge systems.', citations: [] },
    { key: 'REFERENCES', title: 'References', content: refs.map((r) => r.citation).join('\n'), citations: [] },
  ]

  return { sections, references: refs, template }
}

async function generateReport(workspaceId, userId, { template = 'ACADEMIC_RESEARCH', title } = {}) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  if (!ws.synthesis?.updatedAt) {
    await runSynthesis(workspaceId, userId, ws.tenantRole, ws.organizationId)
    const refreshed = await ResearchWorkspace.findById(workspaceId)
    ws.sources = refreshed.sources
    ws.claims = refreshed.claims
    ws.evidence = refreshed.evidence
    ws.synthesis = refreshed.synthesis
    ws.methodology = refreshed.methodology
  }

  validateClaims(ws.claims)
  const { sections, references } = buildReportSections(ws, template)
  const qualityIssues = validateClaims(ws.claims)
  if (ws.synthesis?.contradictions?.length) {
    qualityIssues.push(`${ws.synthesis.contradictions.length} source contradiction(s) require review.`)
  }

  const reportId = uid('report')
  const version = (ws.reports?.length || 0) + 1
  const report = {
    reportId,
    version,
    template,
    title: sanitizeText(title) || ws.title,
    status: qualityIssues.length ? 'REVIEW' : 'DRAFT',
    sections,
    references,
    qualityIssues,
  }
  ws.reports.push(report)
  ws.status = 'REVIEW'
  pushTimeline(ws, 'REPORT_GENERATED', `Report v${version} generated`, userId, { reportId })
  await ws.save()
  return { workspace: ws.toObject(), report }
}

async function reviewReport(workspaceId, userId, reportId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const report = ws.reports.find((r) => r.reportId === reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  const issues = []
  issues.push(...validateClaims(ws.claims))
  if (!report.references?.length) issues.push('Missing references section.')
  for (const sec of report.sections || []) {
    if (sec.key === 'KEY_FINDINGS' && sec.content === 'INSUFFICIENT_EVIDENCE') {
      issues.push('Key findings section has insufficient evidence.')
    }
  }
  report.qualityIssues = [...new Set([...(report.qualityIssues || []), ...issues])]
  report.status = issues.length ? 'REVIEW' : report.status
  pushTimeline(ws, 'REPORT_REVIEWED', `Report ${reportId} reviewed`, userId, { issues: issues.length })
  await ws.save()
  return { workspace: ws.toObject(), report, issues }
}

async function approveReport(workspaceId, userId, reportId) {
  const { issues } = await reviewReport(workspaceId, userId, reportId)
  const blocking = issues.filter((i) => /Unsupported factual claim/.test(i))
  if (blocking.length) {
    const err = new Error('Cannot approve report with unsupported factual claims')
    err.statusCode = 400
    err.issues = blocking
    throw err
  }
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  const report = ws.reports.find((r) => r.reportId === reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  report.status = 'APPROVED'
  report.approvedAt = new Date()
  report.approvedByUserId = userId
  ws.status = 'COMPLETED'
  pushTimeline(ws, 'REPORT_APPROVED', `Report ${reportId} approved`, userId)
  await ws.save()
  return { workspace: ws.toObject(), report }
}

async function addNote(workspaceId, userId, content, contentType = 'USER_NOTE') {
  const ws = await assertWorkspaceAccess(workspaceId, userId, 'editor')
  ws.notes.push({
    authorUserId: userId,
    content: sanitizeText(content),
    contentType: ['USER_NOTE', 'AI_SUMMARY', 'AI_RECOMMENDATION'].includes(contentType) ? contentType : 'USER_NOTE',
  })
  await ws.save()
  return ws.toObject()
}

async function getDashboard(workspaceId, userId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  return {
    workspaceId: ws._id,
    title: ws.title,
    researchQuestion: ws.researchQuestion,
    status: ws.status,
    sourceCount: ws.sources.length,
    evidenceCount: ws.evidence.length,
    claimCount: ws.claims.length,
    gaps: ws.synthesis?.gaps || [],
    keyFindings: ws.synthesis?.keyFindings || [],
    agreements: ws.synthesis?.agreements || [],
    contradictions: ws.synthesis?.contradictions || [],
    reports: (ws.reports || []).map((r) => ({
      reportId: r.reportId,
      version: r.version,
      status: r.status,
      title: r.title,
    })),
    timeline: ws.timeline.slice(-20).reverse(),
    plan: ws.plan,
  }
}

async function researchChat(workspaceId, userId, question) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const q = sanitizeText(question).toLowerCase()
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  let answer = ''
  let contentType = 'AI_SUMMARY'

  if (/strongest|best finding|key finding/.test(q)) {
    const findings = ws.synthesis?.keyFindings || []
    answer = findings.length
      ? findings.map((f) => `[${f.label}] ${f.text}`).join('\n')
      : 'No synthesized findings yet. Run synthesis after adding sources.'
  } else if (/disagree|contradict|conflict/.test(q)) {
    const c = ws.synthesis?.contradictions || []
    answer = c.length
      ? c.map((x) => `Source A (${x.sourceA}) vs Source B (${x.sourceB}): ${x.description}`).join('\n')
      : 'No contradictions detected among current sources.'
  } else if (/evidence|support|cite/.test(q)) {
    answer = ws.evidence.length
      ? ws.evidence.slice(0, 5).map((e) => `${e.excerpt} — source ${e.sourceRefId} (${e.location || 'unknown location'})`).join('\n')
      : 'No evidence extracted yet.'
  } else if (/gap|missing|limitation/.test(q)) {
    answer = [...(ws.synthesis?.gaps || []), ...(ws.synthesis?.limitations || [])].join('\n') || 'No gaps recorded.'
  } else {
    answer = `This workspace contains ${ws.sources.length} source(s) and ${ws.claims.length} claim(s) for: "${ws.researchQuestion}". Ask about strongest findings, disagreements, evidence, or gaps.`
    contentType = 'AI_RECOMMENDATION'
  }

  return { answer, contentType, workspaceId: ws._id }
}

async function exportReportCsv(workspaceId, userId, reportId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const report = ws.reports.find((r) => r.reportId === reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  const rows = [['Section', 'Content']]
  for (const sec of report.sections || []) {
    rows.push([sec.title, (sec.content || '').replace(/\n/g, ' ')])
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  addSource,
  addSourceFromSearch,
  removeSource,
  searchAndCollectSources,
  runEvidenceExtraction,
  runSynthesis,
  generateReport,
  reviewReport,
  approveReport,
  addNote,
  getDashboard,
  researchChat,
  exportReportCsv,
  assertWorkspaceAccess,
  detectContradictions,
  compareSources,
  buildEvidenceMatrix,
  validateClaims,
}
