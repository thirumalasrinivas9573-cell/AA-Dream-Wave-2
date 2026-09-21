const mongoose = require('mongoose')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const { isActiveListingStatus } = require('../constants/companyRecruitment')

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function mapGroupCounts(groups = []) {
  return Object.fromEntries(groups.map((g) => [g._id || 'Unknown', g.count]))
}

function buildAppMatch(companyId, filters = {}) {
  const match = { companyId: oid(companyId) }
  if (filters.department) match.department = new RegExp(filters.department, 'i')
  if (filters.stage) match.stage = filters.stage
  if (filters.jobId) match.jobId = oid(filters.jobId)
  if (filters.dateFrom || filters.dateTo) {
    match.createdAt = {}
    if (filters.dateFrom) match.createdAt.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) match.createdAt.$lte = new Date(filters.dateTo)
  }
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [{ roleTitle: regex }, { 'candidateSnapshot.name': regex }]
  }
  return match
}

async function getRecruitmentAnalytics(companyId, filters = {}) {
  const cid = oid(companyId)
  const appMatch = buildAppMatch(companyId, filters)

  const [
    jobs,
    internships,
    appCounts,
    byPosition,
    byDepartment,
    byStage,
    interviewStats,
    offerStats,
    hiredApps,
    bySource,
    monthlyHires,
  ] = await Promise.all([
    RecruitmentJob.find({ companyId: cid }).select('status').lean(),
    RecruitmentInternship.find({ companyId: cid }).select('status').lean(),
    RecruitmentApplication.aggregate([
      { $match: appMatch },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
    RecruitmentApplication.aggregate([
      { $match: appMatch },
      { $group: { _id: '$roleTitle', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    RecruitmentApplication.aggregate([
      { $match: appMatch },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    RecruitmentApplication.aggregate([
      { $match: appMatch },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]),
    RecruitmentInterview.aggregate([
      { $match: { companyId: cid, status: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          positive: {
            $sum: {
              $cond: [
                { $in: ['$feedback.recommendation', ['Strong Hire', 'Hire']] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    RecruitmentOffer.aggregate([
      { $match: { companyId: cid } },
      {
        $group: {
          _id: null,
          released: { $sum: { $cond: [{ $in: ['$status', ['released', 'accepted', 'declined']] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        },
      },
    ]),
    RecruitmentApplication.find({ ...appMatch, stage: 'hired' }).select('createdAt updatedAt').lean(),
    RecruitmentApplication.aggregate([
      { $match: appMatch },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ['$institutionName', ''] }, { $ne: ['$institutionName', null] }] },
              '$institutionName',
              '$opportunityType',
            ],
          },
          count: { $sum: 1 },
          hired: { $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]),
    RecruitmentApplication.aggregate([
      { $match: { companyId: cid, stage: 'hired' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  const totalJobs = jobs.length + internships.length
  const activeListings = [
    ...jobs.filter((j) => isActiveListingStatus(j.status)),
    ...internships.filter((i) => isActiveListingStatus(i.status)),
  ].length
  const totalApplications = appCounts[0]?.total || 0
  const pipeline = mapGroupCounts(byStage)

  const intStat = interviewStats[0] || { total: 0, positive: 0 }
  const interviewSuccessRate = intStat.total
    ? Math.round((intStat.positive / intStat.total) * 100)
    : 0

  const offStat = offerStats[0] || { released: 0, accepted: 0 }
  const offerAcceptanceRate = offStat.released
    ? Math.round((offStat.accepted / offStat.released) * 100)
    : 0

  const hiredCount = pipeline.hired || 0
  const hiringConversionRate = totalApplications
    ? Math.round((hiredCount / totalApplications) * 100)
    : 0

  let averageTimeToHireDays = 0
  if (hiredApps.length) {
    const totalDays = hiredApps.reduce((sum, a) => {
      const start = new Date(a.createdAt).getTime()
      const end = new Date(a.updatedAt).getTime()
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24))
    }, 0)
    averageTimeToHireDays = Math.round(totalDays / hiredApps.length)
  }

  const sourcePerformance = Object.fromEntries(
    bySource.map((s) => [s._id || 'Direct', { applications: s.count, hired: s.hired }]),
  )

  const monthlyHiringTrends = Object.fromEntries(
    monthlyHires.map((m) => [m._id, m.count]),
  )

  return {
    totalJobOpenings: totalJobs,
    activeRecruitments: activeListings,
    totalApplications,
    applicationsByPosition: mapGroupCounts(byPosition),
    applicationsByDepartment: mapGroupCounts(byDepartment),
    candidatePipelineDistribution: pipeline,
    interviewSuccessRate,
    offerAcceptanceRate,
    hiringConversionRate,
    averageTimeToHireDays,
    recruitmentSourcePerformance: sourcePerformance,
    monthlyHiringTrends,
    hasData: totalJobs > 0 || totalApplications > 0,
  }
}

module.exports = {
  getRecruitmentAnalytics,
  buildAppMatch,
  mapGroupCounts,
}
