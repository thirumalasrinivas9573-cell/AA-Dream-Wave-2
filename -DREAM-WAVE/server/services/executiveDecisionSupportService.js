/**
 * Lasya V4 Prompt 10 — Executive Decision Support Service
 * Composes existing analytics/intelligence services — no duplicate aggregation layers.
 */
const mongoose = require('mongoose')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const InstitutionProgram = require('../models/InstitutionProgram')
const {
  EXTENDED_METRIC_REGISTRY,
  TREND_CLASSIFICATIONS,
  PARTNERSHIP_HEALTH_STATES,
  SKILL_GAP_CLASSIFICATIONS,
  DECISION_SUPPORT_INTENTS,
  FUNNEL_DEFINITION,
  MIN_TREND_POINTS,
} = require('../constants/executiveIntelligence')
const {
  buildFilters,
  getInstitutionDashboard,
  getInstitutionSkillAnalytics,
  getInstitutionTrends,
  getInstitutionDataQuality,
  getCompanyDashboard,
  getCompanyRecruitmentFunnel,
} = require('./businessIntelligenceService')
const { getCommandCenterOverview } = require('./institutionCommandCenterService')
const { getInstitutionPlacementIntelligence } = require('./talentIntelligenceService')
const { getPartnershipAnalytics } = require('./partnershipIntelligenceService')
const { getSkillAlignment, getEcosystemOverview } = require('./ecosystemIntelligenceService')
const { getIndustryIntelligence, getIndustryTrends } = require('./programIntelligenceService')
const { createWorkflowFromTemplate } = require('./ecosystemAutomationService')
const { recordExecutiveAudit } = require('./institutionExecutiveAuditService')
const institutionCache = require('./institutionCache')

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /expose\s+data/i,
  /change\s+permissions/i,
  /execute\s+without/i,
]

function sanitizeQuery(text = '') {
  const str = String(text || '').slice(0, 500)
  for (const p of PROMPT_INJECTION_PATTERNS) {
    if (p.test(str)) return '[filtered query]'
  }
  return str
}

function classifyTrend(points = []) {
  if (!points || points.length < MIN_TREND_POINTS) return 'INSUFFICIENT_DATA'
  const values = points.map((p) => p.count ?? p.value ?? 0)
  const first = values.slice(0, Math.floor(values.length / 2))
  const second = values.slice(Math.floor(values.length / 2))
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const diff = avg(second) - avg(first)
  const variance = values.reduce((s, v) => s + Math.abs(v - avg(values)), 0) / values.length
  if (variance > avg(values) * 0.5 && avg(values) > 0) return 'VOLATILE'
  if (Math.abs(diff) < avg(values) * 0.05) return 'STABLE'
  return diff > 0 ? 'INCREASING' : 'DECREASING'
}

function buildMetricRegistryValues(metrics = {}) {
  return Object.entries(EXTENDED_METRIC_REGISTRY).map(([key, def]) => ({
    name: key,
    description: def.definition,
    source: def.source,
    category: def.category || 'INSTITUTION',
    scope: def.scope || 'institution',
    value: metrics[key] ?? null,
    status: metrics[key] == null ? 'INSUFFICIENT_DATA' : 'OK',
    lastUpdated: new Date().toISOString(),
  }))
}

async function getExecutiveOverview(institutionId, query = {}) {
  const filters = buildFilters(query)
  const cacheKey = institutionCache.makeKey('exec-intel-overview', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const [commandCenter, bi, placementIntel, partnerships, partnershipHealth, ecosystem, alignment] = await Promise.all([
      getCommandCenterOverview(institutionId, query).catch(() => null),
      getInstitutionDashboard(institutionId, query).catch(() => null),
      getInstitutionPlacementIntelligence(institutionId, query).catch(() => null),
      getPartnershipAnalytics(institutionId, 'institution', query).catch(() => null),
      getPartnershipHealthAnalytics(institutionId, query).catch(() => null),
      getEcosystemOverview(institutionId, 'institution', query).catch(() => null),
      getSkillAlignment(institutionId, 'institution', query).catch(() => null),
    ])

    const cc = commandCenter || {}
    const modules = cc.modules || {}
    const placement = modules.placement || {}
    const industry = modules.industry || {}

    const metrics = {
      totalStudents: bi?.overview?.students ?? cc.summary?.students ?? null,
      activeStudents: bi?.overview?.activeStudents ?? null,
      activePrograms: bi?.overview?.programs ?? ecosystem?.programs?.total ?? null,
      openOpportunities: bi?.opportunities?.active ?? placement.activeOpportunities ?? null,
      activePartnerships: partnerships?.engagement?.active ?? partnershipHealth?.summary?.active ?? industry.activePartnerships ?? null,
      applicationsSubmitted: bi?.career?.applications ?? placementIntel?.placement?.applicationsSubmitted ?? null,
      interviewsScheduled: bi?.career?.interviews ?? null,
      placements: bi?.career?.placements ?? placementIntel?.placement?.studentsPlaced ?? null,
      placementRate: bi?.career?.placementRate ?? null,
    }

    const funnelStages = placement.byApplicationStage || bi?.career?.funnel || {}
    const funnel = {
      ...FUNNEL_DEFINITION,
      counts: {
        applications: metrics.applicationsSubmitted ?? funnelStages.applied ?? 0,
        screening: funnelStages.screening ?? funnelStages.review ?? 0,
        shortlisted: funnelStages.shortlisted ?? 0,
        interview: (funnelStages.interview ?? 0) + (funnelStages.final_interview ?? 0),
        offer: funnelStages.offer ?? bi?.career?.offers ?? 0,
        placement: metrics.placements ?? funnelStages.placed ?? 0,
      },
      hasData: (metrics.applicationsSubmitted ?? 0) > 0,
    }

    const keyChanges = []
    if (bi?.trends?.applications?.hasTrend) {
      keyChanges.push({
        title: 'Application activity varies',
        whatChanged: 'Application volume shows variation across recorded periods.',
        dataBasis: 'RecruitmentApplication records',
      })
    }
    if (partnershipHealth?.expiring?.length) {
      keyChanges.push({
        title: `${partnershipHealth.expiring.length} partnership(s) expiring soon`,
        whatChanged: 'Partnership end dates fall within the next 30 days.',
        dataBasis: 'InstitutionCompanyPartnership records',
      })
    }
    if (placementIntel?.skillGaps?.length) {
      keyChanges.push({
        title: 'Skill gaps detected in aggregate',
        whatChanged: `${placementIntel.skillGaps.length} skill(s) appear in demand but not in aggregate student evidence.`,
        dataBasis: 'Opportunity requirements vs student skill evidence',
      })
    }

    const attentionRequired = []
    const lowActivityPartnerships = (partnershipHealth?.items || []).filter(
      (p) => p.state === 'ACTIVE_LOW_ACTIVITY',
    )
    if (lowActivityPartnerships.length) {
      attentionRequired.push({
        type: 'partnership_review',
        label: `${lowActivityPartnerships.length} partnership(s) with low recent activity`,
        nextStep: 'Review partnership engagement',
      })
    }
    if (funnel.hasData && funnel.counts.applications > 0) {
      const dropOff = funnel.counts.applications - (funnel.counts.interview || 0)
      if (dropOff > funnel.counts.applications * 0.7) {
        attentionRequired.push({
          type: 'placement_bottleneck',
          label: 'High drop-off between applications and interviews',
          nextStep: 'Review recommended — available records show reduced progression; cause not automatically determined.',
        })
      }
    }
    const dq = bi?.dataQuality
    if (dq?.hasIssues) {
      attentionRequired.push({
        type: 'data_quality',
        label: `${dq.warnings?.length ?? 0} data quality issue(s) detected`,
        nextStep: 'Open Data Quality Center',
      })
    }

    return {
      generatedAt: new Date().toISOString(),
      freshness: 'CACHED',
      period: filters.periodLabel,
      institution: cc.institution || { name: null },
      summary: metrics,
      metricRegistry: buildMetricRegistryValues(metrics),
      keyChanges: keyChanges.slice(0, 5),
      attentionRequired: attentionRequired.slice(0, 5),
      placementFunnel: funnel,
      partnershipHealth: partnershipHealth || { status: 'INSUFFICIENT_DATA' },
      skillAlignment: {
        alignmentLevel: alignment?.alignmentLevel || 'INSUFFICIENT_DATA',
        programAlignment: alignment?.programAlignment || null,
      },
      industryDemand: placementIntel?.industryDemand?.slice(0, 5) || [],
      hasData: cc.hasData !== false || bi?.hasData !== false,
      dataLimitations: [
        !bi?.hasData ? 'Limited BI dashboard data' : null,
        !cc.hasData ? 'Limited command center data' : null,
      ].filter(Boolean),
    }
  })
}

async function getSkillDemandAnalytics(institutionId, query = {}) {
  const filters = buildFilters(query)
  const skills = await getInstitutionSkillAnalytics(institutionId, filters)
  if (!skills?.demand?.length) {
    return { status: 'INSUFFICIENT_DATA', demand: [], period: filters.periodLabel }
  }
  return {
    status: 'OK',
    period: filters.periodLabel,
    demand: skills.demand.map((d) => ({
      skill: d.skill,
      requestCount: d.count,
      opportunityCount: d.count,
    })),
    recordCount: skills.demand.reduce((s, d) => s + d.count, 0),
    disclaimer: 'Based on available opportunity requirement records in scope — not global industry truth.',
  }
}

async function getSkillGapAnalytics(institutionId, query = {}) {
  const filters = buildFilters(query)
  const skills = await getInstitutionSkillAnalytics(institutionId, filters)
  if (!skills?.demand?.length && !skills?.supply?.length) {
    return { status: 'INSUFFICIENT_DATA', gaps: [], classification: 'INSUFFICIENT_DATA' }
  }
  const gaps = (skills.gaps || []).map((g) => ({
    skill: g.skill,
    demandCount: g.count,
    classification: 'POTENTIAL_GAP',
    note: 'Skill absent from aggregate evidence — does not prove individual students lack this skill.',
  }))
  const classification = gaps.length ? 'POTENTIAL_GAP' : 'ALIGNED'
  return {
    status: gaps.length ? 'OK' : 'INSUFFICIENT_DATA',
    classification,
    gaps: gaps.slice(0, 20),
    overlap: skills.overlap?.slice(0, 10) || [],
    limitation: SKILL_GAP_CLASSIFICATIONS.includes(classification)
      ? 'Aggregate comparison only. Individual readiness not assessed.'
      : 'Insufficient skill evidence.',
  }
}

async function getTrendAnalytics(institutionId, query = {}) {
  const filters = buildFilters(query)
  const trends = await getInstitutionTrends(institutionId, filters)
  const result = []

  for (const [metric, data] of Object.entries(trends || {})) {
    if (!data || typeof data !== 'object') continue
    const points = data.points || []
    result.push({
      metric,
      timePeriod: filters.periodLabel,
      comparisonPeriod: 'prior periods in series',
      dataVolume: points.length,
      direction: data.hasTrend ? classifyTrend(points) : 'INSUFFICIENT_DATA',
      points: points.slice(-12),
      confidence: points.length >= MIN_TREND_POINTS ? 'moderate' : 'low',
      statement: data.hasTrend
        ? `${metric} shows measurable variation during the selected period.`
        : data.message || 'Not enough historical data.',
      causalityNote: 'Association only — causation not inferred.',
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    trends: result,
    classifications: TREND_CLASSIFICATIONS,
  }
}

async function getPartnershipHealthAnalytics(institutionId, query = {}) {
  const analytics = await getPartnershipAnalytics(institutionId, 'institution', query)
  if (!analytics?.hasData && !analytics?.byStatus) {
    return { status: 'INSUFFICIENT_DATA', partnerships: [] }
  }

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const partnerships = await InstitutionCompanyPartnership.find({
    institutionId,
    status: { $in: ['active', 'paused'] },
  })
    .select('companyId status endDate relationshipType')
    .limit(50)
    .lean()

  const healthItems = partnerships.map((p) => {
    let state = 'ACTIVE'
    if (p.endDate && new Date(p.endDate) <= now) state = 'EXPIRED'
    else if (p.endDate && new Date(p.endDate) <= in30) state = 'EXPIRING'
    else if (p.status === 'paused') state = 'ACTIVE_LOW_ACTIVITY'
    return {
      partnershipId: p._id,
      state,
      endDate: p.endDate,
      relationshipType: p.relationshipType,
      basis: 'Partnership status and end date from canonical records.',
    }
  })

  return {
    status: healthItems.length ? 'OK' : 'INSUFFICIENT_DATA',
    summary: {
      active: analytics.engagement?.active ?? 0,
      totalActivity: analytics.totalActivity ?? 0,
    },
    healthStates: PARTNERSHIP_HEALTH_STATES,
    items: healthItems,
    expiring: healthItems.filter((h) => h.state === 'EXPIRING'),
    lowActivity: healthItems.filter((h) => h.state === 'ACTIVE_LOW_ACTIVITY'),
  }
}

async function getProgramAlignmentAnalytics(institutionId, query = {}) {
  const alignment = await getSkillAlignment(institutionId, 'institution', query)
  const industry = await getIndustryIntelligence(institutionId, 'institution').catch(() => null)

  return {
    status: alignment?.alignmentLevel ? 'OK' : 'INSUFFICIENT_DATA',
    alignmentLevel: alignment?.alignmentLevel || 'INSUFFICIENT_DATA',
    alignedSkills: alignment?.programAlignment?.overlapWithIndustryDemand?.slice(0, 10) || [],
    potentialGaps: alignment?.programAlignment?.potentialCurriculumGaps?.slice(0, 10) || [],
    unknownAreas: alignment?.skills?.gaps?.slice(0, 10) || [],
    industryCategories: industry?.categories?.skills?.slice(0, 5) || [],
    limitation: 'Program-opportunity alignment from available records — curriculum changes require administrator review.',
  }
}

async function getDataQualityCenter(institutionId) {
  const dq = await getInstitutionDataQuality(institutionId)
  const iid = new mongoose.Types.ObjectId(institutionId)

  const [missingDeadline, incompletePartnerships] = await Promise.all([
    CampusOpportunity.countDocuments({
      institutionId: iid,
      status: 'published',
      $or: [{ deadline: null }, { deadline: { $exists: false } }],
    }),
    InstitutionCompanyPartnership.countDocuments({
      institutionId: iid,
      status: 'active',
      $or: [{ relationshipType: '' }, { relationshipType: null }],
    }),
  ])

  const issues = [...(dq.warnings || [])]
  if (missingDeadline) {
    issues.push({
      type: 'missing_opportunity_deadline',
      count: missingDeadline,
      severity: 'warning',
      source: 'CampusOpportunity',
      impact: 'Deadline alerts and placement reminders may be incomplete.',
      recommendedAction: 'Review and set application deadlines.',
    })
  }
  if (incompletePartnerships) {
    issues.push({
      type: 'incomplete_partnership_type',
      count: incompletePartnerships,
      severity: 'attention',
      source: 'InstitutionCompanyPartnership',
      impact: 'Partnership analytics may be less precise.',
      recommendedAction: 'Complete partnership relationship types.',
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    hasIssues: issues.length > 0,
    issues,
    totalIssueCount: issues.reduce((s, i) => s + (i.count || 1), 0),
  }
}

function buildInsightFromIntent(intent, context) {
  const overview = context.overview || {}
  const insight = {
    title: '',
    whatChanged: '',
    whyItMatters: '',
    dataBasis: '',
    recommendedNextStep: '',
    limitation: 'Causation not inferred. Insights based on available authorized records only.',
  }

  switch (intent) {
    case 'WHAT_NEEDS_ATTENTION':
      insight.title = 'Attention items'
      insight.whatChanged = `${overview.attentionRequired?.length ?? 0} item(s) flagged for review.`
      insight.whyItMatters = 'These areas may affect placement, partnerships, or data reliability.'
      insight.dataBasis = 'Command center, BI, partnership, and data quality services.'
      insight.recommendedNextStep = overview.attentionRequired?.[0]?.nextStep || 'Review executive dashboard.'
      break
    case 'PLACEMENT_BOTTLENECKS':
      insight.title = 'Placement funnel review'
      insight.whatChanged = 'Funnel stage counts computed from application status records.'
      insight.whyItMatters = 'Stages with unusual drop-off may warrant manual review.'
      insight.dataBasis = 'RecruitmentApplication pipeline stages.'
      insight.recommendedNextStep = 'Review funnel — cause of drop-off not automatically diagnosed.'
      break
    case 'TOP_SKILLS':
    case 'SKILL_DEMAND':
      insight.title = 'Skill demand from opportunities'
      insight.whatChanged = context.skillDemand?.demand?.length
        ? `Top skill: ${context.skillDemand.demand[0]?.skill}`
        : 'Insufficient opportunity skill data.'
      insight.whyItMatters = 'Students may benefit from aligned project and learning evidence.'
      insight.dataBasis = 'Opportunity requirement records in scope.'
      insight.recommendedNextStep = 'Review skill demand report and program alignment.'
      break
    case 'PARTNERSHIPS_NEED_REVIEW':
    case 'PARTNERSHIP_HEALTH':
      insight.title = 'Partnership health'
      insight.whatChanged = context.partnershipHealth?.expiring?.length
        ? `${context.partnershipHealth.expiring.length} partnership(s) expiring within 30 days.`
        : 'No expiring partnerships in current records.'
      insight.whyItMatters = 'Renewal reviews prevent collaboration gaps.'
      insight.dataBasis = 'InstitutionCompanyPartnership end dates and activity.'
      insight.recommendedNextStep = 'Prepare renewal review workflow if expiring partnerships exist.'
      break
    case 'PROGRAM_OPPORTUNITY_GAPS':
      insight.title = 'Program-industry alignment'
      insight.whatChanged = context.alignment?.alignmentLevel || 'INSUFFICIENT_DATA'
      insight.whyItMatters = 'Alignment gaps may affect graduate readiness for available opportunities.'
      insight.dataBasis = 'Program skills vs opportunity requirements.'
      insight.recommendedNextStep = 'Request administrator review — curriculum not modified automatically.'
      break
    case 'DATA_QUALITY':
      insight.title = 'Data quality'
      insight.whatChanged = context.dataQuality?.hasIssues
        ? `${context.dataQuality.issues?.length ?? 0} issue type(s) detected.`
        : 'No data quality issues detected.'
      insight.whyItMatters = 'Analytics accuracy depends on complete source records.'
      insight.dataBasis = 'InstitutionStudent, RecruitmentApplication, CampusOpportunity.'
      insight.recommendedNextStep = 'Create review task for flagged data issues.'
      break
    default:
      insight.title = 'Executive overview'
      insight.whatChanged = overview.keyChanges?.[0]?.whatChanged || 'No significant changes detected.'
      insight.whyItMatters = overview.keyChanges?.[0]?.title || 'Monitor ecosystem metrics regularly.'
      insight.dataBasis = 'Aggregated institution analytics services.'
      insight.recommendedNextStep = 'Review executive intelligence center.'
  }

  return insight
}

async function getDecisionSupport(institutionId, userId, query = {}) {
  const question = sanitizeQuery(query.question || query.intent || 'WHAT_NEEDS_ATTENTION')
  let intent = 'WHAT_NEEDS_ATTENTION'
  if (/program.*gap|alignment/i.test(question)) intent = 'PROGRAM_OPPORTUNITY_GAPS'
  else if (/partnership|collaboration/i.test(question)) intent = 'PARTNERSHIPS_NEED_REVIEW'
  else if (/skill|demand|training/i.test(question)) intent = 'TOP_SKILLS'
  else if (/bottleneck|funnel|placement/i.test(question)) intent = 'PLACEMENT_BOTTLENECKS'
  else if (/change|month|week/i.test(question)) intent = 'WHAT_CHANGED'
  else if (/quality|data issue/i.test(question)) intent = 'DATA_QUALITY'
  else if (/attention|urgent|priority/i.test(question)) intent = 'WHAT_NEEDS_ATTENTION'

  const [overview, skillDemand, partnershipHealth, alignment, dataQuality] = await Promise.all([
    getExecutiveOverview(institutionId, query),
    getSkillDemandAnalytics(institutionId, query),
    getPartnershipHealthAnalytics(institutionId, query),
    getProgramAlignmentAnalytics(institutionId, query),
    getDataQualityCenter(institutionId),
  ])

  const insight = buildInsightFromIntent(intent, {
    overview,
    skillDemand,
    partnershipHealth,
    alignment,
    dataQuality,
  })

  return {
    question,
    intent,
    insight,
    evidence: {
      summary: overview.summary,
      attentionRequired: overview.attentionRequired,
      keyChanges: overview.keyChanges,
    },
    dataLimitations: overview.dataLimitations,
    causalityNote: 'Insights describe associations in available records — not verified causal relationships.',
  }
}

async function getExecutiveInsights(institutionId, query = {}) {
  const overview = await getExecutiveOverview(institutionId, query)
  const insights = []

  for (const change of overview.keyChanges || []) {
    insights.push({
      title: change.title,
      whatChanged: change.whatChanged,
      whyItMatters: 'May affect institution operations or student outcomes.',
      dataBasis: change.dataBasis,
      recommendedNextStep: 'Review details in executive dashboard.',
      limitation: overview.dataLimitations?.join('; ') || 'Based on available records.',
    })
  }

  for (const item of overview.attentionRequired || []) {
    insights.push({
      title: item.label,
      whatChanged: item.type,
      whyItMatters: 'Flagged for authorized review.',
      dataBasis: 'Automated threshold on canonical records.',
      recommendedNextStep: item.nextStep,
      limitation: 'Automated flag — manual verification recommended.',
    })
  }

  if (!insights.length) {
    insights.push({
      title: 'Insufficient change data',
      whatChanged: 'INSUFFICIENT_DATA',
      whyItMatters: 'Not enough historical or activity records to generate change insights.',
      dataBasis: 'Institution analytics services.',
      recommendedNextStep: 'Ensure opportunities, applications, and partnerships are recorded.',
      limitation: 'INSUFFICIENT_DATA',
    })
  }

  return { insights: insights.slice(0, 8), generatedAt: new Date().toISOString() }
}

async function createWorkflowFromInsight(institutionId, userId, { insightType, context = {} } = {}) {
  const templateMap = {
    partnership_review: 'PARTNERSHIP_REVIEW',
    partnership_expiry: 'PARTNERSHIP_EXPIRY',
    skill_gap: 'SKILL_GAP_REVIEW',
    program_alignment: 'PROGRAM_ALIGNMENT_REVIEW',
    data_quality: 'SKILL_GAP_REVIEW',
    placement_bottleneck: 'PLACEMENT_REMINDER',
  }
  const templateId = templateMap[insightType] || 'COMPANY_ENGAGEMENT_REVIEW'
  return createWorkflowFromTemplate({
    userId,
    organizationId: institutionId,
    organizationRole: 'institution',
    templateId,
    context: { ...context, why: context.why || `Analytics insight: ${insightType}` },
    trigger: 'MANUAL',
  })
}

async function getCompanyExecutiveOverview(companyId, query = {}) {
  const filters = buildFilters(query)
  const [dashboard, funnel] = await Promise.all([
    getCompanyDashboard(companyId, query).catch(() => null),
    getCompanyRecruitmentFunnel(companyId, filters).catch(() => null),
  ])

  return {
    generatedAt: new Date().toISOString(),
    scope: 'company',
    period: filters.periodLabel,
    summary: {
      openRoles: dashboard?.recruitment?.activeJobs ?? null,
      applications: funnel?.counts?.applications ?? dashboard?.recruitment?.totalApplications ?? null,
      interviews: funnel?.counts?.interview ?? null,
      offers: funnel?.counts?.offer ?? null,
      hires: funnel?.counts?.hired ?? null,
    },
    funnel: funnel || { status: 'INSUFFICIENT_DATA' },
    hasData: funnel?.hasData || dashboard?.hasData || false,
  }
}

async function recordAccess(institutionId, userId, action, metadata = {}) {
  try {
    await recordExecutiveAudit({ institutionId, actorUserId: userId, action, metadata })
  } catch {
    /* non-blocking */
  }
}

module.exports = {
  sanitizeQuery,
  getExecutiveOverview,
  getSkillDemandAnalytics,
  getSkillGapAnalytics,
  getTrendAnalytics,
  getPartnershipHealthAnalytics,
  getProgramAlignmentAnalytics,
  getDataQualityCenter,
  getDecisionSupport,
  getExecutiveInsights,
  createWorkflowFromInsight,
  getCompanyExecutiveOverview,
  recordAccess,
  buildMetricRegistryValues,
  DECISION_SUPPORT_INTENTS,
  EXTENDED_METRIC_REGISTRY,
}
