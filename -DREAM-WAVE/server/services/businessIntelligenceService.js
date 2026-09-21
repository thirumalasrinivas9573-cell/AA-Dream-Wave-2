const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const CampusOpportunity = require('../models/CampusOpportunity')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const Post = require('../models/Post')
const UserProfile = require('../models/UserProfile')
const Roadmap = require('../models/Roadmap')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const { isActiveListingStatus } = require('../constants/companyRecruitment')
const { MIN_TREND_POINTS, FUNNEL_DEFINITION } = require('../constants/businessIntelligence')
const institutionCache = require('./institutionCache')
const { getOverview, getProgramIntelligence, getAdmissionsAnalytics, getCareerOutcomes, getAcademicAnalytics } = require('./institutionIntelligenceService')
const { getInnovationAnalytics } = require('./institutionInnovationAnalyticsService')
const { getRecruitmentAnalytics } = require('./recruitmentAnalyticsService')
const { getFunnel } = require('./recruitmentService')
const { getStudentCareerDashboard } = require('./studentRecruitmentService')

function oid(value) {
  return new mongoose.Types.ObjectId(value)
}

function normalizeSkill(skill) {
  return String(skill || '').trim().toLowerCase()
}

function parsePeriod(query = {}) {
  const now = new Date()
  if (query.dateFrom || query.dateTo) {
    return {
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || now.toISOString(),
      periodLabel: 'custom',
    }
  }
  const preset = query.period || 'all'
  if (preset === 'all') {
    return { dateFrom: undefined, dateTo: undefined, periodLabel: 'all_time' }
  }
  const daysMap = { today: 0, '7d': 7, '30d': 30, '90d': 90 }
  const days = daysMap[preset]
  if (days === undefined) {
    return { dateFrom: undefined, dateTo: undefined, periodLabel: 'all_time' }
  }
  const dateTo = now
  let dateFrom
  if (days === 0) {
    dateFrom = new Date(now)
    dateFrom.setHours(0, 0, 0, 0)
  } else {
    dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  }
  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    periodLabel: preset,
  }
}

function buildFilters(query = {}) {
  const period = parsePeriod(query)
  return {
    department: query.department || undefined,
    course: query.course || undefined,
    batch: query.batch || undefined,
    academicYear: query.academicYear || undefined,
    semester: query.semester || undefined,
    status: query.status || undefined,
    program: query.program || undefined,
    opportunityType: query.opportunityType || undefined,
    stage: query.stage || undefined,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    periodLabel: period.periodLabel,
  }
}

function buildDateMatch(filters = {}, field = 'createdAt') {
  if (!filters.dateFrom && !filters.dateTo) return {}
  const match = {}
  match[field] = {}
  if (filters.dateFrom) match[field].$gte = new Date(filters.dateFrom)
  if (filters.dateTo) match[field].$lte = new Date(filters.dateTo)
  return match
}

function aggregateSkillCounts(items, accessor) {
  const counts = new Map()
  for (const item of items) {
    const skills = accessor(item) || []
    for (const raw of skills) {
      const skill = normalizeSkill(raw)
      if (!skill) continue
      counts.set(skill, (counts.get(skill) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count }))
}

function buildTrendSeries(monthlyRows, minPoints = MIN_TREND_POINTS) {
  const points = monthlyRows
    .filter((r) => r._id)
    .sort((a, b) => String(a._id).localeCompare(String(b._id)))
    .map((r) => ({ period: r._id, count: r.count }))
  if (points.length < minPoints) {
    return {
      hasTrend: false,
      message: 'Not enough historical data.',
      points: points.length ? points : [],
    }
  }
  return { hasTrend: true, points }
}

async function getInstitutionSkillAnalytics(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const [opportunities, students, partnerships] = await Promise.all([
    CampusOpportunity.find({ institutionId: iid, ...buildDateMatch(filters) }).lean(),
    InstitutionStudent.find({ institutionId: iid }).lean(),
    InstitutionCompanyPartnership.find({ institutionId: iid, status: 'active' }).lean(),
  ])

  const companyIds = partnerships.map((p) => p.companyId)
  const [jobs, internships] = companyIds.length
    ? await Promise.all([
        RecruitmentJob.find({ companyId: { $in: companyIds }, ...buildDateMatch(filters) }).lean(),
        RecruitmentInternship.find({ companyId: { $in: companyIds }, ...buildDateMatch(filters) }).lean(),
      ])
    : [[], []]

  const demandItems = [...opportunities, ...jobs, ...internships]
  const demand = aggregateSkillCounts(demandItems, (x) => x.requiredSkills)

  const supplyCounts = new Map()
  for (const student of students) {
    const skills = [
      ...(student.sharedSkills || []),
      ...(student.verifiedSkills || []),
      ...(student.programmingLanguages || []),
      ...((student.sharedProjects || []).flatMap((p) => p.technologies || [])),
      ...((student.certifications || []).flatMap((c) => c.skillsCovered || [])),
    ]
    for (const raw of skills) {
      const skill = normalizeSkill(raw)
      if (!skill) continue
      supplyCounts.set(skill, (supplyCounts.get(skill) || 0) + 1)
    }
  }
  const supply = [...supplyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count }))

  const demandSet = new Set(demand.map((d) => d.skill))
  const supplySet = new Set(supply.map((s) => s.skill))
  const gaps = demand.filter((d) => !supplySet.has(d.skill)).slice(0, 15)
  const overlap = demand.filter((d) => supplySet.has(d.skill)).slice(0, 15)

  return {
    scope: 'institution',
    period: filters.periodLabel || 'all_time',
    demand: demand.slice(0, 20),
    supply: supply.slice(0, 20),
    gaps,
    overlap,
    definitions: {
      demand: 'Skills listed on active campus opportunities and partner company job/internship listings.',
      supply: 'Aggregate skills from student-shared profiles, verified skills, projects, and certifications.',
      gaps: 'Skills in demand not represented in aggregate student evidence (institution-level only).',
    },
    hasData: demand.length > 0 || supply.length > 0,
  }
}

async function getInstitutionTrends(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const dateMatch = buildDateMatch(filters)

  const [admissionsTrend, applicationsTrend, placementsTrend] = await Promise.all([
    InstitutionStudent.aggregate([
      { $match: { institutionId: iid, ...dateMatch } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    RecruitmentApplication.aggregate([
      { $match: { institutionId: iid, ...dateMatch } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    InstitutionStudent.aggregate([
      {
        $match: {
          institutionId: iid,
          'placement.lifecycleStatus': 'PLACED',
          ...buildDateMatch(filters, 'placement.updatedAt'),
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$placement.updatedAt' } }, count: { $sum: 1 } } },
    ]),
  ])

  return {
    period: filters.periodLabel || 'all_time',
    admissions: buildTrendSeries(admissionsTrend),
    applications: buildTrendSeries(applicationsTrend),
    placements: buildTrendSeries(placementsTrend),
  }
}

async function getInstitutionCommunityAnalytics(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const match = { organizationId: iid, visibility: { $in: ['public', 'institution'] }, ...buildDateMatch(filters) }

  const [total, byType, byVisibility] = await Promise.all([
    Post.countDocuments(match),
    Post.aggregate([{ $match: match }, { $group: { _id: '$postType', count: { $sum: 1 } } }]),
    Post.aggregate([{ $match: match }, { $group: { _id: '$visibility', count: { $sum: 1 } } }]),
  ])

  return {
    totalPosts: total,
    byType: Object.fromEntries(byType.map((x) => [x._id || 'GENERAL', x.count])),
    byVisibility: Object.fromEntries(byVisibility.map((x) => [x._id || 'public', x.count])),
    period: filters.periodLabel || 'all_time',
    hasData: total > 0,
    note: 'Aggregate public and institution-visible community activity only.',
  }
}

async function getInstitutionProjectAnalytics(institutionId, filters = {}) {
  const students = await InstitutionStudent.find({ institutionId: oid(institutionId) }).lean()
  let active = 0
  let completed = 0
  let publicProjects = 0
  const techCounts = new Map()

  for (const student of students) {
    for (const project of student.sharedProjects || []) {
      if (project.status === 'completed') completed += 1
      else active += 1
      if (project.visibility === 'public') publicProjects += 1
      for (const t of project.technologies || []) {
        const skill = normalizeSkill(t)
        if (skill) techCounts.set(skill, (techCounts.get(skill) || 0) + 1)
      }
    }
  }

  const MJProject = mongoose.models.MJProject
  let platformProjects = null
  if (MJProject) {
    const linkedUserIds = students.filter((s) => s.linkedUserId).map((s) => String(s.linkedUserId))
    if (linkedUserIds.length) {
      const [activeCount, completedCount] = await Promise.all([
        MJProject.countDocuments({ userId: { $in: linkedUserIds }, status: 'active', archived: { $ne: true } }),
        MJProject.countDocuments({ userId: { $in: linkedUserIds }, status: 'completed', archived: { $ne: true } }),
      ])
      platformProjects = { active: activeCount, completed: completedCount }
    }
  }

  return {
    sharedProjects: { active, completed, public: publicProjects, total: active + completed },
    platformProjects,
    topTechnologies: [...techCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count })),
    period: filters.periodLabel || 'all_time',
    hasData: active + completed > 0 || Boolean(platformProjects?.active || platformProjects?.completed),
    source: 'InstitutionStudent.sharedProjects and linked MJProject records where available.',
  }
}

async function getInstitutionLearningAnalytics(institutionId) {
  const students = await InstitutionStudent.find({ institutionId: oid(institutionId), linkedUserId: { $ne: null } }).lean()
  const linkedUserIds = students.map((s) => String(s.linkedUserId))
  const MJLearning = mongoose.models.MJLearning
  if (!MJLearning || !linkedUserIds.length) {
    return {
      hasData: false,
      note: 'No linked student learning records available.',
      aggregateProgress: null,
      topics: [],
    }
  }

  const records = await MJLearning.find({ userId: { $in: linkedUserIds }, archived: { $ne: true } }).lean()
  const topics = records.slice(0, 10).map((r) => ({
    topic: r.topic,
    progress: r.progress,
    skillLevel: r.skillLevel,
  }))
  const avgProgress = records.length
    ? Math.round(records.reduce((s, r) => s + (r.progress || 0), 0) / records.length)
    : null

  return {
    hasData: records.length > 0,
    recordCount: records.length,
    aggregateProgress: avgProgress,
    topics,
    note: 'Aggregate learning activity from linked student accounts only.',
  }
}

async function getInstitutionDataQuality(institutionId) {
  const iid = oid(institutionId)
  const warnings = []

  const [missingDept, missingStatus, appsNoStage, duplicateApps] = await Promise.all([
    InstitutionStudent.countDocuments({ institutionId: iid, $or: [{ department: '' }, { department: null }] }),
    InstitutionStudent.countDocuments({ institutionId: iid, $or: [{ status: '' }, { status: null }] }),
    RecruitmentApplication.countDocuments({ institutionId: iid, $or: [{ stage: '' }, { stage: null }] }),
    RecruitmentApplication.aggregate([
      { $match: { institutionId: iid } },
      {
        $group: {
          _id: { candidateUserId: '$candidateUserId', jobId: '$jobId', internshipId: '$internshipId' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $count: 'duplicates' },
    ]),
  ])

  if (missingDept) warnings.push({ type: 'missing_department', count: missingDept, severity: 'warning' })
  if (missingStatus) warnings.push({ type: 'missing_status', count: missingStatus, severity: 'warning' })
  if (appsNoStage) warnings.push({ type: 'missing_application_stage', count: appsNoStage, severity: 'warning' })
  const dupCount = duplicateApps[0]?.duplicates || 0
  if (dupCount) warnings.push({ type: 'duplicate_applications', count: dupCount, severity: 'attention' })

  return { warnings, hasIssues: warnings.length > 0 }
}

async function getInstitutionDashboard(institutionId, query = {}) {
  const filters = buildFilters(query)
  const cacheKey = institutionCache.makeKey('bi-dashboard', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const [
      overview,
      academic,
      career,
      research,
      skills,
      trends,
      community,
      projects,
      learning,
      dataQuality,
    ] = await Promise.all([
      getOverview(institutionId, filters),
      getAcademicAnalytics(institutionId, filters),
      getCareerOutcomes(institutionId, filters),
      getInnovationAnalytics(institutionId, filters),
      getInstitutionSkillAnalytics(institutionId, filters),
      getInstitutionTrends(institutionId, filters),
      getInstitutionCommunityAnalytics(institutionId, filters),
      getInstitutionProjectAnalytics(institutionId, filters),
      getInstitutionLearningAnalytics(institutionId),
      getInstitutionDataQuality(institutionId),
    ])

    const programs = await getProgramIntelligence(institutionId, filters)
    const admissions = await getAdmissionsAnalytics(institutionId, filters)

    return {
      generatedAt: new Date().toISOString(),
      scope: 'institution',
      period: filters.periodLabel,
      filters: {
        department: filters.department,
        course: filters.course,
        batch: filters.batch,
        academicYear: filters.academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
      overview: {
        students: overview.metrics?.totalStudents ?? 0,
        activeStudents: overview.metrics?.activeStudents ?? 0,
        programs: overview.institution?.programs ?? 0,
        faculty: overview.metrics?.faculty ?? 0,
        admissionsEnrolled: admissions.totalEnrolled ?? 0,
        admissionsPendingReview: admissions.pendingReview ?? 0,
      },
      academic: {
        enrollment: academic.students?.totalStudents ?? 0,
        programActivity: programs.departments?.slice(0, 5) ?? [],
        courseActivity: academic.courses?.topCourses ?? [],
        supportSignals: academic.supportSummary?.studentsWithSignals ?? 0,
      },
      career: {
        applications: career.applicationsSubmitted ?? 0,
        interviews: (() => {
          const stages = overview.modules?.placement?.byApplicationStage || {}
          return (stages.interview || 0) + (stages.final_interview || 0)
        })(),
        offers: career.offersReleased ?? 0,
        placements: career.studentsPlaced ?? 0,
        placementRate: career.placementRate,
        placementRateDefinition: 'placedStudents / placementEligible × 100 within scope.',
        funnel: overview.modules?.placement?.byApplicationStage ?? {},
      },
      research: {
        active: research.activeProjects ?? 0,
        completed: research.completedProjects ?? 0,
        total: research.totalResearchProjects ?? 0,
        publications: research.totalPublications ?? 0,
      },
      opportunities: {
        active: overview.metrics?.activeOpportunities ?? 0,
        jobs: overview.modules?.placement?.campusDrives ?? 0,
        internships: overview.modules?.placement?.internshipListings ?? 0,
      },
      skills,
      trends,
      community,
      projects,
      learning,
      admissions,
      dataQuality,
      hasData: overview.hasData,
    }
  })
}

async function getCompanyRecruitmentFunnel(companyId, filters = {}) {
  const funnel = await getFunnel(companyId)
  const appMatch = { companyId: oid(companyId), ...buildDateMatch(filters) }
  const uniqueApplications = await RecruitmentApplication.countDocuments(appMatch)

  return {
    ...FUNNEL_DEFINITION,
    period: filters.periodLabel || 'all_time',
    counts: {
      applications: uniqueApplications,
      screening: funnel.reviewed,
      shortlisted: funnel.shortlisted,
      interview: funnel.interviewed,
      selected: funnel.selected,
      offer: funnel.offered,
      hired: funnel.hired,
    },
    hasData: uniqueApplications > 0,
  }
}

async function getCompanySkillAnalytics(companyId, filters = {}) {
  const cid = oid(companyId)
  const dateMatch = buildDateMatch(filters)
  const [jobs, internships, applications] = await Promise.all([
    RecruitmentJob.find({ companyId: cid, ...dateMatch }).lean(),
    RecruitmentInternship.find({ companyId: cid, ...dateMatch }).lean(),
    RecruitmentApplication.find({ companyId: cid, ...dateMatch }).lean(),
  ])

  const demand = aggregateSkillCounts([...jobs, ...internships], (x) => x.requiredSkills)
  const supply = aggregateSkillCounts(applications, (x) => x.candidateSnapshot?.skills || [])

  const supplySet = new Set(supply.map((s) => s.skill))
  const gaps = demand.filter((d) => !supplySet.has(d.skill)).slice(0, 15)

  return {
    scope: 'company',
    period: filters.periodLabel || 'all_time',
    demand: demand.slice(0, 20),
    supply: supply.slice(0, 20),
    gaps,
    definitions: {
      demand: 'Skills required on active and historical job/internship listings.',
      supply: 'Skills evidenced in candidate application snapshots (aggregate).',
    },
    hasData: demand.length > 0 || supply.length > 0,
  }
}

async function getCompanyTrends(companyId, filters = {}) {
  const cid = oid(companyId)
  const dateMatch = buildDateMatch(filters)

  const [applicationsTrend, jobsTrend, hiresTrend] = await Promise.all([
    RecruitmentApplication.aggregate([
      { $match: { companyId: cid, ...dateMatch } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    RecruitmentJob.aggregate([
      { $match: { companyId: cid, ...dateMatch } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    RecruitmentApplication.aggregate([
      { $match: { companyId: cid, stage: 'hired', ...buildDateMatch(filters, 'updatedAt') } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } }, count: { $sum: 1 } } },
    ]),
  ])

  return {
    period: filters.periodLabel || 'all_time',
    applications: buildTrendSeries(applicationsTrend),
    jobsPosted: buildTrendSeries(jobsTrend),
    hires: buildTrendSeries(hiresTrend),
  }
}

async function getCompanyDataQuality(companyId) {
  const cid = oid(companyId)
  const warnings = []

  const [appsNoStage, jobsNoSkills, interviewsNoOutcome] = await Promise.all([
    RecruitmentApplication.countDocuments({ companyId: cid, $or: [{ stage: '' }, { stage: null }] }),
    RecruitmentJob.countDocuments({ companyId: cid, $or: [{ requiredSkills: { $size: 0 } }, { requiredSkills: null }] }),
    RecruitmentInterview.countDocuments({ companyId: cid, outcome: { $in: [null, ''] } }),
  ])

  if (appsNoStage) warnings.push({ type: 'missing_application_stage', count: appsNoStage, severity: 'warning' })
  if (jobsNoSkills) warnings.push({ type: 'missing_required_skills', count: jobsNoSkills, severity: 'info' })
  if (interviewsNoOutcome) warnings.push({ type: 'missing_interview_outcome', count: interviewsNoOutcome, severity: 'info' })

  return { warnings, hasIssues: warnings.length > 0 }
}

async function getCompanyDashboard(companyId, query = {}) {
  const filters = buildFilters(query)
  const [analytics, funnel, skills, trends, dataQuality] = await Promise.all([
    getRecruitmentAnalytics(companyId, filters),
    getCompanyRecruitmentFunnel(companyId, filters),
    getCompanySkillAnalytics(companyId, filters),
    getCompanyTrends(companyId, filters),
    getCompanyDataQuality(companyId),
  ])

  const cid = oid(companyId)
  const activeJobs = await RecruitmentJob.countDocuments({ companyId: cid, status: { $in: ['open', 'active', 'published'] } })
  const activeInternships = await RecruitmentInternship.countDocuments({
    companyId: cid,
    status: { $in: ['open', 'active', 'published'] },
  })

  return {
    generatedAt: new Date().toISOString(),
    scope: 'company',
    period: filters.periodLabel,
    filters: {
      department: filters.department,
      stage: filters.stage,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
    overview: {
      activeJobs,
      activeInternships,
      totalApplications: analytics.totalApplications ?? 0,
      activeRecruitments: analytics.activeRecruitments ?? 0,
      hired: analytics.candidatePipelineDistribution?.hired ?? 0,
    },
    recruitment: analytics,
    funnel,
    skills,
    trends,
    dataQuality,
    hasData: analytics.hasData,
  }
}

async function getStudentCareerAnalytics(userId, query = {}) {
  const filters = buildFilters(query)
  const dashboard = await getStudentCareerDashboard(userId)
  const [profile, roadmaps] = await Promise.all([
    UserProfile.findOne({ userId: oid(userId) }).lean(),
    Roadmap.find({ userId: oid(userId) }).lean(),
  ])

  const MJProject = mongoose.models.MJProject
  const MJLearning = mongoose.models.MJLearning
  const uid = String(userId)

  const [projectCount, learningCount] = await Promise.all([
    MJProject ? MJProject.countDocuments({ userId: uid, archived: { $ne: true } }) : 0,
    MJLearning ? MJLearning.countDocuments({ userId: uid, archived: { $ne: true } }) : 0,
  ])

  const skills = profile?.skills || []
  const roadmapSkills = (roadmaps[0]?.data?.skills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean)

  return {
    generatedAt: new Date().toISOString(),
    scope: 'student',
    period: filters.periodLabel,
    applications: dashboard.applications,
    interviews: dashboard.interviews,
    offers: dashboard.offers,
    byStage: dashboard.byStage,
    openOpportunities: dashboard.openOpportunities,
    hasInstitutionLink: dashboard.hasInstitutionLink,
    skills: {
      profile: skills.slice(0, 20),
      roadmap: roadmapSkills.slice(0, 20),
      count: new Set([...skills, ...roadmapSkills].map(normalizeSkill)).size,
    },
    projects: { count: projectCount },
    learning: { count: learningCount, roadmaps: roadmaps.length },
    hasData: dashboard.applications > 0 || skills.length > 0 || projectCount > 0,
    note: 'Student-owned career analytics. Private reasoning is not exposed.',
  }
}

async function buildBiContext(scope, scopeId, query = {}) {
  const filters = buildFilters(query)
  if (scope === 'institution') {
    const dashboard = await getInstitutionDashboard(scopeId, query)
    return { scope, filters, dashboard }
  }
  if (scope === 'company') {
    const dashboard = await getCompanyDashboard(scopeId, query)
    return { scope, filters, dashboard }
  }
  if (scope === 'student') {
    const analytics = await getStudentCareerAnalytics(scopeId, query)
    return { scope, filters, analytics }
  }
  return { scope, filters }
}

module.exports = {
  parsePeriod,
  buildFilters,
  getInstitutionDashboard,
  getInstitutionSkillAnalytics,
  getInstitutionTrends,
  getInstitutionCommunityAnalytics,
  getInstitutionProjectAnalytics,
  getInstitutionLearningAnalytics,
  getInstitutionDataQuality,
  getCompanyDashboard,
  getCompanyRecruitmentFunnel,
  getCompanySkillAnalytics,
  getCompanyTrends,
  getCompanyDataQuality,
  getStudentCareerAnalytics,
  buildBiContext,
}
