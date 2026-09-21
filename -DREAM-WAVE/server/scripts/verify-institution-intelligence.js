#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionMember = require('../models/InstitutionMember')

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
    name: 'Intel Inst A',
    email: `intel-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Intel University A',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'Intel Inst B',
    email: `intel-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Intel University B',
    onboardingCompleted: true,
  })
  const studentRole = await User.create({
    name: 'Blocked Student',
    email: `intel-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const facultyUser = await User.create({
    name: 'Intel Faculty',
    email: `intel-faculty-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Intel University A',
    onboardingCompleted: true,
  })

  const tokenA = sign(instUserA._id)
  const tokenB = sign(instUserB._id)
  const tokenStudent = sign(studentRole._id)

  await request('/institution/students/meta', { token: tokenA })
  await request('/institution/students/meta', { token: tokenB })

  const instA = await Institution.findOne({ ownerUserId: instUserA._id })
  const instB = await Institution.findOne({ ownerUserId: instUserB._id })

  await Institution.findByIdAndUpdate(instA._id, {
    departments: ['Computer Science', 'Electronics'],
    programs: ['B.Tech CSE', 'B.Tech ECE'],
  })

  const studentA = await InstitutionStudent.create({
    institutionId: instA._id,
    studentId: `INTEL-${ts}`,
    fullName: 'Intel Student',
    email: `intel-student-record-${ts}@test.com`,
    department: 'Computer Science',
    course: 'B.Tech CSE',
    batch: '2024',
    semester: 'Sem 6',
    academicYear: '2025-26',
    admissionYear: '2024',
    status: 'active',
    cgpa: 5.2,
    attendance: 68,
    backlogs: 2,
    profileStatus: 'partial',
    sharedSkills: ['Python', 'SQL'],
    sharedProjects: [{ title: 'AI Project', visibility: 'shared', technologies: ['Python'] }],
    placement: { lifecycleStatus: 'ELIGIBLE' },
  })

  await InstitutionMember.create({
    institutionId: instA._id,
    userId: facultyUser._id,
    role: 'FACULTY',
    active: true,
  })

  const overview = await request('/institution/intelligence/overview', { token: tokenA })
  assert('Intelligence overview', overview.status === 200 && overview.data.overview?.metrics, JSON.stringify(overview.data))
  assert('Overview has students', overview.data.overview.metrics.totalStudents >= 1)

  const programs = await request('/institution/intelligence/programs', { token: tokenA })
  assert('Program intelligence', programs.status === 200 && programs.data.programs?.departments?.length >= 1)

  const courses = await request('/institution/intelligence/courses', { token: tokenA })
  assert('Course intelligence', courses.status === 200 && courses.data.courses?.courses?.length >= 1)

  const support = await request('/institution/intelligence/support-signals', { token: tokenA })
  assert('Support signals', support.status === 200 && support.data.support?.total >= 1)
  assert('Support wording', support.data.support.items[0]?.signals[0]?.label?.includes('review') || support.data.support.items[0]?.signals[0]?.label?.includes('support') || support.data.support.items[0]?.signals[0]?.label?.includes('attention'))

  const profile = await request(`/institution/intelligence/students/${studentA._id}/academic-profile`, { token: tokenA })
  assert('Academic profile', profile.status === 200 && profile.data.profile?.fullName === 'Intel Student')
  assert('Profile excludes private AI fields', profile.data.profile?.privateGoals === undefined)

  const admissions = await request('/institution/intelligence/admissions', { token: tokenA })
  assert('Admissions analytics', admissions.status === 200 && admissions.data.admissions?.totalEnrolled >= 1)

  const faculty = await request('/institution/intelligence/faculty', { token: tokenA })
  assert('Faculty intelligence', faculty.status === 200 && faculty.data.faculty?.totalFaculty >= 1, JSON.stringify(faculty.data))

  const outcomes = await request('/institution/intelligence/career-outcomes', { token: tokenA })
  assert('Career outcomes', outcomes.status === 200 && outcomes.data.outcomes?.disclaimer)

  const ai = await request('/institution/intelligence/ai/insights', {
    method: 'POST',
    token: tokenA,
    body: { intent: 'ACADEMIC_SUPPORT' },
  })
  assert('AI institution insights', ai.status === 200 && ai.data.insights?.length >= 1)

  const crossTenant = await request(`/institution/intelligence/students/${studentA._id}/academic-profile`, { token: tokenB })
  assert('Institution B cannot read Institution A student', crossTenant.status === 404)

  const unauth = await request('/institution/intelligence/overview')
  assert('Overview requires auth', unauth.status === 401)

  const blocked = await request('/institution/intelligence/overview', { token: tokenStudent })
  assert('Student role blocked', blocked.status === 403)

  const foundation = await request('/institution/foundation/dashboard', { token: tokenA })
  assert('Foundation dashboard admissions', foundation.status === 200 && foundation.data.dashboard?.admissions?.totalApplications >= 1)
  assert('Foundation dashboard faculty', foundation.data.dashboard?.faculty?.total >= 1)

  await InstitutionStudent.deleteMany({ institutionId: instA._id })
  await InstitutionMember.deleteMany({ institutionId: { $in: [instA._id, instB._id] } })
  await Institution.deleteMany({ _id: { $in: [instA._id, instB._id] } })
  await User.deleteMany({ _id: { $in: [instUserA._id, instUserB._id, studentRole._id, facultyUser._id] } })
  await mongoose.disconnect()
  console.log('Institution intelligence verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
