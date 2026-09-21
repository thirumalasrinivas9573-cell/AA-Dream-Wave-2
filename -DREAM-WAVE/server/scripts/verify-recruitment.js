#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Company = require('../models/Company')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const InterviewPanel = require('../models/InterviewPanel')
const ApplicationNote = require('../models/ApplicationNote')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationActivity = require('../models/ApplicationActivity')
const ApplicationAssessment = require('../models/ApplicationAssessment')

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

async function advanceTo(token, appId, stages) {
  for (const stage of stages) {
    const r = await request(`/recruitment/applications/${appId}/stage`, {
      method: 'PATCH',
      token,
      body: { stage },
    })
    if (r.status !== 200) throw new Error(`Failed to advance to ${stage}: ${JSON.stringify(r.data)}`)
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const compUserA = await User.create({
    name: 'ATS Test Co A',
    email: `ats-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'ATS Corp A',
    onboardingCompleted: true,
  })
  const compUserB = await User.create({
    name: 'ATS Test Co B',
    email: `ats-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'ATS Corp B',
    onboardingCompleted: true,
  })

  const tokenA = sign(compUserA._id)
  const tokenB = sign(compUserB._id)

  const metaA = await request('/recruitment/meta', { token: tokenA })
  const metaB = await request('/recruitment/meta', { token: tokenB })
  if (metaA.status !== 200 || metaB.status !== 200) {
    throw new Error(`Meta bootstrap failed: A=${metaA.status} B=${metaB.status}`)
  }

  const companyA = await Company.findOne({ ownerUserId: compUserA._id })
  const companyB = await Company.findOne({ ownerUserId: compUserB._id })
  if (!companyA || !companyB) throw new Error('Company profiles missing')

  const create = await request('/recruitment/applications', {
    method: 'POST',
    token: tokenA,
    body: {
      opportunityType: 'job',
      roleTitle: 'Software Engineer',
      candidateSnapshot: {
        name: 'Jane Doe',
        email: 'jane@test.com',
        skills: ['React', 'Node'],
      },
      institutionName: 'Test University',
      applicationAnswers: [{ question: 'Why this role?', answer: 'Passion for engineering', type: 'text' }],
    },
  })
  console.log('Create application:', create.status === 201 ? 'OK' : create.data)
  const appId = create.data?.application?.id
  if (!appId) throw new Error('Application id missing')

  const transition = await request(`/recruitment/applications/${appId}/stage`, {
    method: 'PATCH',
    token: tokenA,
    body: { stage: 'screening' },
  })
  console.log('Valid transition:', transition.status === 200 ? 'OK' : transition.data)

  const invalid = await request(`/recruitment/applications/${appId}/stage`, {
    method: 'PATCH',
    token: tokenA,
    body: { stage: 'hired' },
  })
  console.log('Invalid transition blocked:', invalid.status === 400 ? 'OK (400)' : invalid.status)

  const transitions = await request(`/recruitment/applications/${appId}/transitions`, { token: tokenA })
  console.log('Allowed transitions:', transitions.status === 200 && Array.isArray(transitions.data.allowedTransitions) ? 'OK' : transitions.data)

  const note = await request(`/recruitment/applications/${appId}/notes`, {
    method: 'POST',
    token: tokenA,
    body: { content: 'Internal screening note', type: 'internal' },
  })
  console.log('Internal note:', note.status === 201 ? 'OK' : note.data)

  const tenantBlock = await request(`/recruitment/applications/${appId}`, { token: tokenB })
  console.log('Tenant isolation (Company B cannot access A app):', tenantBlock.status === 404 || tenantBlock.status === 403 ? 'OK' : tenantBlock.status)

  await advanceTo(tokenA, appId, ['under_review', 'shortlisted', 'assessment', 'assessment_passed', 'interview'])

  const interview = await request(`/recruitment/applications/${appId}/interviews`, {
    method: 'POST',
    token: tokenA,
    body: {
      round: 'Technical Round 1',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '10:00',
      mode: 'online',
      meetingLink: 'https://meet.example.com/room',
    },
  })
  console.log('Schedule interview:', interview.status === 201 ? 'OK' : interview.data)
  const interviewId = interview.data?.interview?._id

  if (interviewId) {
    const feedback = await request(`/recruitment/interviews/${interviewId}/feedback`, {
      method: 'POST',
      token: tokenA,
      body: {
        recommendation: 'Hire',
        strengths: 'Strong technical skills',
        concerns: 'Needs more system design',
      },
    })
    console.log('Interview feedback:', feedback.status === 200 ? 'OK' : feedback.data)
  }

  await advanceTo(tokenA, appId, ['final_interview', 'selected'])

  const offer = await request(`/recruitment/applications/${appId}/offer`, {
    method: 'POST',
    token: tokenA,
    body: { salary: 1200000, location: 'Hyderabad' },
  })
  console.log('Release offer:', offer.status === 200 ? 'OK' : offer.data)

  const rejectApp = await request('/recruitment/applications', {
    method: 'POST',
    token: tokenA,
    body: {
      opportunityType: 'job',
      roleTitle: 'QA Engineer',
      candidateSnapshot: { name: 'Reject Me', email: 'reject@test.com' },
    },
  })
  const rejectId = rejectApp.data?.application?.id
  if (rejectId) {
    await request(`/recruitment/applications/${rejectId}/stage`, {
      method: 'PATCH',
      token: tokenA,
      body: { stage: 'screening' },
    })
    const reject = await request(`/recruitment/applications/${rejectId}/stage`, {
      method: 'PATCH',
      token: tokenA,
      body: {
        stage: 'rejected',
        internalReason: 'Role requirements',
        candidateMessage: 'Thank you for applying.',
      },
    })
    console.log('Rejection workflow:', reject.status === 200 ? 'OK' : reject.data)
  }

  const bulkTags = await request('/recruitment/applications/bulk/tags', {
    method: 'POST',
    token: tokenA,
    body: { applicationIds: [appId], tags: ['High Priority'] },
  })
  console.log('Bulk tags:', bulkTags.status === 200 ? 'OK' : bulkTags.data)

  const stats = await request('/recruitment/stats', { token: tokenA })
  console.log('Stats:', stats.status === 200 ? 'OK' : stats.data)

  const funnel = await request('/recruitment/funnel', { token: tokenA })
  console.log('Funnel:', funnel.status === 200 ? 'OK' : funnel.data)

  const profileGet = await request('/recruitment/profile', { token: tokenA })
  console.log('Company profile GET:', profileGet.status === 200 ? 'OK' : profileGet.data)

  const profilePatch = await request('/recruitment/profile', {
    method: 'PATCH',
    token: tokenA,
    body: {
      industry: 'Technology',
      companySize: '100-500',
      headquarters: 'Hyderabad',
      description: 'Enterprise ATS test company',
      hiringDepartments: ['Engineering', 'Product'],
    },
  })
  console.log('Company profile PATCH:', profilePatch.status === 200 ? 'OK' : profilePatch.data)

  const jobCreate = await request('/recruitment/jobs', {
    method: 'POST',
    token: tokenA,
    body: {
      title: 'Senior Engineer',
      department: 'Engineering',
      location: 'Remote',
      workMode: 'remote',
      experience: '3+ years',
      requiredSkills: ['Node.js', 'React'],
      openings: 2,
      status: 'draft',
    },
  })
  console.log('Create job:', jobCreate.status === 201 ? 'OK' : jobCreate.data)
  const jobId = jobCreate.data?.job?._id || jobCreate.data?.job?.id

  if (jobId) {
    const jobPublish = await request(`/recruitment/jobs/${jobId}/action`, {
      method: 'POST',
      token: tokenA,
      body: { action: 'publish' },
    })
    console.log('Publish job:', jobPublish.status === 200 ? 'OK' : jobPublish.data)

    const jobClose = await request(`/recruitment/jobs/${jobId}/action`, {
      method: 'POST',
      token: tokenA,
      body: { action: 'close' },
    })
    console.log('Close job:', jobClose.status === 200 ? 'OK' : jobClose.data)
  }

  const internCreate = await request('/recruitment/internships', {
    method: 'POST',
    token: tokenA,
    body: {
      title: 'Summer Intern',
      department: 'Engineering',
      duration: '3 months',
      stipend: 25000,
      workMode: 'hybrid',
      requiredSkills: ['JavaScript'],
      status: 'draft',
    },
  })
  console.log('Create internship:', internCreate.status === 201 ? 'OK' : internCreate.data)
  const internId = internCreate.data?.internship?._id || internCreate.data?.internship?.id

  if (internId) {
    const internPublish = await request(`/recruitment/internships/${internId}/action`, {
      method: 'POST',
      token: tokenA,
      body: { action: 'publish' },
    })
    console.log('Publish internship:', internPublish.status === 200 ? 'OK' : internPublish.data)
  }

  const applicants = await request('/recruitment/applicants', { token: tokenA })
  console.log('Applicant directory:', applicants.status === 200 && applicants.data.applicants?.length >= 1 ? 'OK' : applicants.data)

  const shortlist = await request('/recruitment/shortlist', { token: tokenA })
  console.log('Shortlist view:', shortlist.status === 200 ? 'OK' : shortlist.data)

  const pipelineGet = await request('/recruitment/pipeline', { token: tokenA })
  console.log('Pipeline config GET:', pipelineGet.status === 200 ? 'OK' : pipelineGet.data)

  const pipelinePatch = await request('/recruitment/pipeline', {
    method: 'PATCH',
    token: tokenA,
    body: {
      stages: [
        { key: 'applied', label: 'New Applications', enabled: true, order: 0 },
        { key: 'screening', label: 'Resume Screening', enabled: true, order: 1 },
        { key: 'shortlisted', label: 'Shortlisted', enabled: true, order: 2 },
        { key: 'interview', label: 'Interviews', enabled: true, order: 3 },
        { key: 'selected', label: 'Selected', enabled: true, order: 4 },
        { key: 'hired', label: 'Hired', enabled: true, order: 5 },
        { key: 'rejected', label: 'Rejected', enabled: true, order: 6 },
      ],
    },
  })
  console.log('Pipeline config PATCH:', pipelinePatch.status === 200 ? 'OK' : pipelinePatch.data)

  const interviews = await request('/recruitment/interviews', { token: tokenA })
  console.log('List interviews:', interviews.status === 200 ? 'OK' : interviews.data)

  if (interviewId) {
    const reschedule = await request(`/recruitment/interviews/${interviewId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), scheduledTime: '14:00' },
    })
    console.log('Reschedule interview:', reschedule.status === 200 ? 'OK' : reschedule.data)

    const outcome = await request(`/recruitment/interviews/${interviewId}/outcome`, {
      method: 'POST',
      token: tokenA,
      body: { attendance: 'present', recommendation: 'Hire', strengths: 'Good', scores: { technicalSkills: 4, communication: 5 } },
    })
    console.log('Interview outcome:', outcome.status === 200 ? 'OK' : outcome.data)
  }

  const panelCreate = await request('/recruitment/panels', {
    method: 'POST',
    token: tokenA,
    body: { name: 'Tech Panel', department: 'Engineering', members: [{ name: 'Alice', role: 'Engineer', expertise: ['Node.js'] }] },
  })
  console.log('Create panel:', panelCreate.status === 201 ? 'OK' : panelCreate.data)

  const offerDraft = await request(`/recruitment/applications/${rejectId || appId}/offer/draft`, {
    method: 'POST',
    token: tokenA,
    body: { salary: 1500000, location: 'Bangalore', benefits: 'Health insurance', joiningDate: new Date(Date.now() + 86400000 * 60).toISOString() },
  })
  console.log('Offer draft:', offerDraft.status === 201 ? 'OK' : offerDraft.data)
  const offerId = offerDraft.data?.offer?._id

  if (offerId) {
    const approve = await request(`/recruitment/offers/${offerId}/action`, {
      method: 'POST',
      token: tokenA,
      body: { action: 'approve' },
    })
    console.log('Approve offer:', approve.status === 200 ? 'OK' : approve.data)
  }

  const talent = await request('/recruitment/talent/discover?q=Jane', { token: tokenA })
  console.log('Talent discovery:', talent.status === 200 ? 'OK' : talent.data)

  const comms = await request('/recruitment/communications', {
    method: 'POST',
    token: tokenA,
    body: { applicationIds: [appId], title: 'Update', body: 'Your application is under review.' },
  })
  console.log('Bulk communication:', comms.status === 200 ? 'OK' : comms.data)

  const partners = await request('/recruitment/partners', { token: tokenA })
  console.log('Partner institutions:', partners.status === 200 ? 'OK' : partners.data)

  const analytics = await request('/recruitment/analytics', { token: tokenA })
  console.log(
    'Recruitment analytics:',
    analytics.status === 200 && analytics.data.analytics?.hasData !== undefined ? 'OK' : analytics.data,
  )
  if (analytics.status !== 200) throw new Error('Analytics endpoint failed')

  const reportTypes = await request('/recruitment/reports/types', { token: tokenA })
  console.log(
    'Report types:',
    reportTypes.status === 200 && Array.isArray(reportTypes.data.reportTypes) ? 'OK' : reportTypes.data,
  )

  const pipelineReport = await request('/recruitment/reports/candidate_pipeline?page=1&limit=10', { token: tokenA })
  console.log(
    'Pipeline report preview:',
    pipelineReport.status === 200 && pipelineReport.data.report?.header ? 'OK' : pipelineReport.data,
  )

  const exportCsv = await request('/recruitment/reports/candidate_pipeline/export?format=csv', { token: tokenA })
  console.log(
    'Report CSV export:',
    exportCsv.status === 200 && exportCsv.data.export?.content ? 'OK' : exportCsv.data,
  )

  const RecruitmentAuditLog = require('../models/RecruitmentAuditLog')

  await RecruitmentAuditLog.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await ApplicationNote.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await ApplicationActivity.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await ApplicationAssessment.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await RecruitmentInterview.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await RecruitmentOffer.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await RecruitmentApplication.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await RecruitmentJob.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await RecruitmentInternship.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await InterviewPanel.deleteMany({ companyId: { $in: [companyA._id, companyB._id] } })
  await Company.deleteMany({ _id: { $in: [companyA._id, companyB._id] } })
  await User.deleteMany({ _id: { $in: [compUserA._id, compUserB._id] } })
  await mongoose.disconnect()
  console.log('Recruitment ATS verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
