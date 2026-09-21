const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionMember = require('../models/InstitutionMember')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionResearchOpportunity = require('../models/InstitutionResearchOpportunity')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const { SUPPORT_THRESHOLDS, SUPPORT_SIGNAL_LABELS } = require('../constants/institutionIntelligence')
const institutionCache = require('./institutionCache')
const { getAnalyticsDashboard } = require('./institutionAnalyticsService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getInnovationAnalytics } = require('./institutionInnovationAnalyticsService')
const { getAlumniAnalytics } = require('./institutionAlumniAnalyticsService')
const { getIncubationStats } = require('./institutionIncubationService')
const { assertInstitutionStudent } = require('./institutionStudentService')
const { isProjectVisible, isCertificateVisible } = require('../utils/institutionStudentPrivacy')

function oid(value) {
  return new mongoose.Types.ObjectId(value)
}

function buildMatch(institutionId, filters = {}) {
  const match = { institutionId: oid(institutionId) }
  if (filters.department) match.department = filters.department
  if (filters.course) match.course = filters.course
  if (filters.batch) match.batch = filters.batch
  if (filters.academicYear) match.academicYear = filters.academicYear
  if (filters.semester) match.semester = filters.semester
  if (filters.status) match.status = filters.status
  if (filters.dateFrom || filters.dateTo) {
    match.createdAt = {}
    if (filters.dateFrom) match.createdAt.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) match.createdAt.$lte = new Date(filters.dateTo)
  }
  return match
}

function round(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.round(value * 10 ** digits) / 10 ** digits
}

function buildSupportSignalsForStudent(student) {
  const signals = []

  if (student.attendance > 0 && student.attendance < SUPPORT_THRESHOLDS.attendancePercent) {
    signals.push({
      type: 'attendance',
      label: SUPPORT_SIGNAL_LABELS.attendance,
      detail: `Attendance: ${student.attendance}% (configured threshold: ${SUPPORT_THRESHOLDS.attendancePercent}%)`,
      severity: 'attention',
      evidence: { attendance: student.attendance, threshold: SUPPORT_THRESHOLDS.attendancePercent },
    })
  }

  if (student.cgpa !== null && student.cgpa !== undefined && student.cgpa < SUPPORT_THRESHOLDS.cgpa) {
    signals.push({
      type: 'performance',
      label: SUPPORT_SIGNAL_LABELS.performance,
      detail: `CGPA: ${student.cgpa} (configured threshold: ${SUPPORT_THRESHOLDS.cgpa})`,
      severity: 'attention',
      evidence: { cgpa: student.cgpa, threshold: SUPPORT_THRESHOLDS.cgpa },
    })
  }

  if ((student.backlogs || 0) >= SUPPORT_THRESHOLDS.backlogs) {
    signals.push({
      type: 'backlogs',
      label: SUPPORT_SIGNAL_LABELS.backlogs,
      detail: `${student.backlogs} backlog(s) on record`,
      severity: 'attention',
      evidence: { backlogs: student.backlogs, threshold: SUPPORT_THRESHOLDS.backlogs },
    })
  }

  if (student.profileStatus === 'pending' || student.profileStatus === 'partial') {
    signals.push({
      type: 'profile',
      label: SUPPORT_SIGNAL_LABELS.profile,
      detail: `Profile status: ${student.profileStatus}`,
      severity: 'info',
      evidence: { profileStatus: student.profileStatus },
    })
  }

  const perf = student.performance || []
  if (perf.length >= 2) {
    const recent = perf[perf.length - 1]
    const prev = perf[perf.length - 2]
    if (typeof recent === 'number' && typeof prev === 'number' && recent < prev && recent < SUPPORT_THRESHOLDS.performanceTrend) {
      signals.push({
        type: 'declining_performance',
        label: SUPPORT_SIGNAL_LABELS.declining_performance,
        detail: 'Recent performance records show a declining trend',
        severity: 'attention',
        evidence: { recentPerformance: recent, previousPerformance: prev },
      })
    }
  }

  if (student.status === 'inactive') {
    signals.push({
      type: 'inactive',
      label: SUPPORT_SIGNAL_LABELS.inactive,
      detail: 'Student status is inactive',
      severity: 'info',
      evidence: { status: student.status },
    })
  }

  return signals
}

function serializeAcademicProfile(student) {
  const visibleProjects = (student.sharedProjects || []).filter(isProjectVisible).map((p) => ({
    title: p.title,
    technologies: p.technologies || [],
    status: p.status,
    visibility: p.visibility,
    demoUrl: p.demoUrl || '',
    repositoryUrl: p.repositoryUrl || '',
  }))

  const visibleCerts = (student.certifications || []).filter(isCertificateVisible).map((c) => ({
    title: c.title,
    issuer: c.issuer || c.issuingOrganization,
    skillsCovered: c.skillsCovered || [],
    verificationStatus: c.verificationStatus,
  }))

  return {
    id: student._id.toString(),
    studentId: student.studentId,
    rollNumber: student.rollNumber || '',
    fullName: student.fullName,
    email: student.email || '',
    department: student.department || '',
    course: student.course || '',
    batch: student.batch || '',
    semester: student.semester || '',
    academicYear: student.academicYear || '',
    status: student.status,
    cgpa: student.cgpa,
    attendance: student.attendance,
    backlogs: student.backlogs || 0,
    creditsEarned: student.creditsEarned || 0,
    expectedGraduation: student.expectedGraduation || '',
    sharedSkills: student.sharedSkills || [],
    verifiedSkills: student.verifiedSkills || [],
    projects: visibleProjects,
    certifications: visibleCerts,
    placement: {
      lifecycleStatus: student.placement?.lifecycleStatus || '',
      status: student.placement?.status || '',
      companyName: student.placement?.companyName || '',
      roleTitle: student.placement?.roleTitle || '',
    },
    profileStatus: student.profileStatus,
    supportSignals: buildSupportSignalsForStudent(student),
    progress: {
      gpa: student.cgpa,
      attendance: student.attendance,
      projectCount: visibleProjects.length,
      skillCount: (student.sharedSkills || []).length + (student.verifiedSkills || []).length,
      certificateCount: visibleCerts.length,
      sources: ['cgpa', 'attendance', 'sharedProjects', 'sharedSkills', 'certifications'].filter((s) => {
        if (s === 'cgpa') return student.cgpa !== null && student.cgpa !== undefined
        if (s === 'attendance') return student.attendance > 0
        if (s === 'sharedProjects') return visibleProjects.length > 0
        if (s === 'sharedSkills') return (student.sharedSkills || []).length > 0
        if (s === 'certifications') return visibleCerts.length > 0
        return false
      }),
    },
  }
}

async function getOverview(institutionId, filters = {}) {
  const cacheKey = institutionCache.makeKey('intel-overview', institutionId, JSON.stringify(filters))
  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const [
      institution,
      students,
      placement,
      research,
      alumni,
      incubation,
      facultyCount,
      activeOpportunities,
      admissions,
    ] = await Promise.all([
      Institution.findById(institutionId).lean(),
      getAnalyticsDashboard(institutionId, filters),
      getPlacementAnalytics(institutionId, filters),
      getInnovationAnalytics(institutionId, filters),
      getAlumniAnalytics(institutionId, filters),
      getIncubationStats(institutionId),
      InstitutionMember.countDocuments({
        institutionId,
        active: true,
        role: { $in: ['FACULTY', 'DEPARTMENT_HEAD', 'DEAN'] },
      }),
      CampusOpportunity.countDocuments({ institutionId, status: { $in: ['open', 'ongoing'] } }),
      getAdmissionsAnalytics(institutionId, filters),
    ])

    return {
      generatedAt: new Date().toISOString(),
      institution: {
        name: institution?.name || '',
        departments: institution?.departments?.length ?? 0,
        programs: institution?.programs?.length ?? 0,
      },
      metrics: {
        totalStudents: students.totalStudents ?? 0,
        activeStudents: students.activeStudents ?? 0,
        faculty: facultyCount,
        admissionsEnrolled: admissions.totalEnrolled ?? 0,
        admissionsPendingReview: admissions.pendingReview ?? 0,
        placementApplications: placement.applicationsSubmitted ?? 0,
        studentsPlaced: students.placedStudents ?? 0,
        researchProjects: research.totalResearchProjects ?? 0,
        incubationStartups: incubation.activeStartups ?? 0,
        alumniTotal: alumni.totalAlumni ?? 0,
        activeOpportunities,
      },
      modules: {
        students: { hasData: students.hasData, ...students },
        placement: { hasData: placement.hasData, ...placement },
        research: { hasData: research.hasData, ...research },
        incubation: { hasData: incubation.hasData, ...incubation },
        alumni: { hasData: alumni.hasData, ...alumni },
        admissions: { hasData: admissions.hasData, ...admissions },
      },
      thresholds: SUPPORT_THRESHOLDS,
      hasData:
        (students.totalStudents ?? 0) > 0
        || (research.totalResearchProjects ?? 0) > 0
        || (placement.applicationsSubmitted ?? 0) > 0,
    }
  })
}

async function getProgramIntelligence(institutionId, filters = {}) {
  const institution = await Institution.findById(institutionId).lean()
  const match = buildMatch(institutionId, filters)

  const departmentStats = await InstitutionStudent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$department',
        studentCount: { $sum: 1 },
        avgCgpa: { $avg: '$cgpa' },
        avgAttendance: { $avg: '$attendance' },
        placedCount: {
          $sum: {
            $cond: [{ $eq: ['$placement.lifecycleStatus', 'PLACED'] }, 1, 0],
          },
        },
        withProjects: {
          $sum: {
            $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedProjects', []] } }, 0] }, 1, 0],
          },
        },
        placementEligible: {
          $sum: {
            $cond: [
              { $in: ['$placement.lifecycleStatus', ['ELIGIBLE', 'READY', 'APPLYING']] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { studentCount: -1 } },
  ])

  const programNames = institution?.programs || []
  const departments = departmentStats.map((d) => ({
    name: d._id || 'Unknown',
    studentCount: d.studentCount,
    avgCgpa: round(d.avgCgpa),
    avgAttendance: round(d.avgAttendance),
    placedCount: d.placedCount,
    placementEligible: d.placementEligible,
    withProjects: d.withProjects,
    placementRate: d.placementEligible
      ? Math.round((d.placedCount / d.placementEligible) * 100)
      : null,
    coverage: d.studentCount > 0 ? 'complete' : 'empty',
  }))

  const programs = programNames.map((name) => {
    const related = departments.find((d) => d.name.toLowerCase().includes(name.toLowerCase()))
    return {
      name,
      studentCount: related?.studentCount ?? 0,
      avgCgpa: related?.avgCgpa ?? null,
      placedCount: related?.placedCount ?? 0,
      coverage: related ? 'partial' : 'no_student_mapping',
      note: related ? undefined : 'No direct student-to-program mapping; derived from department overlap where available.',
    }
  })

  return {
    departments,
    programs,
    registeredPrograms: programNames,
    registeredDepartments: institution?.departments || [],
    hasData: departments.length > 0,
    incompleteCoverage: programs.some((p) => p.coverage !== 'complete'),
  }
}

async function getCourseIntelligence(institutionId, filters = {}) {
  const match = buildMatch(institutionId, filters)

  const courseStats = await InstitutionStudent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$course',
        studentCount: { $sum: 1 },
        avgCgpa: { $avg: '$cgpa' },
        avgAttendance: { $avg: '$attendance' },
        withProjects: {
          $sum: {
            $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedProjects', []] } }, 0] }, 1, 0],
          },
        },
        placedCount: {
          $sum: {
            $cond: [{ $eq: ['$placement.lifecycleStatus', 'PLACED'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { studentCount: -1 } },
  ])

  const courses = courseStats.map((c) => ({
    name: c._id || 'Unknown',
    studentCount: c.studentCount,
    avgCgpa: round(c.avgCgpa),
    avgAttendance: round(c.avgAttendance),
    withProjects: c.withProjects,
    placedCount: c.placedCount,
    lowAttendanceCount: 0,
  }))

  if (courses.length) {
    const lowAttendance = await InstitutionStudent.aggregate([
      {
        $match: {
          ...match,
          attendance: { $gt: 0, $lt: SUPPORT_THRESHOLDS.attendancePercent },
        },
      },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ])
    const lowMap = Object.fromEntries(lowAttendance.map((x) => [x._id || 'Unknown', x.count]))
    for (const course of courses) {
      course.lowAttendanceCount = lowMap[course.name] || 0
    }
  }

  return {
    courses,
    totalCourses: courses.length,
    hasData: courses.length > 0,
    thresholds: { attendancePercent: SUPPORT_THRESHOLDS.attendancePercent },
  }
}

async function getSupportSignals(institutionId, filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20))
  const match = buildMatch(institutionId, filters)

  const students = await InstitutionStudent.find(match)
    .select(
      'fullName studentId rollNumber department course cgpa attendance backlogs status profileStatus performance',
    )
    .lean()

  const allSignals = []
  for (const student of students) {
    const signals = buildSupportSignalsForStudent(student)
    if (!signals.length) continue
    allSignals.push({
      studentId: student._id.toString(),
      studentName: student.fullName,
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      course: student.course || '',
      signals,
      signalCount: signals.length,
    })
  }

  allSignals.sort((a, b) => b.signalCount - a.signalCount)
  const total = allSignals.length
  const skip = (page - 1) * limit

  return {
    items: allSignals.slice(skip, skip + limit),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
    thresholds: SUPPORT_THRESHOLDS,
    disclaimer: 'Support signals are advisory indicators based on configured thresholds — not automatic judgments.',
    hasData: total > 0,
  }
}

async function getStudentAcademicProfile(institutionId, studentRecordId) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  return serializeAcademicProfile(doc.toObject ? doc.toObject() : doc)
}

async function getFacultyIntelligence(institutionId) {
  const [members, researchContributors] = await Promise.all([
    InstitutionMember.find({
      institutionId,
      active: true,
      role: { $in: ['FACULTY', 'DEPARTMENT_HEAD', 'DEAN', 'RESEARCH_COORDINATOR', 'RESEARCH_DIRECTOR'] },
    })
      .populate('userId', 'name email')
      .lean(),
    InstitutionResearchProject.aggregate([
      { $match: { institutionId: oid(institutionId) } },
      { $unwind: { path: '$members', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$members.name',
          projectCount: { $sum: 1 },
          roles: { $addToSet: '$members.memberType' },
        },
      },
      { $sort: { projectCount: -1 } },
      { $limit: 50 },
    ]),
  ])

  const faculty = members.map((m) => ({
    id: m._id.toString(),
    userId: m.userId?._id?.toString() || null,
    name: m.userId?.name || 'Unknown',
    email: m.userId?.email || '',
    role: m.role,
    active: m.active,
  }))

  return {
    faculty,
    totalFaculty: faculty.length,
    researchContributors: researchContributors.map((r) => ({
      name: r._id || 'Unknown',
      projectCount: r.projectCount,
      roles: r.roles || [],
    })),
    hasData: faculty.length > 0 || researchContributors.length > 0,
    note: faculty.length === 0 && researchContributors.length > 0
      ? 'Faculty directory uses institution members; research contributors derived from project membership.'
      : undefined,
  }
}

async function getAdmissionsAnalytics(institutionId, filters = {}) {
  const match = buildMatch(institutionId, filters)

  const [totalEnrolled, byProfileStatus, byAdmissionYear, monthlyTrend] = await Promise.all([
    InstitutionStudent.countDocuments(match),
    InstitutionStudent.aggregate([
      { $match: match },
      { $group: { _id: '$profileStatus', count: { $sum: 1 } } },
    ]),
    InstitutionStudent.aggregate([
      { $match: match },
      { $group: { _id: '$admissionYear', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
    InstitutionStudent.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
  ])

  const profileMap = Object.fromEntries(byProfileStatus.map((x) => [x._id || 'unknown', x.count]))

  return {
    totalEnrolled,
    pendingReview: profileMap.pending || 0,
    incompleteProfiles: profileMap.partial || 0,
    completeProfiles: profileMap.complete || 0,
    byAdmissionYear: Object.fromEntries(
      byAdmissionYear.filter((x) => x._id).map((x) => [x._id, x.count]),
    ),
    monthlyEnrollments: monthlyTrend.map((x) => ({
      year: x._id.year,
      month: x._id.month,
      count: x.count,
    })),
    hasData: totalEnrolled > 0,
    source: 'enrolled_student_records',
    note: 'Derived from institution student records. No separate admission application pipeline exists.',
  }
}

async function getAcademicAnalytics(institutionId, filters = {}) {
  const [students, programs, courses, support] = await Promise.all([
    getAnalyticsDashboard(institutionId, filters),
    getProgramIntelligence(institutionId, filters),
    getCourseIntelligence(institutionId, filters),
    getSupportSignals(institutionId, filters, { page: 1, limit: 5 }),
  ])

  return {
    students,
    programs: {
      departmentCount: programs.departments.length,
      programCount: programs.programs.length,
      topDepartments: programs.departments.slice(0, 5),
    },
    courses: {
      courseCount: courses.totalCourses,
      topCourses: courses.courses.slice(0, 5),
    },
    supportSummary: {
      studentsWithSignals: support.total,
      sample: support.items,
      thresholds: SUPPORT_THRESHOLDS,
    },
    hasData: students.hasData,
  }
}

async function getCareerOutcomes(institutionId, filters = {}) {
  const [students, placement, courseStats] = await Promise.all([
    getAnalyticsDashboard(institutionId, filters),
    getPlacementAnalytics(institutionId, filters),
    InstitutionStudent.aggregate([
      { $match: buildMatch(institutionId, filters) },
      {
        $group: {
          _id: '$course',
          studentCount: { $sum: 1 },
          placedCount: {
            $sum: {
              $cond: [{ $eq: ['$placement.lifecycleStatus', 'PLACED'] }, 1, 0],
            },
          },
          withProjects: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedProjects', []] } }, 0] }, 1, 0],
            },
          },
        },
      },
    ]),
  ])

  const placementRate = students.placementEligible
    ? Math.round((students.placedStudents / students.placementEligible) * 100)
    : 0

  return {
    placementRate,
    studentsPlaced: students.placedStudents ?? 0,
    placementEligible: students.placementEligible ?? 0,
    applicationsSubmitted: placement.applicationsSubmitted ?? 0,
    offersReleased: placement.offersReleased ?? 0,
    byDepartmentPlaced: placement.byDepartmentPlaced || {},
    byCourse: courseStats.map((c) => ({
      course: c._id || 'Unknown',
      studentCount: c.studentCount,
      placedCount: c.placedCount,
      withProjects: c.withProjects,
      observedPlacementRate: c.studentCount ? Math.round((c.placedCount / c.studentCount) * 100) : 0,
    })),
    skillDevelopment: {
      withSharedProjects: students.withSharedProjects ?? 0,
      withVerifiedCertificates: students.withVerifiedCertificates ?? 0,
    },
    disclaimer: 'Observed relationships from available records — not causal claims.',
    hasData: students.hasData || placement.hasData,
  }
}

async function getOpportunitiesSummary(institutionId) {
  const [campus, research, alumni] = await Promise.all([
    CampusOpportunity.find({ institutionId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title status opportunityType deadline requiredSkills')
      .lean(),
    InstitutionResearchOpportunity.find({ institutionId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title status type deadline')
      .lean(),
    InstitutionAlumni.countDocuments({ institutionId }),
  ])

  const activeCampus = campus.filter((o) => ['open', 'ongoing'].includes(o.status))

  return {
    campusOpportunities: {
      total: campus.length,
      active: activeCampus.length,
      items: activeCampus.slice(0, 10).map((o) => ({
        id: o._id.toString(),
        title: o.title,
        type: o.opportunityType,
        status: o.status,
        deadline: o.deadline,
        requiredSkills: o.requiredSkills || [],
      })),
    },
    researchOpportunities: {
      total: research.length,
      active: research.filter((o) => o.status === 'open').length,
      items: research.slice(0, 10).map((o) => ({
        id: o._id.toString(),
        title: o.title,
        type: o.type,
        status: o.status,
        deadline: o.deadline,
      })),
    },
    alumniNetworkSize: alumni,
    hasData: campus.length > 0 || research.length > 0,
  }
}

async function buildAiContext(institutionId, filters = {}) {
  const [overview, programs, support, admissions, career, opportunities, faculty] = await Promise.all([
    getOverview(institutionId, filters),
    getProgramIntelligence(institutionId, filters),
    getSupportSignals(institutionId, filters, { page: 1, limit: 10 }),
    getAdmissionsAnalytics(institutionId, filters),
    getCareerOutcomes(institutionId, filters),
    getOpportunitiesSummary(institutionId),
    getFacultyIntelligence(institutionId),
  ])

  return {
    overview: overview.metrics,
    programs: {
      topDepartments: programs.departments.slice(0, 5),
      registeredPrograms: programs.registeredPrograms,
    },
    support: {
      studentsWithSignals: support.total,
      thresholds: support.thresholds,
      sample: support.items.slice(0, 5),
    },
    admissions,
    career,
    opportunities,
    faculty: { totalFaculty: faculty.totalFaculty },
    thresholds: SUPPORT_THRESHOLDS,
  }
}

module.exports = {
  getOverview,
  getProgramIntelligence,
  getCourseIntelligence,
  getSupportSignals,
  getStudentAcademicProfile,
  getFacultyIntelligence,
  getAdmissionsAnalytics,
  getAcademicAnalytics,
  getCareerOutcomes,
  getOpportunitiesSummary,
  buildAiContext,
  buildSupportSignalsForStudent,
  SUPPORT_THRESHOLDS,
}
