const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const PartnershipDocument = require('../models/PartnershipDocument')
const institutionCache = require('./institutionCache')
const { getAnalyticsDashboard } = require('./institutionAnalyticsService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getInnovationAnalytics } = require('./institutionInnovationAnalyticsService')
const { getAlumniAnalytics } = require('./institutionAlumniAnalyticsService')
const { getEngagementAnalytics } = require('./institutionAlumniExtendedService')
const institutionStudentService = require('./institutionStudentService')
const institutionPlacementService = require('./institutionPlacementService')
const { getResearchStats } = require('./institutionResearchService')
const { getIncubationStats } = require('./institutionIncubationService')
const { getPartnershipStatsForInstitution } = require('./partnershipService')

const ACTION_ROUTES = {
  review: '/institution/dashboard',
  placement_drive: '/institution/placements',
  research_output: '/institution/research',
  mentorship: '/institution/alumni',
  recruitment: '/institution/industry-network',
  incubation: '/institution/incubation',
  talent: '/institution/students/talent',
  quality_review: '/institution/students',
  curriculum_review: '/institution/academics',
  industry_followup: '/institution/industry-network',
  innovation_milestone: '/institution/incubation',
  partnership_documents: '/institution/industry-network',
  student_documents: '/institution/students',
  research_ideas: '/institution/research',
  alumni_verification: '/institution/alumni',
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function derivePreviousAcademicYear(academicYear) {
  const match = String(academicYear).match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const start = parseInt(match[1], 10)
  const end = parseInt(match[2], 10)
  return `${start - 1}-${String(end - 1).padStart(2, '0')}`
}

function resolveTimeFilters(raw = {}) {
  const now = new Date()
  const resolved = {
    department: raw.department || undefined,
    semester: raw.semester || undefined,
    academicYear: raw.academicYear || undefined,
    dateFrom: raw.dateFrom || undefined,
    dateTo: raw.dateTo || undefined,
    period: raw.period || 'all',
    periodLabel: 'All time',
  }

  if (raw.period === 'last30days') {
    resolved.dateFrom = new Date(now.getTime() - 30 * 86400000).toISOString()
    resolved.dateTo = now.toISOString()
    resolved.periodLabel = 'Last 30 days'
  } else if (raw.period === 'last90days') {
    resolved.dateFrom = new Date(now.getTime() - 90 * 86400000).toISOString()
    resolved.dateTo = now.toISOString()
    resolved.periodLabel = 'Last 90 days'
  } else if (raw.period === 'currentSemester' && raw.semester) {
    resolved.periodLabel = `Semester ${raw.semester}`
  } else if (raw.period === 'currentAcademicYear' && raw.academicYear) {
    resolved.periodLabel = `Academic year ${raw.academicYear}`
  } else if (raw.academicYear) {
    resolved.periodLabel = `Academic year ${raw.academicYear}`
  } else if (raw.dateFrom || raw.dateTo) {
    resolved.periodLabel = 'Custom range'
  }

  return resolved
}

function resolvePreviousPeriodFilters(filters) {
  if (filters.period === 'last30days') {
    const end = new Date(filters.dateFrom)
    return {
      ...filters,
      dateFrom: new Date(end.getTime() - 30 * 86400000).toISOString(),
      dateTo: end.toISOString(),
      periodLabel: 'Previous 30 days',
      academicYear: undefined,
    }
  }
  if (filters.period === 'last90days') {
    const end = new Date(filters.dateFrom)
    return {
      ...filters,
      dateFrom: new Date(end.getTime() - 90 * 86400000).toISOString(),
      dateTo: end.toISOString(),
      periodLabel: 'Previous 90 days',
      academicYear: undefined,
    }
  }
  if (filters.academicYear) {
    const prev = derivePreviousAcademicYear(filters.academicYear)
    if (!prev) return null
    return { ...filters, academicYear: prev, dateFrom: undefined, dateTo: undefined, periodLabel: `Academic year ${prev}` }
  }
  return null
}

function buildComparisonMetric(label, current, previous) {
  if (previous === undefined || previous === null || current === undefined || current === null) return null
  if (typeof current !== 'number' || typeof previous !== 'number') return null
  const absoluteChange = current - previous
  const percentageChange = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((absoluteChange / previous) * 100)
  return { label, current, previous, absoluteChange, percentageChange }
}

function buildComparisons(currentExec, previousExec, currentPlacement, previousPlacement) {
  if (!previousExec) return []
  const items = [
    buildComparisonMetric('Total Students', currentExec.totalStudents, previousExec.totalStudents),
    buildComparisonMetric('Placed Students', currentExec.placedStudents, previousExec.placedStudents),
    buildComparisonMetric('Placement Rate %', currentExec.placementRate, previousExec.placementRate),
    buildComparisonMetric('Research Publications', currentExec.totalPublications, previousExec.totalPublications),
    buildComparisonMetric('Active Startups', currentExec.activeStartups, previousExec.activeStartups),
    buildComparisonMetric('Verified Alumni', currentExec.verifiedAlumni, previousExec.verifiedAlumni),
  ]
  if (currentPlacement && previousPlacement) {
    items.push(
      buildComparisonMetric(
        'Applications Submitted',
        currentPlacement.applicationsSubmitted,
        previousPlacement.applicationsSubmitted,
      ),
    )
  }
  return items.filter(Boolean)
}

async function fetchQualityIntelligence(institutionId, filters, students) {
  const iid = new mongoose.Types.ObjectId(institutionId)
  const base = institutionStudentService.buildListQuery(institutionId, filters)
  const total = students.totalStudents || 0

  const [profileAgg, pendingCerts, partnershipDocStats] = await Promise.all([
    InstitutionStudent.aggregate([
      { $match: base },
      { $group: { _id: '$profileStatus', count: { $sum: 1 } } },
    ]),
    InstitutionStudent.countDocuments({
      ...base,
      $or: [
        { 'certifications.verificationStatus': { $in: ['SELF_UPLOADED', 'pending'] } },
        { 'achievements.verificationStatus': 'pending' },
      ],
    }),
    PartnershipDocument.aggregate([
      { $match: { institutionId: iid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$expiryDate', null] },
                    { $lte: ['$expiryDate', new Date(Date.now() + 90 * 86400000)] },
                    { $gte: ['$expiryDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: {
              $cond: [{ $and: [{ $ne: ['$expiryDate', null] }, { $lt: ['$expiryDate', new Date()] }] }, 1, 0],
            },
          },
        },
      },
    ]),
  ])

  const profileByStatus = Object.fromEntries(profileAgg.map((p) => [p._id || 'unknown', p.count]))
  const completeProfiles = profileByStatus.complete || 0
  const partialProfiles = profileByStatus.partial || 0
  const pendingProfiles = profileByStatus.pending || 0
  const docs = partnershipDocStats[0] || { total: 0, active: 0, expiringSoon: 0, expired: 0 }

  const documentationCoverage = total
    ? Math.round(((total - students.missingRequiredDocuments) / total) * 100)
    : 0
  const certificateCoverage = total
    ? Math.round((students.withVerifiedCertificates / total) * 100)
    : 0
  const profileCompleteness = total ? Math.round((completeProfiles / total) * 100) : 0

  const pendingQualityActions =
    students.missingRequiredDocuments +
    pendingCerts +
    partialProfiles +
    pendingProfiles +
    docs.expiringSoon +
    docs.expired

  return {
    accreditationReadiness: profileCompleteness,
    qualityEvidenceCoverage: documentationCoverage,
    certificateCoverage,
    profileCompleteness,
    pendingQualityActions,
    missingStudentDocuments: students.missingRequiredDocuments,
    pendingVerifications: pendingCerts,
    incompleteProfiles: partialProfiles + pendingProfiles,
    partnershipDocuments: docs.total,
    activePartnershipDocuments: docs.active,
    expiringPartnershipDocuments: docs.expiringSoon,
    expiredPartnershipDocuments: docs.expired,
    departmentCompliance: students.byDepartment,
    continuousImprovementActivities: students.withSharedProjects,
    hasData: total > 0 || docs.total > 0,
  }
}

function buildIndustryIntelligence(placement, placementStats, partnershipStats) {
  const applications = placement.applicationsSubmitted || 0
  const placed = placement.studentsPlaced || 0
  return {
    activeIndustryPartners: partnershipStats.activePartners,
    companyCollaborations: partnershipStats.totalIndustryPartners,
    recruitmentPartners: partnershipStats.recruitmentPartners,
    internshipPartners: partnershipStats.internshipPartners,
    researchPartners: partnershipStats.researchPartners,
    pendingPartnerInvitations: partnershipStats.pendingInvitations,
    campusRecruitmentDrives: placement.campusDrives || 0,
    internshipOpportunities: (placement.internshipListings || 0) + (placementStats.internships || 0),
    hiringOrganizations: placementStats.companies || 0,
    openJobs: placementStats.jobs || 0,
    applicationsSubmitted: applications,
    studentsPlaced: placed,
    applicationToPlacementRate: applications ? Math.round((placed / applications) * 100) : 0,
    offerAcceptanceRate: placement.offersReleased
      ? Math.round(((placement.offersAccepted || 0) / placement.offersReleased) * 100)
      : 0,
    byDepartment: placement.byDepartment || {},
    byCompany: placement.byCompany || {},
    byApplicationStage: placement.byApplicationStage || {},
    industryEngagementTrend: {
      recentApplications: applications,
      activeOpportunities: placement.activeOpportunities || 0,
      activePartnerships: partnershipStats.activePartners,
    },
    hasData: partnershipStats.activePartners > 0 || placement.hasData || placementStats.companies > 0,
  }
}

function buildResearchIntelligence(innovation, researchStats, incubation) {
  return {
    activeResearchProjects: innovation.activeProjects,
    totalResearchProjects: innovation.totalResearchProjects,
    completedProjects: innovation.completedProjects,
    publications: innovation.totalPublications,
    researchCollaborations: innovation.collaborationItems || 0,
    innovationIdeas: innovation.innovationIdeasSubmitted,
    pendingIdeas: researchStats.pendingIdeas || 0,
    startupIncubation: incubation.totalStartups || innovation.startupRegistrations,
    activeStartups: incubation.activeStartups || 0,
    fundingActivities: innovation.totalFundingAmount || 0,
    fundingRecords: Object.keys(innovation.fundingDistribution || {}).length,
    mentorParticipation: innovation.mentorEngagement?.activeMentors || 0,
    mentorSessions: innovation.mentorEngagement?.completedSessions || 0,
    startupProgress: innovation.incubationProgress || incubation.byIncubationStage || {},
    researchDomains: innovation.researchDomains || {},
    facultyParticipation: innovation.facultyParticipation,
    studentParticipation: innovation.studentParticipation,
    eventParticipation: innovation.eventParticipation || 0,
    hasData: innovation.hasData || incubation.hasData,
  }
}

function buildOutcomeIntelligence(modules, quality) {
  const { students, placement, research, alumni, incubation, industryIntelligence } = modules
  return {
    studentSuccess: {
      totalStudents: students.totalStudents,
      activeStudents: students.activeStudents,
      avgCgpa: students.avgCgpa,
      avgAttendance: students.avgAttendance,
      profileCompleteness: quality.profileCompleteness,
    },
    placementOutcomes: {
      placementRate: students.placementEligible
        ? Math.round((students.placedStudents / students.placementEligible) * 100)
        : placement.placementPercentage || 0,
      placedStudents: students.placedStudents || placement.studentsPlaced,
      eligibleStudents: students.placementEligible || placement.studentsEligible,
      highestPackage: placement.highestPackage || 0,
      averagePackage: placement.averagePackage || 0,
    },
    internshipCompletion: {
      internshipListings: placement.internshipListings || industryIntelligence?.internshipOpportunities || 0,
      applicationsSubmitted: placement.applicationsSubmitted || 0,
    },
    researchOutput: {
      publications: research.totalPublications,
      activeProjects: research.activeProjects,
      innovationIdeas: research.innovationIdeasSubmitted,
    },
    startupGrowth: {
      registeredStartups: research.startupRegistrations,
      activeStartups: incubation.activeStartups || 0,
      graduatedStartups: incubation.graduatedStartups || 0,
    },
    industryParticipation: {
      activePartners: industryIntelligence?.activeIndustryPartners || 0,
      hiringOrganizations: industryIntelligence?.hiringOrganizations || 0,
      applicationsSubmitted: industryIntelligence?.applicationsSubmitted || 0,
    },
    alumniEngagement: {
      totalAlumni: alumni.totalAlumni,
      verifiedAlumni: alumni.verifiedAlumni,
      activeMentorships: alumni.mentorshipParticipation?.activeMentorships || 0,
      volunteerHours: alumni.volunteerEngagement?.totalHours || 0,
      eventRegistrations: alumni.eventParticipation?.totalRegistrations || 0,
    },
    hasData: students.hasData || placement.hasData || research.hasData || alumni.hasData,
  }
}

function computeHealthScore(modules) {
  const scores = []
  const { students, placement, research, alumni } = modules

  if (students?.hasData) {
    const placementRate = students.placementEligible
      ? (students.placedStudents / students.placementEligible) * 100
      : 0
    const attendanceScore = students.avgAttendance || 0
    const cgpaScore = students.avgCgpa ? Math.min(100, (students.avgCgpa / 10) * 100) : 0
    scores.push(placementRate * 0.4 + attendanceScore * 0.3 + cgpaScore * 0.3)
  }
  if (placement?.hasData && placement.studentsEligible) scores.push(placement.placementPercentage)
  if (research?.hasData) {
    const projectScore = research.totalResearchProjects
      ? (research.activeProjects / research.totalResearchProjects) * 100
      : 0
    scores.push(projectScore * 0.5 + Math.min(100, research.totalPublications * 5) * 0.5)
  }
  if (alumni?.hasData) {
    scores.push(alumni.totalAlumni ? (alumni.verifiedAlumni / alumni.totalAlumni) * 100 : 0)
  }
  if (!scores.length) return 0
  return clampScore(scores.reduce((sum, s) => sum + s, 0) / scores.length)
}

function buildInstitutionSignals(modules, quality, periodLabel) {
  const signals = []
  const { students, placement, research, alumni, incubation, industryIntelligence } = modules

  const push = (category, severity, title, trigger, supportingRecords, suggestedAction, actionType) => {
    signals.push({
      category,
      severity,
      title,
      trigger,
      supportingRecords,
      timePeriod: periodLabel,
      suggestedAction,
      actionType,
      domain: category,
      detail: supportingRecords,
    })
  }

  if (students?.hasData && students.missingRequiredDocuments > 0) {
    push(
      'quality',
      'attention',
      'Missing student documentation',
      'Student records contain missing required documents',
      `${students.missingRequiredDocuments} of ${students.totalStudents} students have missing or incomplete required documents`,
      'Review student document compliance in the student directory',
      'student_documents',
    )
  }

  if (students?.hasData && students.placementEligible > 0) {
    const rate = Math.round((students.placedStudents / students.placementEligible) * 100)
    if (rate < 50) {
      push(
        'placement',
        'high',
        'Low placement rate',
        'Placed students below 50% of eligible pool',
        `${students.placedStudents}/${students.placementEligible} placement-eligible students placed (${rate}%)`,
        'Launch targeted placement drives for eligible cohorts',
        'placement_drive',
      )
    }
  }

  if (students?.hasData && students.avgAttendance > 0 && students.avgAttendance < 75) {
    push(
      'academic',
      'attention',
      'Below-target attendance',
      'Institution average attendance below 75%',
      `Average attendance is ${students.avgAttendance}% across ${students.totalStudents} students`,
      'Review department attendance reports and intervention plans',
      'curriculum_review',
    )
  }

  if (quality?.pendingVerifications > 0) {
    push(
      'quality',
      'attention',
      'Pending certificate verifications',
      'Student certificates or achievements awaiting verification',
      `${quality.pendingVerifications} verification records pending review`,
      'Process pending certificate and achievement verifications',
      'quality_review',
    )
  }

  if (quality?.expiringPartnershipDocuments > 0) {
    push(
      'operational',
      'attention',
      'Partnership documents expiring soon',
      'Partnership legal documents approaching expiry within 90 days',
      `${quality.expiringPartnershipDocuments} partnership documents expiring within 90 days`,
      'Review and renew partnership documentation',
      'partnership_documents',
    )
  }

  if (industryIntelligence?.hasData && industryIntelligence.pendingPartnerInvitations > 0) {
    push(
      'industry',
      'info',
      'Pending partnership invitations',
      'Company-initiated partnership requests awaiting institution response',
      `${industryIntelligence.pendingPartnerInvitations} pending partnership invitations`,
      'Review pending industry partnership invitations',
      'industry_followup',
    )
  }

  if (industryIntelligence?.hasData && industryIntelligence.activeIndustryPartners > 0 && industryIntelligence.applicationsSubmitted === 0) {
    push(
      'industry',
      'attention',
      'Inactive recruitment pipeline',
      'Active partnerships with no student applications',
      `${industryIntelligence.activeIndustryPartners} active partnerships; 0 applications submitted`,
      'Promote open opportunities to eligible students',
      'recruitment',
    )
  }

  if (research?.pendingIdeas > 0) {
    push(
      'innovation',
      'info',
      'Innovation ideas awaiting review',
      'Submitted ideas pending institutional review',
      `${research.pendingIdeas} innovation ideas in submitted or under_review status`,
      'Review pending innovation ideas',
      'research_ideas',
    )
  }

  if (alumni?.hasData && alumni.mentorshipParticipation?.pendingRequests > 0) {
    push(
      'student',
      'info',
      'Pending alumni mentorship requests',
      'Mentorship requests awaiting mentor assignment',
      `${alumni.mentorshipParticipation.pendingRequests} mentorship requests pending`,
      'Match mentors to pending mentorship requests',
      'mentorship',
    )
  }

  if (incubation?.hasData && incubation.activeStartups > 0) {
    push(
      'innovation',
      'info',
      'Active startup portfolio',
      'Startups currently active in incubation program',
      `${incubation.activeStartups} active startups in incubation`,
      'Review startup progress and milestone tracking',
      'innovation_milestone',
    )
  }

  return signals
}

function buildExecutiveInsights(modules, signals, quality, industryIntelligence, outcomes, periodLabel) {
  const insights = []
  const { students, placement, research, alumni, incubation } = modules

  if (students?.hasData) {
    insights.push({
      category: 'student',
      title: 'Student success overview',
      whatHappened: `${students.totalStudents} students on record with ${students.placedStudents} placed and average CGPA ${students.avgCgpa || 'N/A'}.`,
      whyItMatters: 'Student outcomes drive institutional reputation and accreditation evidence.',
      supportingData: `Attendance ${students.avgAttendance}%; ${students.placementEligible} placement-eligible; ${quality.documentationCoverage}% documentation coverage.`,
      suggestedActions: ['Review student analytics', 'Address missing documents', 'Support placement-eligible cohort'],
      actionType: 'quality_review',
      timePeriod: periodLabel,
    })
  }

  if (placement?.hasData) {
    insights.push({
      category: 'placement',
      title: 'Placement pipeline performance',
      whatHappened: `${placement.studentsPlaced} students placed from ${placement.applicationsSubmitted} applications (${placement.placementPercentage}% placement rate).`,
      whyItMatters: 'Placement outcomes are a primary measure of graduate employability.',
      supportingData: `${placement.campusDrives} campus drives; ${placement.internshipListings} internships; highest package ₹${(placement.highestPackage || 0).toLocaleString('en-IN')}.`,
      suggestedActions: ['Expand campus drives', 'Follow up on open applications', 'Review department-wise gaps'],
      actionType: 'placement_drive',
      timePeriod: periodLabel,
    })
  }

  if (industryIntelligence?.hasData) {
    insights.push({
      category: 'industry',
      title: 'Industry engagement status',
      whatHappened: `${industryIntelligence.activeIndustryPartners} active industry partners with ${industryIntelligence.hiringOrganizations} hiring organizations.`,
      whyItMatters: 'Industry partnerships sustain internship, recruitment, and research collaboration pipelines.',
      supportingData: `${industryIntelligence.recruitmentPartners} recruitment partners; ${industryIntelligence.internshipPartners} internship partners; ${industryIntelligence.applicationsSubmitted} applications submitted.`,
      suggestedActions: ['Respond to pending invitations', 'Activate recruitment pipeline', 'Review partnership documents'],
      actionType: 'industry_followup',
      timePeriod: periodLabel,
    })
  }

  if (research?.hasData) {
    insights.push({
      category: 'research',
      title: 'Research and innovation output',
      whatHappened: `${research.totalResearchProjects} research projects with ${research.totalPublications} publications and ${research.innovationIdeasSubmitted} innovation ideas.`,
      whyItMatters: 'Research output supports institutional ranking, funding, and innovation ecosystem growth.',
      supportingData: `${research.activeProjects} active projects; ${research.facultyParticipation} faculty participants; ₹${(research.totalFundingAmount || 0).toLocaleString('en-IN')} approved funding.`,
      suggestedActions: ['Convert active projects to publications', 'Review pending innovation ideas', 'Schedule mentor sessions'],
      actionType: 'research_output',
      timePeriod: periodLabel,
    })
  }

  if (quality?.hasData) {
    insights.push({
      category: 'quality',
      title: 'Quality evidence coverage',
      whatHappened: `${quality.qualityEvidenceCoverage}% student documentation coverage; ${quality.profileCompleteness}% complete profiles.`,
      whyItMatters: 'Documentation completeness supports audit readiness and compliance reporting.',
      supportingData: `${quality.pendingQualityActions} pending quality actions; ${quality.expiringPartnershipDocuments} partnership documents expiring soon.`,
      suggestedActions: ['Clear document backlog', 'Verify pending certificates', 'Renew expiring partnership documents'],
      actionType: 'quality_review',
      timePeriod: periodLabel,
    })
  }

  if (alumni?.hasData) {
    insights.push({
      category: 'student',
      title: 'Alumni community engagement',
      whatHappened: `${alumni.totalAlumni} alumni with ${alumni.verifiedAlumni} verified profiles and ${alumni.mentorshipParticipation?.activeMentorships || 0} active mentorships.`,
      whyItMatters: 'Alumni engagement extends placement support, mentorship, and institutional giving.',
      supportingData: `${alumni.referralActivity?.totalReferrals || 0} career referrals; ${alumni.volunteerEngagement?.totalHours || 0} volunteer hours; ${alumni.communityGroups} community groups.`,
      suggestedActions: ['Verify alumni profiles', 'Match mentorship requests', 'Promote referral opportunities'],
      actionType: 'alumni_verification',
      timePeriod: periodLabel,
    })
  }

  for (const signal of signals.filter((s) => s.severity === 'high').slice(0, 2)) {
    insights.push({
      category: signal.category,
      title: signal.title,
      whatHappened: signal.trigger,
      whyItMatters: 'Requires executive attention based on institutional threshold rules.',
      supportingData: signal.supportingRecords,
      suggestedActions: [signal.suggestedAction],
      actionType: signal.actionType,
      timePeriod: periodLabel,
    })
  }

  return insights
}

function buildActionCenter(signals, modules) {
  const actions = []
  const seen = new Set()

  for (const signal of signals) {
    const key = `${signal.actionType}:${signal.title}`
    if (seen.has(key)) continue
    seen.add(key)
    actions.push({
      priority: signal.severity === 'high' ? 'high' : signal.severity === 'attention' ? 'medium' : 'low',
      domain: signal.category,
      title: signal.suggestedAction,
      rationale: signal.supportingRecords,
      actionType: signal.actionType,
      route: ACTION_ROUTES[signal.actionType] || ACTION_ROUTES.review,
      source: 'signal',
    })
  }

  const { placement, research, alumni, incubation, students } = modules

  if (placement?.hasData && placement.studentsEligible > placement.studentsPlaced) {
    actions.push({
      priority: 'high',
      domain: 'placement',
      title: 'Expand placement outreach',
      rationale: `${placement.studentsEligible - placement.studentsPlaced} eligible students not yet placed`,
      actionType: 'placement_drive',
      route: ACTION_ROUTES.placement_drive,
      source: 'rule',
    })
  }

  if (research?.hasData && research.activeProjects > 0 && research.totalPublications === 0) {
    actions.push({
      priority: 'medium',
      domain: 'research',
      title: 'Convert research projects to publications',
      rationale: `${research.activeProjects} active projects without recorded publications`,
      actionType: 'research_output',
      route: ACTION_ROUTES.research_output,
      source: 'rule',
    })
  }

  if (alumni?.hasData && alumni.mentorshipParticipation?.pendingRequests > 0) {
    actions.push({
      priority: 'medium',
      domain: 'alumni',
      title: 'Match pending mentorship requests',
      rationale: `${alumni.mentorshipParticipation.pendingRequests} requests awaiting assignment`,
      actionType: 'mentorship',
      route: ACTION_ROUTES.mentorship,
      source: 'rule',
    })
  }

  if (incubation?.hasData && incubation.totalMentors > 0 && incubation.totalSessions === 0) {
    actions.push({
      priority: 'low',
      domain: 'innovation',
      title: 'Schedule incubation mentor sessions',
      rationale: `${incubation.totalMentors} mentors with no sessions recorded`,
      actionType: 'incubation',
      route: ACTION_ROUTES.incubation,
      source: 'rule',
    })
  }

  if (students?.hasData && students.withSharedProjects > 0) {
    actions.push({
      priority: 'low',
      domain: 'student',
      title: 'Showcase student portfolio projects',
      rationale: `${students.withSharedProjects} students with shared portfolio projects`,
      actionType: 'talent',
      route: ACTION_ROUTES.talent,
      source: 'rule',
    })
  }

  return actions.slice(0, 15)
}

function buildCopilotInsights(modules, healthScore, signals) {
  const { students, placement, research, alumni, incubation, industryIntelligence, engagement } = modules
  const insights = []

  insights.push({
    type: 'summary',
    title: 'Institution Performance Summary',
    points: [
      healthScore > 0
        ? `Composite health score is ${healthScore} based on available student, placement, research, and alumni data.`
        : 'Insufficient cross-module data to compute a composite health score.',
      students?.hasData
        ? `${students.totalStudents} students enrolled; ${students.placedStudents} placed of ${students.placementEligible} eligible.`
        : 'No student records found.',
      industryIntelligence?.hasData
        ? `${industryIntelligence.activeIndustryPartners} active industry partners; ${industryIntelligence.applicationsSubmitted} applications submitted.`
        : null,
      research?.hasData
        ? `${research.totalResearchProjects} research projects and ${research.totalPublications} publications on record.`
        : 'No research output recorded.',
    ].filter(Boolean),
  })

  if (signals.length) {
    insights.push({
      type: 'signals',
      title: 'Priority Institution Signals',
      points: signals.slice(0, 5).map((s) => `[${s.severity.toUpperCase()}] ${s.title}: ${s.supportingRecords}`),
    })
  }

  if (engagement?.hasData) {
    insights.push({
      type: 'alumni',
      title: 'Recent Alumni Engagement (30 days)',
      points: [
        `${engagement.newRegistrations} new alumni registrations`,
        `${engagement.referralActivity} career referrals`,
        `${engagement.totalVolunteerHours} volunteer hours`,
      ],
    })
  }

  if (incubation?.hasData) {
    insights.push({
      type: 'innovation',
      title: 'Startup & Incubation',
      points: [
        `${incubation.activeStartups} active startups`,
        `${incubation.totalFundingAmount ? `₹${incubation.totalFundingAmount.toLocaleString('en-IN')} funding` : 'No funding recorded'}`,
      ],
    })
  }

  return insights
}

async function fetchModuleSnapshot(institutionId, filters) {
  const sharedFilters = {
    department: filters.department,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    academicYear: filters.academicYear,
    semester: filters.semester,
  }

  const [students, placement, innovation, alumni, incubation, partnershipStats, placementStats] = await Promise.all([
    getAnalyticsDashboard(institutionId, sharedFilters),
    getPlacementAnalytics(institutionId, sharedFilters),
    getInnovationAnalytics(institutionId, sharedFilters),
    getAlumniAnalytics(institutionId, sharedFilters),
    getIncubationStats(institutionId),
    getPartnershipStatsForInstitution(institutionId),
    institutionPlacementService.getStats(institutionId),
  ])

  const industryIntelligence = buildIndustryIntelligence(placement, placementStats, partnershipStats)

  return {
    students,
    placement,
    research: { ...innovation, pendingIdeas: 0 },
    alumni,
    incubation,
    industryIntelligence,
    executive: {
      totalStudents: students.totalStudents,
      placedStudents: students.placedStudents,
      placementRate: students.placementEligible
        ? Math.round((students.placedStudents / students.placementEligible) * 100)
        : 0,
      totalPublications: innovation.totalPublications,
      activeStartups: incubation.activeStartups,
      verifiedAlumni: alumni.verifiedAlumni,
    },
    placementMetrics: placement,
  }
}

async function getCommandCenterOverview(institutionId, rawFilters = {}) {
  const filters = resolveTimeFilters(rawFilters)
  const cacheKey = institutionCache.makeKey('command-center', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const sharedFilters = {
      department: filters.department,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      academicYear: filters.academicYear,
      semester: filters.semester,
    }

    const [
      students,
      studentStats,
      placement,
      placementStats,
      innovation,
      researchStats,
      alumni,
      engagement,
      incubation,
      partnershipStats,
      filterOptions,
      quality,
    ] = await Promise.all([
      getAnalyticsDashboard(institutionId, sharedFilters),
      institutionStudentService.getStats(institutionId),
      getPlacementAnalytics(institutionId, sharedFilters),
      institutionPlacementService.getStats(institutionId),
      getInnovationAnalytics(institutionId, sharedFilters),
      getResearchStats(institutionId),
      getAlumniAnalytics(institutionId, sharedFilters),
      getEngagementAnalytics(institutionId),
      getIncubationStats(institutionId),
      getPartnershipStatsForInstitution(institutionId),
      institutionStudentService.getFilterOptions(institutionId),
      null,
    ])

    const qualityIntelligence = await fetchQualityIntelligence(institutionId, sharedFilters, students)
    const industryIntelligence = buildIndustryIntelligence(placement, placementStats, partnershipStats)
    const researchIntelligence = buildResearchIntelligence(innovation, researchStats, incubation)

    const modules = {
      students,
      studentStats,
      placement: { ...placement, activePartnerships: partnershipStats.activePartners },
      placementStats,
      research: { ...innovation, pendingIdeas: researchStats.pendingIdeas },
      researchStats,
      alumni,
      engagement,
      incubation,
      industryIntelligence,
    }

    const outcomeIntelligence = buildOutcomeIntelligence(modules, qualityIntelligence)
    const healthScore = computeHealthScore(modules)
    const signals = buildInstitutionSignals(modules, qualityIntelligence, filters.periodLabel)
    const executiveInsights = buildExecutiveInsights(
      modules,
      signals,
      qualityIntelligence,
      industryIntelligence,
      outcomeIntelligence,
      filters.periodLabel,
    )
    const actions = buildActionCenter(signals, modules)
    const copilotInsights = buildCopilotInsights(modules, healthScore, signals)

    const executive = {
      healthScore,
      totalStudents: students.totalStudents,
      activeStudents: students.activeStudents,
      placedStudents: students.placedStudents,
      placementEligible: students.placementEligible,
      placementRate: students.placementEligible
        ? Math.round((students.placedStudents / students.placementEligible) * 100)
        : 0,
      avgCgpa: students.avgCgpa,
      avgAttendance: students.avgAttendance,
      activePartnerships: partnershipStats.activePartners,
      totalAlumni: alumni.totalAlumni,
      verifiedAlumni: alumni.verifiedAlumni,
      totalResearchProjects: innovation.totalResearchProjects,
      totalPublications: innovation.totalPublications,
      startupRegistrations: innovation.startupRegistrations,
      activeStartups: incubation.activeStartups,
      totalFundingAmount: innovation.totalFundingAmount,
      eventRegistrations: (engagement.totalEventRegistrations || 0) + (innovation.eventParticipation || 0),
    }

    let comparisons = []
    const previousFilters = resolvePreviousPeriodFilters(filters)
    if (previousFilters) {
      const previous = await fetchModuleSnapshot(institutionId, previousFilters)
      comparisons = buildComparisons(executive, previous.executive, placement, previous.placementMetrics)
    }

    const hasData =
      students.hasData ||
      placement.hasData ||
      innovation.hasData ||
      alumni.hasData ||
      incubation.hasData ||
      industryIntelligence.hasData ||
      qualityIntelligence.hasData

    return {
      generatedAt: new Date().toISOString(),
      filters,
      timeFilter: {
        period: filters.period,
        periodLabel: filters.periodLabel,
        academicYear: filters.academicYear,
        semester: filters.semester,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
      filterOptions,
      executive,
      industryIntelligence,
      researchIntelligence,
      qualityIntelligence,
      outcomeIntelligence,
      comparisons,
      modules: {
        students,
        placement,
        research: innovation,
        researchStats,
        alumni,
        engagement,
        incubation,
        industry: industryIntelligence,
      },
      signals,
      healthSignals: signals,
      executiveInsights,
      actions,
      recommendations: actions,
      copilotInsights,
      moduleAvailability: {
        students: students.hasData,
        placement: placement.hasData,
        research: innovation.hasData,
        alumni: alumni.hasData,
        incubation: incubation.hasData,
        industry: industryIntelligence.hasData,
        quality: qualityIntelligence.hasData,
      },
      hasData,
    }
  })
}

module.exports = {
  getCommandCenterOverview,
  resolveTimeFilters,
  buildIndustryIntelligence,
  buildResearchIntelligence,
  buildOutcomeIntelligence,
  buildInstitutionSignals,
  buildExecutiveInsights,
  buildActionCenter,
  buildComparisons,
  ACTION_ROUTES,
}
