#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStartup = require('../models/InstitutionStartup')
const InstitutionIncubationRecord = require('../models/InstitutionIncubationRecord')
const InstitutionMentor = require('../models/InstitutionMentor')
const InstitutionMentorshipSession = require('../models/InstitutionMentorshipSession')
const InstitutionFundingRecord = require('../models/InstitutionFundingRecord')
const InstitutionInvestor = require('../models/InstitutionInvestor')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionIncubationCollaboration = require('../models/InstitutionIncubationCollaboration')

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

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUser = await User.create({
    name: 'Incubation Test Institution',
    email: `incubation-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Incubation University',
    onboardingCompleted: true,
  })
  const studentUser = await User.create({
    name: 'Startup Founder',
    email: `incubation-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const studentToken = sign(studentUser._id)

  const meta = await request('/institution/incubation/meta', { token: instToken })
  if (meta.status !== 200) throw new Error(`Meta failed: ${JSON.stringify(meta.data)}`)
  console.log('Meta:', 'OK')

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  if (!institution) throw new Error('Institution missing')

  const startup = await request('/institution/incubation/startups', {
    method: 'POST',
    token: instToken,
    body: {
      name: 'HealthTech Innovators',
      description: 'AI diagnostics startup',
      category: 'healthcare',
      founders: ['Founder One'],
      status: 'active',
    },
  })
  console.log('Create startup:', startup.status === 201 ? 'OK' : startup.data)
  const startupId = startup.data?.startup?._id
  if (!startupId) throw new Error('Startup id missing')

  const duplicate = await request('/institution/incubation/startups', {
    method: 'POST',
    token: instToken,
    body: { name: 'HealthTech Innovators', founders: ['Dup'] },
  })
  console.log('Duplicate blocked:', duplicate.status === 409 ? 'OK' : duplicate.data)

  const advance = await request(`/institution/incubation/startups/${startupId}/incubation/advance`, {
    method: 'POST',
    token: instToken,
    body: { stage: 'pre_incubation' },
  })
  console.log('Advance incubation:', advance.status === 200 ? 'OK' : advance.data)

  const mentor = await request('/institution/incubation/mentors', {
    method: 'POST',
    token: instToken,
    body: {
      name: 'Dr. Mentor',
      mentorType: 'faculty',
      organization: 'Incubation University',
      expertise: ['Healthcare', 'AI'],
    },
  })
  console.log('Create mentor:', mentor.status === 201 ? 'OK' : mentor.data)
  const mentorId = mentor.data?.mentor?._id

  if (mentorId) {
    const assign = await request(`/institution/incubation/startups/${startupId}/mentors`, {
      method: 'POST',
      token: instToken,
      body: { mentorId },
    })
    console.log('Assign mentor:', assign.status === 200 ? 'OK' : assign.data)

    const session = await request('/institution/incubation/sessions', {
      method: 'POST',
      token: instToken,
      body: {
        startupId,
        mentorId,
        scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        goals: ['Define MVP scope'],
      },
    })
    console.log('Create session:', session.status === 201 ? 'OK' : session.data)
    const sessionId = session.data?.session?._id

    if (sessionId) {
      const complete = await request(`/institution/incubation/sessions/${sessionId}/complete`, {
        method: 'POST',
        token: instToken,
        body: { meetingNotes: 'Good progress', feedback: 'On track', rating: 4 },
      })
      console.log('Complete session:', complete.status === 200 ? 'OK' : complete.data)
    }
  }

  const funding = await request('/institution/incubation/funding', {
    method: 'POST',
    token: instToken,
    body: {
      startupId,
      fundingType: 'seed_funding',
      fundingSource: 'Institution Seed Fund',
      amount: 500000,
      status: 'approved',
    },
  })
  console.log('Create funding:', funding.status === 201 ? 'OK' : funding.data)

  const investor = await request('/institution/incubation/investors', {
    method: 'POST',
    token: instToken,
    body: {
      name: 'Alpha Angels',
      investorType: 'angel_network',
      preferredSectors: ['healthcare', 'AI'],
    },
  })
  console.log('Create investor:', investor.status === 201 ? 'OK' : investor.data)
  const investorId = investor.data?.investor?._id

  if (investorId) {
    const connect = await request(`/institution/incubation/investors/${investorId}/connect`, {
      method: 'POST',
      token: instToken,
      body: { startupId },
    })
    console.log('Connect investor:', connect.status === 200 ? 'OK' : connect.data)
  }

  const event = await request('/institution/incubation/events', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'Startup Demo Day 2026',
      eventType: 'demo_day',
      startDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      description: 'Annual demo day',
    },
  })
  console.log('Create event:', event.status === 201 ? 'OK' : event.data)
  const eventId = event.data?.event?._id

  if (eventId) {
    const publish = await request(`/institution/incubation/events/${eventId}/publish`, {
      method: 'POST',
      token: instToken,
    })
    console.log('Publish event:', publish.status === 200 ? 'OK' : publish.data)

    const register = await request(`/institution/incubation/events/${eventId}/register`, {
      method: 'POST',
      token: studentToken,
    })
    console.log('Event registration:', register.status === 201 ? 'OK' : register.data)
  }

  const collab = await request('/institution/incubation/collaboration', {
    method: 'POST',
    token: instToken,
    body: {
      startupId,
      collaborationType: 'discussion',
      title: 'Product roadmap discussion',
      content: 'Discuss Q3 milestones',
    },
  })
  console.log('Create collaboration:', collab.status === 201 ? 'OK' : collab.data)

  const stats = await request('/institution/incubation/stats', { token: instToken })
  console.log('Stats:', stats.status === 200 && stats.data.stats?.hasData ? 'OK' : stats.data)

  const workspace = await request('/institution/incubation/workspace', { token: instToken })
  console.log('Workspace:', workspace.status === 200 ? 'OK' : workspace.data)

  await InstitutionIncubationCollaboration.deleteMany({ institutionId: institution._id })
  await InstitutionInnovationEvent.deleteMany({ institutionId: institution._id })
  await InstitutionInvestor.deleteMany({ institutionId: institution._id })
  await InstitutionFundingRecord.deleteMany({ institutionId: institution._id })
  await InstitutionMentorshipSession.deleteMany({ institutionId: institution._id })
  await InstitutionMentor.deleteMany({ institutionId: institution._id })
  await InstitutionIncubationRecord.deleteMany({ institutionId: institution._id })
  await InstitutionStartup.deleteMany({ institutionId: institution._id })
  await Institution.deleteMany({ _id: institution._id })
  await User.deleteMany({ _id: { $in: [instUser._id, studentUser._id] } })
  await mongoose.disconnect()
  console.log('Institution incubation verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
