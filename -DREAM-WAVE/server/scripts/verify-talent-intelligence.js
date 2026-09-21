#!/usr/bin/env node
/**
 * Lasya V4 Prompt 2 — talent intelligence verification
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const RecruitmentJob = require('../models/RecruitmentJob')

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
    name: 'Talent Inst',
    email: `talent-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Talent University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Talent Co',
    email: `talent-comp-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Talent Corp',
    onboardingCompleted: true,
  })
  const stuUser = await User.create({
    name: 'Talent Student',
    email: `talent-stu-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const otherUser = await User.create({
    name: 'Other Student',
    email: `talent-other-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const stuToken = sign(stuUser._id)
  const otherToken = sign(otherUser._id)

  await request('/partnerships/meta', { token: instToken })
  await request('/partnerships/meta', { token: compToken })

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  const company = await Company.findOne({ ownerUserId: compUser._id })

  await InstitutionStudent.create({
    institutionId: institution._id,
    linkedUserId: stuUser._id,
    studentId: `STU-T-${ts}`,
    fullName: 'Talent Student',
    email: stuUser.email,
    department: 'CSE',
    course: 'B.Tech CSE',
    batch: '2026',
    semester: '6',
    cgpa: 8.2,
    status: 'active',
    sharedSkills: ['Python', 'SQL'],
    verifiedSkills: ['Python'],
    programmingLanguages: ['Python'],
    sharedProjects: [
      {
        title: 'ML Recommender',
        technologies: ['Python', 'Machine Learning'],
        status: 'completed',
        visibility: 'shared',
        verificationStatus: 'verified',
      },
    ],
  })

  await RecruitmentJob.create({
    companyId: company._id,
    title: 'Python Intern',
    department: 'Engineering',
    status: 'open',
    requiredSkills: ['Python', 'SQL'],
    createdByUserId: compUser._id,
  })

  const intents = await request('/student/talent/ai/intents', { token: stuToken })
  intents.status === 200 && intents.data.intents?.length ? pass('Student AI intents') : fail('Student AI intents', String(intents.status))

  const profile = await request('/student/talent/profile', { token: stuToken })
  profile.status === 200 && profile.data.profile?.hasInstitutionLink ? pass('Student talent profile') : fail('Talent profile', String(profile.status))

  const readiness = await request('/student/talent/readiness', { token: stuToken })
  readiness.status === 200 && readiness.data.readiness?.state ? pass('Placement readiness') : fail('Readiness', String(readiness.status))

  const career = await request('/student/talent/career', { token: stuToken })
  career.status === 200 && career.data.intelligence?.talentProfile ? pass('Student career intelligence') : fail('Career intel', String(career.status))

  const gaps = await request('/student/talent/gaps', { token: stuToken })
  gaps.status === 200 && gaps.data.gaps?.hasInstitutionLink ? pass('Skill gap intelligence') : fail('Skill gaps', String(gaps.status))

  const recs = await request('/student/talent/recommendations', { token: stuToken })
  recs.status === 200 ? pass('Recommendations (learning/project/program)') : fail('Recommendations', String(recs.status))

  const pipeline = await request('/student/talent/pipeline', { token: stuToken })
  pipeline.status === 200 && pipeline.data.pipeline?.totals ? pass('Application pipeline') : fail('Pipeline', String(pipeline.status))

  const ai = await request('/student/talent/ai/insights', {
    method: 'POST',
    token: stuToken,
    body: { intent: 'CAREER_READINESS' },
  })
  ai.status === 200 && ai.data.insight ? pass('AI career assistant') : fail('AI career', String(ai.status))

  const multi = await request('/student/talent/ai/multi-agent', {
    method: 'POST',
    token: stuToken,
    body: { intent: 'IMPROVE_STUDENT_PLACEMENT' },
  })
  multi.status === 200 && multi.data.synthesis ? pass('Multi-agent talent request') : fail('Multi-agent', String(multi.status))

  const instIntel = await request('/institution/talent-intelligence/intelligence', { token: instToken })
  instIntel.status === 200 && instIntel.data.intelligence?.scope === 'institution' ? pass('Institution placement intelligence') : fail('Institution intel', String(instIntel.status))

  const compIntel = await request('/company/talent/intelligence', { token: compToken })
  compIntel.status === 200 && compIntel.data.intelligence?.scope === 'company' ? pass('Company talent intelligence') : fail('Company intel', String(compIntel.status))

  const noLink = await request('/student/talent/profile', { token: otherToken })
  noLink.status === 200 && !noLink.data.profile?.hasInstitutionLink ? pass('Tenant isolation (unlinked student)') : fail('Tenant isolation', String(noLink.status))

  const idor = await request('/institution/talent-intelligence/intelligence', { token: compToken })
  idor.status === 403 ? pass('IDOR blocked (company → institution intel)') : fail('IDOR', String(idor.status))

  await InstitutionStudent.deleteMany({ institutionId: institution._id })
  await RecruitmentJob.deleteMany({ companyId: company._id })
  await Institution.deleteOne({ _id: institution._id })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({ _id: { $in: [instUser._id, compUser._id, stuUser._id, otherUser._id] } })
  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\nTalent verify: ${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
