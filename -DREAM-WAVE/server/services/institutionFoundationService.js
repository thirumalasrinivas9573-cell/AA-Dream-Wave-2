const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionStartup = require('../models/InstitutionStartup')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const { INSTITUTION_PROFILE_WRITABLE } = require('../constants/ecosystemProfiles')
const { getStats: getStudentStats } = require('./institutionStudentService')
const { getStats: getPlacementStats } = require('./institutionPlacementService')
const { getAdmissionsAnalytics, getFacultyIntelligence } = require('./institutionIntelligenceService')

function serializeProfile(doc) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: o._id.toString(),
    ownerUserId: o.ownerUserId?.toString(),
    name: o.name,
    type: o.type,
    code: o.code || '',
    email: o.email || '',
    phone: o.phone || '',
    website: o.website || '',
    logoUrl: o.logoUrl || '',
    address: o.address || '',
    city: o.city || '',
    state: o.state || '',
    country: o.country || '',
    description: o.description || '',
    departments: o.departments || [],
    programs: o.programs || [],
    verified: o.verified ?? false,
    isPublic: o.isPublic ?? true,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

async function getProfile(institutionId) {
  const institution = await Institution.findById(institutionId)
  if (!institution) {
    const err = new Error('Institution not found')
    err.statusCode = 404
    throw err
  }
  return serializeProfile(institution)
}

async function updateProfile(institutionId, payload = {}) {
  const institution = await Institution.findById(institutionId)
  if (!institution) {
    const err = new Error('Institution not found')
    err.statusCode = 404
    throw err
  }

  for (const key of INSTITUTION_PROFILE_WRITABLE) {
    if (payload[key] === undefined) continue
    if (key === 'departments' || key === 'programs') {
      institution[key] = Array.isArray(payload[key])
        ? payload[key].map((v) => String(v).trim()).filter(Boolean)
        : []
      continue
    }
    if (key === 'isPublic') {
      institution.isPublic = Boolean(payload[key])
      continue
    }
    institution[key] = typeof payload[key] === 'string' ? payload[key].trim() : payload[key]
  }

  await institution.save()
  return serializeProfile(institution)
}

async function getDashboardMetrics(institutionId) {
  const iid = institutionId.toString()

  const [
    institution,
    studentStats,
    placementStats,
    researchProjects,
    activeStartups,
    totalAlumni,
    admissions,
    faculty,
  ] = await Promise.all([
    Institution.findById(institutionId).lean(),
    getStudentStats(institutionId).catch(() => null),
    getPlacementStats(institutionId).catch(() => null),
    InstitutionResearchProject.countDocuments({ institutionId }),
    InstitutionStartup.countDocuments({ institutionId, status: { $in: ['active', 'incubating'] } }),
    InstitutionAlumni.countDocuments({ institutionId }),
    getAdmissionsAnalytics(institutionId).catch(() => ({ totalEnrolled: 0, pendingReview: 0, incompleteProfiles: 0 })),
    getFacultyIntelligence(institutionId).catch(() => ({ totalFaculty: 0 })),
  ])

  const totalStudents = studentStats?.total ?? 0
  const placedStudents = studentStats?.placedStudents ?? placementStats?.placed ?? 0
  const placementRate = totalStudents
    ? Math.round((placedStudents / totalStudents) * 100)
    : 0

  return {
    generatedAt: new Date().toISOString(),
    students: {
      total: totalStudents,
      active: studentStats?.active ?? 0,
      placed: placedStudents,
      placementRate,
      byDepartment: studentStats?.byDepartment ?? {},
    },
    organization: {
      departments: institution?.departments?.length ?? 0,
      programs: institution?.programs?.length ?? 0,
    },
    admissions: {
      totalApplications: admissions.totalEnrolled ?? 0,
      pendingReview: admissions.pendingReview ?? 0,
      incompleteProfiles: admissions.incompleteProfiles ?? 0,
      completeProfiles: admissions.completeProfiles ?? 0,
      source: admissions.source || 'enrolled_student_records',
    },
    faculty: {
      total: faculty.totalFaculty ?? 0,
    },
    placements: placementStats ?? {
      companies: 0,
      drives: 0,
      internships: 0,
      jobs: 0,
      applications: 0,
      interviews: 0,
      offers: 0,
      placed: 0,
      activePartnerships: 0,
    },
    research: {
      activeProjects: researchProjects,
    },
    incubation: {
      activeStartups,
    },
    alumni: {
      total: totalAlumni,
    },
    events: {
      upcoming: 0,
    },
    hasData: totalStudents > 0 || researchProjects > 0 || (placementStats?.applications ?? 0) > 0,
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getDashboardMetrics,
  serializeProfile,
}
