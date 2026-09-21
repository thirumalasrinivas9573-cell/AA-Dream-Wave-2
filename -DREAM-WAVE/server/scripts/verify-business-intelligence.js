#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const CampusOpportunity = require('../models/CampusOpportunity')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentApplication = require('../models/RecruitmentApplication')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

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

function assert(label, condition, detail) {
  if (!condition) throw new Error(`${label}: FAIL${detail ? ` — ${detail}` : ''}`)
  console.log(`${label}: OK`)
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUserA = await User.create({
    name: 'BI Inst A',
    email: `bi-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'BI University A',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'BI Inst B',
    email: `bi-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'BI University B',
    onboardingCompleted: true,
  })
  const compUserA = await User.create({
    name: 'BI Co A',
    email: `bi-co-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'BI Corp A',
    onboardingCompleted: true,
  })
  const compUserB = await User.create({
    name: 'BI Co B',
    email: `bi-co-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'BI Corp B',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'BI Student',
    email: `bi-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const otherStudent = await User.create({
    name: 'BI Other',
    email: `bi-other-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenInstA = sign(instUserA._id)
  const tokenInstB = sign(instUserB._id)
  const tokenCompA = sign(compUserA._id)
  const tokenCompB = sign(compUserB._id)
  const tokenStudent = sign(studentUser._id)

  await request('/institution/students/meta', { token: tokenInstA })
  await request('/institution/students/meta', { token: tokenInstB })
  await request('/recruitment/meta', { token: tokenCompA })
  await request('/recruitment/meta', { token: tokenCompB })

  const instA = await Institution.findOne({ ownerUserId: instUserA._id })
  const instB = await Institution.findOne({ ownerUserId: instUserB._id })
  const compA = await Company.findOne({ ownerUserId: compUserA._id })
  const compB = await Company.findOne({ ownerUserId: compUserB._id })

  const partnership = await InstitutionCompanyPartnership.create({
    institutionId: instA._id,
    companyId: compA._id,
    status: 'active',
    relationshipType: 'Placement Partner',
    initiatedBy: 'institution',
    initiatorUserId: instUserA._id,
    requestedByUserId: instUserA._id,
    requestStatus: 'accepted',
    contactPerson: { name: 'HR', email: 'hr@test.com' },
  })

  await InstitutionStudent.create({
    institutionId: instA._id,
    linkedUserId: studentUser._id,
    studentId: `BI-${ts}`,
    fullName: 'BI Student',
    email: studentUser.email,
    department: 'Computer Science',
    course: 'B.Tech CSE',
    batch: '2024',
    status: 'active',
    cgpa: 8.2,
    sharedSkills: ['Python', 'React'],
    sharedProjects: [{ title: 'App', visibility: 'shared', technologies: ['React'] }],
  })

  const campusOpp = await CampusOpportunity.create({
    institutionId: instA._id,
    companyId: compA._id,
    partnershipId: partnership._id,
    opportunityType: 'internship',
    title: 'BI Internship',
    status: 'open',
    deadline: new Date(Date.now() + 7 * 86400000),
    requiredSkills: ['Python', 'SQL'],
    createdByUserId: instUserA._id,
  })

  const job = await RecruitmentJob.create({
    companyId: compA._id,
    partnershipId: partnership._id,
    title: 'BI Engineer',
    status: 'open',
    requiredSkills: ['Python', 'SQL'],
    createdByUserId: compUserA._id,
    deadline: new Date(Date.now() + 7 * 86400000),
  })

  await RecruitmentApplication.create({
    companyId: compA._id,
    institutionId: instA._id,
    campusOpportunityId: campusOpp._id,
    candidateUserId: studentUser._id,
    roleTitle: 'BI Internship',
    opportunityType: 'campus_opportunity',
    stage: 'screening',
    candidateSnapshot: { name: 'BI Student', skills: ['Python'] },
    appliedAt: new Date(),
  })

  const instDashA = await request('/institution/bi/dashboard', { token: tokenInstA })
  assert('Institution BI dashboard', instDashA.status === 200 && instDashA.data.dashboard?.scope === 'institution')
  assert('Institution has real student count', instDashA.data.dashboard?.overview?.students >= 1)

  const instDashB = await request('/institution/bi/dashboard', { token: tokenInstB })
  assert('Institution B isolated', instDashB.data.dashboard?.overview?.students === 0)

  const instSkills = await request('/institution/bi/skills', { token: tokenInstA })
  assert('Institution skill analytics', instSkills.status === 200 && instSkills.data.skills?.demand?.length >= 1)
  assert('Skill gap SQL', instSkills.data.skills?.gaps?.some((g) => g.skill === 'sql'))

  const instTrends = await request('/institution/bi/trends?period=90d', { token: tokenInstA })
  assert('Institution trends', instTrends.status === 200 && instTrends.data.trends?.applications)

  const instAi = await request('/institution/bi/ai/insights', {
    method: 'POST',
    token: tokenInstA,
    body: { intent: 'INSTITUTION_OVERVIEW' },
  })
  assert('Institution AI insight contract', instAi.status === 200 && instAi.data.insights?.insight?.observation)
  assert('AI has limitation field', Boolean(instAi.data.insights?.insight?.limitation))

  const compDash = await request('/recruitment/bi/dashboard', { token: tokenCompA })
  assert('Company BI dashboard', compDash.status === 200 && compDash.data.dashboard?.scope === 'company')

  const compDashB = await request('/recruitment/bi/dashboard', { token: tokenCompB })
  assert('Company B isolated', compDashB.data.dashboard?.overview?.totalApplications === 0)

  const compFunnel = await request('/recruitment/bi/funnel', { token: tokenCompA })
  assert('Company funnel', compFunnel.status === 200 && compFunnel.data.funnel?.counts?.applications >= 1)
  assert('Funnel definition present', Boolean(compFunnel.data.funnel?.countType))

  const compSkills = await request('/recruitment/bi/skills', { token: tokenCompA })
  assert('Company skill analytics', compSkills.status === 200 && compSkills.data.skills?.demand?.length >= 1)

  const studentAnalytics = await request('/student/recruitment/career-analytics', { token: tokenStudent })
  assert('Student career analytics', studentAnalytics.status === 200 && studentAnalytics.data.analytics?.scope === 'student')

  const studentAi = await request('/student/recruitment/career-analytics/ai/insights', {
    method: 'POST',
    token: tokenStudent,
    body: { intent: 'STUDENT_CAREER' },
  })
  assert('Student AI insight', studentAi.status === 200 && studentAi.data.insights?.insight?.observation)

  const instBlocked = await request('/institution/bi/dashboard', { token: tokenStudent })
  assert('Student blocked from institution BI', instBlocked.status === 403)

  const dataQuality = await request('/institution/bi/data-quality', { token: tokenInstA })
  assert('Data quality endpoint', dataQuality.status === 200 && Array.isArray(dataQuality.data.dataQuality?.warnings))

  const periodFilter = await request('/institution/bi/dashboard?period=30d', { token: tokenInstA })
  assert('Period filter', periodFilter.status === 200 && periodFilter.data.dashboard?.period === '30d')

  await RecruitmentApplication.deleteMany({ institutionId: instA._id })
  await CampusOpportunity.deleteMany({ institutionId: instA._id })
  await RecruitmentJob.deleteMany({ companyId: compA._id })
  await InstitutionCompanyPartnership.deleteMany({ _id: partnership._id })
  await InstitutionStudent.deleteMany({ institutionId: { $in: [instA._id, instB._id] } })
  await Institution.deleteMany({ _id: { $in: [instA._id, instB._id] } })
  await Company.deleteMany({ _id: { $in: [compA._id, compB._id] } })
  await User.deleteMany({
    _id: { $in: [instUserA._id, instUserB._id, compUserA._id, compUserB._id, studentUser._id, otherStudent._id] },
  })
  await mongoose.disconnect()
  console.log('Business intelligence verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
