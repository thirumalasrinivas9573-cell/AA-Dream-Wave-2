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

  const instUser = await User.create({
    name: 'Recruit Inst',
    email: `rec-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Recruit University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Recruit Co',
    email: `rec-co-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Recruit Corp',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'Recruit Student',
    email: `rec-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const otherStudent = await User.create({
    name: 'Other Student',
    email: `rec-other-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenInst = sign(instUser._id)
  const tokenComp = sign(compUser._id)
  const tokenStudent = sign(studentUser._id)
  const tokenOther = sign(otherStudent._id)

  await request('/institution/students/meta', { token: tokenInst })
  await request('/recruitment/meta', { token: tokenComp })

  const inst = await Institution.findOne({ ownerUserId: instUser._id })
  const comp = await Company.findOne({ ownerUserId: compUser._id })

  const partnership = await InstitutionCompanyPartnership.create({
    institutionId: inst._id,
    companyId: comp._id,
    status: 'active',
    relationshipType: 'Placement Partner',
    initiatedBy: 'institution',
    initiatorUserId: instUser._id,
    requestedByUserId: instUser._id,
    requestStatus: 'accepted',
    contactPerson: { name: 'HR', email: comp.email },
  })

  const student = await InstitutionStudent.create({
    institutionId: inst._id,
    linkedUserId: studentUser._id,
    studentId: `REC-${ts}`,
    fullName: 'Recruit Student',
    email: studentUser.email,
    department: 'Computer Science',
    course: 'B.Tech CSE',
    batch: '2024',
    semester: 'Sem 8',
    status: 'active',
    cgpa: 8.5,
    sharedSkills: ['Python', 'SQL', 'React'],
    sharedProjects: [{ title: 'ML Portfolio', visibility: 'shared', technologies: ['Python', 'Machine Learning'] }],
  })

  const campusOpp = await CampusOpportunity.create({
    institutionId: inst._id,
    companyId: comp._id,
    partnershipId: partnership._id,
    opportunityType: 'internship',
    title: 'Campus Internship',
    status: 'open',
    deadline: new Date(Date.now() + 7 * 86400000),
    requiredSkills: ['Python'],
    eligibilityRules: { minCgpa: 7, requiredSkills: ['Python'], departments: ['Computer Science'] },
    createdByUserId: instUser._id,
  })

  const job = await RecruitmentJob.create({
    companyId: comp._id,
    partnershipId: partnership._id,
    title: 'Software Engineer',
    status: 'open',
    requiredSkills: ['Python', 'React'],
    experience: '0-1 years',
    createdByUserId: compUser._id,
    deadline: new Date(Date.now() + 7 * 86400000),
  })

  const browse = await request('/student/recruitment/opportunities/browse', { token: tokenStudent })
  assert('Student browse opportunities', browse.status === 200 && browse.data.items?.length >= 2)

  const eligibility = await request(
    `/student/recruitment/opportunities/campus_opportunity/${campusOpp._id}/eligibility`,
    { token: tokenStudent },
  )
  assert('Explainable eligibility', eligibility.status === 200 && eligibility.data.eligibility?.checks?.length > 0)
  assert('Eligibility result present', Boolean(eligibility.data.eligibility?.result))

  const apply = await request(
    `/student/recruitment/opportunities/campus_opportunity/${campusOpp._id}/apply`,
    { method: 'POST', token: tokenStudent, body: {} },
  )
  assert('Student apply', apply.status === 201, JSON.stringify(apply.data))
  const applicationId = apply.data.application?.id

  const duplicate = await request(
    `/student/recruitment/opportunities/campus_opportunity/${campusOpp._id}/apply`,
    { method: 'POST', token: tokenStudent, body: {} },
  )
  assert('Duplicate application rejected', duplicate.status === 409)

  const myApps = await request('/student/recruitment/applications', { token: tokenStudent })
  assert('Student sees own applications', myApps.status === 200 && myApps.data.applications?.length === 1)

  const crossStudent = await request(`/student/recruitment/applications/${applicationId}`, { token: tokenOther })
  assert('Student B cannot read Student A application', crossStudent.status === 404)

  const compApps = await request('/recruitment/applications', { token: tokenComp })
  assert('Company sees application', compApps.status === 200 && compApps.data.applications?.length >= 1)

  const aiSummary = await request(`/recruitment/applications/${applicationId}/ai-summary`, {
    method: 'POST',
    token: tokenComp,
  })
  assert('AI candidate summary', aiSummary.status === 200 && aiSummary.data.summary?.candidateSummary)

  const jobAnalysis = await request(`/recruitment/jobs/${job._id}/ai-analysis`, {
    method: 'POST',
    token: tokenComp,
  })
  assert('Job analysis', jobAnalysis.status === 200 && jobAnalysis.data.analysis?.extracted)

  const closedJob = await RecruitmentJob.findByIdAndUpdate(job._id, { status: 'closed' })
  const closedApply = await request(
    `/student/recruitment/opportunities/job/${job._id}/apply`,
    { method: 'POST', token: tokenStudent, body: {} },
  )
  assert('Closed job rejects apply', closedApply.status === 400)

  const unauth = await request('/student/recruitment/opportunities/browse')
  assert('Browse requires auth', unauth.status === 401)

  await RecruitmentApplication.deleteMany({ institutionId: inst._id })
  await CampusOpportunity.deleteMany({ institutionId: inst._id })
  await RecruitmentJob.deleteMany({ companyId: comp._id })
  await InstitutionCompanyPartnership.deleteMany({ _id: partnership._id })
  await InstitutionStudent.deleteMany({ institutionId: inst._id })
  await Institution.deleteMany({ _id: inst._id })
  await Company.deleteMany({ _id: comp._id })
  await User.deleteMany({ _id: { $in: [instUser._id, compUser._id, studentUser._id, otherStudent._id] } })
  await mongoose.disconnect()
  console.log('Student recruitment verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
