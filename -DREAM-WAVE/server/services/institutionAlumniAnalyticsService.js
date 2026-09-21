const mongoose = require('mongoose')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const InstitutionAlumniMentorship = require('../models/InstitutionAlumniMentorship')
const InstitutionAlumniMentorshipSession = require('../models/InstitutionAlumniMentorshipSession')
const InstitutionAlumniCareerContribution = require('../models/InstitutionAlumniCareerContribution')
const InstitutionAlumniCareerApplication = require('../models/InstitutionAlumniCareerApplication')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionAlumniInstitutionalContribution = require('../models/InstitutionAlumniInstitutionalContribution')
const InstitutionAlumniVolunteerRecord = require('../models/InstitutionAlumniVolunteerRecord')
const InstitutionAlumniGroup = require('../models/InstitutionAlumniGroup')

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function mapGroupCounts(groups = []) {
  return Object.fromEntries(groups.map((g) => [g._id || 'Unknown', g.count]))
}

function buildDateFilter(filters = {}) {
  if (!filters.dateFrom && !filters.dateTo) return {}
  const createdAt = {}
  if (filters.dateFrom) createdAt.$gte = new Date(filters.dateFrom)
  if (filters.dateTo) createdAt.$lte = new Date(filters.dateTo)
  return { createdAt }
}

async function getAlumniAnalytics(institutionId, filters = {}) {
  const cid = oid(institutionId)
  const dateFilter = buildDateFilter(filters)
  const alumniMatch = { institutionId: cid, ...dateFilter }
  if (filters.department) alumniMatch.department = new RegExp(String(filters.department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.graduationYear) alumniMatch.graduationYear = String(filters.graduationYear)
  if (filters.industry) alumniMatch.industry = filters.industry

  const [
    alumni,
    mentorships,
    sessions,
    careerContributions,
    careerApplications,
    events,
    institutionalContributions,
    volunteers,
    groups,
    byGradYear,
    byDepartment,
    byIndustry,
    byCountry,
    byCompany,
  ] = await Promise.all([
    InstitutionAlumni.find(alumniMatch).select(
      'status verificationStatus graduationYear department industry currentCompany location isMentorAvailable updatedAt',
    ).lean(),
    InstitutionAlumniMentorship.find({ institutionId: cid, ...dateFilter }).select('status alumniId').lean(),
    InstitutionAlumniMentorshipSession.find({ institutionId: cid, ...dateFilter }).select('status').lean(),
    InstitutionAlumniCareerContribution.find({ institutionId: cid, ...dateFilter }).select('contributionType status participantCount').lean(),
    InstitutionAlumniCareerApplication.countDocuments({ institutionId: cid }),
    InstitutionAlumniEvent.find({ institutionId: cid, ...dateFilter }).select('registrations status').lean(),
    InstitutionAlumniInstitutionalContribution.find({ institutionId: cid, ...dateFilter }).select('approvalStatus amount contributionType').lean(),
    InstitutionAlumniVolunteerRecord.find({ institutionId: cid, ...dateFilter }).select('status hoursContributed volunteerRole').lean(),
    InstitutionAlumniGroup.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionAlumni.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    InstitutionAlumni.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InstitutionAlumni.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InstitutionAlumni.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InstitutionAlumni.aggregate([
      { $match: { institutionId: cid, currentCompany: { $ne: '' } } },
      { $group: { _id: '$currentCompany', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 25 },
    ]),
  ])

  const referralTypes = [
    'job_referral', 'internship_referral', 'startup_hiring',
    'freelance_opportunity', 'contract_position', 'research_collaboration',
  ]

  const eventRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0)
  const attendedRegistrations = events.reduce(
    (sum, e) => sum + (e.registrations || []).filter((r) => r.status === 'attended').length,
    0,
  )

  const approvedDonations = institutionalContributions.filter((c) =>
    ['approved', 'disbursed'].includes(c.approvalStatus),
  )
  const totalDonationAmount = approvedDonations.reduce((sum, c) => sum + (c.amount || 0), 0)

  const mentorAlumni = alumni.filter((a) => a.isMentorAvailable && a.status === 'active').length
  const activeMentorships = mentorships.filter((m) => ['matched', 'active'].includes(m.status)).length
  const completedSessions = sessions.filter((s) => s.status === 'completed').length

  return {
    totalAlumni: alumni.length,
    verifiedAlumni: alumni.filter((a) => a.verificationStatus === 'verified').length,
    activeAlumni: alumni.filter((a) => a.status === 'active').length,
    alumniByGraduationYear: mapGroupCounts(byGradYear),
    alumniByDepartment: mapGroupCounts(byDepartment),
    alumniByIndustry: mapGroupCounts(byIndustry),
    alumniByCountry: mapGroupCounts(byCountry),
    alumniByCompany: mapGroupCounts(byCompany),
    mentorshipParticipation: {
      mentorsAvailable: mentorAlumni,
      activeMentorships,
      completedMentorships: mentorships.filter((m) => m.status === 'completed').length,
      pendingRequests: mentorships.filter((m) => m.status === 'requested').length,
      completedSessions,
    },
    referralActivity: {
      totalReferrals: careerContributions.filter((c) => referralTypes.includes(c.contributionType)).length,
      openReferrals: careerContributions.filter((c) => c.status === 'open' && referralTypes.includes(c.contributionType)).length,
      totalApplications: careerApplications,
      totalParticipants: careerContributions.reduce((sum, c) => sum + (c.participantCount || 0), 0),
    },
    eventParticipation: {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => ['published', 'completed', 'ongoing'].includes(e.status)).length,
      totalRegistrations: eventRegistrations,
      attendedRegistrations,
    },
    donationsContributions: {
      totalRecords: institutionalContributions.length,
      approvedRecords: approvedDonations.length,
      totalAmount: totalDonationAmount,
      byType: institutionalContributions.reduce((acc, c) => {
        acc[c.contributionType] = (acc[c.contributionType] || 0) + 1
        return acc
      }, {}),
    },
    volunteerEngagement: {
      totalRecords: volunteers.length,
      completedActivities: volunteers.filter((v) => v.status === 'completed').length,
      totalHours: volunteers.reduce((sum, v) => sum + (v.hoursContributed || 0), 0),
      byRole: volunteers.reduce((acc, v) => {
        acc[v.volunteerRole] = (acc[v.volunteerRole] || 0) + 1
        return acc
      }, {}),
    },
    communityGroups: groups,
    hasData: alumni.length > 0 || events.length > 0 || groups > 0 || careerContributions.length > 0,
  }
}

module.exports = {
  getAlumniAnalytics,
  mapGroupCounts,
}
