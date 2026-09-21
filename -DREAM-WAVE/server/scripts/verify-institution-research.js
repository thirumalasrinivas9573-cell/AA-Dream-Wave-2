#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionResearchOpportunity = require('../models/InstitutionResearchOpportunity')
const InstitutionResearchOpportunityApplication = require('../models/InstitutionResearchOpportunityApplication')
const InstitutionInnovationIdea = require('../models/InstitutionInnovationIdea')
const InstitutionResearchPublication = require('../models/InstitutionResearchPublication')
const InstitutionInnovationAuditLog = require('../models/InstitutionInnovationAuditLog')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
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
    name: 'Research Test Institution',
    email: `research-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Research University',
    onboardingCompleted: true,
  })

  const studentUser = await User.create({
    name: 'Research Student',
    email: `research-student-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const studentToken = sign(studentUser._id)

  const meta = await request('/institution/research/meta', { token: instToken })
  if (meta.status !== 200) throw new Error(`Meta failed: ${JSON.stringify(meta.data)}`)
  console.log('Meta:', 'OK')

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  if (!institution) throw new Error('Institution profile missing')

  const student = await InstitutionStudent.create({
    institutionId: institution._id,
    linkedUserId: studentUser._id,
    studentId: `RS-${ts}`,
    fullName: 'Research Student',
    email: studentUser.email,
    department: 'Computer Science',
    status: 'active',
  })

  const project = await request('/institution/research/projects', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'AI for Healthcare Diagnostics',
      abstract: 'Developing ML models for early disease detection.',
      researchArea: 'Healthcare AI',
      category: 'applied',
      domain: 'healthcare',
      principalInvestigator: { name: 'Dr. Smith', department: 'Computer Science' },
      budget: 500000,
      fundingSource: 'DST Grant',
      objectives: ['Build dataset', 'Train model', 'Clinical validation'],
    },
  })
  console.log('Create project:', project.status === 201 ? 'OK' : project.data)
  const projectId = project.data?.project?._id
  if (!projectId) throw new Error('Project id missing')

  const member = await request(`/institution/research/projects/${projectId}/members`, {
    method: 'POST',
    token: instToken,
    body: {
      name: 'Research Student',
      memberType: 'student',
      role: 'student_researcher',
      responsibilities: 'Data collection and model evaluation',
    },
  })
  console.log('Add project member:', member.status === 200 ? 'OK' : member.data)

  const status = await request(`/institution/research/projects/${projectId}/status`, {
    method: 'POST',
    token: instToken,
    body: { status: 'approved' },
  })
  console.log('Transition project:', status.status === 200 ? 'OK' : status.data)

  const publication = await request('/institution/research/publications', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'Deep Learning for Medical Imaging',
      publicationType: 'journal',
      authors: ['Dr. Smith', 'Research Student'],
      journalOrVenue: 'Journal of Medical AI',
      year: 2026,
      projectId,
    },
  })
  console.log('Create publication:', publication.status === 201 ? 'OK' : publication.data)

  const opportunity = await request('/institution/research/opportunities', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'Research Assistant — Healthcare AI',
      description: 'Assist with dataset curation and model training.',
      opportunityType: 'research_assistant',
      department: 'Computer Science',
      researchArea: 'Healthcare AI',
      applicationDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    },
  })
  console.log('Create opportunity:', opportunity.status === 201 ? 'OK' : opportunity.data)
  const oppId = opportunity.data?.opportunity?._id
  if (!oppId) throw new Error('Opportunity id missing')

  const publish = await request(`/institution/research/opportunities/${oppId}/action`, {
    method: 'POST',
    token: instToken,
    body: { action: 'publish' },
  })
  console.log('Publish opportunity:', publish.status === 200 ? 'OK' : publish.data)

  const browse = await request('/institution/research/opportunities/browse', { token: studentToken })
  console.log('Student browse:', browse.status === 200 && browse.data.opportunities?.length >= 1 ? 'OK' : browse.data)

  const apply = await request(`/institution/research/opportunities/${oppId}/apply`, {
    method: 'POST',
    token: studentToken,
    body: { coverLetter: 'I am interested in healthcare AI research.' },
  })
  console.log('Student apply:', apply.status === 201 ? 'OK' : apply.data)
  const appId = apply.data?.application?._id

  const review = await request(`/institution/research/applications/${appId}/review`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'shortlisted', reviewNotes: 'Strong background' },
  })
  console.log('Review application:', review.status === 200 ? 'OK' : review.data)

  const ideaInst = await request('/institution/research/ideas', {
    method: 'POST',
    token: instToken,
    body: {
      title: 'Campus Waste Management Startup',
      ideaType: 'startup_idea',
      problemStatement: 'Inefficient campus waste sorting',
      proposedSolution: 'AI-powered smart bins',
      tags: ['sustainability', 'AI'],
    },
  })
  console.log('Submit idea (institution):', ideaInst.status === 201 ? 'OK' : ideaInst.data)
  const ideaId = ideaInst.data?.idea?._id

  const ideaStudent = await request('/institution/research/ideas/submit', {
    method: 'POST',
    token: studentToken,
    body: {
      title: 'Student Health Monitoring App',
      ideaType: 'product_innovation',
      problemStatement: 'Students lack access to timely health insights',
      proposedSolution: 'Wearable-integrated wellness dashboard',
    },
  })
  console.log('Submit idea (student):', ideaStudent.status === 201 ? 'OK' : ideaStudent.data)

  const reviewIdea = await request(`/institution/research/ideas/${ideaId}/review`, {
    method: 'PATCH',
    token: instToken,
    body: { reviewStatus: 'incubating', reviewNotes: 'Promising social impact' },
  })
  console.log('Review idea:', reviewIdea.status === 200 ? 'OK' : reviewIdea.data)

  const stats = await request('/institution/research/stats', { token: instToken })
  console.log('Stats:', stats.status === 200 && stats.data.stats?.hasData ? 'OK' : stats.data)

  const workspace = await request('/institution/research/workspace', { token: instToken })
  console.log('Workspace:', workspace.status === 200 ? 'OK' : workspace.data)

  const listProjects = await request('/institution/research/projects', { token: instToken })
  console.log('List projects:', listProjects.status === 200 && listProjects.data.projects?.length >= 1 ? 'OK' : listProjects.data)

  const analytics = await request('/institution/research/analytics', { token: instToken })
  console.log(
    'Analytics:',
    analytics.status === 200 && analytics.data.analytics?.hasData && analytics.data.analytics.totalResearchProjects >= 1
      ? 'OK'
      : analytics.data,
  )

  const reportTypes = await request('/institution/research/reports/types', { token: instToken })
  console.log(
    'Report types:',
    reportTypes.status === 200 && reportTypes.data.reportTypes?.length === 9 ? 'OK' : reportTypes.data,
  )

  const reportPreview = await request('/institution/research/reports/research_project?page=1&limit=10', { token: instToken })
  console.log(
    'Report preview:',
    reportPreview.status === 200 && reportPreview.data.report?.rows?.length >= 1 ? 'OK' : reportPreview.data,
  )

  const reportExport = await request('/institution/research/reports/research_project/export?format=csv', { token: instToken })
  console.log(
    'Report export:',
    reportExport.status === 200 && reportExport.data.export?.content?.includes('AI for Healthcare') ? 'OK' : reportExport.data,
  )

  const auditCount = await InstitutionInnovationAuditLog.countDocuments({ institutionId: institution._id })
  console.log('Audit logs:', auditCount >= 2 ? 'OK' : `Expected >= 2, got ${auditCount}`)

  await InstitutionInnovationAuditLog.deleteMany({ institutionId: institution._id })

  await InstitutionResearchOpportunityApplication.deleteMany({ institutionId: institution._id })
  await InstitutionInnovationIdea.deleteMany({ institutionId: institution._id })
  await InstitutionResearchPublication.deleteMany({ institutionId: institution._id })
  await InstitutionResearchOpportunity.deleteMany({ institutionId: institution._id })
  await InstitutionResearchProject.deleteMany({ institutionId: institution._id })
  await InstitutionStudent.deleteMany({ _id: student._id })
  await Institution.deleteMany({ _id: institution._id })
  await User.deleteMany({ _id: { $in: [instUser._id, studentUser._id] } })
  await mongoose.disconnect()
  console.log('Institution research verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
