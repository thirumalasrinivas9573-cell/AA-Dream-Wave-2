#!/usr/bin/env node
/**
 * Lasya V4 Prompt 1 — ecosystem intelligence verification
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionProgram = require('../models/InstitutionProgram')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')

const API_PORT = process.env.VERIFY_PORT || process.env.PORT || 5001
const BASE = `http://127.0.0.1:${API_PORT}/api`
const results = []

function pass(n) {
  results.push({ ok: true, n })
  console.log(`  PASS  ${n}`)
}
function fail(n, d) {
  results.push({ ok: false, n, d })
  console.log(`  FAIL  ${n}${d ? `: ${d}` : ''}`)
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUser = await User.create({
    name: 'Eco Inst',
    email: `eco-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Eco University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Eco Co',
    email: `eco-comp-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Eco Corp',
    onboardingCompleted: true,
  })
  const stuUser = await User.create({
    name: 'Eco Student',
    email: `eco-stu-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const otherUser = await User.create({
    name: 'Other Inst',
    email: `eco-other-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Other U',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const stuToken = sign(stuUser._id)
  const otherToken = sign(otherUser._id)

  await request('/partnerships/meta', { token: instToken })
  await request('/partnerships/meta', { token: compToken })
  await request('/partnerships/meta', { token: otherToken })

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  const company = await Company.findOne({ ownerUserId: compUser._id })
  const otherInst = await Institution.findOne({ ownerUserId: otherUser._id })

  await InstitutionStudent.create({
    institutionId: institution._id,
    linkedUserId: stuUser._id,
    studentId: `STU-${ts}`,
    fullName: 'Eco Student',
    email: stuUser.email,
    department: 'CSE',
    course: 'B.Tech CSE',
    batch: '2026',
    semester: '6',
    cgpa: 8.5,
    status: 'active',
    sharedSkills: ['Python', 'SQL'],
    programmingLanguages: ['Python'],
  })

  const intents = await request('/ecosystem/intelligence/ai/intents', { token: instToken })
  intents.status === 200 && intents.data.intents?.length ? pass('AI intents') : fail('AI intents', String(intents.status))

  const overview = await request('/ecosystem/intelligence/overview', { token: instToken })
  overview.status === 200 && overview.data.ecosystem ? pass('Institution ecosystem overview') : fail('Overview', String(overview.status))

  const compOverview = await request('/ecosystem/intelligence/overview', { token: compToken })
  compOverview.status === 200 ? pass('Company ecosystem overview') : fail('Company overview', String(compOverview.status))

  const skills = await request('/ecosystem/intelligence/skills', { token: instToken })
  skills.status === 200 && skills.data.alignment?.alignmentLevel ? pass('Skill alignment') : fail('Skills', String(skills.status))

  const recs = await request('/ecosystem/intelligence/recommendations', { token: instToken })
  recs.status === 200 && Array.isArray(recs.data.recommendations) ? pass('Recommendations') : fail('Recommendations', String(recs.status))

  const ai = await request('/ecosystem/intelligence/ai/insights', {
    method: 'POST',
    token: instToken,
    body: { intent: 'ECOSYSTEM_OVERVIEW' },
  })
  ai.status === 200 && ai.data.insight ? pass('AI ecosystem insight') : fail('AI insight', String(ai.status))

  const multi = await request('/ecosystem/intelligence/ai/multi-agent', {
    method: 'POST',
    token: instToken,
    body: { intent: 'IMPROVE_PLACEMENT' },
  })
  multi.status === 200 && multi.data.synthesis ? pass('Multi-agent ecosystem request') : fail('Multi-agent', String(multi.status))

  const student = await request('/student/ecosystem/summary', { token: stuToken })
  student.status === 200 && student.data.summary?.hasInstitutionLink ? pass('Student ecosystem summary') : fail('Student summary', String(student.status))

  await InstitutionProgram.create({
    institutionId: institution._id,
    ownerRole: 'institution',
    createdByUserId: instUser._id,
    title: 'Eco Test Program',
    programType: 'SKILL_PROGRAM',
    status: 'draft',
    skills: ['Python'],
  })

  const search = await request('/ecosystem/intelligence/search?q=Eco', { token: instToken })
  search.status === 200 && search.data.results?.length ? pass('Ecosystem search') : fail('Search', String(search.status))

  const idor = await request('/ecosystem/intelligence/overview', { token: otherToken })
  idor.status === 200 && idor.data.ecosystem?.scope === 'institution' ? pass('Tenant-scoped overview (other org)') : fail('Tenant scope', String(idor.status))

  await InstitutionProgram.deleteMany({ institutionId: institution._id })
  await InstitutionStudent.deleteMany({ institutionId: institution._id })
  await InstitutionCompanyPartnership.deleteMany({ institutionId: institution._id })
  await Institution.deleteMany({ _id: { $in: [institution._id, otherInst._id] } })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({ _id: { $in: [instUser._id, compUser._id, stuUser._id, otherUser._id] } })
  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\nEcosystem verify: ${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
