const mongoose = require('mongoose')
const InstitutionProgram = require('../models/InstitutionProgram')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const CampusOpportunity = require('../models/CampusOpportunity')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const { getCollaborationDashboard } = require('./partnershipCollaborationService')
const { getPartnershipStatsForInstitution, getPartnershipStatsForCompany } = require('./partnershipService')
const {
  getInstitutionSkillAnalytics,
  getCompanySkillAnalytics,
  getInstitutionDashboard,
  getCompanyDashboard,
  buildFilters,
  getInstitutionProjectAnalytics,
  getInstitutionLearningAnalytics,
} = require('./businessIntelligenceService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getRecruitmentAnalytics } = require('./recruitmentAnalyticsService')
const ProgramParticipant = require('../models/ProgramParticipant')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function normalizeSkill(s) {
  return String(s || '').trim().toLowerCase()
}

function resolveAlignmentLevel(overlapCount, gapCount, demandCount) {
  if (!demandCount) return 'NEEDS_ATTENTION'
  const ratio = overlapCount / Math.max(demandCount, 1)
  if (ratio >= 0.7) return 'STRONG_ALIGNMENT'
  if (ratio >= 0.45) return 'GOOD_ALIGNMENT'
  if (ratio >= 0.2) return 'PARTIAL_ALIGNMENT'
  return 'NEEDS_ATTENTION'
}

async function getProgramCounts(orgId, role) {
  const filter = role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }
  const [total, active, registrationOpen] = await Promise.all([
    InstitutionProgram.countDocuments(filter),
    InstitutionProgram.countDocuments({ ...filter, status: 'active' }),
    InstitutionProgram.countDocuments({ ...filter, status: 'registration_open' }),
  ])
  return { total, active, registrationOpen }
}

async function getUpcomingEvents(orgId, role, limit = 8) {
  const now = new Date()
  const filter = { startDate: { $gte: now }, status: { $in: ['published', 'open', 'active'] } }
  if (role === 'institution') {
    filter.institutionId = oid(orgId)
  } else {
    const partnerships = await InstitutionCompanyPartnership.find({
      companyId: oid(orgId),
      status: 'active',
    }).select('institutionId').lean()
    const instIds = partnerships.map((p) => p.institutionId)
    if (!instIds.length) return []
    filter.institutionId = { $in: instIds }
  }
  return CampusOpportunity.find(filter)
    .select('title opportunityType startDate endDate status institutionId companyId')
    .sort({ startDate: 1 })
    .limit(limit)
    .lean()
}

async function getOpenOpportunities(orgId, role, limit = 8) {
  if (role === 'company') {
    const cid = oid(orgId)
    const [jobs, internships] = await Promise.all([
      RecruitmentJob.find({ companyId: cid, status: { $in: ['open', 'published'] } })
        .select('title department location status deadline')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      RecruitmentInternship.find({ companyId: cid, status: { $in: ['open', 'published'] } })
        .select('title department location status deadline')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
    ])
    return { jobs, internships }
  }

  const partnerships = await InstitutionCompanyPartnership.find({
    institutionId: oid(orgId),
    status: 'active',
  }).lean()
  const companyIds = partnerships.map((p) => p.companyId)
  if (!companyIds.length) return { jobs: [], internships: [], drives: [] }

  const [jobs, internships, drives] = await Promise.all([
    RecruitmentJob.find({ companyId: { $in: companyIds }, status: { $in: ['open', 'published'] } })
      .select('title companyId status deadline')
      .limit(limit)
      .lean(),
    RecruitmentInternship.find({ companyId: { $in: companyIds }, status: { $in: ['open', 'published'] } })
      .select('title companyId status deadline')
      .limit(limit)
      .lean(),
    CampusOpportunity.find({
      institutionId: oid(orgId),
      opportunityType: { $in: ['campus_drive', 'training', 'hackathon'] },
      status: { $in: ['open', 'published', 'active'] },
    })
      .select('title opportunityType status deadline')
      .limit(limit)
      .lean(),
  ])
  return { jobs, internships, drives }
}

async function getEcosystemOverview(orgId, role, query = {}) {
  const filters = buildFilters(query)
  const [partnerships, programs, events, opportunities, placement, recruitment] = await Promise.all([
    getCollaborationDashboard(orgId, role),
    getProgramCounts(orgId, role),
    getUpcomingEvents(orgId, role),
    getOpenOpportunities(orgId, role),
    role === 'institution' ? getPlacementAnalytics(orgId, filters) : Promise.resolve(null),
    role === 'company' ? getRecruitmentAnalytics(orgId, filters) : Promise.resolve(null),
  ])

  return {
    generatedAt: new Date().toISOString(),
    scope: role,
    overview: {
      activePartnerships: partnerships.counts?.active || 0,
      pendingPartnershipRequests:
        (partnerships.counts?.pendingIncoming || 0) + (partnerships.counts?.pendingOutgoing || 0),
      activePrograms: programs.active,
      programsWithRegistrationOpen: programs.registrationOpen,
      upcomingEvents: events.length,
      openJobs: opportunities.jobs?.length || 0,
      openInternships: opportunities.internships?.length || 0,
      applicationsSubmitted: placement?.applicationsSubmitted ?? recruitment?.totalApplications ?? 0,
      studentsPlaced: placement?.studentsPlaced ?? recruitment?.candidatePipelineDistribution?.hired ?? 0,
    },
    partnerships: {
      active: partnerships.activePartners?.slice(0, 10) || [],
      counts: partnerships.counts,
    },
    programs,
    upcomingEvents: events,
    opportunities,
    placement: placement
      ? {
          hasData: placement.hasData,
          applicationsSubmitted: placement.applicationsSubmitted,
          studentsPlaced: placement.studentsPlaced,
          activeOpportunities: placement.activeOpportunities,
        }
      : null,
    recruitment: recruitment
      ? {
          hasData: recruitment.hasData,
          totalApplications: recruitment.totalApplications,
          activeRecruitments: recruitment.activeRecruitments,
        }
      : null,
  }
}

async function getPartnershipIntelligence(orgId, role) {
  const dashboard = await getCollaborationDashboard(orgId, role)
  const stats =
    role === 'institution'
      ? await getPartnershipStatsForInstitution(orgId)
      : await getPartnershipStatsForCompany(orgId)

  return {
    stats,
    dashboard,
    sharedPrograms: await InstitutionProgram.countDocuments({
      ...(role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }),
      partnershipId: { $ne: null },
      status: { $in: ['active', 'registration_open', 'planned'] },
    }),
  }
}

async function getProgramIntelligence(orgId, role, query = {}) {
  const filter = role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }
  if (query.status && query.status !== 'all') filter.status = query.status

  const programs = await InstitutionProgram.find(filter)
    .select('title programType status skills objectives partnershipId startDate endDate capacity linkedEntities')
    .sort({ updatedAt: -1 })
    .limit(25)
    .lean()

  const programIds = programs.map((p) => p._id)
  const participantCounts = programIds.length
    ? await ProgramParticipant.aggregate([
        { $match: { programId: { $in: programIds } } },
        { $group: { _id: '$programId', total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ['$status', ['approved', 'active']] }, 1, 0] } } } },
      ])
    : []

  const countMap = Object.fromEntries(participantCounts.map((c) => [c._id.toString(), c]))

  return {
    programs: programs.map((p) => ({
      ...p,
      id: p._id.toString(),
      participants: countMap[p._id.toString()] || { total: 0, active: 0 },
      linkedEntityCount: (p.linkedEntities || []).length,
    })),
    totals: {
      count: programs.length,
      active: programs.filter((p) => p.status === 'active').length,
      withPartnership: programs.filter((p) => p.partnershipId).length,
    },
  }
}

async function getSkillAlignment(orgId, role, query = {}) {
  const filters = buildFilters(query)
  const skills =
    role === 'institution'
      ? await getInstitutionSkillAnalytics(orgId, filters)
      : await getCompanySkillAnalytics(orgId, filters)

  const programs = await InstitutionProgram.find({
    ...(role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }),
    status: { $in: ['active', 'registration_open', 'planned'] },
  })
    .select('title skills programType')
    .lean()

  const programSkills = new Set()
  for (const p of programs) {
    for (const s of p.skills || []) programSkills.add(normalizeSkill(s))
  }

  const demandSkills = (skills.demand || []).map((d) => d.skill)
  const overlapWithPrograms = demandSkills.filter((s) => programSkills.has(s))
  const programGaps = demandSkills.filter((s) => !programSkills.has(s)).slice(0, 10)

  const alignmentLevel = resolveAlignmentLevel(
    (skills.overlap || overlapWithPrograms).length,
    (skills.gaps || programGaps).length,
    demandSkills.length,
  )

  return {
    alignmentLevel,
    skills,
    programAlignment: {
      programCount: programs.length,
      programSkills: [...programSkills].slice(0, 20),
      overlapWithIndustryDemand: overlapWithPrograms.slice(0, 15),
      potentialCurriculumGaps: programGaps,
    },
    explanation: {
      what: `Industry skill alignment: ${alignmentLevel.replace(/_/g, ' ')}`,
      why: skills.gaps?.length
        ? `${skills.gaps.length} in-demand skill(s) have limited aggregate student evidence.`
        : 'Demand and supply skill evidence show reasonable overlap.',
      source: role === 'institution' ? 'Partner jobs/internships + student aggregate skills' : 'Job listings + application snapshots',
    },
  }
}

async function getEcosystemRecommendations(orgId, role) {
  const recommendations = []
  const [overview, alignment, programIntel, partnershipIntel] = await Promise.all([
    getEcosystemOverview(orgId, role),
    getSkillAlignment(orgId, role),
    getProgramIntelligence(orgId, role),
    getPartnershipIntelligence(orgId, role),
  ])

  if (overview.overview.pendingPartnershipRequests > 0) {
    recommendations.push({
      id: 'pending-partnerships',
      type: 'partnership',
      title: 'Review pending partnership requests',
      what: `${overview.overview.pendingPartnershipRequests} partnership request(s) awaiting action`,
      why: 'Pending requests block new cross-organization collaboration.',
      source: 'Partnership Collaboration Dashboard',
      priority: 'high',
      href: role === 'institution' ? '/institution/industry-network' : '/company/institution-network',
    })
  }

  if (alignment.alignmentLevel === 'NEEDS_ATTENTION' && alignment.skills.gaps?.length) {
    const topGap = alignment.skills.gaps[0]
    recommendations.push({
      id: 'skill-gap',
      type: 'skill_program',
      title: `Address skill gap: ${topGap?.skill || 'in-demand skills'}`,
      what: 'Industry partners require skills with limited aggregate student evidence',
      why: alignment.explanation.why,
      source: alignment.explanation.source,
      priority: 'medium',
      href: role === 'institution' ? '/institution/programs' : '/company/programs',
    })
  }

  if (programIntel.totals.count === 0 && overview.overview.activePartnerships > 0) {
    recommendations.push({
      id: 'create-program',
      type: 'program',
      title: 'Create an industry program with active partners',
      what: 'Active partnerships exist but no operational programs are configured',
      why: 'Programs structure events, recruitment, and learning into measurable outcomes.',
      source: 'Program Intelligence + Partnership Intelligence',
      priority: 'medium',
      href: role === 'institution' ? '/institution/programs' : '/company/programs',
    })
  }

  for (const event of (overview.upcomingEvents || []).slice(0, 3)) {
    recommendations.push({
      id: `event-${event._id}`,
      type: 'event',
      title: event.title,
      what: `Upcoming ${event.opportunityType || 'event'}`,
      why: 'Scheduled activity within your ecosystem scope.',
      source: 'Campus Opportunity / Event records',
      priority: 'low',
      href: `/events/campus/${event._id}`,
    })
  }

  if (role === 'institution' && partnershipIntel.stats?.pendingInvitations > 0) {
    recommendations.push({
      id: 'follow-up-partners',
      type: 'partnership',
      title: 'Follow up on partnership invitations',
      what: `${partnershipIntel.stats.pendingInvitations} pending invitation(s) from companies`,
      why: 'Unanswered invitations delay industry collaboration.',
      source: 'Partnership Stats',
      priority: 'medium',
      href: '/institution/industry-network',
    })
  }

  return { recommendations: recommendations.slice(0, 12), generatedAt: new Date().toISOString() }
}

async function searchEcosystem(orgId, role, { q = '', type = 'all', limit = 20 } = {}) {
  const term = String(q || '').trim()
  if (!term) return { results: [] }

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const results = []
  const max = Math.min(parseInt(limit, 10) || 20, 30)

  const orgFilter = role === 'institution' ? { institutionId: oid(orgId) } : { companyId: oid(orgId) }

  const [programs, partnerships] = await Promise.all([
    InstitutionProgram.find({ ...orgFilter, $or: [{ title: regex }, { description: regex }] })
      .select('title programType status')
      .limit(max)
      .lean(),
    InstitutionCompanyPartnership.find({
      ...orgFilter,
      status: 'active',
    })
      .populate(role === 'institution' ? 'companyId' : 'institutionId', 'name industry type')
      .limit(max)
      .lean(),
  ])

  for (const p of programs) {
    results.push({
      kind: 'program',
      id: p._id.toString(),
      title: p.title,
      subtitle: p.programType,
      status: p.status,
      href: role === 'institution' ? `/institution/programs/${p._id}` : `/company/programs/${p._id}`,
    })
  }

  for (const p of partnerships) {
    const counterparty = role === 'institution' ? p.companyId : p.institutionId
    results.push({
      kind: 'partnership',
      id: p._id.toString(),
      title: counterparty?.name || 'Partner',
      subtitle: p.relationshipType,
      status: p.status,
      href:
        role === 'institution'
          ? `/institution/partnerships/${p._id}`
          : `/company/partnerships/${p._id}`,
    })
  }

  if (type === 'all' || type === 'opportunity') {
    if (role === 'company') {
      const jobs = await RecruitmentJob.find({
        companyId: oid(orgId),
        title: regex,
        status: { $in: ['open', 'published'] },
      })
        .select('title status')
        .limit(5)
        .lean()
      for (const j of jobs) {
        results.push({
          kind: 'job',
          id: j._id.toString(),
          title: j.title,
          status: j.status,
          href: '/company/recruitment/jobs',
        })
      }
    }
  }

  return { results: results.slice(0, max), query: term }
}

async function buildEcosystemAiContext(orgId, role, query = {}) {
  const [overview, alignment, programs, partnerships, recommendations] = await Promise.all([
    getEcosystemOverview(orgId, role, query),
    getSkillAlignment(orgId, role, query),
    getProgramIntelligence(orgId, role),
    getPartnershipIntelligence(orgId, role),
    getEcosystemRecommendations(orgId, role),
  ])

  let projects = null
  let learning = null
  if (role === 'institution') {
    ;[projects, learning] = await Promise.all([
      getInstitutionProjectAnalytics(orgId, buildFilters(query)),
      getInstitutionLearningAnalytics(orgId),
    ])
  }

  return {
    scope: role,
    overview,
    alignment,
    programs,
    partnerships,
    recommendations: recommendations.recommendations?.slice(0, 5),
    projects,
    learning,
  }
}

async function getStudentEcosystemSummary(userId) {
  const InstitutionStudent = require('../models/InstitutionStudent')
  const { listDiscoverablePrograms, listStudentPrograms } = require('./institutionProgramService')
  const { getStudentFeed } = require('./opportunityMatchingService')

  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student?.institutionId) {
    return {
      hasInstitutionLink: false,
      note: 'Link your institution student profile to see ecosystem recommendations.',
    }
  }

  const [programs, myPrograms, feed] = await Promise.all([
    listDiscoverablePrograms(userId, student.institutionId, {}),
    listStudentPrograms(userId),
    getStudentFeed(userId, { limit: 5 }).catch(() => ({ items: [], totals: { all: 0 } })),
  ])

  const eligiblePrograms = programs.filter((p) => p.eligibility?.eligible)
  const strongMatches = (feed.items || feed.strongMatches || []).slice(0, 5)

  return {
    hasInstitutionLink: true,
    institutionId: student.institutionId.toString(),
    discoverablePrograms: eligiblePrograms.length,
    enrolledPrograms: myPrograms.length,
    opportunityMatches: feed.totals?.all ?? strongMatches.length,
    recommendations: [
      ...eligiblePrograms.slice(0, 3).map((p) => ({
        type: 'program',
        title: p.title,
        what: p.programType,
        why: p.eligibility?.reasons?.[0] || 'Eligible based on your profile',
        source: 'Institution Program + Eligibility Engine',
        href: `/programs/${p.id || p._id}`,
      })),
      ...strongMatches.slice(0, 3).map((m) => ({
        type: 'opportunity',
        title: m.title,
        what: m.kind || m.type,
        why: m.match?.reasons?.[0]?.label || 'Matches your skills and goals',
        source: 'Opportunity Matching (V3 P7)',
        href: m.href || `/opportunities`,
      })),
    ].slice(0, 6),
  }
}

module.exports = {
  getEcosystemOverview,
  getPartnershipIntelligence,
  getProgramIntelligence,
  getSkillAlignment,
  getEcosystemRecommendations,
  searchEcosystem,
  buildEcosystemAiContext,
  getStudentEcosystemSummary,
}
