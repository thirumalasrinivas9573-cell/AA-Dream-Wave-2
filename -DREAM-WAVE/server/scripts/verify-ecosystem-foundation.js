#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const RecruitmentJob = require('../models/RecruitmentJob')

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
    name: 'Eco Inst A',
    email: `eco-inst-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Eco University A',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'Eco Inst B',
    email: `eco-inst-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Eco University B',
    onboardingCompleted: true,
  })
  const compUserA = await User.create({
    name: 'Eco Co A',
    email: `eco-co-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Eco Corp A',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'Eco Student',
    email: `eco-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenInstA = sign(instUserA._id)
  const tokenInstB = sign(instUserB._id)
  const tokenCompA = sign(compUserA._id)
  const tokenStudent = sign(studentUser._id)

  await request('/institution/students/meta', { token: tokenInstA })
  await request('/institution/students/meta', { token: tokenInstB })
  await request('/recruitment/meta', { token: tokenCompA })

  const instA = await Institution.findOne({ ownerUserId: instUserA._id })
  const instB = await Institution.findOne({ ownerUserId: instUserB._id })
  const compA = await Company.findOne({ ownerUserId: compUserA._id })

  await InstitutionStudent.create({
    institutionId: instA._id,
    studentId: `ECO-${ts}`,
    fullName: 'Eco Student Record',
    email: `eco-student-record-${ts}@test.com`,
    department: 'CS',
    status: 'active',
    sharedProjects: [
      { title: 'Public Project', visibility: 'shared' },
      { title: 'Private Project', visibility: 'private' },
    ],
  })

  const profileRes = await request('/institution/foundation/profile', { token: tokenInstA })
  assert('Institution foundation profile', profileRes.status === 200 && profileRes.data.profile?.name)

  const patchRes = await request('/institution/foundation/profile', {
    method: 'PATCH',
    token: tokenInstA,
    body: { description: 'V3 foundation profile update', ownerUserId: 'evil-id' },
  })
  assert('Profile patch whitelists fields', patchRes.status === 200)
  const refreshedInst = await Institution.findById(instA._id)
  assert('Owner not mass-assignable', refreshedInst.ownerUserId.toString() === instUserA._id.toString())

  const dashRes = await request('/institution/foundation/dashboard', { token: tokenInstA })
  assert('Institution foundation dashboard', dashRes.status === 200 && dashRes.data.dashboard?.students)

  const studentListA = await request('/institution/students', { token: tokenInstA })
  const studentId = studentListA.data.students?.[0]?.id
  assert('Institution A student list', studentListA.status === 200 && studentId)

  const crossTenant = await request(`/institution/students/${studentId}`, { token: tokenInstB })
  assert('Institution B cannot read Institution A student', crossTenant.status === 404)

  const detailA = await request(`/institution/students/${studentId}`, { token: tokenInstA })
  const projectTitles = (detailA.data.student?.projects || []).map((p) => p.title)
  assert('Private projects hidden', !projectTitles.includes('Private Project'))
  assert('Shared projects visible', projectTitles.includes('Public Project'))

  const onboardingAdmin = await request('/auth/onboarding', {
    method: 'POST',
    token: tokenStudent,
    body: { role: 'admin' },
  })
  assert('Admin role blocked in onboarding', onboardingAdmin.status === 400)

  const adminStats = await request('/admin/stats', { token: tokenStudent })
  assert('Admin stats blocked for student', adminStats.status === 403)

  const discoveryCompany = await request(`/discovery/companies/${compA._id}`, { token: tokenInstA })
  assert('Discovery company profile', discoveryCompany.status === 200)
  assert('Discovery hides hrContacts', !discoveryCompany.data.company?.hrContacts)
  assert('Discovery hides recruiterTeam', !discoveryCompany.data.company?.recruiterTeam)

  const foreignJob = await RecruitmentJob.create({
    companyId: compA._id,
    title: 'Foreign Job',
    status: 'open',
    description: 'Test',
    location: 'Remote',
    employmentType: 'full_time',
    createdByUserId: compUserA._id,
  })

  const applyForeign = await request('/institution/placements/applications', {
    method: 'POST',
    token: tokenInstA,
    body: { institutionStudentId: studentId, jobId: foreignJob._id.toString() },
  })
  assert('Institution blocked from non-partner job', applyForeign.status === 403 || applyForeign.status === 400)

  const unauthFoundation = await request('/institution/foundation/dashboard')
  assert('Foundation requires auth', unauthFoundation.status === 401)

  await RecruitmentJob.deleteMany({ _id: foreignJob._id })
  if (instA?._id) await InstitutionStudent.deleteMany({ institutionId: instA._id })
  if (instB?._id) await InstitutionStudent.deleteMany({ institutionId: instB._id })
  const instIds = [instA?._id, instB?._id].filter(Boolean)
  if (instIds.length) await Institution.deleteMany({ _id: { $in: instIds } })
  if (compA?._id) await Company.deleteMany({ _id: compA._id })
  await User.deleteMany({ _id: { $in: [instUserA._id, instUserB._id, compUserA._id, studentUser._id] } })
  await mongoose.disconnect()
  console.log('Ecosystem foundation verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
