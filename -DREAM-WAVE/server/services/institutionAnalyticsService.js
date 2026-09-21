const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const { buildListQuery } = require('./institutionStudentService')
const institutionCache = require('./institutionCache')

function buildAnalyticsMatch(institutionId, filters = {}) {
  const base = buildListQuery(institutionId, filters)
  if (filters.dateFrom || filters.dateTo) {
    base.createdAt = {}
    if (filters.dateFrom) base.createdAt.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) base.createdAt.$lte = new Date(filters.dateTo)
  }
  if (filters.placementLifecycle) {
    base['placement.lifecycleStatus'] = filters.placementLifecycle
  }
  return base
}

function mapGroupCounts(groups = []) {
  return Object.fromEntries(groups.map((g) => [g._id || 'Unknown', g.count]))
}

async function getAnalyticsDashboard(institutionId, filters = {}) {
  const cacheKey = institutionCache.makeKey(
    'analytics',
    institutionId,
    JSON.stringify(filters),
  )

  return institutionCache.getOrSet(
    cacheKey,
    institutionCache.CACHE_TTL_MS.analytics,
    async () => {
      const match = buildAnalyticsMatch(institutionId, filters)

      const [result] = await InstitutionStudent.aggregate([
        { $match: match },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalStudents: { $sum: 1 },
                  activeStudents: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
                  },
                  placementEligible: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            '$placement.lifecycleStatus',
                            ['ELIGIBLE', 'READY', 'APPLYING'],
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  placedStudents: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $eq: ['$placement.lifecycleStatus', 'PLACED'] },
                            { $eq: ['$placement.status', 'placed'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  withSharedProjects: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            {
                              $size: {
                                $filter: {
                                  input: { $ifNull: ['$sharedProjects', []] },
                                  as: 'p',
                                  cond: { $ne: ['$$p.visibility', 'private'] },
                                },
                              },
                            },
                            0,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  withVerifiedCertificates: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            {
                              $size: {
                                $filter: {
                                  input: { $ifNull: ['$certifications', []] },
                                  as: 'c',
                                  cond: {
                                    $in: [
                                      '$$c.verificationStatus',
                                      [
                                        'INSTITUTION_VERIFIED',
                                        'INSTITUTION_ISSUED',
                                        'EXTERNALLY_VERIFIED',
                                      ],
                                    ],
                                  },
                                },
                              },
                            },
                            0,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  missingRequiredDocuments: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            {
                              $eq: [{ $size: { $ifNull: ['$documents', []] } }, 0],
                            },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: { $ifNull: ['$documents', []] },
                                      as: 'd',
                                      cond: { $eq: ['$$d.status', 'missing'] },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  avgAttendance: { $avg: '$attendance' },
                  avgCgpa: { $avg: '$cgpa' },
                },
              },
            ],
            byDepartment: [{ $group: { _id: '$department', count: { $sum: 1 } } }],
            byProgram: [{ $group: { _id: '$course', count: { $sum: 1 } } }],
            byBatch: [{ $group: { _id: '$batch', count: { $sum: 1 } } }],
            bySemester: [{ $group: { _id: '$semester', count: { $sum: 1 } } }],
            bySection: [{ $group: { _id: '$section', count: { $sum: 1 } } }],
            byAcademicStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            byPlacementLifecycle: [
              {
                $group: {
                  _id: { $ifNull: ['$placement.lifecycleStatus', 'NOT_ELIGIBLE'] },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ])

      const totals = result?.totals?.[0]
      if (!totals?.totalStudents) {
        return {
          totalStudents: 0,
          activeStudents: 0,
          byDepartment: {},
          byProgram: {},
          byBatch: {},
          bySemester: {},
          bySection: {},
          placementEligible: 0,
          placedStudents: 0,
          withSharedProjects: 0,
          withVerifiedCertificates: 0,
          missingRequiredDocuments: 0,
          byAcademicStatus: {},
          byPlacementLifecycle: {},
          avgAttendance: 0,
          avgCgpa: 0,
          hasData: false,
        }
      }

      return {
        totalStudents: totals.totalStudents,
        activeStudents: totals.activeStudents,
        byDepartment: mapGroupCounts(result.byDepartment),
        byProgram: mapGroupCounts(result.byProgram),
        byBatch: mapGroupCounts(result.byBatch),
        bySemester: mapGroupCounts(result.bySemester),
        bySection: mapGroupCounts(result.bySection),
        byAcademicStatus: mapGroupCounts(result.byAcademicStatus),
        byPlacementLifecycle: mapGroupCounts(result.byPlacementLifecycle),
        placementEligible: totals.placementEligible,
        placedStudents: totals.placedStudents,
        withSharedProjects: totals.withSharedProjects,
        withVerifiedCertificates: totals.withVerifiedCertificates,
        missingRequiredDocuments: totals.missingRequiredDocuments,
        avgAttendance: Math.round(totals.avgAttendance || 0),
        avgCgpa: Math.round((totals.avgCgpa || 0) * 100) / 100,
        hasData: true,
      }
    },
  )
}

module.exports = {
  getAnalyticsDashboard,
  buildAnalyticsMatch,
}
