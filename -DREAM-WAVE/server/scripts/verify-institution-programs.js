#!/usr/bin/env node
/**
 * Lasya V3 Prompt 10 — institution program operations verification
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const InstitutionProgram = require('../models/InstitutionProgram')
const ProgramParticipant = require('../models/ProgramParticipant')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`
const results = []

function pass(name) {
  results.push({ name, ok: true })
  console.log(`  PASS  ${name}`)
}
function fail(name, detail) {
  results.push({ name, ok: false, detail })
  console.log(`  FAIL  ${name}${detail ? `: ${detail}` : ''}`)
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
    name: 'Prog Inst Admin',
    email: `prog-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Prog University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Prog Company',
    email: `prog-comp-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Prog Corp',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'Prog Student',
    email: `prog-stu-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const otherInstUser = await User.create({
    name: 'Other Inst',
    email: `prog-other-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Other U',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const studentToken = sign(studentUser._id)
  const otherToken = sign(otherInstUser._id)

  await request('/institution/programs/meta', { token: instToken })
  await request('/partnerships/meta', { token: instToken })
  await request('/partnerships/meta', { token: compToken })
  await request('/institution/programs/meta', { token: otherToken })

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  const company = await Company.findOne({ ownerUserId: compUser._id })
  const otherInst = await Institution.findOne({ ownerUserId: otherInstUser._id })

  await InstitutionStudent.create({
    institutionId: institution._id,
    linkedUserId: studentUser._id,
    studentId: `STU-${ts}`,
    fullName: 'Prog Student',
    email: studentUser.email,
    department: 'CSE',
    course: 'B.Tech CSE',
    batch: '2026',
    semester: '6',
    cgpa: 8.5,
    backlogs: 0,
    status: 'active',
  })

  const meta = await request('/institution/programs/meta', { token: instToken })
  meta.status === 200 && meta.data.programTypes?.length ? pass('Meta returns program types') : fail('Meta', String(meta.status))

  const create = await request('/institution/programs', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'AI Bootcamp 2026',
      programType: 'BOOTCAMP',
      objectives: 'Develop AI/ML skills',
      capacity: 2,
      skills: ['Python', 'ML'],
    },
  })
  const programId = create.data?.program?.id || create.data?.program?._id
  create.status === 201 ? pass('Institution creates program') : fail('Create program', JSON.stringify(create.data))

  const idor = await request(`/institution/programs/${programId}`, { token: otherToken })
  idor.status === 403 ? pass('IDOR blocked for other institution') : fail('IDOR', String(idor.status))

  const planned = await request(`/institution/programs/${programId}/status`, {
    method: 'POST',
    token: instToken,
    body: { status: 'planned' },
  })
  planned.status === 200 ? pass('Status transition draft→planned') : fail('Planned', JSON.stringify(planned.data))

  const regOpen = await request(`/institution/programs/${programId}/status`, {
    method: 'POST',
    token: instToken,
    body: { status: 'registration_open' },
  })
  regOpen.status === 200 ? pass('Open registration') : fail('Registration open', JSON.stringify(regOpen.data))

  const invalid = await request(`/institution/programs/${programId}/status`, {
    method: 'POST',
    token: instToken,
    body: { status: 'draft' },
  })
  invalid.status === 400 ? pass('Invalid status transition rejected') : fail('Invalid transition', String(invalid.status))

  const discover = await request('/student/programs/discover', { token: studentToken })
  discover.status === 200 ? pass('Student discovers programs') : fail('Discover', String(discover.status))

  const register = await request(`/student/programs/${programId}/register`, {
    method: 'POST',
    token: studentToken,
  })
  register.status === 201 ? pass('Student registers') : fail('Register', JSON.stringify(register.data))

  const dup = await request(`/student/programs/${programId}/register`, {
    method: 'POST',
    token: studentToken,
  })
  dup.status === 409 ? pass('Duplicate registration prevented') : fail('Duplicate reg', String(dup.status))

  const dashboard = await request(`/institution/programs/${programId}/dashboard`, { token: instToken })
  dashboard.status === 200 && dashboard.data.dashboard?.registrationCount >= 1
    ? pass('Organizer dashboard')
    : fail('Dashboard', String(dashboard.status))

  const participants = await request(`/institution/programs/${programId}/participants`, { token: instToken })
  const participantId = participants.data?.participants?.[0]?._id
  participants.status === 200 && participantId ? pass('List participants') : fail('Participants', String(participants.status))

  const approve = await request(`/institution/programs/${programId}/participants/${participantId}`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'approved' },
  })
  approve.status === 200 ? pass('Approve participant') : fail('Approve', JSON.stringify(approve.data))

  const ai = await request(`/institution/programs/${programId}/ai/insights`, {
    method: 'POST',
    token: instToken,
    body: { intent: 'PROGRAM_SUMMARY' },
  })
  ai.status === 200 && ai.data.insight ? pass('AI organizer insight') : fail('AI', String(ai.status))

  const studentAi = await request(`/student/programs/${programId}/ai/insights`, {
    method: 'POST',
    token: studentToken,
    body: { intent: 'STUDENT_PROGRESS' },
  })
  studentAi.status === 200 ? pass('AI student insight') : fail('Student AI', String(studentAi.status))

  const massAssign = await request(`/institution/programs/${programId}`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'completed', institutionId: otherInst._id.toString(), ownerRole: 'company' },
  })
  const pAfter = await InstitutionProgram.findById(programId).lean()
  massAssign.status === 200 &&
    pAfter.institutionId.toString() === institution._id.toString() &&
    pAfter.status !== 'completed'
    ? pass('Mass assignment fields ignored')
    : fail('Mass assignment', `status=${pAfter?.status}`)

  await ProgramParticipant.deleteMany({ programId })
  await InstitutionProgram.deleteMany({ institutionId: institution._id })
  await InstitutionStudent.deleteMany({ institutionId: institution._id })
  await Institution.deleteMany({ _id: { $in: [institution._id, otherInst._id] } })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({
    _id: { $in: [instUser._id, compUser._id, studentUser._id, otherInstUser._id] },
  })
  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\nProgram verify: ${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
