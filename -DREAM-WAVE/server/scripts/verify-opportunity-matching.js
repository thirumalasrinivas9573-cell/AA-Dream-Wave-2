#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const CampusOpportunity = require('../models/CampusOpportunity')
const Goal = require('../models/Goal')
const UserProfile = require('../models/UserProfile')

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
    name: 'Match Inst',
    email: `match-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Match University',
    onboardingCompleted: true,
  })
  const studentA = await User.create({
    name: 'Match Student A',
    email: `match-stu-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const studentB = await User.create({
    name: 'Match Student B',
    email: `match-stu-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenInst = sign(instUser._id)
  const tokenA = sign(studentA._id)
  const tokenB = sign(studentB._id)

  await request('/institution/students/meta', { token: tokenInst })
  const inst = await Institution.findOne({ ownerUserId: instUser._id })

  await InstitutionStudent.create({
    institutionId: inst._id,
    linkedUserId: studentA._id,
    studentId: `MATCH-A-${ts}`,
    fullName: 'Match Student A',
    email: studentA.email,
    department: 'Computer Science',
    course: 'B.Tech CSE',
    batch: '2024',
    status: 'active',
    cgpa: 8.5,
    sharedSkills: ['Python', 'React', 'Node.js'],
    verifiedSkills: ['Python'],
    sharedProjects: [{
      title: 'AI Assistant',
      technologies: ['Python', 'React', 'FastAPI'],
      visibility: 'public',
      status: 'completed',
    }],
  })

  await UserProfile.create({
    userId: studentA._id,
    targetRole: 'AI Engineer',
    skills: ['Python', 'Machine Learning'],
    interests: ['AI', 'Hackathons'],
  })

  await Goal.create({
    userId: studentA._id,
    title: 'Become an AI Engineer',
    category: 'Career',
    progress: 30,
  })

  await CampusOpportunity.create({
    institutionId: inst._id,
    opportunityType: 'hackathon',
    title: 'AI ML Hackathon 2026',
    description: 'Build AI applications',
    status: 'open',
    deadline: new Date(Date.now() + 5 * 86400000),
    requiredSkills: ['Python', 'React', 'MongoDB'],
    hackathonDetails: { teamSizeMin: 1, teamSizeMax: 4 },
    createdByUserId: instUser._id,
  })

  await CampusOpportunity.create({
    institutionId: inst._id,
    opportunityType: 'training',
    title: 'React Workshop 2026',
    description: 'Hands-on React workshop',
    status: 'open',
    deadline: new Date(Date.now() + 10 * 86400000),
    requiredSkills: ['React', 'JavaScript'],
    createdByUserId: instUser._id,
  })

  await CampusOpportunity.create({
    institutionId: inst._id,
    opportunityType: 'full_time',
    title: 'Closed Job Posting',
    status: 'closed',
    deadline: new Date(Date.now() - 86400000),
    requiredSkills: ['Java'],
    createdByUserId: instUser._id,
  })

  const feed = await request('/student/opportunities/feed', { token: tokenA })
  assert('Student feed', feed.status === 200 && feed.data.feed?.hasInstitutionLink)
  assert('Feed has opportunities', feed.data.feed?.totals?.all >= 1)
  assert('Strong matches have reasons', (feed.data.feed?.strongMatches?.[0]?.match?.reasons?.length || 0) >= 1)
  assert('Match has explainable score', Boolean(feed.data.feed?.strongMatches?.[0]?.match?.explainableScore?.rankFormula))

  const hackathon = feed.data.feed.explore.find((e) => e.title.includes('AI ML Hackathon'))
  assert('Hackathon in feed', Boolean(hackathon))

  const match = await request(`/student/opportunities/match/${hackathon.source}/${hackathon.id}`, { token: tokenA })
  assert('Match explanation', match.status === 200 && match.data.match?.matchLevel)
  assert('Match has reasons not percentage only', (match.data.match?.reasons?.length || 0) >= 1)
  assert('Missing requirements listed', Array.isArray(match.data.match?.missingRequirements))

  const prep = await request(`/student/opportunities/prepare/${hackathon.source}/${hackathon.id}`, { token: tokenA })
  assert('Preparation plan', prep.status === 200 && prep.data.plan?.checklist)
  assert('Prep lists missing skills', prep.data.plan?.checklist?.missingSkills?.includes('MongoDB'))

  const ai = await request('/student/opportunities/ai/insights', {
    method: 'POST',
    token: tokenA,
    body: { intent: 'OPPORTUNITY_DISCOVERY' },
  })
  assert('AI discovery insight', ai.status === 200 && ai.data.insights?.insight?.observation)
  assert('AI has limitation field', Boolean(ai.data.insights?.insight?.limitation))

  const nl = await request('/student/opportunities/discover', {
    method: 'POST',
    token: tokenA,
    body: { query: 'Find AI hackathons for me' },
  })
  assert('Natural language discovery', nl.status === 200 && nl.data.detectedIntents?.includes('hackathon'))

  const compare = await request('/student/opportunities/compare', {
    method: 'POST',
    token: tokenA,
    body: {
      items: feed.data.feed.explore.slice(0, 2).map((e) => ({ source: e.source, id: e.id })),
    },
  })
  assert('Opportunity comparison', compare.status === 200 && compare.data.comparison?.comparisons?.length >= 2)

  const idor = await request(`/student/opportunities/match/${hackathon.source}/${hackathon.id}`, { token: tokenB })
  assert('IDOR blocked for other student', idor.status === 404 || idor.status === 403)

  const closedInFeed = feed.data.feed.explore.find((e) => e.title === 'Closed Job Posting')
  if (closedInFeed) {
    assert('Closed opportunity not actionable', closedInFeed.match?.matchStatus === 'REGISTRATION_CLOSED' || !closedInFeed.match?.actionable)
  }

  const feedback = await request('/student/opportunities/feedback', {
    method: 'POST',
    token: tokenA,
    body: { source: hackathon.source, sourceId: hackathon.id, action: 'interested' },
  })
  assert('Feedback recorded', feedback.status === 200 && feedback.data.recorded)

  const massAssign = await request('/student/opportunities/feedback', {
    method: 'POST',
    token: tokenA,
    body: {
      source: hackathon.source,
      sourceId: hackathon.id,
      action: 'viewed',
      metadata: { recommendationScore: 99, userId: studentB._id.toString() },
    },
  })
  assert('Mass assignment blocked', massAssign.status === 400)

  const orgInsights = await request('/student/opportunities/organizer/insights', { token: tokenInst })
  assert('Organizer insights', orgInsights.status === 200 && orgInsights.data.insights?.observation)

  await CampusOpportunity.deleteMany({ institutionId: inst._id })
  await InstitutionStudent.deleteMany({ institutionId: inst._id })
  await Goal.deleteMany({ userId: studentA._id })
  await UserProfile.deleteMany({ userId: studentA._id })
  await Institution.deleteMany({ _id: inst._id })
  await User.deleteMany({ _id: { $in: [instUser._id, studentA._id, studentB._id] } })
  await mongoose.disconnect()
  console.log('Opportunity matching verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
