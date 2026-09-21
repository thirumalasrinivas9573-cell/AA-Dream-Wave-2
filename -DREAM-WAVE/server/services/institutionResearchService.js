const mongoose = require('mongoose')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionResearchOpportunity = require('../models/InstitutionResearchOpportunity')
const InstitutionResearchOpportunityApplication = require('../models/InstitutionResearchOpportunityApplication')
const InstitutionInnovationIdea = require('../models/InstitutionInnovationIdea')
const InstitutionResearchPublication = require('../models/InstitutionResearchPublication')
const InstitutionStudent = require('../models/InstitutionStudent')
const {
  assertProjectTransition,
  OPPORTUNITY_APPLICATION_STATUSES,
  IDEA_REVIEW_STATUSES,
} = require('../constants/institutionResearch')
const { recordInnovationAudit } = require('./institutionInnovationAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function sanitize(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordProjectHistory(project, action, actorUserId, actorName, extra = {}) {
  project.history.push({
    action,
    description: extra.description || '',
    actorUserId,
    actorName: sanitize(actorName, 100),
    previousState: extra.previousState || '',
    newState: extra.newState || '',
    metadata: extra.metadata || {},
    at: new Date(),
  })
}

function buildListQuery(institutionId, filters = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.status) query.status = filters.status
  if (filters.category) query.category = filters.category
  if (filters.domain) query.domain = filters.domain
  if (filters.researchArea) query.researchArea = new RegExp(filters.researchArea, 'i')
  if (filters.department) query['principalInvestigator.department'] = new RegExp(filters.department, 'i')
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: regex }, { abstract: regex }, { researchArea: regex }]
  }
  return query
}

async function paginate(Model, query, { page = 1, limit = 20, sort = '-createdAt' }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (safePage - 1) * safeLimit
  const [items, total] = await Promise.all([
    Model.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
    Model.countDocuments(query),
  ])
  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

async function getResearchStats(institutionId) {
  const cid = oid(institutionId)
  const [projects, opportunities, applications, ideas, publications] = await Promise.all([
    InstitutionResearchProject.find({ institutionId: cid }).select('status category').lean(),
    InstitutionResearchOpportunity.find({ institutionId: cid }).select('status opportunityType').lean(),
    InstitutionResearchOpportunityApplication.countDocuments({ institutionId: cid }),
    InstitutionInnovationIdea.find({ institutionId: cid }).select('reviewStatus ideaType').lean(),
    InstitutionResearchPublication.countDocuments({ institutionId: cid }),
  ])

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: projects.filter((p) => p.status === 'completed').length,
    totalOpportunities: opportunities.length,
    publishedOpportunities: opportunities.filter((o) => o.status === 'published').length,
    totalApplications: applications,
    totalIdeas: ideas.length,
    pendingIdeas: ideas.filter((i) => ['submitted', 'under_review'].includes(i.reviewStatus)).length,
    incubatingIdeas: ideas.filter((i) => i.reviewStatus === 'incubating').length,
    totalPublications: publications,
    byProjectStatus: projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {}),
    byOpportunityType: opportunities.reduce((acc, o) => {
      acc[o.opportunityType] = (acc[o.opportunityType] || 0) + 1
      return acc
    }, {}),
    byIdeaType: ideas.reduce((acc, i) => {
      acc[i.ideaType] = (acc[i.ideaType] || 0) + 1
      return acc
    }, {}),
    hasData: projects.length > 0 || opportunities.length > 0 || ideas.length > 0,
  }
}

async function getResearchWorkspace(institutionId) {
  const stats = await getResearchStats(institutionId)
  const cid = oid(institutionId)
  const [recentProjects, recentIdeas, recentApplications] = await Promise.all([
    InstitutionResearchProject.find({ institutionId: cid })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status researchArea updatedAt')
      .lean(),
    InstitutionInnovationIdea.find({ institutionId: cid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title ideaType reviewStatus createdAt')
      .lean(),
    InstitutionResearchOpportunityApplication.find({ institutionId: cid })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('opportunityId', 'title')
      .lean(),
  ])

  return {
    stats,
    recentProjects,
    recentIdeas,
    recentApplications: recentApplications.map((a) => ({
      id: a._id,
      applicantName: a.applicantName,
      status: a.status,
      opportunityTitle: a.opportunityId?.title || '',
      createdAt: a.createdAt,
    })),
  }
}

async function listProjects(institutionId, filters = {}, pagination = {}) {
  return paginate(InstitutionResearchProject, buildListQuery(institutionId, filters), pagination)
}

async function getProject(institutionId, projectId) {
  const project = await InstitutionResearchProject.findOne({
    institutionId: oid(institutionId),
    _id: projectId,
  }).lean()
  if (!project) throw err('Research project not found', 404)
  return project
}

async function createProject(institutionId, actorUserId, actorName, payload) {
  if (!payload.title) throw err('Project title is required')

  return InstitutionResearchProject.create({
    institutionId: oid(institutionId),
    title: sanitize(payload.title, 300),
    abstract: sanitize(payload.abstract),
    researchArea: sanitize(payload.researchArea, 200),
    category: payload.category || 'applied',
    domain: payload.domain || 'other',
    principalInvestigator: payload.principalInvestigator || {},
    members: payload.members || [],
    objectives: payload.objectives || [],
    timeline: payload.timeline || {},
    budget: payload.budget ?? 0,
    fundingSource: sanitize(payload.fundingSource, 300),
    status: payload.status || 'proposed',
    expectedOutcomes: payload.expectedOutcomes || [],
    tags: payload.tags || [],
    isConfidential: Boolean(payload.isConfidential),
    createdByUserId: actorUserId,
    history: [
      {
        action: 'project_created',
        description: `Project created: ${payload.title}`,
        actorUserId,
        actorName: sanitize(actorName, 100),
        newState: payload.status || 'proposed',
        at: new Date(),
      },
    ],
  }).then(async (project) => {
    await recordInnovationAudit({
      institutionId,
      action: 'research_project_created',
      actorUserId,
      actorName,
      description: `Research project created: ${payload.title}`,
      metadata: { projectId: project._id.toString() },
    }).catch(() => {})
    return project
  })
}

async function updateProject(institutionId, projectId, actorUserId, actorName, payload) {
  const project = await InstitutionResearchProject.findOne({
    institutionId: oid(institutionId),
    _id: projectId,
  })
  if (!project) throw err('Research project not found', 404)

  const allowed = [
    'title', 'abstract', 'researchArea', 'category', 'domain',
    'principalInvestigator', 'objectives', 'timeline', 'budget',
    'fundingSource', 'expectedOutcomes', 'tags', 'isConfidential', 'outcomes',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) project[key] = payload[key]
  }

  await recordProjectHistory(project, 'project_updated', actorUserId, actorName, {
    description: `Project updated: ${project.title}`,
  })
  await project.save()
  await recordInnovationAudit({
    institutionId,
    action: 'research_project_updated',
    actorUserId,
    actorName,
    description: `Research project updated: ${project.title}`,
    metadata: { projectId: project._id.toString() },
  }).catch(() => {})
  return project
}

async function transitionProjectStatus(institutionId, projectId, nextStatus, actorUserId, actorName) {
  const project = await InstitutionResearchProject.findOne({
    institutionId: oid(institutionId),
    _id: projectId,
  })
  if (!project) throw err('Research project not found', 404)

  const previous = project.status
  assertProjectTransition(previous, nextStatus)
  project.status = nextStatus
  await recordProjectHistory(project, 'project_status_changed', actorUserId, actorName, {
    description: `Status changed from ${previous} to ${nextStatus}`,
    previousState: previous,
    newState: nextStatus,
  })
  await project.save()
  return project
}

async function addProjectMember(institutionId, projectId, actorUserId, actorName, member) {
  const project = await InstitutionResearchProject.findOne({
    institutionId: oid(institutionId),
    _id: projectId,
  })
  if (!project) throw err('Research project not found', 404)
  if (!member.name || !member.memberType) throw err('Member name and type are required')

  project.members.push({ ...member, joinedAt: new Date(), contributions: [] })
  await recordProjectHistory(project, 'member_added', actorUserId, actorName, {
    description: `Member added: ${member.name}`,
    metadata: { memberName: member.name },
  })
  await project.save()
  return project
}

async function removeProjectMember(institutionId, projectId, memberId, actorUserId, actorName) {
  const project = await InstitutionResearchProject.findOne({
    institutionId: oid(institutionId),
    _id: projectId,
  })
  if (!project) throw err('Research project not found', 404)

  const member = project.members.id(memberId)
  if (!member) throw err('Member not found', 404)
  const memberName = member.name
  member.deleteOne()
  await recordProjectHistory(project, 'member_removed', actorUserId, actorName, {
    description: `Member removed: ${memberName}`,
  })
  await project.save()
  return project
}

async function listPublications(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.projectId) query.projectId = oid(filters.projectId)
  if (filters.publicationType) query.publicationType = filters.publicationType
  return paginate(InstitutionResearchPublication, query, pagination)
}

async function createPublication(institutionId, actorUserId, payload) {
  if (!payload.title) throw err('Publication title is required')
  return InstitutionResearchPublication.create({
    institutionId: oid(institutionId),
    projectId: payload.projectId || null,
    title: sanitize(payload.title, 300),
    publicationType: payload.publicationType || 'journal',
    authors: payload.authors || [],
    journalOrVenue: sanitize(payload.journalOrVenue, 300),
    year: payload.year ?? null,
    doi: sanitize(payload.doi, 200),
    url: sanitize(payload.url, 500),
    abstract: sanitize(payload.abstract),
    isConfidential: Boolean(payload.isConfidential),
    createdByUserId: actorUserId,
  })
}

async function listOpportunities(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.status) query.status = filters.status
  if (filters.opportunityType) query.opportunityType = filters.opportunityType
  if (filters.department) query.department = new RegExp(filters.department, 'i')
  return paginate(InstitutionResearchOpportunity, query, pagination)
}

async function createOpportunity(institutionId, actorUserId, payload) {
  if (!payload.title || !payload.opportunityType) {
    throw err('Title and opportunity type are required')
  }
  return InstitutionResearchOpportunity.create({
    institutionId: oid(institutionId),
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    opportunityType: payload.opportunityType,
    researchArea: sanitize(payload.researchArea, 200),
    domain: payload.domain || 'other',
    department: sanitize(payload.department, 200),
    principalInvestigator: payload.principalInvestigator || {},
    eligibility: payload.eligibility || {},
    positions: payload.positions ?? 1,
    applicationDeadline: payload.applicationDeadline || null,
    status: payload.status || 'draft',
    linkedProjectId: payload.linkedProjectId || null,
    tags: payload.tags || [],
    createdByUserId: actorUserId,
  })
}

async function updateOpportunity(institutionId, opportunityId, payload) {
  const opp = await InstitutionResearchOpportunity.findOne({
    institutionId: oid(institutionId),
    _id: opportunityId,
  })
  if (!opp) throw err('Opportunity not found', 404)

  const allowed = [
    'title', 'description', 'opportunityType', 'researchArea', 'domain', 'department',
    'principalInvestigator', 'eligibility', 'positions', 'applicationDeadline',
    'linkedProjectId', 'tags',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) opp[key] = payload[key]
  }
  await opp.save()
  return opp
}

async function transitionOpportunityStatus(institutionId, opportunityId, action) {
  const opp = await InstitutionResearchOpportunity.findOne({
    institutionId: oid(institutionId),
    _id: opportunityId,
  })
  if (!opp) throw err('Opportunity not found', 404)

  switch (action) {
    case 'publish':
      if (!['draft', 'closed'].includes(opp.status)) throw err('Cannot publish this opportunity')
      opp.status = 'published'
      opp.publishedAt = new Date()
      break
    case 'close':
      opp.status = 'closed'
      opp.closedAt = new Date()
      break
    case 'archive':
      opp.status = 'archived'
      break
    case 'reopen':
      opp.status = 'published'
      opp.closedAt = null
      break
    default:
      throw err('Invalid opportunity action')
  }
  await opp.save()
  return opp
}

async function listOpportunityApplications(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.opportunityId) query.opportunityId = oid(filters.opportunityId)
  if (filters.status) query.status = filters.status
  return paginate(InstitutionResearchOpportunityApplication, query, pagination)
}

async function reviewOpportunityApplication(institutionId, applicationId, actorUserId, payload) {
  const app = await InstitutionResearchOpportunityApplication.findOne({
    institutionId: oid(institutionId),
    _id: applicationId,
  })
  if (!app) throw err('Application not found', 404)
  if (payload.status && !OPPORTUNITY_APPLICATION_STATUSES.includes(payload.status)) {
    throw err('Invalid application status')
  }
  if (payload.status) app.status = payload.status
  if (payload.reviewNotes !== undefined) app.reviewNotes = sanitize(payload.reviewNotes)
  app.reviewedByUserId = actorUserId
  app.reviewedAt = new Date()
  await app.save()
  return app
}

async function resolveStudentForUser(userId) {
  return InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' }).lean()
}

async function listPublishedOpportunitiesForStudent(userId, filters = {}) {
  const student = await resolveStudentForUser(userId)
  if (!student) return { items: [], total: 0, institutionId: null }

  const query = { institutionId: student.institutionId, status: 'published' }
  if (filters.opportunityType) query.opportunityType = filters.opportunityType
  if (filters.department) query.department = new RegExp(filters.department, 'i')

  const now = new Date()
  const items = await InstitutionResearchOpportunity.find(query)
    .sort({ applicationDeadline: 1, createdAt: -1 })
    .lean()

  const filtered = items.filter(
    (o) => !o.applicationDeadline || new Date(o.applicationDeadline) >= now,
  )

  return { items: filtered, total: filtered.length, institutionId: student.institutionId, student }
}

async function applyToOpportunity(userId, userName, opportunityId, payload) {
  const student = await resolveStudentForUser(userId)
  if (!student) throw err('You must be linked to an institution to apply', 403)

  const opp = await InstitutionResearchOpportunity.findOne({
    _id: opportunityId,
    institutionId: student.institutionId,
    status: 'published',
  })
  if (!opp) throw err('Opportunity not found or not accepting applications', 404)
  if (opp.applicationDeadline && new Date(opp.applicationDeadline) < new Date()) {
    throw err('Application deadline has passed', 400)
  }

  const existing = await InstitutionResearchOpportunityApplication.findOne({
    opportunityId: opp._id,
    applicantUserId: userId,
  })
  if (existing) throw err('You have already applied to this opportunity', 409)

  return InstitutionResearchOpportunityApplication.create({
    institutionId: student.institutionId,
    opportunityId: opp._id,
    applicantUserId: userId,
    institutionStudentId: student._id,
    applicantName: student.fullName || userName || 'Applicant',
    applicantEmail: student.email || payload.applicantEmail || '',
    department: student.department || '',
    coverLetter: sanitize(payload.coverLetter),
    resumeUrl: sanitize(payload.resumeUrl, 500),
    status: 'submitted',
  })
}

async function listIdeas(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.reviewStatus) query.reviewStatus = filters.reviewStatus
  if (filters.ideaType) query.ideaType = filters.ideaType
  return paginate(InstitutionInnovationIdea, query, pagination)
}

async function submitIdea(institutionId, submitterUserId, submitterName, submitterRole, payload) {
  if (!payload.title || !payload.ideaType) throw err('Title and idea type are required')
  if (!payload.problemStatement && !payload.description) {
    throw err('Description or problem statement is required')
  }

  return InstitutionInnovationIdea.create({
    institutionId: oid(institutionId),
    submitterUserId,
    submitterName: sanitize(submitterName, 100),
    submitterRole: submitterRole || 'student',
    title: sanitize(payload.title, 300),
    ideaType: payload.ideaType,
    description: sanitize(payload.description),
    problemStatement: sanitize(payload.problemStatement),
    proposedSolution: sanitize(payload.proposedSolution),
    attachments: payload.attachments || [],
    tags: payload.tags || [],
    reviewStatus: 'submitted',
  }).then(async (idea) => {
    await recordInnovationAudit({
      institutionId,
      action: 'idea_submitted',
      actorUserId: submitterUserId,
      actorName: submitterName,
      description: `Innovation idea submitted: ${payload.title}`,
      metadata: { ideaId: idea._id.toString(), ideaType: payload.ideaType },
    }).catch(() => {})
    return idea
  })
}

async function submitIdeaForLinkedUser(userId, userName, userRole, payload) {
  const student = await resolveStudentForUser(userId)
  const institutionId = student?.institutionId || payload.institutionId
  if (!institutionId) throw err('Institution context required to submit an idea', 400)
  return submitIdea(institutionId, userId, userName, userRole, payload)
}

async function reviewIdea(institutionId, ideaId, actorUserId, payload) {
  const idea = await InstitutionInnovationIdea.findOne({
    institutionId: oid(institutionId),
    _id: ideaId,
  })
  if (!idea) throw err('Idea not found', 404)
  if (payload.reviewStatus && !IDEA_REVIEW_STATUSES.includes(payload.reviewStatus)) {
    throw err('Invalid review status')
  }
  if (payload.reviewStatus) idea.reviewStatus = payload.reviewStatus
  if (payload.reviewNotes !== undefined) idea.reviewNotes = sanitize(payload.reviewNotes)
  if (payload.linkedProjectId !== undefined) idea.linkedProjectId = payload.linkedProjectId || null
  idea.reviewedByUserId = actorUserId
  idea.reviewedAt = new Date()
  await idea.save()
  return idea
}

module.exports = {
  getResearchStats,
  getResearchWorkspace,
  listProjects,
  getProject,
  createProject,
  updateProject,
  transitionProjectStatus,
  addProjectMember,
  removeProjectMember,
  listPublications,
  createPublication,
  listOpportunities,
  createOpportunity,
  updateOpportunity,
  transitionOpportunityStatus,
  listOpportunityApplications,
  reviewOpportunityApplication,
  listPublishedOpportunitiesForStudent,
  applyToOpportunity,
  listIdeas,
  submitIdea,
  submitIdeaForLinkedUser,
  reviewIdea,
  resolveStudentForUser,
}
