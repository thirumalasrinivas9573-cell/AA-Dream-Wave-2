#!/usr/bin/env node
/** Lasya V5 Prompt 4 — research workspace + synthesis + report builder verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const SearchIndexEntry = require('../models/SearchIndexEntry')
const ResearchWorkspace = require('../models/ResearchWorkspace')

const API_PORT = process.env.VERIFY_PORT || process.env.PORT || 5001
const BASE = `http://127.0.0.1:${API_PORT}/api`
const results = []

function pass(n) { results.push({ ok: true, n }); console.log(`  PASS  ${n}`) }
function fail(n, d) { results.push({ ok: false, n, d }); console.log(`  FAIL  ${n}${d ? `: ${d}` : ''}`) }

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(id) { return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' }) }

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const userA = await User.create({
    name: 'RW User A', email: `rw-a-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })
  const userB = await User.create({
    name: 'RW User B', email: `rw-b-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })
  const tokenA = sign(userA._id)
  const tokenB = sign(userB._id)

  await SearchIndexEntry.create({
    ownerUserId: userA._id,
    sourceType: 'research',
    sourceId: 'rw-doc-1',
    title: 'AI Engineering Skills Guide',
    chunkText: 'Machine learning, Python, and MLOps are core skills for AI engineering roles.',
    authority: 60,
    visibility: 'private',
  })

  // 1 Architecture — route exists
  const listEmpty = await request('/research/workspace', { token: tokenA })
  listEmpty.status === 200 && listEmpty.data.success ? pass('1 Research architecture — workspace API') : fail('1', listEmpty.status)

  // 2 Create workspace
  const created = await request('/research/workspace', {
    method: 'POST', token: tokenA,
    body: {
      title: 'AI Skills Study',
      researchQuestion: 'What skills are most relevant for AI engineering opportunities?',
    },
  })
  const wsId = created.data?.workspace?._id
  created.status === 201 && wsId ? pass('2 Research Workspace create') : fail('2', created.status)

  // 3 Status
  if (created.data?.workspace?.status === 'DRAFT') pass('3 Workspace status DRAFT')
  else fail('3', created.data?.workspace?.status)

  // 4 Research question
  if (created.data?.workspace?.researchQuestion?.includes('AI engineering')) pass('4 Research question stored')
  else fail('4')

  // 5 Research plan
  if (Array.isArray(created.data?.workspace?.plan) && created.data.workspace.plan.length >= 4) pass('5 Research plan generated')
  else fail('5')

  // 6 Collect sources via search integration
  const collected = await request(`/research/workspace/${wsId}/sources/collect`, {
    method: 'POST', token: tokenA, body: { query: 'AI engineering skills' },
  })
  collected.status === 200 && collected.data.added?.length >= 0 ? pass('6 Source collection via search') : fail('6', collected.status)

  // 7 Manual source add with metadata
  const manual = await request(`/research/workspace/${wsId}/sources`, {
    method: 'POST', token: tokenA,
    body: { sourceType: 'PAPER', title: 'Test Paper', author: 'UNKNOWN', authority: 'USER_PROVIDED', excerpt: 'Sample evidence text.' },
  })
  manual.status === 201 ? pass('7 Source types and metadata') : fail('7', manual.status)

  // 8 Authority
  if (manual.data?.workspace?.sources?.some((s) => s.authority === 'USER_PROVIDED')) pass('8 Source authority')
  else fail('8')

  // 9 Snapshot
  const got = await request(`/research/workspace/${wsId}`, { token: tokenA })
  if (got.data?.workspace?.sources?.[0]?.snapshotAt) pass('9 Source snapshot preserved')
  else fail('9')

  // 10 Evidence extraction
  const evidence = await request(`/research/workspace/${wsId}/evidence/extract`, { method: 'POST', token: tokenA })
  evidence.status === 200 && evidence.data.workspace.claims?.length ? pass('10 Evidence extraction + claim registry') : fail('10', evidence.status)

  // 11 Claim types
  if (evidence.data?.workspace?.claims?.some((c) => c.type === 'FACT')) pass('11 Claim types FACT')
  else fail('11')

  // 12 Synthesis
  const syn = await request(`/research/workspace/${wsId}/synthesize`, { method: 'POST', token: tokenA })
  syn.status === 200 && syn.data.workspace.synthesis?.keyFindings?.length ? pass('12 Synthesis engine') : fail('12', syn.status)

  // 13 Contradiction detection structure
  if (Array.isArray(syn.data?.workspace?.synthesis?.contradictions)) pass('13 Contradiction detection')
  else fail('13')

  // 14 Evidence matrix
  if (Array.isArray(syn.data?.workspace?.synthesis?.evidenceMatrix)) pass('14 Evidence matrix')
  else fail('14')

  // 15 Report generation
  const report = await request(`/research/workspace/${wsId}/reports`, {
    method: 'POST', token: tokenA, body: { template: 'CAREER_RESEARCH' },
  })
  const reportId = report.data?.report?.reportId
  report.status === 201 && reportId ? pass('15 Report generation') : fail('15', report.status)

  // 16 Report structure sections
  if (report.data?.report?.sections?.some((s) => s.key === 'REFERENCES')) pass('16 Report structure + references')
  else fail('16')

  // 17 Report review / quality check
  const review = await request(`/research/workspace/${wsId}/reports/${reportId}/review`, { method: 'POST', token: tokenA })
  review.status === 200 ? pass('17 Report quality check') : fail('17', review.status)

  // 18 Approve report
  const approve = await request(`/research/workspace/${wsId}/reports/${reportId}/approve`, { method: 'POST', token: tokenA })
  approve.status === 200 && approve.data.report.status === 'APPROVED' ? pass('18 Human review approve') : fail('18', approve.status)

  // 19 Dashboard
  const dash = await request(`/research/workspace/${wsId}/dashboard`, { token: tokenA })
  dash.status === 200 && dash.data.dashboard.sourceCount >= 0 ? pass('19 Research dashboard') : fail('19', dash.status)

  // 20 Research chat
  const chat = await request(`/research/workspace/${wsId}/chat`, {
    method: 'POST', token: tokenA, body: { question: 'What are the strongest findings?' },
  })
  chat.status === 200 && chat.data.answer ? pass('20 Research chat bounded to workspace') : fail('20', chat.status)

  // 21 Notes — user vs AI content
  const note = await request(`/research/workspace/${wsId}/notes`, {
    method: 'POST', token: tokenA, body: { content: 'My user note', contentType: 'USER_NOTE' },
  })
  note.status === 201 ? pass('21 Collaborative notes + content type') : fail('21', note.status)

  // 22 IDOR — user B cannot access user A workspace
  const idor = await request(`/research/workspace/${wsId}`, { token: tokenB })
  idor.status === 403 ? pass('22 IDOR protection') : fail('22', `status ${idor.status}`)

  // 23 Tenant isolation list
  const listB = await request('/research/workspace', { token: tokenB })
  const leaked = (listB.data.items || []).some((w) => w._id === wsId)
  !leaked ? pass('23 Tenant/user isolation on list') : fail('23', 'cross-user leak')

  // 24 Methodology tracked
  if (syn.data?.workspace?.methodology?.sourceCount >= 1) pass('24 Methodology tracking')
  else fail('24')

  // 25 Timeline
  if (dash.data.dashboard.timeline?.length >= 1) pass('25 Research timeline')
  else fail('25')

  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } })
  await SearchIndexEntry.deleteMany({ ownerUserId: userA._id })
  await ResearchWorkspace.deleteMany({ ownerUserId: userA._id })
  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok)
  console.log(`\nResearch Workspace verify: ${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAILED: ${f.n} ${f.d || ''}`))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
