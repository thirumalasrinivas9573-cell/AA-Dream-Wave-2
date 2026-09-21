const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionProgram = require('../models/InstitutionProgram')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const ProgramParticipant = require('../models/ProgramParticipant')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const CampusOpportunity = require('../models/CampusOpportunity')
const { MIN_TREND_POINTS } = require('../constants/businessIntelligence')
const { ALIGNMENT_LEVELS, ENGAGEMENT_STATUSES } = require('../constants/programIntelligence')
const {
  getOverview: getInstitutionOverview,
  getProgramIntelligence: getAcademicProgramIntelligence,
  getOpportunitiesSummary,
} = require('./institutionIntelligenceService')
const {
  getEcosystemOverview,
  getProgramIntelligence: getIndustryProgramIntelligence,
  getSkillAlignment,
  getPartnershipIntelligence,
} = require('./ecosystemIntelligenceService')
const {
  getInstitutionSkillAnalytics,
  getCompanySkillAnalytics,
  getInstitutionDashboard,
  getCompanyDashboard,
  buildFilters,
  getInstitutionTrends,
  getCompanyTrends,
} = require('./businessIntelligenceService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getRecruitmentAnalytics } = require('./recruitmentAnalyticsService')
const { getRecommendedPartners } = require('./partnershipIntelligenceService')
const { collectSkillEvidence, EVIDENCE_LEVELS } = require('./recruitmentIntelligenceService')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function normalizeSkill(s) {
  return String(s || '').trim().toLowerCase()
}

function mapEvidenceLevel(level) {
  const map = {
    [EVIDENCE_LEVELS.VERIFIED]: 'VERIFIED',
    [EVIDENCE_LEVELS.CERTIFIED]: 'VERIFIED',
    [EVIDENCE_LEVELS.PROJECT]: 'PROJECT_EVIDENCED',
    [EVIDENCE_LEVELS.LEARNING]: 'CURRENTLY_LEARNING',
    [EVIDENCE_LEVELS.DECLARED]: 'DECLARED',
    [EVIDENCE_LEVELS.INFERRED]: 'INFERRED',
  }
  return map[level] || 'UNKNOWN'
}

function resolveAlignment(overlap, demand) {
  if (!demand.length) return 'INSUFFICIENT_DATA'
  const ratio = overlap.length / demand.length
  if (ratio >= 0.7) return 'ALIGNED'
  if (ratio >= 0.4) return 'PARTIALLY_ALIGNED'
  return 'GAP'
}

function deriveEngagement({ jobs, internships, events, partnerships, daysSinceActivity }) {
  const total = (jobs || 0) + (internships || 0) + (events || 0)
  if (total >= 3 || (partnerships || 0) >= 2) return 'ACTIVE'
  if (total >= 1 || (daysSinceActivity != null && daysSinceActivity <= 30)) return 'RECENT'
  if (total === 0 && partnerships === 0) return 'INSUFFICIENT_DATA'
  if (daysSinceActivity != null && daysSinceActivity <= 90) return 'LOW_ACTIVITY'
  return 'INACTIVE'
}

async function assertProgramAccess(orgId, role, programId) {
  const program = await InstitutionProgram.findById(programId).lean()
  if (!program) {
    const err = new Error('Program not found')
    err.statusCode = 404
    throw err
  }
  const ownerField = role === 'institution' ? 'institutionId' : 'companyId'
  if (program[ownerField]?.toString() !== orgId.toString()) {
    const err = new Error('Access denied')
    err.statusCode = 403
    throw err
  }
  return program
}

async function getInstitutionIntelligenceHub(institutionId, query = {}) {
  const filters = buildFilters(query)
  const institution = await Institution.findById(institutionId).lean()
  if (!institution) {
    const err = new Error('Institution not found')
    err.statusCode = 404
    throw err
  }

  const [overview, academic, industry, alignment, partnerships, placement, skills, opportunities] =
    await Promise.all([
      getInstitutionOverview(institutionId, filters),
      getAcademicProgramIntelligence(institutionId, filters),
      getIndustryProgramIntelligence(institutionId, 'institution', query),
      getSkillAlignment(institutionId, 'institution', query),
      getPartnershipIntelligence(institutionId, 'institution'),
      getPlacementAnalytics(institutionId, filters),
      getInstitutionSkillAnalytics(institutionId, filters),
      getOpportunitiesSummary(institutionId),
    ])

  const stats = {
    studentCount: overview.metrics?.totalStudents ?? null,
    programCount: institution.programs?.length ?? null,
    departmentCount: institution.departments?.length ?? null,
    activeCompanies: partnerships.stats?.activePartnerships ?? partnerships.dashboard?.counts?.active ?? null,
    openOpportunities: overview.metrics?.activeOpportunities ?? null,
    applications: placement.applicationsSubmitted ?? null,
    placementActivity: placement.studentsPlaced ?? null,
  }

  const activeAreas = []
  if ((placement.applicationsSubmitted || 0) > 0) activeAreas.push('Placement')
  if ((overview.metrics?.researchProjects || 0) > 0) activeAreas.push('Research')
  if (industry.totals?.withPartnership > 0) activeAreas.push('Industry Projects')

  const attention = []
  const closing = (opportunities.campusOpportunities?.items || []).filter((o) => {
    if (!o.deadline) return false
    const days = Math.ceil((new Date(o.deadline) - Date.now()) / (86400000))
    return days >= 0 && days <= 7
  }).length
  if (closing) attention.push(`${closing} opportunity deadline(s) approaching`)

  const skillGapNote =
    (skills.gaps || []).length > 0
      ? `${(skills.gaps[0].skill || skills.gaps[0])} appears less represented among available student evidence`
      : null

  return {
    generatedAt: new Date().toISOString(),
    role: 'institution',
    profile: {
      name: institution.name,
      type: institution.type || 'INSUFFICIENT_DATA',
      city: institution.city || null,
      description: institution.description || null,
      website: institution.website || null,
      departments: institution.departments || [],
      programs: institution.programs || [],
    },
    statistics: stats,
    intelligence: {
      activeAreas,
      attention,
      skillGap: skillGapNote,
      alignmentLevel: alignment.alignmentLevel,
    },
    departments: academic.departments || [],
    academicPrograms: academic.programs || [],
    industryPrograms: industry.programs || [],
    skills,
    alignment,
    partnerships,
    placement,
    opportunities,
    disclaimer: 'Institution intelligence uses authorized aggregate data only.',
  }
}

async function getCompanyIntelligenceHub(companyId, query = {}) {
  const filters = buildFilters(query)
  const company = await Company.findById(companyId).lean()
  if (!company) {
    const err = new Error('Company not found')
    err.statusCode = 404
    throw err
  }

  const [ecosystem, industry, alignment, partnerships, recruitment, skills, dashboard] =
    await Promise.all([
      getEcosystemOverview(companyId, 'company', query),
      getIndustryProgramIntelligence(companyId, 'company', query),
      getSkillAlignment(companyId, 'company', query),
      getPartnershipIntelligence(companyId, 'company'),
      getRecruitmentAnalytics(companyId, filters),
      getCompanySkillAnalytics(companyId, filters),
      getCompanyDashboard(companyId, filters),
    ])

  const [jobs, internships] = await Promise.all([
    RecruitmentJob.countDocuments({ companyId: oid(companyId), status: { $in: ['open', 'published'] } }),
    RecruitmentInternship.countDocuments({ companyId: oid(companyId), status: { $in: ['open', 'published'] } }),
  ])

  const engagement = deriveEngagement({
    jobs,
    internships,
    events: ecosystem.upcomingEvents?.length || 0,
    partnerships: partnerships.stats?.activePartnerships || 0,
  })

  return {
    generatedAt: new Date().toISOString(),
    role: 'company',
    profile: {
      name: company.name,
      industry: company.industry || 'INSUFFICIENT_DATA',
      description: company.description || null,
      website: company.website || null,
      city: company.city || null,
      technologyAreas: company.technologies || [],
    },
    statistics: {
      openJobs: jobs || null,
      openInternships: internships || null,
      applications: recruitment.totalApplications ?? null,
      activePartnerships: partnerships.stats?.activePartnerships ?? null,
      activePrograms: industry.totals?.active ?? null,
    },
    activity: {
      engagement,
      openOpportunities: jobs + internships,
      recruitmentActivity: recruitment.hasData ? recruitment.totalApplications : 'INSUFFICIENT_DATA',
      events: ecosystem.upcomingEvents?.length ?? 0,
    },
    skillDemand: (skills.demand || []).slice(0, 10),
    industryPrograms: industry.programs || [],
    alignment,
    partnerships,
    recruitment,
    dashboard,
    disclaimer: 'Company intelligence uses authorized platform data only. Not global market truth.',
  }
}

async function getDepartmentIntelligence(institutionId, departmentName, query = {}) {
  const filters = { ...buildFilters(query), department: departmentName }
  const match = { institutionId: oid(institutionId), department: departmentName, status: 'active' }

  const [students, skills, opportunities, placement] = await Promise.all([
    InstitutionStudent.countDocuments(match),
    getInstitutionSkillAnalytics(institutionId, filters),
    CampusOpportunity.find({ institutionId: oid(institutionId), status: { $in: ['open', 'published', 'active'] } })
      .select('title opportunityType status deadline')
      .limit(10)
      .lean(),
    getPlacementAnalytics(institutionId, filters),
  ])

  const programs = await Institution.findById(institutionId).select('programs').lean()
  const relatedPrograms = (programs?.programs || []).filter((p) =>
    String(p).toLowerCase().includes(String(departmentName).toLowerCase()),
  )

  return {
    department: departmentName,
    studentCount: students,
    programs: relatedPrograms,
    skills: {
      supply: (skills.supply || []).slice(0, 8),
      demand: (skills.demand || []).slice(0, 8),
    },
    opportunities: opportunities.map((o) => ({ id: o._id.toString(), title: o.title, type: o.opportunityType })),
    placementActivity: {
      applications: placement.applicationsSubmitted ?? 'INSUFFICIENT_DATA',
      placed: placement.studentsPlaced ?? 'INSUFFICIENT_DATA',
    },
    disclaimer: 'Aggregate department data — individual students not exposed.',
  }
}

async function getProgramDetailIntelligence(orgId, role, programId) {
  const program = await assertProgramAccess(orgId, role, programId)
  const filters = buildFilters({})

  const [participants, alignment, placement] = await Promise.all([
    ProgramParticipant.find({ programId: oid(programId) })
      .select('status institutionStudentId')
      .lean(),
    getSkillAlignment(orgId, role),
    role === 'institution' ? getPlacementAnalytics(orgId, filters) : Promise.resolve(null),
  ])

  const programSkills = new Set((program.skills || []).map(normalizeSkill))
  const demandSkills = (alignment.skills?.demand || []).map((d) => d.skill || d)
  const matched = demandSkills.filter((s) => programSkills.has(normalizeSkill(s)))
  const gaps = demandSkills.filter((s) => !programSkills.has(normalizeSkill(s))).slice(0, 8)

  let studentSkillEvidence = []
  if (role === 'institution' && program.eligibilityRules?.departments?.length) {
    const students = await InstitutionStudent.find({
      institutionId: oid(orgId),
      department: { $in: program.eligibilityRules.departments },
      status: 'active',
    })
      .limit(50)
      .lean()
    const evidenceMap = new Map()
    for (const stu of students) {
      const evidence = collectSkillEvidence(stu)
      for (const [, entry] of evidence) {
        const key = normalizeSkill(entry.skill)
        if (!evidenceMap.has(key)) {
          evidenceMap.set(key, { skill: entry.skill, evidenceLevel: mapEvidenceLevel(entry.level), count: 0 })
        }
        evidenceMap.get(key).count++
      }
    }
    studentSkillEvidence = [...evidenceMap.values()].sort((a, b) => b.count - a.count).slice(0, 15)
  }

  const linkedOpportunities = (program.linkedEntities || []).filter((e) =>
    ['job', 'internship', 'campus_opportunity', 'event'].includes(e.entityType),
  )

  return {
    program: {
      id: program._id.toString(),
      title: program.title,
      programType: program.programType,
      status: program.status,
      skills: program.skills || [],
      objectives: program.objectives || [],
      startDate: program.startDate,
      endDate: program.endDate,
    },
    participants: {
      total: participants.length,
      active: participants.filter((p) => ['approved', 'active'].includes(p.status)).length,
    },
    skillIntelligence: studentSkillEvidence,
    industryAlignment: {
      level: resolveAlignment(matched, demandSkills),
      matchedSkills: matched,
      gapSkills: gaps,
      explanation: {
        what: `Program-industry alignment: ${resolveAlignment(matched, demandSkills)}`,
        why: gaps.length
          ? `Gap areas: ${gaps.slice(0, 3).join(', ')}`
          : 'Program skills overlap with opportunity requirements',
        dataBasis: 'Program skills + aggregate opportunity requirements',
        limitation: 'Based only on available Dream Wave opportunity data',
      },
    },
    linkedOpportunities,
    placement: placement
      ? {
          applications: placement.applicationsSubmitted ?? 'INSUFFICIENT_DATA',
          placed: placement.studentsPlaced ?? 'INSUFFICIENT_DATA',
        }
      : null,
    curriculumRecommendation:
      gaps.length > 0
        ? {
            what: `Consider reviewing coverage of ${gaps[0]}`,
            why: `${gaps[0]} appears in relevant opportunity requirements with limited program/student evidence`,
            advisory: true,
          }
        : null,
    disclaimer: 'Program intelligence is advisory. Does not modify curriculum automatically.',
  }
}

async function getIndustryIntelligence(orgId, role, query = {}) {
  const filters = buildFilters(query)
  const skills =
    role === 'institution'
      ? await getInstitutionSkillAnalytics(orgId, filters)
      : await getCompanySkillAnalytics(orgId, filters)

  const categories = {
    technology: [...new Set((skills.demand || []).map((d) => d.skill).slice(0, 10))],
    domains: role === 'company' ? [(await Company.findById(orgId).select('industry').lean())?.industry].filter(Boolean) : [],
    roles: [],
    skills: (skills.demand || []).slice(0, 12),
  }

  if (role === 'company') {
    const jobs = await RecruitmentJob.find({ companyId: oid(orgId), status: { $in: ['open', 'published'] } })
      .select('title department')
      .limit(10)
      .lean()
    categories.roles = jobs.map((j) => j.title)
  }

  return {
    generatedAt: new Date().toISOString(),
    categories,
    recordCount: (skills.demand || []).length,
    disclaimer: 'Industry view based on platform opportunity records — not global market truth.',
  }
}

async function getIndustryTrends(orgId, role, query = {}) {
  const filters = buildFilters(query)
  try {
    const trends =
      role === 'institution'
        ? await getInstitutionTrends(orgId, filters)
        : await getCompanyTrends(orgId, filters)

    const appTrend = trends.applications || trends.applications
    const points = appTrend?.points?.length || 0
    if (!appTrend?.hasTrend || points < MIN_TREND_POINTS) {
      return {
        status: 'INSUFFICIENT_DATA',
        reason: `Requires at least ${MIN_TREND_POINTS} data points; found ${points}`,
        trends: [],
      }
    }
    return {
      status: 'AVAILABLE',
      timeRange: filters.period || '30d',
      recordCount: points,
      trends: appTrend.points || [],
      disclaimer: 'Trends based on available opportunity/application records during selected period.',
    }
  } catch {
    return { status: 'INSUFFICIENT_DATA', reason: 'Trend data unavailable', trends: [] }
  }
}

async function getCompanyRecommendations(institutionId) {
  const result = await getRecommendedPartners(institutionId, 'institution', { limit: 8 })
  return {
    recommendations: (result.matches || []).map((m) => ({
      id: m.id,
      name: m.name,
      fitLevel: m.fitLevel,
      overlappingAreas: m.overlappingAreas || [],
      potentialCollaborationTypes: m.potentialCollaborationTypes || [],
      disclaimer: 'Potential collaboration fit — not partnership guarantees',
    })),
  }
}

async function getStudentAggregateIntelligence(institutionId, query = {}) {
  const filters = buildFilters(query)
  const match = { institutionId: oid(institutionId), status: 'active' }

  const [total, withProjects, withSkills, seeking, inRecruitment] = await Promise.all([
    InstitutionStudent.countDocuments(match),
    InstitutionStudent.countDocuments({ ...match, 'sharedProjects.0': { $exists: true } }),
    InstitutionStudent.countDocuments({
      ...match,
      $or: [{ 'sharedSkills.0': { $exists: true } }, { 'verifiedSkills.0': { $exists: true } }],
    }),
    InstitutionStudent.countDocuments({
      ...match,
      'placement.lifecycleStatus': { $in: ['ELIGIBLE', 'READY', 'APPLYING'] },
    }),
    InstitutionStudent.countDocuments({
      ...match,
      'placement.lifecycleStatus': { $in: ['APPLYING', 'INTERVIEW', 'OFFERED'] },
    }),
  ])

  return {
    aggregates: {
      totalStudents: total,
      withCompleteProfiles: await InstitutionStudent.countDocuments({ ...match, profileStatus: 'complete' }),
      withProjects,
      withVerifiedSkills: withSkills,
      seekingOpportunities: seeking,
      inRecruitment,
    },
    privacy: 'Aggregate counts only — individual student PII not included.',
  }
}

async function getCompanyProgramConnections(institutionId, companyId) {
  const partnership = await InstitutionCompanyPartnership.findOne({
    institutionId: oid(institutionId),
    companyId: oid(companyId),
    status: 'active',
  }).lean()

  const [programs, jobs, internships] = await Promise.all([
    InstitutionProgram.find({
      institutionId: oid(institutionId),
      $or: [{ companyId: oid(companyId) }, { partnershipId: partnership?._id }],
    })
      .select('title programType status skills')
      .lean(),
    RecruitmentJob.find({ companyId: oid(companyId), status: { $in: ['open', 'published'] } })
      .select('title requiredSkills department')
      .limit(10)
      .lean(),
    RecruitmentInternship.find({ companyId: oid(companyId), status: { $in: ['open', 'published'] } })
      .select('title requiredSkills')
      .limit(10)
      .lean(),
  ])

  return {
    hasFormalPartnership: !!partnership,
    relationshipType: partnership?.relationshipType || null,
    programs: programs.map((p) => ({ id: p._id.toString(), title: p.title, skills: p.skills || [] })),
    opportunities: [
      ...jobs.map((j) => ({ type: 'job', title: j.title, skills: j.requiredSkills || [] })),
      ...internships.map((i) => ({ type: 'internship', title: i.title, skills: i.requiredSkills || [] })),
    ],
    disclaimer: partnership
      ? 'Connections via active partnership and linked records'
      : 'Opportunity-based connection only — no formal partnership on record',
  }
}

module.exports = {
  getInstitutionIntelligenceHub,
  getCompanyIntelligenceHub,
  getDepartmentIntelligence,
  getProgramDetailIntelligence,
  getIndustryIntelligence,
  getIndustryTrends,
  getCompanyRecommendations,
  getStudentAggregateIntelligence,
  getCompanyProgramConnections,
  assertProgramAccess,
  resolveAlignment,
  deriveEngagement,
}
