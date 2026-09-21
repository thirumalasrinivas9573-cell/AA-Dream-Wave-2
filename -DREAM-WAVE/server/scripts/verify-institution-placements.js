#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const CampusOpportunity = require('../models/CampusOpportunity')
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

function assert(name, pass, detail = '') {
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) throw new Error(name)
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUser = await User.create({
    name: 'Placement Test Uni',
    email: `placement-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Placement University',
    onboardingCompleted: true,
  })
  const companyUser = await User.create({
    name: 'Placement Corp',
    email: `placement-co-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Placement Corp',
    onboardingCompleted: true,
  })

  const tokenInst = sign(instUser._id)
  await request('/institution/students/meta', { token: tokenInst })
  await request('/institution/placements/meta', { token: tokenInst })

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  if (!institution) {
    await Institution.create({ ownerUserId: instUser._id, name: 'Placement University', email: instUser.email })
  }
  const inst = await Institution.findOne({ ownerUserId: instUser._id })

  let company = await Company.findOne({ ownerUserId: companyUser._id })
  if (!company) {
    company = await Company.create({
      ownerUserId: companyUser._id,
      name: 'Placement Corp',
      industry: 'Technology',
      email: companyUser.email,
      website: 'https://example.com',
    })
  }

  const partnership = await InstitutionCompanyPartnership.create({
    institutionId: inst._id,
    companyId: company._id,
    status: 'active',
    relationshipType: 'Recruitment Partner',
    initiatedBy: 'institution',
    initiatorUserId: instUser._id,
    requestStatus: 'accepted',
  })

  const studentRes = await request('/institution/students', {
    method: 'POST',
    token: tokenInst,
    body: {
      fullName: 'Placement Student',
      email: `pstudent-${ts}@test.com`,
      department: 'Computer Science',
      course: 'B.Tech CSE',
      semester: 'Semester 8',
      batch: '2022-2026',
      cgpa: 8.5,
      sharedSkills: ['React', 'Node.js'],
    },
  })
  assert('Create student', studentRes.status === 201)
  const studentId = studentRes.data.student.id

  const oppRes = await request('/institution/placements/opportunities', {
    method: 'POST',
    token: tokenInst,
    body: {
      opportunityType: 'campus_drive',
      title: 'Campus Drive 2026',
      companyId: company._id.toString(),
      partnershipId: partnership._id.toString(),
      description: 'Annual campus recruitment drive',
      location: 'Main Auditorium',
      workMode: 'offline',
      deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
      requiredSkills: ['React'],
      eligibilityRules: {
        departments: ['Computer Science'],
        minCgpa: 7,
        maxBacklogs: 0,
      },
      venue: 'Block A',
      driveDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      status: 'open',
    },
  })
  assert('Create opportunity', oppRes.status === 201)
  const opportunityId = oppRes.data.opportunity.id

  const eligRes = await request(
    `/institution/placements/opportunities/${opportunityId}/eligibility/${studentId}`,
    { token: tokenInst },
  )
  assert('Eligibility check', eligRes.status === 200 && eligRes.data.eligibility?.status === 'eligible', `status=${eligRes.status} body=${JSON.stringify(eligRes.data)}`)

  const applyRes = await request('/institution/placements/applications', {
    method: 'POST',
    token: tokenInst,
    body: { institutionStudentId: studentId, campusOpportunityId: opportunityId, companyId: company._id.toString() },
  })
  assert('Submit application', applyRes.status === 201, `status=${applyRes.status} body=${JSON.stringify(applyRes.data)}`)
  const applicationId = applyRes.data.application.id

  const publishRes = await request(`/institution/placements/drives/${opportunityId}/action`, {
    method: 'POST',
    token: tokenInst,
    body: { action: 'publish' },
  })
  assert('Publish drive', publishRes.status === 200 && publishRes.data.drive?.status === 'registration_open')

  const shortlistRes = await request(`/institution/placements/drives/${opportunityId}/shortlist/generate`, {
    method: 'POST',
    token: tokenInst,
    body: { mode: 'automatic' },
  })
  assert('Generate shortlist', shortlistRes.status === 200 && shortlistRes.data.shortlist?.count >= 1)

  const dashboard = await request('/institution/placements/dashboard', { token: tokenInst })
  assert('Dashboard widgets', dashboard.status === 200 && dashboard.data.widgets?.applicationsReceived >= 1)

  const engagement = await request(`/institution/placements/companies/${company._id}/engagement`, { token: tokenInst })
  assert('Company engagement', engagement.status === 200 && engagement.data.engagement?.totalApplications >= 1)

  const history = await request(`/institution/placements/students/${studentId}/placement-history`, { token: tokenInst })
  assert('Placement history', history.status === 200 && history.data.history?.applications?.length >= 1)

  const dupApply = await request('/institution/placements/applications', {
    method: 'POST',
    token: tokenInst,
    body: { institutionStudentId: studentId, campusOpportunityId: opportunityId, companyId: company._id.toString() },
  })
  assert('Duplicate application blocked', dupApply.status === 409, `status=${dupApply.status}`)

  const workspace = await request('/institution/placements/workspace', { token: tokenInst })
  assert('Workspace load', workspace.status === 200 && workspace.data.workspace?.applications?.length >= 1)

  const stats = await request('/institution/placements/stats', { token: tokenInst })
  assert('Placement stats', stats.status === 200)

  const analytics = await request('/institution/placements/analytics', { token: tokenInst })
  assert(
    'Placement analytics',
    analytics.status === 200 &&
      analytics.data.analytics?.hasData === true &&
      analytics.data.analytics?.applicationsSubmitted >= 1,
    `status=${analytics.status} body=${JSON.stringify(analytics.data)}`,
  )

  const reportTypes = await request('/institution/placements/reports/types', { token: tokenInst })
  assert(
    'Report types',
    reportTypes.status === 200 && reportTypes.data.reportTypes?.length >= 9,
    `status=${reportTypes.status}`,
  )

  const preview = await request('/institution/placements/reports/student_placement?page=1&limit=10', {
    token: tokenInst,
  })
  assert(
    'Report preview',
    preview.status === 200 && preview.data.report?.rows?.length >= 1,
    `status=${preview.status} body=${JSON.stringify(preview.data)}`,
  )

  const exportRes = await request('/institution/placements/reports/placement_summary/export?format=csv', {
    token: tokenInst,
  })
  assert(
    'Report export CSV',
    exportRes.status === 200 && exportRes.data.export?.content?.includes('Total Applications'),
    `status=${exportRes.status}`,
  )

  const pools = await request('/institution/placements/pools', { token: tokenInst })
  assert('Student pools', pools.status === 200 && pools.data.pools?.length >= 8)

  const noAuth = await request('/institution/placements/stats')
  assert('Unauthenticated blocked', noAuth.status === 401)

  await CampusOpportunity.deleteMany({ institutionId: inst._id })
  await RecruitmentApplication.deleteMany({ institutionId: inst._id })
  await InstitutionStudent.deleteMany({ institutionId: inst._id })
  await InstitutionCompanyPartnership.deleteMany({ _id: partnership._id })
  await Institution.deleteMany({ _id: inst._id })
  await Company.deleteMany({ _id: company._id })
  await User.deleteMany({ _id: { $in: [instUser._id, companyUser._id] } })
  await mongoose.disconnect()
  console.log('\nInstitution placement verification complete — ALL OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
