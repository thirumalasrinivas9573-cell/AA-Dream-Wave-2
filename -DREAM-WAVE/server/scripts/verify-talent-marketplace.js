#!/usr/bin/env node
/** Lasya V4 Prompt 5 — talent marketplace verification */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentApplication = require('../models/RecruitmentApplication')

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

  const compUser = await User.create({
    name: 'Mkt Co', email: `mkt-co-${ts}@test.com`, password: 'testpass123',
    role: 'company', organizationName: 'Mkt Corp', onboardingCompleted: true,
  })
  const stuUser = await User.create({
    name: 'Mkt Student', email: `mkt-stu-${ts}@test.com`, password: 'testpass123',
    role: 'student', onboardingCompleted: true,
  })
  const otherUser = await User.create({
    name: 'Other Co', email: `mkt-other-${ts}@test.com`, password: 'testpass123',
    role: 'company', organizationName: 'Other Corp', onboardingCompleted: true,
  })

  const compToken = sign(compUser._id)
  const stuToken = sign(stuUser._id)
  const otherToken = sign(otherUser._id)

  await request('/partnerships/meta', { token: compToken })

  const institution = await Institution.findOne({})
  const company = await Company.findOne({ ownerUserId: compUser._id })

  await InstitutionStudent.create({
    institutionId: institution?._id || new mongoose.Types.ObjectId(),
    linkedUserId: stuUser._id,
    studentId: `MKT-${ts}`,
    fullName: 'Mkt Student',
    email: stuUser.email,
    department: 'CSE', course: 'B.Tech', batch: '2026', semester: '6', cgpa: 8.0,
    status: 'active',
    sharedSkills: ['Python', 'React'],
    verifiedSkills: ['Python'],
    sharedProjects: [{ title: 'Dream Wave AI', technologies: ['React', 'Node.js', 'MongoDB'], visibility: 'shared', status: 'completed' }],
  })

  const job = await RecruitmentJob.create({
    companyId: company._id,
    title: 'Full Stack Intern',
    department: 'Engineering',
    status: 'open',
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    createdByUserId: compUser._id,
  })

  const stu = await InstitutionStudent.findOne({ linkedUserId: stuUser._id })
  await RecruitmentApplication.create({
    companyId: company._id,
    jobId: job._id,
    institutionStudentId: stu._id,
    candidateUserId: stuUser._id,
    opportunityType: 'job',
    roleTitle: job.title,
    stage: 'applied',
    candidateSnapshot: {
      name: 'Mkt Student',
      skills: ['Python', 'React', 'Node.js'],
      education: ['B.Tech CSE'],
      projects: ['Dream Wave AI'],
    },
  })

  const completeness = await request('/marketplace/profile-completeness', { token: stuToken })
  completeness.status === 200 && completeness.data.completeness?.level ? pass('Profile completeness') : fail('Completeness', String(completeness.status))

  const browse = await request('/marketplace/browse', { token: stuToken })
  browse.status === 200 ? pass('Marketplace browse') : fail('Browse', String(browse.status))

  const feed = await request('/marketplace/feed', { token: stuToken })
  feed.status === 200 && feed.data.feed?.sections ? pass('Personalized feed') : fail('Feed', String(feed.status))

  const analytics = await request('/marketplace/analytics', { token: stuToken })
  analytics.status === 200 ? pass('Matching analytics') : fail('Analytics', String(analytics.status))

  const ai = await request('/marketplace/ai/insights', {
    method: 'POST', token: stuToken, body: { intent: 'OPPORTUNITY_RECOMMENDATION' },
  })
  ai.status === 200 && ai.data.insight ? pass('Marketplace AI insight') : fail('AI', String(ai.status))

  const matchRole = await request(`/marketplace/recruiter/match/job/${job._id}`, { token: compToken })
  matchRole.status === 200 && matchRole.data.matching?.candidates?.length ? pass('Recruiter match-talent') : fail('Recruiter match', String(matchRole.status))

  const gaps = await request(`/marketplace/recruiter/gaps/job/${job._id}`, { token: compToken })
  gaps.status === 200 && gaps.data.analysis?.requiredSkills ? pass('Role skill gap analysis') : fail('Role gaps', String(gaps.status))

  const idor = await request(`/marketplace/recruiter/match/job/${job._id}`, { token: otherToken })
  idor.status === 404 || idor.status === 403 ? pass('IDOR blocked (other company)') : fail('IDOR', String(idor.status))

  const mass = await request('/marketplace/ai/insights', {
    method: 'POST', token: stuToken,
    body: { intent: 'OPPORTUNITY_RECOMMENDATION', matchCategory: 'STRONG_MATCH', eligibility: 'ELIGIBLE' },
  })
  mass.status === 200 && mass.data.insight ? pass('Mass assignment ignored on AI body') : fail('Mass assignment', String(mass.status))

  await RecruitmentApplication.deleteMany({ companyId: company._id })
  await RecruitmentJob.deleteMany({ companyId: company._id })
  await InstitutionStudent.deleteMany({ linkedUserId: stuUser._id })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({ _id: { $in: [compUser._id, stuUser._id, otherUser._id] } })
  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\nMarketplace verify: ${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
