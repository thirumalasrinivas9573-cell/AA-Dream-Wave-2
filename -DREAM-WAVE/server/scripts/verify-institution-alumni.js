#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const InstitutionAlumniGroup = require('../models/InstitutionAlumniGroup')
const InstitutionAlumniConnection = require('../models/InstitutionAlumniConnection')
const InstitutionAlumniMentorship = require('../models/InstitutionAlumniMentorship')
const InstitutionAlumniMentorshipSession = require('../models/InstitutionAlumniMentorshipSession')
const InstitutionAlumniCareerContribution = require('../models/InstitutionAlumniCareerContribution')
const InstitutionAlumniCareerApplication = require('../models/InstitutionAlumniCareerApplication')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionAlumniInstitutionalContribution = require('../models/InstitutionAlumniInstitutionalContribution')
const InstitutionAlumniGroupPost = require('../models/InstitutionAlumniGroupPost')
const InstitutionAlumniVolunteerRecord = require('../models/InstitutionAlumniVolunteerRecord')
const InstitutionAlumniAuditLog = require('../models/InstitutionAlumniAuditLog')

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
    name: 'Alumni Test Institution',
    email: `alumni-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Alumni University',
    onboardingCompleted: true,
  })

  const studentUser = await User.create({
    name: 'Alumni Student',
    email: `alumni-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const studentToken = sign(studentUser._id)

  const meta = await request('/institution/alumni/meta', { token: instToken })
  if (meta.status !== 200) throw new Error(`Meta failed: ${JSON.stringify(meta.data)}`)
  console.log('Meta:', 'OK')

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  if (!institution) throw new Error('Institution missing')

  const student = await InstitutionStudent.create({
    institutionId: institution._id,
    linkedUserId: studentUser._id,
    studentId: `AL-${ts}`,
    fullName: 'Alumni Student',
    email: studentUser.email,
    department: 'Computer Science',
    batch: '2024',
    status: 'graduated',
  })

  const alumni = await request('/institution/alumni/directory', {
    method: 'POST',
    token: instToken,
    body: {
      fullName: 'Priya Sharma',
      email: `priya.alumni.${ts}@test.com`,
      graduationYear: '2020',
      department: 'Computer Science',
      degree: 'B.Tech',
      currentCompany: 'TechCorp Global',
      currentRole: 'Senior Software Engineer',
      industry: 'technology',
      skills: ['JavaScript', 'Cloud', 'Leadership'],
      location: { city: 'Bangalore', country: 'India' },
      isMentorAvailable: true,
      verificationStatus: 'verified',
    },
  })
  console.log('Create alumni:', alumni.status === 201 ? 'OK' : alumni.data)
  const alumniId = alumni.data?.alumni?._id
  if (!alumniId) throw new Error('Alumni id missing')

  const duplicate = await request('/institution/alumni/directory', {
    method: 'POST',
    token: instToken,
    body: { fullName: 'Dup', email: `priya.alumni.${ts}@test.com` },
  })
  console.log('Duplicate blocked:', duplicate.status === 409 ? 'OK' : duplicate.data)

  const fromStudent = await request(`/institution/alumni/directory/from-student/${student._id}`, {
    method: 'POST',
    token: instToken,
  })
  console.log('Create from student:', fromStudent.status === 201 ? 'OK' : fromStudent.data)

  const search = await request('/institution/alumni/directory?q=Priya&industry=technology', { token: instToken })
  console.log('Search alumni:', search.status === 200 && search.data.alumni?.length >= 1 ? 'OK' : search.data)

  const group = await request('/institution/alumni/groups', {
    method: 'POST',
    token: instToken,
    body: {
      name: 'CS Alumni Chapter 2020',
      groupType: 'graduation_year',
      description: 'Computer Science graduates from 2020',
      interestTags: ['technology', 'startups'],
    },
  })
  console.log('Create group:', group.status === 201 ? 'OK' : group.data)
  const groupId = group.data?.group?._id

  const addMember = await request(`/institution/alumni/groups/${groupId}/members`, {
    method: 'POST',
    token: instToken,
    body: { alumniId },
  })
  console.log('Add group member:', addMember.status === 200 ? 'OK' : addMember.data)

  const mentorshipReq = await request('/institution/alumni/mentorships/request', {
    method: 'POST',
    token: studentToken,
    body: {
      alumniId,
      goals: ['Career guidance', 'Interview prep'],
      requestMessage: 'Would love mentorship on software engineering careers.',
    },
  })
  console.log('Mentorship request:', mentorshipReq.status === 201 ? 'OK' : mentorshipReq.data)
  const mentorshipId = mentorshipReq.data?.mentorship?._id

  const match = await request(`/institution/alumni/mentorships/${mentorshipId}`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'matched' },
  })
  console.log('Match mentorship:', match.status === 200 ? 'OK' : match.data)

  const session = await request('/institution/alumni/sessions', {
    method: 'POST',
    token: instToken,
    body: {
      mentorshipId,
      scheduledDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      goals: ['Resume review'],
    },
  })
  console.log('Schedule session:', session.status === 201 ? 'OK' : session.data)
  const sessionId = session.data?.session?._id

  const complete = await request(`/institution/alumni/sessions/${sessionId}/complete`, {
    method: 'POST',
    token: instToken,
    body: { notes: 'Reviewed resume and discussed career paths', feedback: 'Great session' },
  })
  console.log('Complete session:', complete.status === 200 ? 'OK' : complete.data)

  const career = await request('/institution/alumni/career', {
    method: 'POST',
    token: instToken,
    body: {
      alumniId,
      contributionType: 'job_referral',
      title: 'Software Engineer — TechCorp Global',
      company: 'TechCorp Global',
      role: 'Software Engineer',
      location: 'Bangalore',
      description: 'Referral for full-time SWE role.',
    },
  })
  console.log('Career contribution:', career.status === 201 ? 'OK' : career.data)

  const browse = await request('/institution/alumni/browse?q=Priya', { token: studentToken })
  console.log('Student browse:', browse.status === 200 && browse.data.alumni?.length >= 1 ? 'OK' : browse.data)

  const careerBrowse = await request('/institution/alumni/career/browse', { token: studentToken })
  console.log('Career browse:', careerBrowse.status === 200 && careerBrowse.data.contributions?.length >= 1 ? 'OK' : careerBrowse.data)

  const engagement = await request('/institution/alumni/engagement', { token: instToken })
  console.log('Engagement analytics:', engagement.status === 200 && engagement.data.analytics?.hasData ? 'OK' : engagement.data)

  const event = await request('/institution/alumni/events', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'Annual Alumni Reunion 2026',
      eventType: 'annual_reunion',
      description: 'Celebrate alumni achievements',
      organizer: 'Alumni Association',
      venue: 'Main Auditorium',
      startDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      speakers: [{ name: 'Priya Sharma', title: 'Keynote', organization: 'TechCorp' }],
    },
  })
  console.log('Create event:', event.status === 201 ? 'OK' : event.data)
  const eventId = event.data?.event?._id

  const publish = await request(`/institution/alumni/events/${eventId}/publish`, { method: 'POST', token: instToken })
  console.log('Publish event:', publish.status === 200 ? 'OK' : publish.data)

  const eventReg = await request(`/institution/alumni/events/${eventId}/register`, { method: 'POST', token: studentToken })
  console.log('Event registration:', eventReg.status === 200 ? 'OK' : eventReg.data)

  const institutional = await request('/institution/alumni/contributions', {
    method: 'POST',
    token: instToken,
    body: {
      alumniId,
      contributionType: 'scholarship',
      title: 'Merit Scholarship Fund',
      amount: 100000,
      beneficiaries: 'CS Department students',
    },
  })
  console.log('Institutional contribution:', institutional.status === 201 ? 'OK' : institutional.data)
  const contribId = institutional.data?.contribution?._id

  const approve = await request(`/institution/alumni/contributions/${contribId}/approve`, {
    method: 'POST',
    token: instToken,
    body: { approvalStatus: 'approved' },
  })
  console.log('Approve contribution:', approve.status === 200 ? 'OK' : approve.data)

  const post = await request(`/institution/alumni/groups/${groupId}/posts`, {
    method: 'POST',
    token: instToken,
    body: { title: 'Career advice for fresh graduates', body: 'Share your industry insights!', postType: 'career_advice' },
  })
  console.log('Group discussion post:', post.status === 201 ? 'OK' : post.data)

  const volunteer = await request('/institution/alumni/volunteers', {
    method: 'POST',
    token: instToken,
    body: {
      alumniId,
      volunteerRole: 'guest_speaker',
      title: 'Reunion Keynote Speaker',
      eventId,
      hoursContributed: 2,
    },
  })
  console.log('Volunteer record:', volunteer.status === 201 ? 'OK' : volunteer.data)

  const careerApply = await request(`/institution/alumni/career/${career.data?.contribution?._id}/apply`, {
    method: 'POST',
    token: studentToken,
    body: { coverLetter: 'I am interested in this referral opportunity.' },
  })
  console.log('Career application:', careerApply.status === 201 ? 'OK' : careerApply.data)

  const audit = await request('/institution/alumni/audit', { token: instToken })
  console.log('Audit log:', audit.status === 200 && audit.data.auditLog?.length >= 1 ? 'OK' : audit.data)

  const analytics = await request('/institution/alumni/analytics', { token: instToken })
  console.log(
    'Alumni analytics:',
    analytics.status === 200 && analytics.data.analytics?.totalAlumni >= 1 ? 'OK' : analytics.data,
  )

  const reportTypes = await request('/institution/alumni/reports/types', { token: instToken })
  console.log(
    'Report types:',
    reportTypes.status === 200 && reportTypes.data.reportTypes?.length === 8 ? 'OK' : reportTypes.data,
  )

  const reportPreview = await request('/institution/alumni/reports/alumni_directory?page=1&limit=10', {
    token: instToken,
  })
  console.log(
    'Report preview:',
    reportPreview.status === 200 && reportPreview.data.report?.rows?.length >= 1 ? 'OK' : reportPreview.data,
  )

  const reportExport = await request('/institution/alumni/reports/alumni_directory/export?format=csv', {
    token: instToken,
  })
  console.log(
    'Report export:',
    reportExport.status === 200 && reportExport.data.export?.content?.includes('Name') ? 'OK' : reportExport.data,
  )

  const stats = await request('/institution/alumni/stats', { token: instToken })
  console.log('Stats:', stats.status === 200 && stats.data.stats?.hasData ? 'OK' : stats.data)

  const workspace = await request('/institution/alumni/workspace', { token: instToken })
  console.log('Workspace:', workspace.status === 200 ? 'OK' : workspace.data)

  await InstitutionAlumniAuditLog.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniVolunteerRecord.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniGroupPost.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniInstitutionalContribution.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniEvent.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniCareerApplication.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniCareerContribution.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniMentorshipSession.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniMentorship.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniConnection.deleteMany({ institutionId: institution._id })
  await InstitutionAlumniGroup.deleteMany({ institutionId: institution._id })
  await InstitutionAlumni.deleteMany({ institutionId: institution._id })
  await InstitutionStudent.deleteMany({ _id: student._id })
  await Institution.deleteMany({ _id: institution._id })
  await User.deleteMany({ _id: { $in: [instUser._id, studentUser._id] } })
  await mongoose.disconnect()
  console.log('Institution alumni verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
