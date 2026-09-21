const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const CampusOpportunity = require('../models/CampusOpportunity')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const Company = require('../models/Company')
const { STAGE_ALIASES } = require('../constants/recruitment')
const {
  buildEligibilityChecklist,
  buildOpportunityRecommendation,
  jobToEligibilityRules,
} = require('./recruitmentIntelligenceService')
const {
  buildStudentSnapshot,
  assertInstitutionRecruitmentAccess,
  getActivePartnershipIds,
} = require('./institutionPlacementService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(value) {
  if (!value) return null
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
}

async function resolveStudentForUser(userId) {
  return InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' })
}

function assertOpportunityOpen(record) {
  if (!record) throw err('Opportunity not found', 404)
  const status = record.status
  if (['closed', 'draft', 'archived', 'paused'].includes(status)) {
    throw err('This opportunity is not accepting applications', 400)
  }
  if (record.deadline && new Date() > new Date(record.deadline)) {
    throw err('Application deadline has passed', 400)
  }
}

async function browseOpportunities(userId, filters = {}) {
  const student = await resolveStudentForUser(userId)
  if (!student) {
    return { items: [], total: 0, page: 1, limit: 20, pageCount: 0, hasInstitutionLink: false }
  }

  const institutionId = student.institutionId
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20))
  const now = new Date()

  const campusQuery = {
    institutionId,
    status: { $in: ['open', 'ongoing'] },
  }
  if (filters.opportunityType) campusQuery.opportunityType = filters.opportunityType

  const [campus, partnerships] = await Promise.all([
    CampusOpportunity.find(campusQuery).sort({ deadline: 1 }).lean(),
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
    linked = linked.concat(
      jobs.map((j) => ({
        id: j._id.toString(),
        sourceType: 'job',
        title: j.title,
        companyName: companyMap[j.companyId.toString()]?.name || '',
        location: j.location,
        opportunityType: 'full_time',
        requiredSkills: j.requiredSkills || [],
        deadline: j.deadline,
        eligibilityRules: jobToEligibilityRules(j),
        eligibilityText: j.eligibility || '',
        status: 'open',
      })),
    )
  }
  if (!filters.opportunityType || filters.opportunityType === 'internship') {
    const internships = partnershipIds.length
      ? await RecruitmentInternship.find({ partnershipId: { $in: partnershipIds }, status: 'open' }).lean()
      : []
    linked = linked.concat(
      internships.map((i) => ({
        id: i._id.toString(),
        sourceType: 'internship',
        title: i.title,
        companyName: companyMap[i.companyId.toString()]?.name || '',
        location: i.location,
        opportunityType: 'internship',
        requiredSkills: i.requiredSkills || [],
        deadline: i.deadline,
        eligibilityRules: jobToEligibilityRules(i),
        eligibilityText: i.eligibility || '',
        status: 'open',
      })),
    )
  }

  const campusItems = campus
    .filter((o) => !o.deadline || new Date(o.deadline) >= now)
    .map((o) => ({
      id: o._id.toString(),
      sourceType: 'campus_opportunity',
      title: o.title,
      companyName: o.companyId ? companyMap[o.companyId.toString()]?.name || '' : '',
      location: o.location,
      opportunityType: o.opportunityType,
      requiredSkills: o.requiredSkills || [],
      deadline: o.deadline,
      eligibilityRules: o.eligibilityRules || {},
      eligibilityText: '',
      status: o.status,
    }))

  const all = [...campusItems, ...linked]
    .map((item) => {
      const recommendation = buildOpportunityRecommendation(item, student)
      return { ...item, recommendation }
    })
    .filter((item) => {
      if (filters.q) {
        const q = String(filters.q).toLowerCase()
        return item.title.toLowerCase().includes(q) || item.companyName.toLowerCase().includes(q)
      }
      return true
    })

  if (filters.recommendedOnly === 'true') {
    const filtered = all.filter((item) => item.recommendation.recommendation !== 'not_recommended')
    const total = filtered.length
    const start = (page - 1) * limit
    return {
      items: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit) || 0,
      hasInstitutionLink: true,
    }
  }

  const total = all.length
  const start = (page - 1) * limit
  return {
    items: all.slice(start, start + limit),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 0,
    hasInstitutionLink: true,
  }
}

async function resolveOpportunityRecord(institutionId, sourceType, opportunityId) {
  if (sourceType === 'campus_opportunity') {
    const opp = await CampusOpportunity.findOne({ _id: opportunityId, institutionId: oid(institutionId) })
    assertOpportunityOpen(opp)
    return { type: 'campus_opportunity', record: opp, rules: opp.eligibilityRules || {} }
  }
  if (sourceType === 'job') {
    const job = await RecruitmentJob.findById(opportunityId)
    if (!job) throw err('Job not found', 404)
    assertOpportunityOpen(job)
    await assertInstitutionRecruitmentAccess(institutionId, { job })
    return { type: 'job', record: job, rules: jobToEligibilityRules(job) }
  }
  if (sourceType === 'internship') {
    const internship = await RecruitmentInternship.findById(opportunityId)
    if (!internship) throw err('Internship not found', 404)
    assertOpportunityOpen(internship)
    await assertInstitutionRecruitmentAccess(institutionId, { internship })
    return { type: 'internship', record: internship, rules: jobToEligibilityRules(internship) }
  }
  throw err('Invalid opportunity type', 400)
}

async function getOpportunityEligibility(userId, sourceType, opportunityId) {
  const student = await resolveStudentForUser(userId)
  if (!student) throw err('You must be linked to an institution to check eligibility', 403)

  const { record, rules } = await resolveOpportunityRecord(student.institutionId, sourceType, opportunityId)
  const application = await findExistingApplication(student, sourceType, record._id)
  return buildEligibilityChecklist(student, rules, application)
}

async function findExistingApplication(student, sourceType, opportunityId) {
  const query = {
    institutionId: student.institutionId,
    institutionStudentId: student._id,
    stage: { $nin: ['rejected', 'withdrawn'] },
  }
  if (sourceType === 'campus_opportunity') query.campusOpportunityId = opportunityId
  if (sourceType === 'job') query.jobId = opportunityId
  if (sourceType === 'internship') query.internshipId = opportunityId
  return RecruitmentApplication.findOne(query)
}

async function applyToOpportunity(userId, sourceType, opportunityId, payload = {}) {
  const student = await resolveStudentForUser(userId)
  if (!student) throw err('You must be linked to an institution to apply', 403)

  const institutionId = student.institutionId
  const { type, record, rules } = await resolveOpportunityRecord(institutionId, sourceType, opportunityId)

  const existing = await findExistingApplication(student, sourceType, record._id)
  if (existing) throw err('You have already applied to this opportunity', 409)

  const eligibility = buildEligibilityChecklist(student, rules)
  if (eligibility.result === 'NOT_ELIGIBLE') {
    throw err(`Not eligible: ${eligibility.summary?.join?.('; ') || eligibility.reasons?.join?.('; ') || 'Requirements not met'}`, 400)
  }

  let companyId = record.companyId
  let partnershipId = record.partnershipId || null
  let campusOpportunityId = null
  let jobId = null
  let internshipId = null
  let opportunityType = type

  if (type === 'campus_opportunity') {
    campusOpportunityId = record._id
    if (!companyId) throw err('Opportunity requires a linked company to apply', 400)
  } else if (type === 'job') {
    jobId = record._id
    companyId = record.companyId
    opportunityType = 'job'
  } else if (type === 'internship') {
    internshipId = record._id
    companyId = record.companyId
    opportunityType = 'internship'
  }

  const snapshot = buildStudentSnapshot(student)
  const app = await RecruitmentApplication.create({
    companyId: oid(companyId),
    candidateUserId: userId,
    candidateSnapshot: snapshot,
    institutionStudentId: student._id,
    institutionId: oid(institutionId),
    partnershipId,
    opportunityType,
    campusOpportunityId,
    jobId,
    internshipId,
    roleTitle: record.title,
    department: student.department,
    graduationYear: student.expectedGraduation || student.admissionYear || '',
    cgpa: student.cgpa,
    skillsSummary: (student.sharedSkills || []).slice(0, 10).join(', '),
    resumeUrl: payload.resumeUrl || '',
    resumeFileName: payload.resumeFileName || '',
    resumeUploadedAt: payload.resumeUrl ? new Date() : null,
    applicationAnswers: payload.applicationAnswers || [],
    createdByUserId: userId,
    tags: ['Campus Candidate'],
  })

  if (student.placement?.lifecycleStatus === 'READY') {
    student.placement.lifecycleStatus = 'APPLYING'
    await student.save()
  }

  return serializeStudentApplication(app)
}

function serializeStudentApplication(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: o._id.toString(),
    roleTitle: o.roleTitle,
    companyId: o.companyId?.toString(),
    opportunityType: o.opportunityType,
    stage: STAGE_ALIASES[o.stage] || o.stage,
    canonicalStage: o.stage,
    appliedAt: o.createdAt,
    updatedAt: o.updatedAt,
    campusOpportunityId: o.campusOpportunityId?.toString() || null,
    jobId: o.jobId?.toString() || null,
    internshipId: o.internshipId?.toString() || null,
  }
}

async function listMyApplications(userId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit

  const query = { candidateUserId: oid(userId) }
  if (filters.stage) query.stage = filters.stage

  const [items, total] = await Promise.all([
    RecruitmentApplication.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(query),
  ])

  return {
    applications: items.map(serializeStudentApplication),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 0,
  }
}

async function getMyApplication(userId, applicationId) {
  const app = await RecruitmentApplication.findOne({ _id: applicationId, candidateUserId: oid(userId) }).lean()
  if (!app) throw err('Application not found', 404)

  const [interviews, offer] = await Promise.all([
    RecruitmentInterview.find({ applicationId: app._id }).sort({ scheduledAt: 1 }).lean(),
    RecruitmentOffer.findOne({ applicationId: app._id }).lean(),
  ])

  return {
    application: serializeStudentApplication(app),
    interviews: interviews.map((i) => ({
      id: i._id.toString(),
      round: i.round,
      scheduledAt: i.scheduledAt,
      status: i.status,
      mode: i.mode,
    })),
    offer: offer
      ? {
          id: offer._id.toString(),
          status: offer.status,
          roleTitle: offer.roleTitle,
          startDate: offer.startDate,
        }
      : null,
  }
}

async function withdrawMyApplication(userId, applicationId) {
  const app = await RecruitmentApplication.findOne({ _id: applicationId, candidateUserId: oid(userId) })
  if (!app) throw err('Application not found', 404)
  if (['hired', 'withdrawn', 'rejected'].includes(app.stage)) {
    throw err('Application cannot be withdrawn in its current state', 400)
  }
  app.stage = 'withdrawn'
  app.withdrawnAt = new Date()
  app.withdrawnBy = 'candidate'
  await app.save()
  return serializeStudentApplication(app)
}

async function getStudentCareerDashboard(userId) {
  const student = await resolveStudentForUser(userId)
  const applications = await RecruitmentApplication.find({ candidateUserId: oid(userId) }).lean()
  const browse = student ? await browseOpportunities(userId, { limit: 5, recommendedOnly: 'true' }) : { items: [], total: 0 }

  const byStage = {}
  for (const app of applications) {
    byStage[app.stage] = (byStage[app.stage] || 0) + 1
  }

  const applicationIds = applications.map((a) => a._id)
  const [interviews, offers] = await Promise.all([
    RecruitmentInterview.countDocuments({ applicationId: { $in: applicationIds }, scheduledAt: { $gte: new Date() } }),
    RecruitmentOffer.countDocuments({ applicationId: { $in: applicationIds }, status: { $in: ['released', 'pending_approval'] } }),
  ])

  return {
    hasInstitutionLink: Boolean(student),
    applications: applications.length,
    interviews,
    offers,
    recommendedOpportunities: browse.items,
    openOpportunities: browse.total,
    byStage,
  }
}

module.exports = {
  resolveStudentForUser,
  browseOpportunities,
  getOpportunityEligibility,
  applyToOpportunity,
  listMyApplications,
  getMyApplication,
  withdrawMyApplication,
  getStudentCareerDashboard,
}
