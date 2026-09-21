const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const institutionCache = require('./institutionCache')
const { getStats } = require('./institutionStudentService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getInstitutionSkillAnalytics, getInstitutionTrends, buildFilters } = require('./businessIntelligenceService')
const { getInstitutionPlacementIntelligence } = require('./talentIntelligenceService')
const { getProgramIntelligence } = require('./institutionIntelligenceService')
const { getResearchStats } = require('./institutionResearchService')
const { getPartnershipStatsForInstitution } = require('./partnershipService')
const {
  STAGE_NORMALIZE,
  ALERT_PRIORITIES,
  CAMPUS_AI_INTENTS,
} = require('../constants/campusCommandCenter')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function normalizeStage(raw) {
  if (!raw) return 'APPLIED'
  const key = String(raw).toLowerCase()
  return STAGE_NORMALIZE[key] || String(raw).toUpperCase()
}

function deriveInstitutionHealth(studentStats, placement, skills) {
  const indicators = []
  if (!studentStats?.total) {
    return {
      state: 'INSUFFICIENT_DATA',
      indicators: ['No students on record'],
      explanation: 'Add students to enable campus intelligence.',
    }
  }

  let attention = 0
  if (studentStats.active) indicators.push(`${studentStats.active} active student(s)`)
  if (studentStats.placementEligible) indicators.push(`${studentStats.placementEligible} placement-eligible`)
  if (placement.activeOpportunities) indicators.push(`${placement.activeOpportunities} open opportunity(ies)`)
  else {
    attention++
    indicators.push('No active opportunities')
  }
  if (placement.applicationsSubmitted) indicators.push(`${placement.applicationsSubmitted} application(s)`)
  else if (studentStats.placementEligible) {
    attention++
    indicators.push('Eligible students without applications')
  }
  if ((skills.gaps || []).length >= 3) {
    attention++
    indicators.push(`${skills.gaps.length} aggregate skill gap area(s)`)
  }
  if (studentStats.pendingVerifications) {
    indicators.push(`${studentStats.pendingVerifications} pending verification(s)`)
  }

  let state = 'ACTIVE'
  if (attention >= 2) state = 'NEEDS_ATTENTION'
  else if (
    studentStats.active > 0 &&
    placement.applicationsSubmitted > 0 &&
    placement.activeOpportunities > 0
  ) {
    state = 'HEALTHY'
  } else if (!placement.hasData && !skills.hasData) {
    state = 'INSUFFICIENT_DATA'
  }

  return {
    state,
    indicators,
    explanation: `Based on verified student, placement, and skill analytics records.`,
  }
}

function deriveCurriculumAlignment(skills) {
  if (!skills.hasData || !skills.demand?.length) {
    return {
      level: 'INSUFFICIENT_DATA',
      explanation: 'Insufficient opportunity skill demand data in Dream Wave.',
      overlap: [],
      gaps: [],
    }
  }
  const demandCount = skills.demand.length
  const overlapCount = (skills.overlap || []).length
  const ratio = overlapCount / Math.max(demandCount, 1)
  let level = 'GAP'
  if (ratio >= 0.7) level = 'ALIGNED'
  else if (ratio >= 0.45) level = 'PARTIALLY_ALIGNED'
  else if (demandCount === 0) level = 'INSUFFICIENT_DATA'

  return {
    level,
    explanation: `Based on ${demandCount} in-platform opportunity skill requirement(s). Advisory only — does not modify curriculum.`,
    overlap: (skills.overlap || []).slice(0, 8),
    gaps: (skills.gaps || []).slice(0, 8),
    ratio: Math.round(ratio * 100),
  }
}

function buildPipelineCounts(byStage = {}) {
  const pipeline = {}
  for (const stage of ['ELIGIBLE', 'APPLIED', 'SCREENING', 'SHORTLISTED', 'ASSESSMENT', 'INTERVIEW', 'SELECTED', 'OFFERED', 'JOINED']) {
    pipeline[stage] = 0
  }
  for (const [raw, count] of Object.entries(byStage)) {
    const normalized = normalizeStage(raw)
    if (pipeline[normalized] !== undefined) pipeline[normalized] += count
    else pipeline.APPLIED += count
  }
  return pipeline
}

async function getClosingOpportunities(institutionId, days = 7) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 86400000)
  return CampusOpportunity.find({
    institutionId: oid(institutionId),
    status: { $in: ['open', 'registration_open', 'published', 'active'] },
    $or: [
      { registrationDeadline: { $gte: now, $lte: cutoff } },
      { deadline: { $gte: now, $lte: cutoff } },
    ],
  })
    .select('title opportunityType registrationDeadline deadline status')
    .limit(20)
    .lean()
}

async function getUpcomingDrives(institutionId, days = 14) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 86400000)
  return CampusOpportunity.find({
    institutionId: oid(institutionId),
    opportunityType: 'campus_drive',
    startDate: { $gte: now, $lte: cutoff },
    status: { $in: ['open', 'registration_open', 'published', 'active', 'scheduled'] },
  })
    .select('title startDate registrationDeadline companyName')
    .limit(15)
    .lean()
}

async function countInterviewsToday(institutionId) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const partnerships = await InstitutionCompanyPartnership.find({
    institutionId: oid(institutionId),
    status: 'active',
  })
    .select('companyId')
    .lean()
  const companyIds = partnerships.map((p) => p.companyId)
  if (!companyIds.length) return 0
  return RecruitmentInterview.countDocuments({
    companyId: { $in: companyIds },
    scheduledAt: { $gte: start, $lt: end },
    status: { $in: ['scheduled', 'confirmed'] },
  })
}

function buildAlerts({ closing, drives, skills, stats, placement }) {
  const alerts = []
  for (const opp of closing.slice(0, 5)) {
    alerts.push({
      id: `deadline-${opp._id}`,
      priority: 'HIGH',
      category: 'deadline',
      title: 'Opportunity closing soon',
      detail: opp.title,
      actionRoute: '/institution/placements',
    })
  }
  for (const drive of drives.slice(0, 3)) {
    alerts.push({
      id: `drive-${drive._id}`,
      priority: 'MEDIUM',
      category: 'drive',
      title: 'Upcoming campus drive',
      detail: drive.title,
      actionRoute: '/institution/placements',
    })
  }
  const topGap = (skills.gaps || [])[0]
  if (topGap) {
    alerts.push({
      id: `gap-${topGap.skill}`,
      priority: 'MEDIUM',
      category: 'skill_gap',
      title: 'Skill gap detected',
      detail: `${topGap.skill} — in demand but limited aggregate student evidence`,
      actionRoute: '/institution/placements/intelligence',
    })
  }
  if (stats.pendingVerifications > 0) {
    alerts.push({
      id: 'pending-verifications',
      priority: 'LOW',
      category: 'approval',
      title: 'Pending verifications',
      detail: `${stats.pendingVerifications} student verification(s) awaiting review`,
      actionRoute: '/institution/students',
    })
  }
  if (stats.placementEligible > 0 && !placement.applicationsSubmitted) {
    alerts.push({
      id: 'no-applications',
      priority: 'HIGH',
      category: 'placement',
      title: 'Eligible students without applications',
      detail: `${stats.placementEligible} eligible student(s); no applications recorded`,
      actionRoute: '/institution/placements',
    })
  }
  return alerts.sort((a, b) => ALERT_PRIORITIES.indexOf(a.priority) - ALERT_PRIORITIES.indexOf(b.priority))
}

function buildTrainingRecommendations(skills, programIntel) {
  const recs = []
  for (const gap of (skills.gaps || []).slice(0, 5)) {
    recs.push({
      type: 'skill_gap',
      skill: gap.skill,
      recommendation: `Consider workshop or learning module for ${gap.skill}`,
      scope: 'institution',
      advisory: true,
    })
  }
  for (const dept of (programIntel.departments || []).slice(0, 3)) {
    const gapSkill = (skills.gaps || [])[0]
    if (gapSkill && dept.studentCount >= 5) {
      recs.push({
        type: 'program_training',
        program: dept.name,
        skill: gapSkill.skill,
        recommendation: `Program ${dept.name}: recurring gap in ${gapSkill.skill}. Consider a focused learning module.`,
        scope: 'department',
        advisory: true,
      })
    }
  }
  return recs
}

function buildStudentSuccessSignals(stats, skills, readiness) {
  const signals = []
  if (stats.placementEligible > stats.placedStudents) {
    signals.push({
      category: 'application_preparation',
      message: `${stats.placementEligible - stats.placedStudents} eligible student(s) may benefit from application preparation support`,
      language: 'MAY_BENEFIT',
    })
  }
  if ((skills.gaps || []).length) {
    signals.push({
      category: 'skill_development',
      message: `Aggregate skill gaps detected — students may benefit from targeted skill development`,
      language: 'MAY_BENEFIT',
    })
  }
  const developing = readiness.DEVELOPING || readiness.PREPARING || 0
  if (developing > 0) {
    signals.push({
      category: 'profile_completion',
      message: `${developing} student(s) may benefit from profile or portfolio completion`,
      language: 'MAY_BENEFIT',
    })
  }
  return signals
}

function mapReadinessDistribution(raw) {
  return {
    READY: raw.READY || 0,
    NEAR_READY: raw.NEARLY_READY || 0,
    DEVELOPING: (raw.PREPARING || 0) + (raw.NEEDS_ATTENTION || 0),
    INSUFFICIENT_DATA: raw.INSUFFICIENT_DATA || 0,
  }
}

async function getCampusCommandCenter(institutionId, query = {}) {
  const filters = buildFilters(query)
  const cacheKey = institutionCache.makeKey('campus-cmd', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const institution = await Institution.findById(institutionId).select('name type location departments programs').lean()
    if (!institution) {
      const err = new Error('Institution not found')
      err.statusCode = 404
      throw err
    }

    const [
      studentStats,
      placement,
      skills,
      talentIntel,
      programIntel,
      research,
      partnerships,
      closing,
      drives,
      interviewsToday,
      trends,
    ] = await Promise.all([
      getStats(institutionId),
      getPlacementAnalytics(institutionId, filters),
      getInstitutionSkillAnalytics(institutionId, filters),
      getInstitutionPlacementIntelligence(institutionId, query),
      getProgramIntelligence(institutionId, filters),
      getResearchStats(institutionId).catch(() => ({ hasData: false })),
      getPartnershipStatsForInstitution(institutionId).catch(() => ({ active: 0, total: 0 })),
      getClosingOpportunities(institutionId),
      getUpcomingDrives(institutionId),
      countInterviewsToday(institutionId),
      getInstitutionTrends(institutionId, filters),
    ])

    const health = deriveInstitutionHealth(studentStats, placement, skills)
    const curriculum = deriveCurriculumAlignment(skills)
    const pipeline = buildPipelineCounts(placement.byApplicationStage || {})
    pipeline.ELIGIBLE = placement.studentsEligible || studentStats.placementEligible || 0

    const readiness = mapReadinessDistribution(talentIntel.readinessDistribution || {})
    const alerts = buildAlerts({ closing, drives, skills, stats: studentStats, placement })
    const trainingRecs = buildTrainingRecommendations(skills, programIntel)
    const studentSuccess = buildStudentSuccessSignals(studentStats, skills, readiness)

    const companyActivity = {
      activePartnerships: partnerships.active ?? partnerships.totalActive ?? 0,
      totalPartnerships: partnerships.total ?? 0,
      companiesWithApplications: Object.keys(placement.byCompany || {}).length,
      engagement: {
        active: partnerships.active ?? 0,
        note: 'Based on active partnership records and application activity.',
      },
    }

    return {
      generatedAt: new Date().toISOString(),
      institution: {
        name: institution.name,
        type: institution.type,
        location: institution.location,
        departments: institution.departments || [],
        programs: institution.programs || [],
      },
      health,
      campusOverview: {
        students: studentStats.total,
        activeStudents: studentStats.active,
        departments: studentStats.departments,
        programs: (institution.programs || []).length,
        openOpportunities: placement.activeOpportunities,
        activeCompanies: companyActivity.activePartnerships,
        researchProjects: research.totalProjects ?? research.activeProjects ?? null,
        events: drives.length,
        hasData: studentStats.total > 0,
      },
      studentIntelligence: {
        total: studentStats.total,
        active: studentStats.active,
        withProfiles: studentStats.total - (studentStats.byStatus?.pending || 0),
        placementEligible: studentStats.placementEligible,
        placementReady: studentStats.placementReady,
        placed: studentStats.placedStudents,
        inPipeline: placement.applicationsSubmitted,
        byDepartment: studentStats.byDepartment,
        disclaimer: 'Aggregate counts only. Individual student details require authorization.',
      },
      readiness,
      skillIntelligence: {
        topSkills: (skills.supply || []).slice(0, 10),
        industryDemand: (skills.demand || []).slice(0, 10).map((d) => ({
          skill: d.skill,
          count: d.count,
          state: 'HIGH_DEMAND',
        })),
        gaps: (skills.gaps || []).slice(0, 10).map((g) => ({
          skill: g.skill,
          state: 'GAP',
          required: g.count,
          available: 0,
          unknown: false,
        })),
        available: (skills.overlap || []).slice(0, 10).map((o) => ({
          skill: o.skill,
          state: 'AVAILABLE',
        })),
        sourceNote: 'Based on opportunities available in Dream Wave — not entire industry.',
        hasData: skills.hasData,
      },
      curriculumAlignment: curriculum,
      placementCommandCenter: {
        overview: {
          eligible: pipeline.ELIGIBLE,
          applications: placement.applicationsSubmitted,
          shortlisted: pipeline.SHORTLISTED + pipeline.SELECTED,
          interviews: pipeline.INTERVIEW,
          selections: placement.studentsSelected,
          offers: placement.offersReleased,
          offersAccepted: placement.offersAccepted,
          placed: placement.studentsPlaced,
        },
        pipeline,
        outcomes: {
          placed: placement.studentsPlaced,
          selected: placement.studentsSelected,
          pending: Math.max(0, (placement.applicationsSubmitted || 0) - (placement.studentsPlaced || 0)),
          offersPending: Math.max(0, (placement.offersReleased || 0) - (placement.offersAccepted || 0)),
          note: 'Missing outcome data is not treated as unplaced.',
        },
        analytics: {
          placementPercentage: placement.placementPercentage,
          byDepartment: placement.byDepartment,
          byCompany: placement.byCompany,
          hasData: placement.hasData,
        },
      },
      companyIntelligence: companyActivity,
      opportunityIntelligence: {
        open: placement.activeOpportunities,
        closingSoon: closing.length,
        upcomingDrives: drives.length,
        closingItems: closing.map((o) => ({
          id: o._id.toString(),
          title: o.title,
          deadline: o.registrationDeadline || o.deadline,
        })),
        talentMatching: {
          strongMatches: talentIntel.readinessDistribution?.READY || 0,
          note: 'Aggregate match indicators from talent intelligence layer.',
        },
      },
      departmentIntelligence: (programIntel.departments || []).slice(0, 12),
      programIntelligence: {
        programs: (programIntel.programs || []).slice(0, 12),
        hasData: programIntel.hasData,
        incompleteCoverage: programIntel.incompleteCoverage,
      },
      researchIntelligence: {
        totalProjects: research.totalProjects ?? null,
        activeProjects: research.activeProjects ?? null,
        publications: research.publications ?? null,
        hasData: research.hasData ?? false,
        note: 'Institution research aggregate. Researcher privacy preserved.',
      },
      partnershipIntelligence: {
        active: partnerships.active ?? partnerships.totalActive ?? 0,
        total: partnerships.total ?? 0,
        hasData: (partnerships.total ?? 0) > 0,
      },
      alerts,
      recommendations: {
        training: trainingRecs,
        placement: alerts.filter((a) => a.category === 'placement' || a.category === 'deadline').slice(0, 5),
        studentSuccess,
      },
      trends: {
        applications: trends.applications,
        placements: trends.placements,
        disclaimer: trends.applications?.hasTrend
          ? 'Trends based on historical in-platform records.'
          : 'Insufficient historical data for trend analysis.',
      },
      dailyBrief: {
        todaysDrives: drives.filter((d) => {
          const start = new Date(d.startDate)
          const today = new Date()
          return start.toDateString() === today.toDateString()
        }).length,
        applicationsClosing: closing.length,
        interviewsToday,
        pendingActions: alerts.filter((a) => ['CRITICAL', 'HIGH'].includes(a.priority)).length,
        topSkillGap: (skills.gaps || [])[0]?.skill || null,
      },
      dataLimitations: [
        !placement.hasData ? 'Limited placement application records.' : null,
        !skills.hasData ? 'Insufficient skill demand/supply data.' : null,
        !trends.applications?.hasTrend ? 'Not enough data for application trends.' : null,
        programIntel.incompleteCoverage ? 'Program-to-student mapping may be partial.' : null,
      ].filter(Boolean),
      integrations: {
        memoryBoundary: 'Uses authorized institution-visible student data only — not personal AI memory.',
        knowledgeGraph: 'Explainable chain: Institution → Programs → Skills → Opportunities → Companies.',
        workflow: 'Reports and actions require user confirmation before external execution.',
        continuousIntelligence: 'Alert hooks available; real-time events via existing Socket.IO infrastructure.',
      },
      disclaimer:
        'Advisory intelligence only. Placement and hiring decisions remain human responsibilities. Does not guarantee outcomes.',
    }
  })
}

async function getWeeklyReport(institutionId, query = {}) {
  const center = await getCampusCommandCenter(institutionId, { ...query, period: query.period || '7d' })
  return {
    title: 'Weekly Campus Intelligence',
    generatedAt: center.generatedAt,
    dataPeriod: query.period || '7d',
    institution: center.institution.name,
    keyMetrics: {
      students: center.studentIntelligence.total,
      applications: center.placementCommandCenter.overview.applications,
      placements: center.placementCommandCenter.overview.placed,
      openOpportunities: center.opportunityIntelligence.open,
      skillGaps: center.skillIntelligence.gaps.length,
    },
    insights: [
      center.health.state !== 'HEALTHY'
        ? `Institution health: ${center.health.state.replace(/_/g, ' ')}`
        : 'Campus placement activity is active',
      center.dailyBrief.topSkillGap
        ? `Top skill gap: ${center.dailyBrief.topSkillGap}`
        : 'No major skill gaps detected',
    ].filter(Boolean),
    recommendations: center.recommendations.training.slice(0, 5),
    dataLimitations: center.dataLimitations,
    focus: center.alerts.slice(0, 5).map((a) => a.title),
  }
}

function buildRuleInsight(intent, center) {
  const insight = {
    observation: '',
    why: '',
    evidence: [],
    nextStep: null,
    source: 'Campus Command Center Service',
    limitation: 'Advisory only. Human confirmation required for actions.',
  }

  switch (intent) {
    case 'DAILY_BRIEF':
      insight.observation = `Drives: ${center.dailyBrief.todaysDrives} · Closing: ${center.dailyBrief.applicationsClosing} · Interviews: ${center.dailyBrief.interviewsToday}`
      insight.why = center.dailyBrief.topSkillGap
        ? `Top skill gap: ${center.dailyBrief.topSkillGap}`
        : 'Based on today\'s placement records'
      insight.nextStep = center.dailyBrief.pendingActions
        ? `Review ${center.dailyBrief.pendingActions} high-priority action(s)`
        : null
      break
    case 'WEEKLY_REPORT':
      insight.observation = `${center.placementCommandCenter.overview.applications} applications · ${center.placementCommandCenter.overview.placed} placed`
      insight.evidence = center.dataLimitations
      insight.nextStep = 'Review weekly campus intelligence report'
      break
    case 'PLACEMENT_FOCUS':
      insight.observation = `${center.placementCommandCenter.overview.eligible} eligible · ${center.placementCommandCenter.overview.applications} applied`
      insight.nextStep = '/institution/placements'
      break
    case 'SKILL_GAP_ACTION':
      insight.observation = (center.skillIntelligence.gaps[0]?.skill) || 'No gaps detected'
      insight.gaps = center.skillIntelligence.gaps.map((g) => g.skill)
      insight.nextStep = center.recommendations.training[0]?.recommendation || null
      break
    case 'STUDENT_SUCCESS':
      insight.observation = center.recommendations.studentSuccess.map((s) => s.message).join(' ')
      break
    case 'TRAINING_RECOMMENDATION':
      insight.observation = center.recommendations.training[0]?.recommendation || 'No training recommendations'
      break
    case 'CURRICULUM_ALIGNMENT':
      insight.observation = `Curriculum alignment: ${center.curriculumAlignment.level.replace(/_/g, ' ')}`
      insight.why = center.curriculumAlignment.explanation
      break
    default:
      insight.observation = center.health.explanation
  }

  return insight
}

async function getCampusAiInsight(institutionId, intent, query = {}) {
  const center = await getCampusCommandCenter(institutionId, query)
  return {
    intent: intent || 'DAILY_BRIEF',
    source: 'rule',
    insight: buildRuleInsight(intent || 'DAILY_BRIEF', center),
  }
}

module.exports = {
  getCampusCommandCenter,
  getWeeklyReport,
  getCampusAiInsight,
  CAMPUS_AI_INTENTS,
}
