const mongoose = require('mongoose')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const Company = require('../models/Company')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const institutionCache = require('./institutionCache')

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function mapGroupCounts(groups = []) {
  return Object.fromEntries(groups.map((g) => [g._id || 'Unknown', g.count]))
}

function buildPlacementMatch(institutionId, filters = {}) {
  const match = { institutionId: oid(institutionId) }
  if (filters.department) match.department = filters.department
  if (filters.companyId) match.companyId = oid(filters.companyId)
  if (filters.stage) match.stage = filters.stage
  if (filters.opportunityType) match.opportunityType = filters.opportunityType
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

async function getPlacementAnalytics(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const cacheKey = institutionCache.makeKey('placement-analytics', institutionId, JSON.stringify(filters))

  return institutionCache.getOrSet(cacheKey, institutionCache.CACHE_TTL_MS.analytics, async () => {
    const appMatch = buildPlacementMatch(institutionId, filters)
    const partnerships = await InstitutionCompanyPartnership.find({ institutionId: iid, status: 'active' }).lean()
    const companyIds = partnerships.map((p) => p.companyId)

    const [
      opportunityCounts,
      appAgg,
      offerAgg,
      eligibleCount,
      internshipCount,
      byDepartment,
      byBatch,
      byCompany,
      byStage,
      byOfferStatus,
    ] = await Promise.all([
      CampusOpportunity.aggregate([
        { $match: { institutionId: iid } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['open', 'registration_open', 'ongoing', 'published']] },
                  1,
                  0,
                ],
              },
            },
            drives: { $sum: { $cond: [{ $eq: ['$opportunityType', 'campus_drive'] }, 1, 0] } },
            internships: { $sum: { $cond: [{ $eq: ['$opportunityType', 'internship'] }, 1, 0] } },
          },
        },
      ]),
      RecruitmentApplication.aggregate([
        { $match: appMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            selected: { $sum: { $cond: [{ $in: ['$stage', ['selected', 'shortlisted']] }, 1, 0] } },
            placed: { $sum: { $cond: [{ $in: ['$stage', ['hired', 'offer_accepted']] }, 1, 0] } },
          },
        },
      ]),
      RecruitmentOffer.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        {
          $lookup: {
            from: 'recruitmentapplications',
            localField: 'applicationId',
            foreignField: '_id',
            as: 'app',
          },
        },
        { $unwind: '$app' },
        { $match: { 'app.institutionId': iid } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
            highest: { $max: '$salary' },
            average: { $avg: '$salary' },
          },
        },
      ]),
      InstitutionStudent.countDocuments({
        institutionId: iid,
        status: 'active',
        'placement.lifecycleStatus': { $in: ['ELIGIBLE', 'READY', 'APPLYING'] },
      }),
      CampusOpportunity.countDocuments({ institutionId: iid, opportunityType: 'internship' }),
      RecruitmentApplication.aggregate([
        { $match: appMatch },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RecruitmentApplication.aggregate([
        { $match: appMatch },
        { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      RecruitmentApplication.aggregate([
        { $match: appMatch },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      RecruitmentApplication.aggregate([
        { $match: appMatch },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      RecruitmentOffer.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        {
          $lookup: {
            from: 'recruitmentapplications',
            localField: 'applicationId',
            foreignField: '_id',
            as: 'app',
          },
        },
        { $unwind: '$app' },
        { $match: { 'app.institutionId': iid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const opp = opportunityCounts[0] || { total: 0, active: 0, drives: 0, internships: 0 }
    const apps = appAgg[0] || { total: 0, selected: 0, placed: 0 }
    const offers = offerAgg[0] || { total: 0, accepted: 0, highest: 0, average: 0 }

    const companyMap = Object.fromEntries(
      (await Company.find({ _id: { $in: byCompany.map((c) => c._id).filter(Boolean) } }).select('name').lean()).map(
        (c) => [c._id.toString(), c.name],
      ),
    )

    const byCompanyNamed = Object.fromEntries(
      byCompany.map((c) => [companyMap[c._id?.toString()] || 'Unknown', c.count]),
    )

    const placedCount = apps.placed
    const placementPercentage = eligibleCount ? Math.round((placedCount / eligibleCount) * 100) : 0

    const deptPlaced = await RecruitmentApplication.aggregate([
      { $match: { ...appMatch, stage: { $in: ['hired', 'offer_accepted', 'selected'] } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ])

    return {
      totalOpportunities: opp.total,
      activeOpportunities: opp.active,
      campusDrives: opp.drives,
      applicationsSubmitted: apps.total,
      studentsEligible: eligibleCount,
      studentsSelected: apps.selected,
      studentsPlaced: placedCount,
      placementPercentage,
      highestPackage: offers.highest || 0,
      averagePackage: Math.round(offers.average || 0),
      offersReleased: offers.total,
      offersAccepted: offers.accepted,
      internshipListings: internshipCount,
      byDepartment: mapGroupCounts(byDepartment),
      byDepartmentPlaced: mapGroupCounts(deptPlaced),
      byBatch: mapGroupCounts(byBatch),
      byCompany: byCompanyNamed,
      byApplicationStage: mapGroupCounts(byStage),
      byOfferStatus: mapGroupCounts(byOfferStatus),
      hasData: opp.total > 0 || apps.total > 0,
    }
  })
}

module.exports = {
  getPlacementAnalytics,
  buildPlacementMatch,
  mapGroupCounts,
}
