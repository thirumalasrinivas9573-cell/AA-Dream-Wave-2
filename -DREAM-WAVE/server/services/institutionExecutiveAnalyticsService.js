const { getCommandCenterOverview } = require('./institutionCommandCenterService')
const institutionCache = require('./institutionCache')

function buildDepartmentPerformance(students, placement) {
  const departments = new Set([
    ...Object.keys(students.byDepartment || {}),
    ...Object.keys(placement.byDepartmentPlaced || {}),
    ...Object.keys(placement.byDepartment || {}),
  ])

  return Object.fromEntries(
    [...departments].map((dept) => {
      const enrolled = students.byDepartment?.[dept] || 0
      const placed = placement.byDepartmentPlaced?.[dept] || 0
      const applications = placement.byDepartment?.[dept] || 0
      return [
        dept,
        {
          enrolled,
          placed,
          applications,
          placementRate: enrolled ? Math.round((placed / enrolled) * 100) : 0,
        },
      ]
    }),
  )
}

function buildStrategicKPIs(overview) {
  const { executive, qualityIntelligence, industryIntelligence, researchIntelligence, comparisons } = overview

  const kpis = [
    {
      id: 'institutional_health',
      category: 'institutional',
      label: 'Institution Health Score',
      value: executive.healthScore,
      unit: 'score',
    },
    {
      id: 'placement_rate',
      category: 'placement',
      label: 'Placement Rate',
      value: executive.placementRate,
      unit: 'percent',
    },
    {
      id: 'student_enrollment',
      category: 'student',
      label: 'Total Students',
      value: executive.totalStudents,
      unit: 'count',
    },
    {
      id: 'avg_cgpa',
      category: 'academic',
      label: 'Average CGPA',
      value: executive.avgCgpa,
      unit: 'gpa',
    },
    {
      id: 'avg_attendance',
      category: 'academic',
      label: 'Average Attendance',
      value: executive.avgAttendance,
      unit: 'percent',
    },
    {
      id: 'research_publications',
      category: 'research',
      label: 'Research Publications',
      value: executive.totalPublications,
      unit: 'count',
    },
    {
      id: 'active_research_projects',
      category: 'research',
      label: 'Active Research Projects',
      value: researchIntelligence.activeResearchProjects,
      unit: 'count',
    },
    {
      id: 'faculty_participation',
      category: 'faculty',
      label: 'Faculty Research Participation',
      value: researchIntelligence.facultyParticipation,
      unit: 'count',
    },
    {
      id: 'startup_portfolio',
      category: 'innovation',
      label: 'Active Startups',
      value: executive.activeStartups,
      unit: 'count',
    },
    {
      id: 'industry_partners',
      category: 'industry',
      label: 'Active Industry Partners',
      value: industryIntelligence.activeIndustryPartners,
      unit: 'count',
    },
    {
      id: 'industry_applications',
      category: 'industry',
      label: 'Recruitment Applications',
      value: industryIntelligence.applicationsSubmitted,
      unit: 'count',
    },
    {
      id: 'alumni_verified',
      category: 'alumni',
      label: 'Verified Alumni',
      value: executive.verifiedAlumni,
      unit: 'count',
    },
    {
      id: 'quality_evidence',
      category: 'quality',
      label: 'Quality Evidence Coverage',
      value: qualityIntelligence.qualityEvidenceCoverage,
      unit: 'percent',
    },
    {
      id: 'research_funding',
      category: 'research',
      label: 'Approved Research Funding',
      value: executive.totalFundingAmount,
      unit: 'currency',
    },
  ]

  if (comparisons?.length) {
    for (const kpi of kpis) {
      const match = comparisons.find((c) => {
        if (kpi.id === 'student_enrollment' && c.label === 'Total Students') return true
        if (kpi.id === 'placement_rate' && c.label === 'Placement Rate %') return true
        if (kpi.id === 'research_publications' && c.label === 'Research Publications') return true
        if (kpi.id === 'startup_portfolio' && c.label === 'Active Startups') return true
        if (kpi.id === 'alumni_verified' && c.label === 'Verified Alumni') return true
        return false
      })
      if (match) {
        kpi.previousValue = match.previous
        kpi.absoluteChange = match.absoluteChange
        kpi.percentageChange = match.percentageChange
      }
    }
  }

  return kpis
}

async function getExecutiveAnalytics(institutionId, filters = {}) {
  const cacheKey = institutionCache.makeKey('executive-analytics', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const overview = await getCommandCenterOverview(institutionId, filters)
    const { executive, modules, qualityIntelligence, industryIntelligence, researchIntelligence, outcomeIntelligence } = overview
    const students = modules.students
    const placement = modules.placement

    const departmentWisePerformance = buildDepartmentPerformance(students, placement)
    const strategicKPIs = buildStrategicKPIs(overview)

    return {
      generatedAt: overview.generatedAt,
      timeFilter: overview.timeFilter,
      filterOptions: overview.filterOptions,
      overallInstitutionalPerformance: {
        healthScore: executive.healthScore,
        totalStudents: executive.totalStudents,
        activeStudents: executive.activeStudents,
        activePartnerships: executive.activePartnerships,
        eventRegistrations: executive.eventRegistrations,
      },
      academicPerformance: {
        avgCgpa: executive.avgCgpa,
        avgAttendance: executive.avgAttendance,
        byDepartment: students.byDepartment,
        bySemester: students.bySemester,
        byProgram: students.byProgram,
      },
      studentSuccessMetrics: outcomeIntelligence.studentSuccess,
      facultyPerformance: {
        researchParticipation: researchIntelligence.facultyParticipation,
        mentorParticipation: researchIntelligence.mentorParticipation,
        publications: researchIntelligence.publications,
        activeProjects: researchIntelligence.activeResearchProjects,
      },
      placementStatistics: {
        placementRate: executive.placementRate,
        placedStudents: executive.placedStudents,
        placementEligible: executive.placementEligible,
        highestPackage: placement.highestPackage,
        averagePackage: placement.averagePackage,
        offersReleased: placement.offersReleased,
        offersAccepted: placement.offersAccepted,
        byDepartmentPlaced: placement.byDepartmentPlaced,
      },
      internshipStatistics: {
        internshipListings: placement.internshipListings,
        internshipOpportunities: industryIntelligence.internshipOpportunities,
        applicationsSubmitted: placement.applicationsSubmitted,
      },
      industryEngagement: industryIntelligence,
      researchProductivity: {
        totalProjects: researchIntelligence.totalResearchProjects,
        activeProjects: researchIntelligence.activeResearchProjects,
        publications: researchIntelligence.publications,
        collaborations: researchIntelligence.researchCollaborations,
        fundingAmount: researchIntelligence.fundingActivities,
        facultyParticipation: researchIntelligence.facultyParticipation,
        studentParticipation: researchIntelligence.studentParticipation,
      },
      innovationPerformance: {
        innovationIdeas: researchIntelligence.innovationIdeas,
        pendingIdeas: researchIntelligence.pendingIdeas,
        eventParticipation: researchIntelligence.eventParticipation,
        mentorSessions: researchIntelligence.mentorSessions,
      },
      startupGrowth: outcomeIntelligence.startupGrowth,
      alumniEngagement: outcomeIntelligence.alumniEngagement,
      institutionalHealthScore: executive.healthScore,
      departmentWisePerformance,
      strategicKPIs,
      qualityIntelligence,
      comparisons: overview.comparisons,
      signals: overview.signals,
      hasData: overview.hasData,
    }
  })
}

module.exports = {
  getExecutiveAnalytics,
  buildDepartmentPerformance,
  buildStrategicKPIs,
}
