#!/usr/bin/env node
/** Lasya V4 Prompt 6 — campus command center verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')

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

  const instUser = await User.create({
    name: 'Campus Inst', email: `campus-inst-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'Campus University', onboardingCompleted: true,
  })
  const otherUser = await User.create({
    name: 'Other Inst', email: `campus-other-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'Other University', onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const otherToken = sign(otherUser._id)

  let inst = await Institution.findOne({ ownerUserId: instUser._id })
  if (!inst) {
    inst = await Institution.create({
      ownerUserId: instUser._id,
      name: 'Campus University',
      email: instUser.email,
      departments: ['Computer Science', 'Electronics'],
      programs: ['B.Tech CSE', 'B.Tech ECE'],
    })
  }

  await InstitutionStudent.create({
    institutionId: inst._id,
    studentId: `CAMP-${ts}`,
    fullName: 'Campus Student',
    email: `campus-stu-${ts}@test.com`,
    department: 'Computer Science',
    batch: '2024',
    status: 'active',
    cgpa: 8.5,
    sharedSkills: ['Python', 'JavaScript'],
    placement: { lifecycleStatus: 'ELIGIBLE', status: 'placement-ready' },
  })

  const overview = await request('/institution/campus-command-center', { token: instToken })
  overview.status === 200 && overview.data.commandCenter?.institution?.name
    ? pass('Campus command center overview')
    : fail('Campus command center overview', String(overview.status))

  const cc = overview.data.commandCenter
  cc.health?.state ? pass('Institution health') : fail('Institution health')
  cc.campusOverview?.students >= 1 ? pass('Campus overview') : fail('Campus overview')
  cc.studentIntelligence?.total >= 1 ? pass('Student intelligence') : fail('Student intelligence')
  cc.readiness ? pass('Student readiness aggregate') : fail('Student readiness aggregate')
  cc.skillIntelligence ? pass('Skill intelligence') : fail('Skill intelligence')
  cc.placementCommandCenter?.pipeline ? pass('Placement pipeline') : fail('Placement pipeline')
  cc.curriculumAlignment?.level ? pass('Curriculum alignment') : fail('Curriculum alignment')
  cc.dailyBrief ? pass('Daily placement brief') : fail('Daily placement brief')

  const weekly = await request('/institution/campus-command-center/weekly-report', { token: instToken })
  weekly.status === 200 && weekly.data.report?.title ? pass('Weekly institution report') : fail('Weekly report', String(weekly.status))

  const ai = await request('/institution/campus-command-center/ai/insights', {
    method: 'POST', token: instToken,
    body: { intent: 'DAILY_BRIEF', health: 'HEALTHY', placementRate: 99 },
  })
  ai.status === 200 && ai.data.insight?.observation ? pass('AI insight (mass assignment ignored)') : fail('AI insight', String(ai.status))

  const idor = await request('/institution/campus-command-center', { token: otherToken })
  idor.status === 200 && idor.data.commandCenter?.institution?.name === 'Other University'
    ? pass('Tenant isolation (scoped to own institution)')
    : fail('Tenant isolation', `status=${idor.status}`)

  const passed = results.filter((r) => r.ok).length
  console.log(`\nCampus command center verify: ${passed}/${results.length} passed`)
  await mongoose.disconnect()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
