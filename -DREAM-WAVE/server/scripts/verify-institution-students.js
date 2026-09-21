#!/usr/bin/env node
/**
 * Comprehensive Institution Student Intelligence verification.
 * Covers: integration, API, security, permissions, validation, privacy, performance.
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionStudentNote = require('../models/InstitutionStudentNote')
const InstitutionMember = require('../models/InstitutionMember')
const InstitutionStudentAudit = require('../models/InstitutionStudentAudit')
const InstitutionCohort = require('../models/InstitutionCohort')
const InstitutionSavedFilter = require('../models/InstitutionSavedFilter')
const { roleHasPermission } = require('../constants/institutionPermissions')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

const PRIVATE_FIELD_DENYLIST = [
  'aiMemory',
  'aiConversations',
  'conversations',
  'goals',
  'tasks',
  'planner',
  'knowledgeGraph',
  'researchNotes',
  'privateProjects',
  'recommendationHistory',
  'personalNotes',
  'privateNotes',
  'careerReasoning',
  'password',
  'passwordHash',
  'jwt',
  'refreshToken',
]

const results = []

function record(category, name, pass, detail = '') {
  results.push({ category, name, pass, detail })
  const label = pass ? 'PASS' : 'FAIL'
  console.log(`[${category}] ${name}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!pass) throw new Error(`${category}/${name} failed: ${detail}`)
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data, headers: res.headers }
}

function sign(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

function scanForPrivateFields(obj, path = '') {
  const hits = []
  if (!obj || typeof obj !== 'object') return hits
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      hits.push(...scanForPrivateFields(obj[i], `${path}[${i}]`))
    }
    return hits
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key
    if (PRIVATE_FIELD_DENYLIST.some((d) => key.toLowerCase().includes(d.toLowerCase()))) {
      hits.push(fullPath)
    }
    if (value && typeof value === 'object') {
      hits.push(...scanForPrivateFields(value, fullPath))
    }
  }
  return hits
}

async function cleanup(institutionA, institutionB, users) {
  await InstitutionStudentAudit.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await InstitutionMember.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await InstitutionCohort.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await InstitutionSavedFilter.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await InstitutionStudentNote.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await InstitutionStudent.deleteMany({ institutionId: { $in: [institutionA._id, institutionB._id] } })
  await Institution.deleteMany({ _id: { $in: [institutionA._id, institutionB._id] } })
  await User.deleteMany({ _id: { $in: users.map((u) => u._id) } })
}

async function main() {
  if (!process.env.MONGODB_URL || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URL and JWT_SECRET required')
  }

  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUserA = await User.create({
    name: 'Test University A',
    email: `inst-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'University A',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'Test University B',
    email: `inst-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'University B',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'Student User',
    email: `student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenA = sign(instUserA._id)
  const tokenB = sign(instUserB._id)
  const tokenStudent = sign(studentUser._id)
  const users = [instUserA, instUserB, studentUser]

  // ── Authentication ──────────────────────────────────────────────────────────
  const noAuth = await request('/institution/students/stats')
  record('Security', 'Unauthenticated rejected', noAuth.status === 401, `status=${noAuth.status}`)

  const badToken = await request('/institution/students/stats', { token: 'invalid.jwt.token' })
  record('Security', 'Invalid token rejected', badToken.status === 401, `status=${badToken.status}`)

  const wrongRole = await request('/institution/students/stats', { token: tokenStudent })
  record('Security', 'Student role blocked', wrongRole.status === 403, `status=${wrongRole.status}`)

  // Bootstrap institutions (HTTP + direct ensure for test reliability)
  const metaA = await request('/institution/students/meta', { token: tokenA })
  record('Integration', 'Meta bootstrap A', metaA.status === 200)
  await request('/institution/students/meta', { token: tokenB })

  let institutionA = await Institution.findOne({ ownerUserId: instUserA._id })
  let institutionB = await Institution.findOne({ ownerUserId: instUserB._id })
  if (!institutionA) {
    institutionA = await Institution.create({
      ownerUserId: instUserA._id,
      name: 'University A',
      email: instUserA.email,
    })
  }
  if (!institutionB) {
    institutionB = await Institution.create({
      ownerUserId: instUserB._id,
      name: 'University B',
      email: instUserB.email,
    })
  }

  // ── CRUD & Integration ──────────────────────────────────────────────────────
  const create = await request('/institution/students', {
    method: 'POST',
    token: tokenA,
    body: {
      studentId: `STU-${ts}`,
      fullName: 'Alice Kumar',
      email: `alice-${ts}@test.com`,
      department: 'Computer Science',
      course: 'B.Tech CSE',
      semester: 'Semester 5',
      section: 'A',
      batch: '2022-2026',
      sharedSkills: ['React', 'Node.js'],
      sharedProjects: [
        {
          title: 'Campus Portal',
          technologies: ['React'],
          visibility: 'shared',
        },
      ],
      certifications: [
        { title: 'Private Cert', visibility: 'private', verificationStatus: 'SELF_UPLOADED' },
        { title: 'Shared Cert', visibility: 'shared', verificationStatus: 'SELF_UPLOADED' },
      ],
    },
  })
  record('Integration', 'Create student', create.status === 201)
  const studentId = create.data?.student?.id
  if (!studentId) throw new Error('Student id missing')

  const privateCertLeaks = (create.data.student?.certifications || []).some(
    (c) => c.title === 'Private Cert',
  )
  record('Privacy', 'Private certificates hidden', !privateCertLeaks)

  const privacyHits = scanForPrivateFields(create.data)
  record('Privacy', 'No private AI fields in create response', privacyHits.length === 0, privacyHits.join(', '))

  // Duplicate student ID
  const dupId = await request('/institution/students', {
    method: 'POST',
    token: tokenA,
    body: { studentId: `STU-${ts}`, fullName: 'Duplicate ID' },
  })
  record('Validation', 'Duplicate student ID rejected', dupId.status === 409, `status=${dupId.status}`)

  // Duplicate email
  const dupEmail = await request('/institution/students', {
    method: 'POST',
    token: tokenA,
    body: { fullName: 'Dup Email', email: `alice-${ts}@test.com` },
  })
  record('Validation', 'Duplicate email rejected', dupEmail.status === 409, `status=${dupEmail.status}`)

  // Missing required field
  const missingName = await request('/institution/students', {
    method: 'POST',
    token: tokenA,
    body: { email: 'noname@test.com' },
  })
  record('Validation', 'Missing fullName rejected', missingName.status === 400, `status=${missingName.status}`)

  // Invalid list filter
  const invalidList = await request('/institution/students?status=invalid-status', { token: tokenA })
  record('Validation', 'Invalid academic status rejected', invalidList.status === 400, `status=${invalidList.status}`)

  // Invalid student ID param
  const invalidId = await request('/institution/students/not-a-valid-id', { token: tokenA })
  record('Validation', 'Invalid ObjectId rejected', invalidId.status === 400, `status=${invalidId.status}`)

  const list = await request('/institution/students?q=Alice&department=Computer%20Science&page=1&limit=10', {
    token: tokenA,
  })
  record('Integration', 'Search/list', list.status === 200 && list.data.students?.length >= 1)

  const detail = await request(`/institution/students/${studentId}`, { token: tokenA })
  record('Integration', 'Student detail', detail.status === 200)
  const detailPrivacy = scanForPrivateFields(detail.data)
  record('Privacy', 'Detail has no private fields', detailPrivacy.length === 0, detailPrivacy.join(', '))

  // ── Tenant isolation ────────────────────────────────────────────────────────
  const tenantGet = await request(`/institution/students/${studentId}`, { token: tokenB })
  record('Security', 'Cross-tenant GET blocked', tenantGet.status === 404, `status=${tenantGet.status}`)

  const tenantList = await request('/institution/students?q=Alice', { token: tokenB })
  const crossTenantLeak = (tenantList.data.students || []).some((s) => s.fullName === 'Alice Kumar')
  record('Security', 'Cross-tenant search isolated', !crossTenantLeak)

  const tenantExport = await request('/institution/students/reports/student_directory/export?format=csv', {
    token: tokenB,
  })
  const exportContent = tenantExport.data?.export?.content || ''
  record(
    'Security',
    'Cross-tenant export isolated',
    !exportContent.includes('Alice Kumar'),
  )

  // ── Permission matrix (unit) ────────────────────────────────────────────────
  record('Permissions', 'VIEWER cannot manage students', !roleHasPermission('VIEWER', 'students.manage'))
  record('Permissions', 'OWNER can manage students', roleHasPermission('OWNER', 'students.manage'))
  record('Permissions', 'VIEWER cannot generate reports', !roleHasPermission('VIEWER', 'reports.generate'))
  record('Permissions', 'PLACEMENT_OFFICER can manage placement', roleHasPermission('PLACEMENT_OFFICER', 'placement.manage'))
  record('Permissions', 'FACULTY cannot import students', !roleHasPermission('FACULTY', 'students.import'))

  // Invalid note type
  const badNote = await request(`/institution/students/${studentId}/notes`, {
    method: 'POST',
    token: tokenA,
    body: { content: 'Test', type: 'invalid_type' },
  })
  record('Validation', 'Invalid note type rejected', badNote.status === 400, `status=${badNote.status}`)

  // Injection-safe search
  const injectionSearch = await request(
    `/institution/students?q=${encodeURIComponent('{$gt: ""}')}`,
    { token: tokenA },
  )
  record('Security', 'Injection-safe search', injectionSearch.status === 200)
  const note = await request(`/institution/students/${studentId}/notes`, {
    method: 'POST',
    token: tokenA,
    body: { content: 'Strong performer', type: 'academic_followup' },
  })
  record('Integration', 'Institution note', note.status === 201)

  const verify = await request(`/institution/students/${studentId}/verify-skill`, {
    method: 'POST',
    token: tokenA,
    body: { skill: 'React' },
  })
  record('Integration', 'Skill verification', verify.status === 200)

  const stats = await request('/institution/students/stats', { token: tokenA })
  record('Integration', 'Dashboard stats', stats.status === 200 && stats.data.stats?.total >= 1)
  record('Integration', 'Stats include activity', Boolean(stats.data.stats?.recentActivity))

  const activityRes = await request('/institution/students/activity?limit=5', { token: tokenA })
  record('Integration', 'Activity timeline', activityRes.status === 200 && activityRes.data.activity?.items?.length >= 1)

  // ── Analytics & Reports ─────────────────────────────────────────────────────
  const analyticsRes = await request('/institution/students/analytics', { token: tokenA })
  record('Integration', 'Analytics dashboard', analyticsRes.status === 200 && analyticsRes.data.analytics?.hasData)

  const reportPreview = await request('/institution/students/reports/student_directory', { token: tokenA })
  record('Integration', 'Report preview', reportPreview.status === 200 && reportPreview.data.report?.rows?.length >= 1)

  const reportExport = await request('/institution/students/reports/student_directory/export?format=csv', {
    token: tokenA,
  })
  record('Integration', 'Report export CSV', reportExport.status === 200 && Boolean(reportExport.data.export?.content))
  record(
    'Security',
    'Export excludes passwords/tokens',
    !reportExport.data.export?.content?.includes('password'),
  )

  const permissions = await request('/institution/students/permissions', { token: tokenA })
  record('Permissions', 'Permissions meta OWNER', permissions.status === 200 && permissions.data.currentRole === 'OWNER')

  // ── Talent & Import ─────────────────────────────────────────────────────────
  const smartSearch = await request('/institution/students/talent/smart-search', {
    method: 'POST',
    token: tokenA,
    body: { query: 'final year react students' },
  })
  record('Integration', 'Smart search', smartSearch.status === 200)

  const discover = await request('/institution/students/talent/discover?skill=React', { token: tokenA })
  record('Integration', 'Talent discover', discover.status === 200)

  const preview = await request('/institution/students/import/preview', {
    method: 'POST',
    token: tokenA,
    body: {
      mode: 'CREATE_ONLY',
      rows: [{ fullName: 'Bob Test', email: `bob-${ts}@test.com`, department: 'CS' }],
    },
  })
  record('Integration', 'Import preview', preview.status === 200)

  const placementSummary = await request(`/institution/students/${studentId}/placement-summary`, { token: tokenA })
  record('Integration', 'Placement summary', placementSummary.status === 200)
  const placementPrivacy = scanForPrivateFields(placementSummary.data)
  record('Privacy', 'Placement summary privacy-safe', placementPrivacy.length === 0)

  // ── Performance ─────────────────────────────────────────────────────────────
  const perfStart = Date.now()
  const perfList = await request('/institution/students?page=1&limit=20', { token: tokenA })
  const perfMs = Date.now() - perfStart
  record('Performance', 'List pagination under 2s', perfMs < 2000, `${perfMs}ms`)
  const payloadSize = JSON.stringify(perfList.data).length
  record('Performance', 'List payload under 500KB', payloadSize < 512000, `${payloadSize} bytes`)

  const perfAnalyticsStart = Date.now()
  await request('/institution/students/analytics', { token: tokenA })
  const perfAnalyticsMs = Date.now() - perfAnalyticsStart
  record('Performance', 'Analytics under 3s', perfAnalyticsMs < 3000, `${perfAnalyticsMs}ms`)

  // ── Audit trail ─────────────────────────────────────────────────────────────
  const auditCount = await InstitutionStudentAudit.countDocuments({ institutionId: institutionA._id })
  record('Integration', 'Audit logging enabled', auditCount >= 2, `${auditCount} entries`)

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  await cleanup(institutionA, institutionB, users)
  await mongoose.disconnect()

  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`VERIFICATION COMPLETE: ${passed} passed, ${failed} failed (${results.length} total)`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
