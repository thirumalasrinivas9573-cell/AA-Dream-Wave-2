#!/usr/bin/env node
/** Lasya V4 Prompt 9 — AI Career Copilot verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const UserProfile = require('../models/UserProfile')
const Goal = require('../models/Goal')

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

  const stuUser = await User.create({
    name: 'CC Student', email: `cc-stu-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })
  const otherUser = await User.create({
    name: 'CC Other', email: `cc-other-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })
  const instUser = await User.create({
    name: 'CC Inst', email: `cc-inst-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'CC University', onboardingCompleted: true,
  })

  const stuToken = sign(stuUser._id)
  const otherToken = sign(otherUser._id)
  const instToken = sign(instUser._id)

  const inst = await Institution.create({
    ownerUserId: instUser._id, name: 'CC University', email: instUser.email,
    departments: ['Computer Science'], programs: ['B.Tech CSE'], isPublic: true,
  })

  await InstitutionStudent.create({
    institutionId: inst._id,
    linkedUserId: stuUser._id,
    studentId: `CC-${ts}`,
    fullName: 'CC Student',
    email: stuUser.email,
    department: 'Computer Science',
    status: 'active',
    sharedSkills: ['Python', 'JavaScript', 'Machine Learning'],
    placement: { lifecycleStatus: 'ELIGIBLE' },
  })

  await UserProfile.create({
    userId: stuUser._id,
    targetRole: 'Software Engineer',
    currentRole: 'Student',
    skills: ['Python', 'JavaScript'],
    interests: ['AI', 'Web Development'],
  })

  await Goal.create({
    userId: stuUser._id,
    title: 'Become a Software Engineer',
    category: 'Career',
    progress: 25,
  })

  const hub = await request('/student/career-copilot/hub', { token: stuToken })
  hub.status === 200 && hub.data.hub?.careerProfile ? pass('Career hub') : fail('Career hub', String(hub.status))

  const gaps = await request('/student/career-copilot/gaps', { token: stuToken })
  gaps.status === 200 && gaps.data.gaps?.targetCareer ? pass('Career gap engine') : fail('Career gap engine', String(gaps.status))

  const roadmap = await request('/student/career-copilot/roadmap', { token: stuToken })
  roadmap.status === 200 && roadmap.data.roadmap?.steps?.length ? pass('Career roadmap') : fail('Career roadmap', String(roadmap.status))

  const weekly = await request('/student/career-copilot/weekly-plan', { token: stuToken })
  weekly.status === 200 && weekly.data.plan?.priorities ? pass('Weekly career plan') : fail('Weekly career plan', String(weekly.status))

  const daily = await request('/student/career-copilot/daily-focus', { token: stuToken })
  daily.status === 200 && daily.data.focus?.topPriority ? pass('Daily career focus') : fail('Daily career focus', String(daily.status))

  const success = await request('/student/career-copilot/success', { token: stuToken })
  success.status === 200 && success.data.success?.careerState ? pass('Student success intelligence') : fail('Student success intelligence', String(success.status))

  const explore = await request('/student/career-copilot/explore', { token: stuToken })
  explore.status === 200 && explore.data.exploration?.possibleRoles ? pass('Exploration mode') : fail('Exploration mode', String(explore.status))

  const paths = await request('/student/career-copilot/compare/paths', {
    method: 'POST', token: stuToken,
    body: { paths: ['software engineer', 'data scientist'] },
  })
  paths.status === 200 && paths.data.comparison?.comparisons?.length === 2 ? pass('Career path comparison') : fail('Career path comparison', String(paths.status))

  const tasks = await request('/student/career-copilot/suggest-tasks', {
    method: 'POST', token: stuToken, body: {},
  })
  tasks.status === 200 && tasks.data.requiresConfirmation === true ? pass('Roadmap task suggestions') : fail('Roadmap task suggestions', String(tasks.status))

  const ai = await request('/student/career-copilot/ai/insights', {
    method: 'POST', token: stuToken,
    body: { intent: 'DAILY_FOCUS', hiringProbability: 99, role: 'admin' },
  })
  ai.status === 200 && ai.data.observation ? pass('AI copilot insight (mass assignment ignored)') : fail('AI copilot insight', String(ai.status))

  const interview = await request('/student/career-copilot/prepare/interview', { token: stuToken })
  interview.status === 200 && interview.data.preparation?.disclaimer ? pass('Interview preparation') : fail('Interview preparation', String(interview.status))

  const idor = await request(`/student/career-copilot/hub/${otherUser._id}`, { token: stuToken })
  idor.status === 403 ? pass('IDOR protection (other student hub)') : fail('IDOR protection', String(idor.status))

  const tenant = await request('/student/career-copilot/hub', { token: instToken })
  tenant.status === 403 ? pass('Tenant isolation (institution blocked)') : fail('Tenant isolation', String(tenant.status))

  const passed = results.filter((r) => r.ok).length
  console.log(`\nCareer copilot verify: ${passed}/${results.length} passed`)
  await mongoose.disconnect()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
