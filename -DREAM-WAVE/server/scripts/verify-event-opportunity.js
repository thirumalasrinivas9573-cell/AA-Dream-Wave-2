#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const Company = require('../models/Company')

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
    name: 'Event Inst A',
    email: `evt-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Event University A',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'Event Inst B',
    email: `evt-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Event University B',
    onboardingCompleted: true,
  })
  const studentA = await User.create({
    name: 'Event Student A',
    email: `evt-stu-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const studentB = await User.create({
    name: 'Event Student B',
    email: `evt-stu-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenInstA = sign(instUserA._id)
  const tokenInstB = sign(instUserB._id)
  const tokenStudentA = sign(studentA._id)
  const tokenStudentB = sign(studentB._id)

  await request('/institution/students/meta', { token: tokenInstA })
  await request('/institution/students/meta', { token: tokenInstB })

  const instA = await Institution.findOne({ ownerUserId: instUserA._id })
  const instB = await Institution.findOne({ ownerUserId: instUserB._id })

  await InstitutionStudent.create({
    institutionId: instA._id,
    linkedUserId: studentA._id,
    studentId: `EVT-A-${ts}`,
    fullName: 'Event Student A',
    email: studentA.email,
    department: 'Computer Science',
    course: 'B.Tech CSE',
    batch: '2024',
    status: 'active',
    cgpa: 8.5,
    sharedSkills: ['Python', 'React'],
  })

  const hackathon = await CampusOpportunity.create({
    institutionId: instA._id,
    opportunityType: 'hackathon',
    title: 'Dream Wave Hackathon 2026',
    description: 'Build real projects',
    status: 'open',
    deadline: new Date(Date.now() + 7 * 86400000),
    capacity: 2,
    requiredSkills: ['Python', 'React', 'MongoDB'],
    hackathonDetails: {
      teamSizeMin: 1,
      teamSizeMax: 3,
      submissionDeadline: new Date(Date.now() + 10 * 86400000),
      problemStatements: [{ title: 'Smart Campus', description: 'Campus automation' }],
      themes: ['AI', 'Sustainability'],
      prizes: [{ label: 'First Place', description: 'Organizer-defined prize' }],
    },
    createdByUserId: instUserA._id,
  })

  const innovationEvent = await InstitutionInnovationEvent.create({
    institutionId: instA._id,
    title: 'Innovation Workshop',
    description: 'Hands-on workshop',
    eventType: 'workshop',
    startDate: new Date(Date.now() + 3 * 86400000),
    registrationDeadline: new Date(Date.now() + 2 * 86400000),
    capacity: 50,
    status: 'published',
    publishedAt: new Date(),
    createdByUserId: instUserA._id,
  })

  const closedEvent = await InstitutionInnovationEvent.create({
    institutionId: instA._id,
    title: 'Closed Event',
    eventType: 'seminar',
    startDate: new Date(Date.now() - 86400000),
    registrationDeadline: new Date(Date.now() - 3600000),
    status: 'published',
    publishedAt: new Date(),
    createdByUserId: instUserA._id,
  })

  const browse = await request('/events/browse', { token: tokenStudentA })
  assert('Student browse events', browse.status === 200 && browse.data.items?.length >= 2)
  assert('Browse has hackathon', browse.data.items.some((e) => e.category === 'hackathon'))

  const browseB = await request('/events/browse', { token: tokenStudentB })
  assert('Student B no institution link', browseB.data.items?.length === 0)

  const details = await request(`/events/campus_opportunity/${hackathon._id}`, { token: tokenStudentA })
  assert('Event details', details.status === 200 && details.data.event?.title === 'Dream Wave Hackathon 2026', JSON.stringify(details.data))
  assert('Hackathon details present', Boolean(details.data.event?.hackathonDetails))

  const eligibility = await request(`/events/campus_opportunity/${hackathon._id}/eligibility`, { token: tokenStudentA })
  assert('Eligibility check', eligibility.status === 200 && eligibility.data.eligibility?.result)

  const register = await request(`/events/campus_opportunity/${hackathon._id}/register`, {
    method: 'POST',
    token: tokenStudentA,
  })
  assert('Register for hackathon', register.status === 201, JSON.stringify(register.data))

  const duplicate = await request(`/events/campus_opportunity/${hackathon._id}/register`, {
    method: 'POST',
    token: tokenStudentA,
  })
  assert('Duplicate registration blocked', duplicate.status === 409)

  const workshopReg = await request(`/events/innovation_event/${innovationEvent._id}/register`, {
    method: 'POST',
    token: tokenStudentA,
  })
  assert('Register for workshop', workshopReg.status === 201)

  const closedReg = await request(`/events/innovation_event/${closedEvent._id}/register`, {
    method: 'POST',
    token: tokenStudentA,
  })
  assert('Closed registration rejected', closedReg.status === 400)

  const team = await request(`/events/campus_opportunity/${hackathon._id}/teams`, {
    method: 'POST',
    token: tokenStudentA,
    body: { name: 'Team Alpha', track: 'AI' },
  })
  assert('Create hackathon team', team.status === 201 && team.data.team?.name === 'Team Alpha')

  const my = await request('/events/my', { token: tokenStudentA })
  assert('Student dashboard', my.status === 200 && my.data.dashboard?.registered?.length >= 2)

  const save = await request(`/events/campus_opportunity/${hackathon._id}/save`, {
    method: 'POST',
    token: tokenStudentA,
  })
  assert('Save event', save.status === 200 && save.data.saved === true)

  const ai = await request('/events/ai/insights', {
    method: 'POST',
    token: tokenStudentA,
    body: { intent: 'HACKATHON_MATCH' },
  })
  assert('AI event insights', ai.status === 200 && ai.data.insights?.insight?.observation)

  const prep = await request('/events/ai/insights', {
    method: 'POST',
    token: tokenStudentA,
    body: {
      intent: 'EVENT_PREPARATION',
      source: 'campus_opportunity',
      sourceId: hackathon._id.toString(),
    },
  })
  assert('AI preparation insight', prep.status === 200 && prep.data.insights?.insight?.evidence)

  const idor = await request(`/events/campus_opportunity/${hackathon._id}`, { token: tokenStudentB })
  assert('IDOR blocked for other student', idor.status === 404)

  const instBlocked = await request('/events/browse', { token: tokenInstA })
  assert('Institution blocked from student browse', instBlocked.status === 403)

  const orgDash = await request('/events/organizer/dashboard', { token: tokenInstA })
  assert('Organizer dashboard', orgDash.status === 200 && orgDash.data.dashboard?.events?.length >= 1)

  const orgDashB = await request('/events/organizer/dashboard', { token: tokenInstB })
  assert('Institution B isolated organizer dashboard', orgDashB.data.dashboard?.totals?.events === 0)

  const hackathonFilter = await request('/events/browse?hackathon=true', { token: tokenStudentA })
  assert('Hackathon filter', hackathonFilter.data.items.every((e) => e.isHackathon || e.category === 'hackathon'))

  await CampusOpportunity.deleteMany({ institutionId: instA._id })
  await InstitutionInnovationEvent.deleteMany({ institutionId: instA._id })
  await InstitutionStudent.deleteMany({ institutionId: { $in: [instA._id, instB._id] } })
  await Institution.deleteMany({ _id: { $in: [instA._id, instB._id] } })
  await User.deleteMany({ _id: { $in: [instUserA._id, instUserB._id, studentA._id, studentB._id] } })
  await mongoose.disconnect()
  console.log('Event opportunity verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
