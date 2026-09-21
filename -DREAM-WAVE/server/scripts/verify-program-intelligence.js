#!/usr/bin/env node
/** Lasya V4 Prompt 3 — institution + company + program intelligence verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionProgram = require('../models/InstitutionProgram')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')

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
    name: 'PI Inst', email: `pi-inst-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'PI University', onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'PI Co', email: `pi-co-${ts}@test.com`, password: 'testpass123',
    role: 'company', organizationName: 'PI Corp', onboardingCompleted: true,
  })
  const otherInstUser = await User.create({
    name: 'PI Other', email: `pi-other-${ts}@test.com`, password: 'testpass123',
    role: 'institution', organizationName: 'Other Uni', onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const otherToken = sign(otherInstUser._id)

  const inst = await Institution.create({
    ownerUserId: instUser._id, name: 'PI University', email: instUser.email,
    departments: ['Computer Science'], programs: ['B.Tech CSE'], isPublic: true,
  })
  const company = await Company.create({
    ownerUserId: compUser._id, name: 'PI Corp', email: compUser.email, industry: 'Technology', isPublic: true,
  })
  const otherInst = await Institution.create({
    ownerUserId: otherInstUser._id, name: 'Other Uni', email: otherInstUser.email,
    departments: ['Engineering'], programs: ['B.Tech'], isPublic: true,
  })

  const partnership = await InstitutionCompanyPartnership.create({
    institutionId: inst._id, companyId: company._id,
    status: 'active', relationshipType: 'Recruitment Partner',
    initiatedBy: 'institution', initiatorUserId: instUser._id, requestStatus: 'accepted',
  })

  const program = await InstitutionProgram.create({
    institutionId: inst._id, companyId: company._id, partnershipId: partnership._id,
    ownerRole: 'institution', createdByUserId: instUser._id,
    title: 'AI Industry Program', programType: 'INDUSTRY_PROJECT', status: 'active',
    skills: ['Python', 'Machine Learning', 'JavaScript'],
  })

  const instHub = await request('/ecosystem/intelligence/institution/hub', { token: instToken })
  instHub.status === 200 && instHub.data.hub?.profile?.name ? pass('Institution intelligence hub') : fail('Institution intelligence hub', String(instHub.status))

  const compHub = await request('/ecosystem/intelligence/company/hub', { token: compToken })
  compHub.status === 200 && compHub.data.hub?.profile?.name ? pass('Company intelligence hub') : fail('Company intelligence hub', String(compHub.status))

  const progIntel = await request(`/ecosystem/intelligence/programs/${program._id}/intelligence`, { token: instToken })
  progIntel.status === 200 && progIntel.data.intelligence?.program?.title ? pass('Program detail intelligence') : fail('Program detail intelligence', String(progIntel.status))

  const dept = await request('/ecosystem/intelligence/departments/Computer%20Science/intelligence', { token: instToken })
  dept.status === 200 && dept.data.intelligence?.department ? pass('Department intelligence') : fail('Department intelligence', String(dept.status))

  const industry = await request('/ecosystem/intelligence/industry', { token: instToken })
  industry.status === 200 && industry.data.industry?.categories ? pass('Industry intelligence') : fail('Industry intelligence', String(industry.status))

  const trends = await request('/ecosystem/intelligence/industry/trends', { token: instToken })
  trends.status === 200 && trends.data.trends?.status ? pass('Industry trends (with INSUFFICIENT_DATA guard)') : fail('Industry trends', String(trends.status))

  const recs = await request('/ecosystem/intelligence/company-recommendations', { token: instToken })
  recs.status === 200 && Array.isArray(recs.data.recommendations) ? pass('Company recommendations') : fail('Company recommendations', String(recs.status))

  const aggregates = await request('/ecosystem/intelligence/student-aggregates', { token: instToken })
  aggregates.status === 200 && aggregates.data.aggregates?.aggregates ? pass('Student aggregate intelligence') : fail('Student aggregate intelligence', String(aggregates.status))

  const connection = await request(`/ecosystem/intelligence/companies/${company._id}/connection`, { token: instToken })
  connection.status === 200 && connection.data.connection ? pass('Company-program connection') : fail('Company-program connection', String(connection.status))

  const skills = await request('/ecosystem/intelligence/skills', { token: instToken })
  skills.status === 200 && skills.data.alignment?.alignmentLevel ? pass('Program industry alignment') : fail('Program industry alignment', String(skills.status))

  const overview = await request('/ecosystem/intelligence/overview', { token: instToken })
  overview.status === 200 ? pass('Ecosystem overview (regression)') : fail('Ecosystem overview', String(overview.status))

  const idor = await request(`/ecosystem/intelligence/programs/${program._id}/intelligence`, { token: otherToken })
  idor.status === 403 ? pass('IDOR protection (other institution program)') : fail('IDOR protection', String(idor.status))

  const tenant = await request('/ecosystem/intelligence/institution/hub', { token: compToken })
  tenant.status === 403 ? pass('Tenant isolation (company ≠ institution hub)') : fail('Tenant isolation', String(tenant.status))

  const crossHub = await request(`/ecosystem/intelligence/hub/${otherInst._id}`, { token: instToken })
  crossHub.status === 403 ? pass('Cross-tenant hub blocked') : fail('Cross-tenant hub', String(crossHub.status))

  const passed = results.filter((r) => r.ok).length
  console.log(`\nProgram intelligence verify: ${passed}/${results.length} passed`)
  await mongoose.disconnect()
  process.exit(passed === results.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
