const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const PartnershipActivity = require('../models/PartnershipActivity')
const PartnershipDocument = require('../models/PartnershipDocument')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const { getCollaborationDashboard, getPartnershipWorkspace } = require('./partnershipCollaborationService')
const { searchCompanies, searchInstitutions, getPartnershipById, assertPartnershipAccess } = require('./partnershipService')
const { getInstitutionSkillAnalytics } = require('./businessIntelligenceService')
const { PARTNERSHIP_FIT_LEVELS, PARTNERSHIP_HEALTH_STATES } = require('../constants/partnershipIntelligence')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function normalizeSkill(s) {
  return String(s || '').trim().toLowerCase()
}

function mapFitLevel(score) {
  if (score == null || Number.isNaN(score)) return 'INSUFFICIENT_DATA'
  if (score >= 75) return 'STRONG_FIT'
  if (score >= 55) return 'GOOD_FIT'
  if (score >= 35) return 'PARTIAL_FIT'
  if (score >= 15) return 'LOW_FIT'
  return 'INSUFFICIENT_DATA'
}

async function getExistingPartnerIds(orgId, role) {
  const filter =
    role === 'institution'
      ? { institutionId: oid(orgId), status: { $in: ['invited', 'pending', 'active', 'paused'] } }
      : { companyId: oid(orgId), status: { $in: ['invited', 'pending', 'active', 'paused'] } }
  const rows = await InstitutionCompanyPartnership.find(filter).select('institutionId companyId').lean()
  if (role === 'institution') return new Set(rows.map((r) => r.companyId.toString()))
  return new Set(rows.map((r) => r.institutionId.toString()))
}

async function scoreCompanyForInstitution(institution, company, skillContext) {
  const reasons = []
  const overlaps = []
  const missing = []
  let score = 0

  const supplySet = new Set((skillContext.supply || []).map((s) => normalizeSkill(s.skill)))
  const demandSet = new Set()

  const [jobs, internships] = await Promise.all([
    RecruitmentJob.find({ companyId: company._id, status: { $in: ['open', 'published'] } })
      .select('title requiredSkills')
      .limit(10)
      .lean(),
    RecruitmentInternship.find({ companyId: company._id, status: { $in: ['open', 'published'] } })
      .select('title requiredSkills')
      .limit(10)
      .lean(),
  ])

  for (const item of [...jobs, ...internships]) {
    for (const sk of item.requiredSkills || []) demandSet.add(normalizeSkill(sk))
  }

  if (jobs.length || internships.length) {
    score += 25
    reasons.push(`${jobs.length + internships.length} open role listing(s)`)
  }

  const deptText = (institution.departments || []).join(' ').toLowerCase()
  if (company.industry && deptText.includes(String(company.industry).toLowerCase().slice(0, 4))) {
    score += 20
    overlaps.push('Industry/domain alignment')
  } else if (company.industry) {
    reasons.push(`Industry: ${company.industry}`)
  }

  let skillOverlap = 0
  for (const sk of demandSet) {
    if (supplySet.has(sk)) {
      skillOverlap++
      overlaps.push(sk)
    }
  }
  if (skillOverlap) {
    score += Math.min(35, skillOverlap * 8)
    reasons.push(`${skillOverlap} skill overlap(s) with aggregate student evidence`)
  } else if (demandSet.size) {
    missing.push(...[...demandSet].slice(0, 3))
  }

  if (company.description || company.focusAreas) score += 10

  const collaborationTypes = []
  if (jobs.length || internships.length) collaborationTypes.push('PLACEMENT', 'INTERNSHIP')
  if (skillOverlap >= 2) collaborationTypes.push('INDUSTRY_PROJECT', 'TRAINING')

  return {
    fitLevel: mapFitLevel(score),
    score,
    institutionStrengths: [
      institution.departments?.length ? `${institution.departments.length} department(s)` : null,
      skillContext.supply?.length ? 'Aggregate student skill evidence available' : null,
    ].filter(Boolean),
    companyNeeds: reasons,
    overlappingAreas: overlaps.slice(0, 8),
    missingInformation: missing.length ? missing : ['Full company research interests may be unavailable'],
    potentialCollaborationTypes: [...new Set(collaborationTypes)],
    disclaimer: 'Potential collaboration fit based on available Dream Wave data — not a partnership guarantee.',
  }
}

async function scoreInstitutionForCompany(company, institution, skillContext) {
  const reasons = []
  const overlaps = []
  let score = 0

  if (institution.departments?.length) {
    score += 20
    reasons.push(`${institution.departments.length} academic department(s)`)
  }
  if (institution.programs?.length) {
    score += 15
    overlaps.push(`${institution.programs.length} program(s)`)
  }

  const researchCount = await InstitutionResearchProject.countDocuments({
    institutionId: institution._id,
    status: { $in: ['active', 'ongoing', 'published'] },
  })
  if (researchCount) {
    score += 20
    reasons.push(`${researchCount} research project(s)`)
  }

  if (skillContext.demand?.length && skillContext.supply?.length) {
    score += 25
    overlaps.push('Skill supply/demand data available')
  }

  return {
    fitLevel: mapFitLevel(score),
    score,
    institutionStrengths: overlaps,
    companyNeeds: reasons,
    overlappingAreas: overlaps,
    missingInformation: researchCount ? [] : ['Research collaboration data limited'],
    potentialCollaborationTypes: researchCount ? ['RESEARCH', 'INDUSTRY_PROJECT'] : ['PLACEMENT', 'INTERNSHIP'],
    disclaimer: 'Potential collaboration fit based on available Dream Wave data.',
  }
}

async function getRecommendedPartners(orgId, role, query = {}) {
  const limit = Math.min(parseInt(query.limit, 10) || 10, 20)
  const existing = await getExistingPartnerIds(orgId, role)

  if (role === 'institution') {
    const institution = await Institution.findById(orgId).lean()
    if (!institution) {
      const err = new Error('Institution not found')
      err.statusCode = 404
      throw err
    }
    const skills = await getInstitutionSkillAnalytics(orgId, {})
    const { items } = await searchCompanies({ q: query.q, industry: query.industry, limit: limit + existing.size })
    const matches = []
    for (const company of items) {
      if (existing.has(company._id.toString())) continue
      const match = await scoreCompanyForInstitution(institution, company, skills)
      matches.push({
        id: company._id.toString(),
        name: company.name,
        industry: company.industry,
        location: company.location || company.city,
        ...match,
      })
      if (matches.length >= limit) break
    }
    matches.sort((a, b) => (b.score || 0) - (a.score || 0))
    return { role, matches, total: matches.length, disclaimer: 'Recommendations are evidence-based, not partnership guarantees.' }
  }

  const company = await Company.findById(orgId).lean()
  if (!company) {
    const err = new Error('Company not found')
    err.statusCode = 404
    throw err
  }
  const { items } = await searchInstitutions({ q: query.q, limit: limit + existing.size })
  const matches = []
  for (const institution of items) {
    if (existing.has(institution._id.toString())) continue
    const skills = await getInstitutionSkillAnalytics(institution._id, {})
    const match = await scoreInstitutionForCompany(company, institution, skills)
    matches.push({
      id: institution._id.toString(),
      name: institution.name,
      type: institution.type,
      location: institution.city || institution.country,
      ...match,
    })
    if (matches.length >= limit) break
  }
  matches.sort((a, b) => (b.score || 0) - (a.score || 0))
  return { role, matches, total: matches.length, disclaimer: 'Recommendations are evidence-based, not partnership guarantees.' }
}

async function derivePartnershipHealth(partnership, recentActivityCount, expiringDocs) {
  if (!partnership) return { state: 'INSUFFICIENT_DATA', indicators: ['Partnership not found'] }
  const indicators = []
  if (partnership.status !== 'active') {
    return {
      state: 'INSUFFICIENT_DATA',
      indicators: [`Partnership status: ${partnership.status}`],
      explanation: 'Health metrics apply to active partnerships.',
    }
  }
  indicators.push('Status: active')
  if (expiringDocs > 0) {
    indicators.push(`${expiringDocs} document(s) expiring soon`)
    return { state: 'EXPIRING', indicators, explanation: 'Objective document expiry indicators.' }
  }
  if (recentActivityCount >= 3) {
    indicators.push(`${recentActivityCount} recent activities`)
    return { state: 'HEALTHY_ACTIVITY', indicators, explanation: 'Recent authorized partnership activity recorded.' }
  }
  if (recentActivityCount >= 1) {
    indicators.push(`${recentActivityCount} recent activity`)
    return { state: 'ACTIVE', indicators, explanation: 'Partnership is active with some recorded activity.' }
  }
  indicators.push('No recent activity in lookback window')
  return { state: 'LOW_ACTIVITY', indicators, explanation: 'Active partnership with limited recent activity.' }
}

async function getPartnershipBrief(partnershipId, actor) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })
  const workspace = await getPartnershipWorkspace(partnershipId, actor)

  const pid = oid(partnershipId)
  const [activityCount, expiringDocs] = await Promise.all([
    PartnershipActivity.countDocuments({
      partnershipId: pid,
      createdAt: { $gte: new Date(Date.now() - 90 * 86400000) },
    }),
    PartnershipDocument.countDocuments({
      partnershipId: pid,
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
    }),
  ])

  const health = await derivePartnershipHealth(partnership, activityCount, expiringDocs)
  const counterparty =
    actor.role === 'institution'
      ? partnership.companyId?.name || 'Company'
      : partnership.institutionId?.name || 'Institution'

  return {
    generatedAt: new Date().toISOString(),
    partner: counterparty,
    activeCollaboration: partnership.relationshipType,
    status: partnership.status,
    health,
    recentActivity: (workspace.recentActivity || []).slice(0, 5),
    opportunities: {
      jobs: workspace.shared?.jobs?.length || 0,
      internships: workspace.shared?.internships?.length || 0,
      drives: workspace.shared?.drives?.length || 0,
      events: workspace.shared?.events?.length || 0,
    },
    recommendedAction:
      health.state === 'EXPIRING'
        ? 'Review renewal and document expiry'
        : health.state === 'LOW_ACTIVITY'
          ? 'Consider linking opportunities or scheduling collaboration activity'
          : null,
    disclaimer: 'Brief uses authorized partnership data only.',
  }
}

async function getRenewalIntelligence(partnershipId, actor) {
  const brief = await getPartnershipBrief(partnershipId, actor)
  return {
    ...brief,
    renewalReview: {
      activityLevel: brief.health.state,
      openOpportunities: brief.opportunities.jobs + brief.opportunities.internships,
      recommendation: brief.health.state === 'EXPIRING' ? 'Review renewal' : 'Monitor activity',
      requiresHumanDecision: true,
    },
  }
}

function buildProposalDraft(body = {}, orgContext = {}) {
  return {
    state: 'DRAFT',
    requiresReview: true,
    requiresApprovalBeforeSend: true,
    objective: body.objective || '',
    collaborationType: body.collaborationType || 'INDUSTRY_PROJECT',
    expectedOutcomes: body.expectedOutcomes || [],
    skills: body.skills || [],
    domain: body.domain || orgContext.industry || orgContext.type || '',
    timeline: body.timeline || '',
    participants: {
      students: body.studentInvolvement !== false,
      faculty: body.facultyInvolvement !== false,
    },
    scope: body.scope || '',
    deliverables: body.deliverables || [],
    supportingInformation: body.supportingInformation || '',
    disclaimer: 'Draft only — not sent, not approved, not signed. Human review required.',
  }
}

async function getCollaborationHub(orgId, role) {
  const [dashboard, matches, analytics] = await Promise.all([
    getCollaborationDashboard(orgId, role),
    getRecommendedPartners(orgId, role, { limit: 8 }),
    getPartnershipAnalytics(orgId, role),
  ])

  const expiringAlerts = []
  if (role === 'institution') {
    const docs = await PartnershipDocument.find({
      institutionId: oid(orgId),
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
    })
      .limit(5)
      .lean()
    for (const d of docs) {
      expiringAlerts.push({
        id: `doc-${d._id}`,
        priority: 'HIGH',
        title: 'Partnership document expiring',
        detail: d.name,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    dashboard,
    potentialPartners: matches.matches,
    analytics,
    activityFeed: (dashboard.recentActivity || []).slice(0, 20).map((a) => ({
      id: a._id?.toString(),
      type: a.type,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
      partnershipId: a.partnershipId?.toString(),
    })),
    alerts: expiringAlerts,
    counts: {
      activePartnerships: dashboard.counts?.active || 0,
      potentialPartners: matches.total,
      pendingIncoming: dashboard.counts?.pendingIncoming || 0,
      pendingOutgoing: dashboard.counts?.pendingOutgoing || 0,
    },
    integrations: {
      memoryBoundary: 'Personal student memory is never exposed to partners.',
      workflow: 'External communication requires user confirmation.',
      knowledgeGraph: 'Institution ↔ Company ↔ Partnership ↔ Project ↔ Opportunity chain.',
    },
    disclaimer: 'Collaboration intelligence is advisory. Partnership decisions remain human responsibilities.',
  }
}

async function getPartnershipAnalytics(orgId, role, query = {}) {
  const filter =
    role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }

  const [byStatus, byType, activityCount, linkedCounts] = await Promise.all([
    InstitutionCompanyPartnership.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    InstitutionCompanyPartnership.aggregate([
      { $match: filter },
      { $group: { _id: '$relationshipType', count: { $sum: 1 } } },
    ]),
    PartnershipActivity.countDocuments(
      role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) },
    ),
    InstitutionCompanyPartnership.aggregate([
      { $match: { ...filter, status: 'active' } },
      {
        $group: {
          _id: null,
          jobs: { $sum: { $size: { $ifNull: ['$linkedJobIds', []] } } },
          internships: { $sum: { $size: { $ifNull: ['$linkedInternshipIds', []] } } },
          drives: { $sum: { $size: { $ifNull: ['$linkedDriveIds', []] } } },
          events: { $sum: { $size: { $ifNull: ['$linkedEventIds', []] } } },
        },
      },
    ]),
  ])

  const linked = linkedCounts[0] || { jobs: 0, internships: 0, drives: 0, events: 0 }

  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
    byType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
    totalActivity: activityCount,
    linkedResources: linked,
    engagement: {
      active: byStatus.find((r) => r._id === 'active')?.count || 0,
      note: 'Based on partnership records and linked resources in Dream Wave.',
    },
    hasData: byStatus.length > 0 || activityCount > 0,
  }
}

async function getCollaborationFeed(orgId, role, query = {}) {
  const limit = Math.min(parseInt(query.limit, 10) || 20, 50)
  const filter =
    role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }
  const items = await PartnershipActivity.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  return {
    items: items.map((a) => ({
      id: a._id.toString(),
      type: a.type,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
      partnershipId: a.partnershipId?.toString(),
    })),
    total: items.length,
  }
}

module.exports = {
  getRecommendedPartners,
  getCollaborationHub,
  getPartnershipBrief,
  getRenewalIntelligence,
  buildProposalDraft,
  getPartnershipAnalytics,
  getCollaborationFeed,
  derivePartnershipHealth,
  mapFitLevel,
}
