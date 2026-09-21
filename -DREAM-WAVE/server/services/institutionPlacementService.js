const mongoose = require('mongoose')
const CampusOpportunity = require('../models/CampusOpportunity')
const Company = require('../models/Company')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationNote = require('../models/ApplicationNote')
const InstitutionCohort = require('../models/InstitutionCohort')
const {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_STATUSES,
  POOL_PRESETS,
  STAGE_TO_ELIGIBILITY_STATUS,
} = require('../constants/institutionPlacements')
const { STAGE_ALIASES } = require('../constants/recruitment')
const { evaluateEligibility } = require('./institutionPlacementEligibilityService')
const { jobToEligibilityRules, buildEligibilityChecklist } = require('./recruitmentIntelligenceService')
const { buildListQuery } = require('./institutionStudentService')
const { recordAudit } = require('./institutionAuditService')
const institutionCache = require('./institutionCache')
const { transitionStage } = require('./recruitmentService')
const { recordStudentPlacementStatus } = require('./institutionPlacementHistoryService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function buildStudentSnapshot(student) {
  const o = student.toObject ? student.toObject() : student
  return {
    name: o.fullName,
    email: o.email,
    phone: o.phone || '',
    skills: [...(o.sharedSkills || []), ...(o.verifiedSkills || [])],
    education: [`${o.course} · ${o.department} · ${o.semester}`],
    experience: o.internships || [],
    projects: (o.sharedProjects || [])
      .filter((p) => p.visibility !== 'private')
      .map((p) => p.title),
    certificates: (o.certifications || [])
      .filter((c) => c.visibility !== 'private')
      .map((c) => c.title),
    portfolioUrl: '',
  }
}

function serializeCompany(company, partnership = null) {
  const o = company.toObject ? company.toObject() : company
  return {
    id: o._id.toString(),
    logoInitials: (o.name || 'CO').slice(0, 2).toUpperCase(),
    name: o.name,
    industry: o.industry || '',
    hrContact: partnership?.contactPerson?.name || o.name,
    email: partnership?.contactPerson?.email || o.email || '',
    phone: partnership?.contactPerson?.phone || o.phone || '',
    location: o.location || o.city || '',
    website: o.website || '',
    about: o.about || '',
    hiringDepartments: o.hiringDepartments || [],
    requiredSkills: [],
    hiringProcess: [],
    pastPlacements: 0,
    internshipsCount: o.activeInternshipsCount || 0,
    jobsCount: o.activeJobsCount || 0,
    driveStatus: 'ongoing',
    status: partnership?.status === 'active' ? 'active' : 'active',
    partnershipId: partnership?._id?.toString() || null,
  }
}

function serializeOpportunity(doc, company = null) {
  const o = doc.toObject ? doc.toObject() : doc
  const base = {
    id: o._id.toString(),
    source: 'campus_opportunity',
    opportunityType: o.opportunityType,
    title: o.title,
    companyId: o.companyId?.toString() || '',
    companyName: company?.name || '',
    description: o.description,
    location: o.location,
    workMode: o.workMode,
    salary: o.salary,
    stipend: o.stipend,
    employmentType: o.employmentType,
    deadline: o.deadline,
    requiredSkills: o.requiredSkills || [],
    eligibilityRules: o.eligibilityRules || {},
    selectionProcess: o.selectionProcess || [],
    documentsRequired: o.documentsRequired || [],
    venue: o.venue,
    driveDate: o.driveDate,
    status: o.status,
    openPositions: o.openPositions,
    partnershipId: o.partnershipId?.toString() || null,
    createdAt: o.createdAt,
  }

  if (['internship', 'apprenticeship'].includes(o.opportunityType)) {
    return {
      ...base,
      listType: 'internship',
      duration: o.description?.slice(0, 50) || '',
      openPositions: o.openPositions,
    }
  }
  if (['full_time', 'graduate_program'].includes(o.opportunityType)) {
    return { ...base, listType: 'job', jobType: o.employmentType, experience: '' }
  }
  if (o.opportunityType === 'campus_drive') {
    return {
      ...base,
      listType: 'drive',
      name: o.title,
      date: o.driveDate,
      mode: o.workMode,
      eligibleDepartments: o.eligibilityRules?.departments || [],
      eligiblePrograms: o.eligibilityRules?.programs || [],
      minCgpa: o.eligibilityRules?.minCgpa ?? 0,
      maxBacklogs: o.eligibilityRules?.maxBacklogs ?? 0,
      skillsRequired: o.requiredSkills || [],
      registrationDeadline: o.deadline,
      expectedHiringCount: o.expectedHiringCount ?? o.openPositions ?? 1,
      onlinePlatform: o.onlinePlatform || '',
      workflowStages: o.workflowStages || [],
      currentWorkflowStage: o.currentWorkflowStage || '',
      shortlist: o.shortlist || null,
      publishedAt: o.publishedAt,
      archivedAt: o.archivedAt,
      documentsRequired: o.documentsRequired || [],
    }
  }
  return base
}

function serializeJobListing(job, company) {
  const o = job.toObject ? job.toObject() : job
  return {
    id: o._id.toString(),
    source: 'recruitment_job',
    listType: 'job',
    title: o.title,
    companyId: o.companyId.toString(),
    companyName: company?.name || '',
    salary: o.salary,
    location: o.location,
    experience: o.experience,
    eligibility: o.eligibility,
    jobType: o.jobType,
    deadline: o.deadline,
    selectionProcess: o.selectionProcess || [],
    status: o.status === 'open' ? 'open' : 'closed',
    opportunityType: 'full_time',
    partnershipId: o.partnershipId?.toString() || null,
  }
}

function serializeInternshipListing(internship, company) {
  const o = internship.toObject ? internship.toObject() : internship
  return {
    id: o._id.toString(),
    source: 'recruitment_internship',
    listType: 'internship',
    title: o.title,
    companyId: o.companyId.toString(),
    companyName: company?.name || '',
    duration: o.duration,
    location: o.location,
    workMode: o.workMode,
    stipend: o.stipend,
    eligibility: o.eligibility,
    requiredSkills: o.requiredSkills || [],
    deadline: o.deadline,
    openPositions: o.openPositions,
    status: o.status === 'open' ? 'open' : 'closed',
    opportunityId: o._id.toString(),
    partnershipId: o.partnershipId?.toString() || null,
  }
}

function serializeApplication(doc, student = null) {
  const o = doc.toObject ? doc.toObject() : doc
  const stage = STAGE_ALIASES[o.stage] || o.stage
  return {
    id: o._id.toString(),
    studentName: o.candidateSnapshot?.name || student?.fullName || '—',
    studentId: o.institutionStudentId?.toString() || '',
    companyId: o.companyId?.toString() || '',
    role: o.roleTitle,
    type: o.opportunityType === 'campus_opportunity' ? 'drive' : o.opportunityType,
    department: o.department || student?.department || '',
    cgpa: o.cgpa ?? student?.cgpa ?? 0,
    graduationYear: o.graduationYear || student?.expectedGraduation || '',
    stage,
    canonicalStage: o.stage,
    eligibilityStatus: STAGE_TO_ELIGIBILITY_STATUS[o.stage] || 'application_submitted',
    appliedDate: o.createdAt,
    opportunityId: o.campusOpportunityId?.toString() || o.jobId?.toString() || o.internshipId?.toString() || '',
  }
}

async function getActivePartnershipIds(institutionId, requiredScope = null) {
  const partnerships = await InstitutionCompanyPartnership.find({
    institutionId: oid(institutionId),
    status: 'active',
  }).lean()
  if (!requiredScope) return partnerships
  return partnerships.filter(
    (p) => Array.isArray(p.sharingScopes) && p.sharingScopes.includes(requiredScope),
  )
}

async function assertInstitutionRecruitmentAccess(institutionId, { job, internship, partnershipId, companyId }) {
  const partnerships = await getActivePartnershipIds(institutionId, 'recruitment')
  const partnerCompanyIds = new Set(partnerships.map((p) => p.companyId.toString()))
  const partnerIds = new Set(partnerships.map((p) => p._id.toString()))

  if (partnershipId && !partnerIds.has(String(partnershipId))) {
    throw err('Opportunity is not linked to an active institution partnership', 403)
  }

  const targetCompanyId = companyId?.toString()
  if (targetCompanyId && !partnerCompanyIds.has(targetCompanyId)) {
    throw err('Company is not an active institution partner', 403)
  }

  if (job) {
    if (job.status !== 'open') throw err('Job is not open for applications', 400)
    if (job.partnershipId && !partnerIds.has(job.partnershipId.toString())) {
      throw err('Job is not available through your institution partnerships', 403)
    }
    if (!job.partnershipId && !partnerCompanyIds.has(job.companyId.toString())) {
      throw err('Job company is not an active institution partner', 403)
    }
  }

  if (internship) {
    if (internship.status !== 'open') throw err('Internship is not open for applications', 400)
    if (internship.partnershipId && !partnerIds.has(internship.partnershipId.toString())) {
      throw err('Internship is not available through your institution partnerships', 403)
    }
    if (!internship.partnershipId && !partnerCompanyIds.has(internship.companyId.toString())) {
      throw err('Internship company is not an active institution partner', 403)
    }
  }
}

async function getStats(institutionId) {
  const iid = oid(institutionId)
  const partnerships = await getActivePartnershipIds(institutionId)
  const partnershipIds = partnerships.map((p) => p._id)
  const companyIds = partnerships.map((p) => p.companyId)

  const [
    companies,
    opportunities,
    applications,
    interviews,
    offers,
    placed,
  ] = await Promise.all([
    Company.countDocuments({ _id: { $in: companyIds } }),
    CampusOpportunity.countDocuments({ institutionId: iid, status: { $in: ['open', 'ongoing'] } }),
    RecruitmentApplication.countDocuments({ institutionId: iid }),
    RecruitmentInterview.countDocuments({ companyId: { $in: companyIds } }),
    RecruitmentOffer.countDocuments({ companyId: { $in: companyIds } }),
    RecruitmentApplication.countDocuments({ institutionId: iid, stage: { $in: ['hired', 'offer_accepted'] } }),
  ])

  const jobs = partnershipIds.length
    ? await RecruitmentJob.countDocuments({ partnershipId: { $in: partnershipIds }, status: 'open' })
    : 0
  const internships = partnershipIds.length
    ? await RecruitmentInternship.countDocuments({ partnershipId: { $in: partnershipIds }, status: 'open' })
    : 0

  return {
    companies,
    drives: await CampusOpportunity.countDocuments({ institutionId: iid, opportunityType: 'campus_drive' }),
    internships: internships + (await CampusOpportunity.countDocuments({ institutionId: iid, opportunityType: 'internship' })),
    jobs: jobs + (await CampusOpportunity.countDocuments({ institutionId: iid, opportunityType: 'full_time' })),
    applications,
    interviews,
    offers,
    placed,
    activePartnerships: partnerships.length,
  }
}

async function listCompanies(institutionId, filters = {}) {
  const partnerships = await getActivePartnershipIds(institutionId)
  let companyIds = partnerships.map((p) => p.companyId)
  if (filters.industry) {
    const matched = await Company.find({
      _id: { $in: companyIds },
      industry: new RegExp(sanitizeText(filters.industry, 100), 'i'),
    }).select('_id')
    companyIds = matched.map((c) => c._id)
  }
  const companies = await Company.find({ _id: { $in: companyIds } }).lean()
  const partnershipMap = Object.fromEntries(partnerships.map((p) => [p.companyId.toString(), p]))
  return companies.map((c) => serializeCompany(c, partnershipMap[c._id.toString()]))
}

async function listOpportunities(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const query = { institutionId: iid }
  if (filters.opportunityType) query.opportunityType = filters.opportunityType
  if (filters.status) query.status = filters.status
  if (filters.companyId) query.companyId = oid(filters.companyId)
  if (filters.q) {
    query.$text = { $search: sanitizeText(filters.q, 200) }
  }

  const [campus, partnerships] = await Promise.all([
    CampusOpportunity.find(query).sort({ deadline: 1 }).lean(),
    getActivePartnershipIds(institutionId),
  ])

  const partnershipIds = partnerships.map((p) => p._id)
  const companyMap = Object.fromEntries(
    (await Company.find({ _id: { $in: partnerships.map((p) => p.companyId) } }).lean()).map((c) => [
      c._id.toString(),
      c,
    ]),
  )

  let linked = []
  if (!filters.opportunityType || filters.opportunityType === 'full_time') {
    const jobs = partnershipIds.length
      ? await RecruitmentJob.find({ partnershipId: { $in: partnershipIds }, status: 'open' }).lean()
      : []
    linked = linked.concat(jobs.map((j) => serializeJobListing(j, companyMap[j.companyId.toString()])))
  }
  if (!filters.opportunityType || filters.opportunityType === 'internship') {
    const internships = partnershipIds.length
      ? await RecruitmentInternship.find({ partnershipId: { $in: partnershipIds }, status: 'open' }).lean()
      : []
    linked = linked.concat(
      internships.map((i) => serializeInternshipListing(i, companyMap[i.companyId.toString()])),
    )
  }

  const campusItems = campus.map((o) =>
    serializeOpportunity(o, o.companyId ? companyMap[o.companyId.toString()] : null),
  )
  const all = [...campusItems, ...linked]
  const total = all.length
  const start = (page - 1) * limit
  const items = all.slice(start, start + limit)

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function createOpportunity(institutionId, actorUserId, payload) {
  const title = sanitizeText(payload.title, 200)
  if (!title) throw err('title is required')
  if (!OPPORTUNITY_TYPES.includes(payload.opportunityType)) throw err('Invalid opportunity type')

  const doc = await CampusOpportunity.create({
    institutionId: oid(institutionId),
    companyId: payload.companyId ? oid(payload.companyId) : null,
    partnershipId: payload.partnershipId ? oid(payload.partnershipId) : null,
    opportunityType: payload.opportunityType,
    title,
    description: sanitizeText(payload.description),
    location: sanitizeText(payload.location, 200),
    workMode: payload.workMode || 'hybrid',
    salary: payload.salary ?? 0,
    stipend: payload.stipend ?? 0,
    employmentType: payload.employmentType || 'full-time',
    deadline: payload.deadline ? new Date(payload.deadline) : null,
    requiredSkills: payload.requiredSkills || [],
    eligibilityRules: payload.eligibilityRules || {},
    selectionProcess: payload.selectionProcess || [],
    documentsRequired: payload.documentsRequired || [],
    venue: sanitizeText(payload.venue, 200),
    onlinePlatform: sanitizeText(payload.onlinePlatform, 200),
    driveDate: payload.driveDate ? new Date(payload.driveDate) : null,
    status: payload.status || (payload.opportunityType === 'campus_drive' ? 'draft' : 'open'),
    openPositions: payload.openPositions ?? 1,
    expectedHiringCount: payload.expectedHiringCount ?? payload.openPositions ?? 1,
    workflowStages: payload.workflowStages || undefined,
    currentWorkflowStage: payload.currentWorkflowStage || 'registration_open',
    createdByUserId: actorUserId,
  })

  institutionCache.invalidateInstitution(String(institutionId))
  await recordAudit({
    institutionId: oid(institutionId),
    action: 'placement_opportunity_created',
    actorUserId,
    description: `Opportunity created: ${title}`,
    metadata: { opportunityType: payload.opportunityType },
  }).catch(() => {})

  return serializeOpportunity(doc)
}

async function updateOpportunity(institutionId, opportunityId, payload) {
  const doc = await CampusOpportunity.findOne({ _id: opportunityId, institutionId: oid(institutionId) })
  if (!doc) throw err('Opportunity not found', 404)
  const fields = [
    'title', 'description', 'location', 'workMode', 'salary', 'stipend', 'employmentType',
    'deadline', 'requiredSkills', 'eligibilityRules', 'selectionProcess', 'documentsRequired',
    'venue', 'onlinePlatform', 'driveDate', 'status', 'openPositions', 'expectedHiringCount',
    'companyId', 'partnershipId', 'workflowStages', 'currentWorkflowStage',
  ]
  for (const f of fields) {
    if (payload[f] !== undefined) doc[f] = payload[f]
  }
  await doc.save()
  institutionCache.invalidateInstitution(String(institutionId))
  return serializeOpportunity(doc)
}

async function listApplications(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit
  const query = { institutionId: iid }
  if (filters.stage) query.stage = filters.stage
  if (filters.department) query.department = filters.department
  if (filters.companyId) query.companyId = oid(filters.companyId)
  if (filters.opportunityType) query.opportunityType = filters.opportunityType
  if (filters.q) {
    const regex = new RegExp(sanitizeText(filters.q, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ roleTitle: regex }, { 'candidateSnapshot.name': regex }]
  }

  const [docs, total] = await Promise.all([
    RecruitmentApplication.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(query),
  ])

  const studentIds = docs.map((d) => d.institutionStudentId).filter(Boolean)
  const students = studentIds.length
    ? await InstitutionStudent.find({ _id: { $in: studentIds } }).lean()
    : []
  const studentMap = Object.fromEntries(students.map((s) => [s._id.toString(), s]))

  return {
    items: docs.map((d) => serializeApplication(d, studentMap[d.institutionStudentId?.toString()])),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

function assertOpportunityOpen(record) {
  if (!record) return
  if (['closed', 'draft', 'archived', 'paused'].includes(record.status)) {
    throw err('This opportunity is not accepting applications', 400)
  }
  if (record.deadline && new Date() > new Date(record.deadline)) {
    throw err('Application deadline has passed', 400)
  }
}

async function submitApplication(institutionId, actorUserId, payload) {
  const student = await InstitutionStudent.findOne({
    _id: payload.institutionStudentId,
    institutionId: oid(institutionId),
  })
  if (!student) throw err('Student not found', 404)

  let opportunity = null
  let companyId = payload.companyId
  let roleTitle = payload.roleTitle || ''
  let opportunityType = 'campus_opportunity'
  let campusOpportunityId = null
  let jobId = null
  let internshipId = null
  let partnershipId = null

  if (payload.campusOpportunityId) {
    opportunity = await CampusOpportunity.findOne({
      _id: payload.campusOpportunityId,
      institutionId: oid(institutionId),
    })
    if (!opportunity) throw err('Opportunity not found', 404)
    assertOpportunityOpen(opportunity)
    const eligibility = evaluateEligibility(student, opportunity.eligibilityRules || {})
    if (!eligibility.eligible) {
      throw err(`Not eligible: ${eligibility.reasons.join('; ')}`, 400)
    }
    campusOpportunityId = opportunity._id
    companyId = opportunity.companyId || payload.companyId
    roleTitle = opportunity.title
    partnershipId = opportunity.partnershipId
    if (!companyId) throw err('Opportunity requires a linked company to apply', 400)
  } else if (payload.jobId) {
    const job = await RecruitmentJob.findById(payload.jobId)
    if (!job) throw err('Job not found', 404)
    assertOpportunityOpen(job)
    await assertInstitutionRecruitmentAccess(institutionId, { job })
    const eligibility = evaluateEligibility(student, jobToEligibilityRules(job))
    if (!eligibility.eligible) {
      throw err(`Not eligible: ${eligibility.reasons.join('; ')}`, 400)
    }
    jobId = job._id
    companyId = job.companyId
    roleTitle = job.title
    opportunityType = 'job'
    partnershipId = job.partnershipId
  } else if (payload.internshipId) {
    const internship = await RecruitmentInternship.findById(payload.internshipId)
    if (!internship) throw err('Internship not found', 404)
    assertOpportunityOpen(internship)
    await assertInstitutionRecruitmentAccess(institutionId, { internship })
    const eligibility = evaluateEligibility(student, jobToEligibilityRules(internship))
    if (!eligibility.eligible) {
      throw err(`Not eligible: ${eligibility.reasons.join('; ')}`, 400)
    }
    internshipId = internship._id
    companyId = internship.companyId
    roleTitle = internship.title
    opportunityType = 'internship'
    partnershipId = internship.partnershipId
  } else {
    throw err('campusOpportunityId, jobId, or internshipId required')
  }

  const existing = await RecruitmentApplication.findOne({
    institutionId: oid(institutionId),
    institutionStudentId: student._id,
    campusOpportunityId: campusOpportunityId || undefined,
    jobId: jobId || undefined,
    internshipId: internshipId || undefined,
    stage: { $nin: ['rejected', 'withdrawn'] },
  })
  if (existing) throw err('Duplicate application — student already applied', 409)

  const snapshot = buildStudentSnapshot(student)
  const app = await RecruitmentApplication.create({
    companyId: oid(companyId),
    candidateUserId: student.linkedUserId || null,
    candidateSnapshot: snapshot,
    institutionStudentId: student._id,
    institutionId: oid(institutionId),
    institutionName: '',
    partnershipId,
    opportunityType,
    campusOpportunityId,
    jobId,
    internshipId,
    roleTitle,
    department: student.department,
    graduationYear: student.expectedGraduation || student.admissionYear || '',
    cgpa: student.cgpa,
    skillsSummary: (student.sharedSkills || []).slice(0, 10).join(', '),
    resumeUrl: payload.resumeUrl || '',
    resumeFileName: payload.resumeFileName || '',
    resumeUploadedAt: payload.resumeUrl ? new Date() : null,
    applicationAnswers: payload.applicationAnswers || [],
    createdByUserId: actorUserId,
    tags: ['Campus Candidate'],
  })

  if (student.placement?.lifecycleStatus === 'READY') {
    student.placement.lifecycleStatus = 'APPLYING'
    await student.save()
  }
  await recordStudentPlacementStatus(student._id, 'applied', actorUserId).catch(() => {})

  institutionCache.invalidateInstitution(String(institutionId))
  await recordAudit({
    institutionId: oid(institutionId),
    studentId: student._id,
    action: 'placement_status_changed',
    actorUserId,
    description: `Application submitted: ${roleTitle}`,
    metadata: { applicationId: app._id.toString() },
  }).catch(() => {})

  return serializeApplication(app, student)
}

async function reviewApplication(institutionId, applicationId, actorUserId, actorName, payload) {
  const app = await RecruitmentApplication.findOne({
    _id: applicationId,
    institutionId: oid(institutionId),
  })
  if (!app) throw err('Application not found', 404)

  if (payload.stage) {
    await transitionStage(app.companyId, applicationId, payload.stage, actorUserId, {
      note: payload.reason,
      internalReason: payload.internalReason,
    })
  }

  if (payload.note) {
    await ApplicationNote.create({
      applicationId: app._id,
      companyId: app.companyId,
      authorUserId: actorUserId,
      authorName: sanitizeText(actorName, 100),
      content: sanitizeText(payload.note),
      type: payload.noteType || 'internal',
      isInternal: true,
    })
  }

  const updated = await RecruitmentApplication.findById(applicationId)
  const student = updated.institutionStudentId
    ? await InstitutionStudent.findById(updated.institutionStudentId).lean()
    : null
  return serializeApplication(updated, student)
}

async function withdrawApplication(institutionId, applicationId, actorUserId) {
  const app = await RecruitmentApplication.findOne({
    _id: applicationId,
    institutionId: oid(institutionId),
  })
  if (!app) throw err('Application not found', 404)
  if (app.stage === 'withdrawn') throw err('Already withdrawn')

  const opp = app.campusOpportunityId
    ? await CampusOpportunity.findById(app.campusOpportunityId)
    : null
  if (opp?.deadline && new Date() > opp.deadline) {
    throw err('Withdrawal deadline has passed', 400)
  }

  await transitionStage(app.companyId, applicationId, 'withdrawn', actorUserId, {
    withdrawnBy: 'recruiter',
  })
  return { success: true }
}

async function getEligibility(institutionId, opportunityId, studentId, source = 'campus') {
  const student = await InstitutionStudent.findOne({
    _id: studentId,
    institutionId: oid(institutionId),
  })
  if (!student) throw err('Student not found', 404)

  let rules = {}
  let opportunityRef = opportunityId

  if (source === 'campus' || !source) {
    const opp = await CampusOpportunity.findOne({
      _id: opportunityId,
      institutionId: oid(institutionId),
    })
    if (!opp) throw err('Opportunity not found', 404)
    rules = opp.eligibilityRules || {}
    opportunityRef = opp._id
  } else if (source === 'job') {
    const job = await RecruitmentJob.findById(opportunityId)
    if (!job) throw err('Job not found', 404)
    rules = jobToEligibilityRules(job)
    opportunityRef = job._id
  } else if (source === 'internship') {
    const internship = await RecruitmentInternship.findById(opportunityId)
    if (!internship) throw err('Internship not found', 404)
    rules = jobToEligibilityRules(internship)
    opportunityRef = internship._id
  }

  const application = await RecruitmentApplication.findOne({
    institutionId: oid(institutionId),
    institutionStudentId: student._id,
    campusOpportunityId: source === 'campus' ? oid(opportunityId) : undefined,
    jobId: source === 'job' ? oid(opportunityId) : undefined,
    internshipId: source === 'internship' ? oid(opportunityId) : undefined,
  })

  const result = evaluateEligibility(student, rules, application)
  const detailed = buildEligibilityChecklist(student, rules, application)
  return {
    studentId: student._id.toString(),
    studentName: student.fullName,
    opportunityId: opportunityRef?.toString() || opportunityId,
    ...result,
    ...detailed,
  }
}

async function listEligibilityForOpportunity(institutionId, opportunityId, filters = {}) {
  const opp = await CampusOpportunity.findOne({
    _id: opportunityId,
    institutionId: oid(institutionId),
  })
  if (!opp) throw err('Opportunity not found', 404)

  const query = buildListQuery(institutionId, filters)
  const students = await InstitutionStudent.find(query).limit(200).lean()
  const applications = await RecruitmentApplication.find({
    institutionId: oid(institutionId),
    campusOpportunityId: opp._id,
  }).lean()
  const appMap = Object.fromEntries(
    applications.map((a) => [a.institutionStudentId?.toString(), a]),
  )

  return students.map((s) => {
    const app = appMap[s._id.toString()]
    const result = evaluateEligibility(s, opp.eligibilityRules || {}, app)
    return {
      studentId: s._id.toString(),
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      department: s.department,
      cgpa: s.cgpa,
      ...result,
    }
  })
}

async function listInterviews(institutionId, filters = {}) {
  const partnerships = await getActivePartnershipIds(institutionId)
  const companyIds = partnerships.map((p) => p.companyId)
  const apps = await RecruitmentApplication.find({ institutionId: oid(institutionId) }).select('_id roleTitle institutionStudentId candidateSnapshot')
  const appIds = apps.map((a) => a._id)
  const interviews = await RecruitmentInterview.find({
    companyId: { $in: companyIds },
    applicationId: { $in: appIds },
  })
    .sort({ scheduledDate: 1 })
    .lean()

  return interviews.map((i) => {
    const app = apps.find((a) => a._id.toString() === i.applicationId.toString())
    return {
      id: i._id.toString(),
      studentName: app?.candidateSnapshot?.name || '—',
      companyId: i.companyId.toString(),
      role: i.roleTitle || app?.roleTitle || '',
      date: i.scheduledDate,
      time: i.scheduledTime,
      panel: (i.interviewers || []).join(', '),
      meetingLink: i.meetingLink,
      venue: i.venue,
      status: i.status,
      feedback: i.feedback?.recommendation || '',
    }
  })
}

async function listOffers(institutionId, filters = {}) {
  const partnerships = await getActivePartnershipIds(institutionId)
  const companyIds = partnerships.map((p) => p.companyId)
  const apps = await RecruitmentApplication.find({ institutionId: oid(institutionId) }).lean()
  const appMap = Object.fromEntries(apps.map((a) => [a._id.toString(), a]))
  const appIds = apps.map((a) => a._id)

  const offers = await RecruitmentOffer.find({
    companyId: { $in: companyIds },
    applicationId: { $in: appIds },
  })
    .sort({ createdAt: -1 })
    .lean()

  return offers.map((o) => {
    const app = appMap[o.applicationId.toString()]
    return {
      id: o._id.toString(),
      studentName: app?.candidateSnapshot?.name || '—',
      companyId: o.companyId.toString(),
      role: app?.roleTitle || '',
      packageAmount: o.salary || 0,
      location: o.location || '',
      joiningDate: o.joiningDate,
      status: o.status,
      department: app?.department || '',
    }
  })
}

async function listPools(institutionId) {
  const cohorts = await InstitutionCohort.find({ institutionId: oid(institutionId) }).lean()
  const presetPools = POOL_PRESETS.map((p) => ({
    id: p.key,
    name: p.label,
    type: 'dynamic',
    filterConfig: p.filterConfig,
    isPreset: true,
  }))
  const saved = cohorts.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    type: c.type,
    filterConfig: c.filterConfig,
    isPreset: false,
  }))
  return [...presetPools, ...saved]
}

async function getWorkspace(institutionId) {
  const [stats, companies, opportunities, applications, interviews, offers] = await Promise.all([
    getStats(institutionId),
    listCompanies(institutionId, {}),
    listOpportunities(institutionId, { limit: 100 }),
    listApplications(institutionId, { limit: 100 }),
    listInterviews(institutionId, {}),
    listOffers(institutionId, {}),
  ])

  const drives = opportunities.items.filter((o) => o.listType === 'drive' || o.opportunityType === 'campus_drive')
  const internships = opportunities.items.filter((o) => o.listType === 'internship')
  const jobs = opportunities.items.filter((o) => o.listType === 'job')

  return {
    stats,
    recruiters: companies,
    drives,
    internships,
    jobs,
    applications: applications.items,
    interviews,
    offers,
  }
}

module.exports = {
  getStats,
  listCompanies,
  listOpportunities,
  createOpportunity,
  updateOpportunity,
  listApplications,
  submitApplication,
  reviewApplication,
  withdrawApplication,
  getEligibility,
  listEligibilityForOpportunity,
  listInterviews,
  listOffers,
  listPools,
  getWorkspace,
  buildStudentSnapshot,
  assertInstitutionRecruitmentAccess,
  getActivePartnershipIds,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_STATUSES,
}
