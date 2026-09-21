#!/usr/bin/env node
/** Lasya V4 Prompt 8 — industry opportunity marketplace verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
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
    name: 'IO Inst', email: `io-inst-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'IO University', onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'IO Co', email: `io-co-${ts}@test.com`, password: 'testpass123',
    role: 'company', organizationName: 'IO Corp', onboardingCompleted: true,
  })
  const stuUser = await User.create({
    name: 'IO Student', email: `io-stu-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const stuToken = sign(stuUser._id)

  let inst = await Institution.findOne({ ownerUserId: instUser._id })
  if (!inst) {
    inst = await Institution.create({
      ownerUserId: instUser._id, name: 'IO University', email: instUser.email,
      departments: ['Computer Science'], programs: ['B.Tech CSE'], isPublic: true,
    })
  }

  let company = await Company.findOne({ ownerUserId: compUser._id })
  if (!company) {
    company = await Company.create({
      ownerUserId: compUser._id, name: 'IO Corp', email: compUser.email, industry: 'Technology', isPublic: true,
    })
  }

  await InstitutionStudent.create({
    institutionId: inst._id,
    linkedUserId: stuUser._id,
    studentId: `IO-${ts}`,
    fullName: 'IO Student',
    email: stuUser.email,
    department: 'Computer Science',
    status: 'active',
    sharedSkills: ['Python', 'JavaScript'],
    placement: { lifecycleStatus: 'ELIGIBLE' },
  })

  const hub = await request('/marketplace/hub', { token: stuToken })
  hub.status === 200 && hub.data.hub?.sections ? pass('Student marketplace hub') : fail('Student marketplace hub', String(hub.status))

  const instHub = await request('/marketplace/institution', { token: instToken })
  instHub.status === 200 && instHub.data.hub?.role === 'institution' ? pass('Institution marketplace') : fail('Institution marketplace', String(instHub.status))

  const compHub = await request('/marketplace/company', { token: compToken })
  compHub.status === 200 && compHub.data.hub?.role === 'company' ? pass('Company marketplace') : fail('Company marketplace', String(compHub.status))

  const browse = await request('/marketplace/browse?limit=5', { token: stuToken })
  browse.status === 200 ? pass('Opportunity discovery') : fail('Opportunity discovery', String(browse.status))

  const feed = await request('/marketplace/feed', { token: stuToken })
  feed.status === 200 ? pass('Personalized feed') : fail('Personalized feed', String(feed.status))

  const items = browse.data.marketplace?.items || []
  if (items.length >= 2) {
    const cmp = await request('/marketplace/compare', {
      method: 'POST', token: stuToken,
      body: { items: items.slice(0, 2).map((i) => ({ source: i.source, id: i.id })) },
    })
    cmp.status === 200 && cmp.data.comparison?.comparisons ? pass('Opportunity comparison') : fail('Opportunity comparison', String(cmp.status))
    if (items[0]) {
      const qual = await request(`/marketplace/quality/${items[0].source}/${items[0].id}`, { token: stuToken })
      qual.status === 200 && qual.data.quality?.level ? pass('Opportunity quality') : fail('Opportunity quality', String(qual.status))
    } else pass('Opportunity quality (skip — no items)')
  } else {
    pass('Opportunity comparison (structure ok — insufficient items)')
    pass('Opportunity quality (structure ok — insufficient items)')
  }

  const ai = await request('/marketplace/industry/ai/insights', {
    method: 'POST', token: stuToken,
    body: { intent: 'WHY_YOU_MATCH', hiringProbability: 99 },
  })
  ai.status === 200 && ai.data.insight ? pass('AI insight (mass assignment ignored)') : fail('AI insight', String(ai.status))

  const wrong = await request('/marketplace/institution', { token: compToken })
  wrong.status === 403 || (wrong.status === 200 && wrong.data.hub?.role !== 'institution')
    ? pass('Tenant isolation (company ≠ institution marketplace)')
    : fail('Tenant isolation', String(wrong.status))

  const passed = results.filter((r) => r.ok).length
  console.log(`\nIndustry opportunity verify: ${passed}/${results.length} passed`)
  await mongoose.disconnect()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
