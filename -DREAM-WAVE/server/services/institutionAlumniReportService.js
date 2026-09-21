const mongoose = require('mongoose')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const InstitutionAlumniMentorship = require('../models/InstitutionAlumniMentorship')
const InstitutionAlumniMentorshipSession = require('../models/InstitutionAlumniMentorshipSession')
const InstitutionAlumniCareerContribution = require('../models/InstitutionAlumniCareerContribution')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionAlumniInstitutionalContribution = require('../models/InstitutionAlumniInstitutionalContribution')
const InstitutionAlumniVolunteerRecord = require('../models/InstitutionAlumniVolunteerRecord')
const InstitutionAlumniGroup = require('../models/InstitutionAlumniGroup')
const InstitutionAlumniConnection = require('../models/InstitutionAlumniConnection')
const InstitutionAlumniGroupPost = require('../models/InstitutionAlumniGroupPost')
const { ALUMNI_REPORT_TYPES } = require('../constants/institutionAlumniExtended')
const { recordAlumniAudit } = require('./institutionAlumniAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

async function paginate(Model, query, { page = 1, limit = 50, sortField, sortDir } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50))
  const skip = (safePage - 1) * safeLimit
  const sortObj = sortField ? { [sortField]: sortDir === 'asc' ? 1 : -1 } : { createdAt: -1 }

  const [items, total] = await Promise.all([
    Model.find(query).sort(sortObj).skip(skip).limit(safeLimit).lean(),
    Model.countDocuments(query),
  ])
  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

function buildReportRows(type, data) {
  switch (type) {
    case 'alumni_directory':
      return {
        header: ['Name', 'Graduation Year', 'Department', 'Company', 'Role', 'Industry', 'Country', 'Verified'],
        rows: data.alumni.map((a) => [
          a.fullName,
          a.graduationYear || '',
          a.department || '',
          a.currentCompany || '',
          a.currentRole || '',
          a.industry || '',
          a.location?.country || '',
          a.verificationStatus || '',
        ]),
      }
    case 'mentorship':
      return {
        header: ['Student', 'Department', 'Status', 'Goals', 'Matched', 'Created'],
        rows: data.mentorships.map((m) => [
          m.studentName || '',
          m.studentDepartment || '',
          m.status,
          (m.goals || []).join('; '),
          m.matchedAt ? new Date(m.matchedAt).toISOString().slice(0, 10) : '',
          m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'career_referral':
      return {
        header: ['Title', 'Type', 'Company', 'Role', 'Status', 'Applications', 'Created'],
        rows: data.careerContributions.map((c) => [
          c.title,
          c.contributionType,
          c.company || '',
          c.role || '',
          c.status,
          c.participantCount ?? 0,
          c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'event_participation':
      return {
        header: ['Event', 'Type', 'Date', 'Registrant', 'Type', 'Status'],
        rows: data.events.flatMap((e) =>
          (e.registrations || []).map((r) => [
            e.title,
            e.eventType,
            e.startDate ? new Date(e.startDate).toISOString().slice(0, 10) : '',
            r.registrantName,
            r.registrantType || '',
            r.status,
          ]),
        ),
      }
    case 'community_growth':
      return {
        header: ['Group', 'Type', 'Location', 'Members', 'Status', 'Created'],
        rows: data.groups.map((g) => [
          g.name,
          g.groupType,
          g.chapterLocation || '',
          g.memberCount ?? 0,
          g.status,
          g.createdAt ? new Date(g.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'donation':
      return {
        header: ['Title', 'Type', 'Amount', 'Status', 'Beneficiaries', 'Date'],
        rows: data.donations.map((d) => [
          d.title,
          d.contributionType,
          d.amount ?? 0,
          d.approvalStatus,
          d.beneficiaries || '',
          d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'volunteer_activity':
      return {
        header: ['Title', 'Role', 'Event', 'Hours', 'Status', 'Date'],
        rows: data.volunteers.map((v) => [
          v.title,
          v.volunteerRole,
          v.eventTitle || '',
          v.hoursContributed ?? 0,
          v.status,
          v.participationDate ? new Date(v.participationDate).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'alumni_engagement':
      return {
        header: ['Metric', 'Value'],
        rows: Object.entries(data.engagement || {}).map(([k, v]) => [
          k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          typeof v === 'object' ? JSON.stringify(v) : String(v),
        ]),
      }
    default:
      throw err('Unknown report type')
  }
}

async function fetchReportData(institutionId, type, filters, pagination) {
  const cid = oid(institutionId)
  const query = { institutionId: cid }
  if (filters.status) query.status = filters.status
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ fullName: regex }, { title: regex }, { name: regex }, { currentCompany: regex }]
  }

  let alumni = []
  let mentorships = []
  let careerContributions = []
  let events = []
  let groups = []
  let donations = []
  let volunteers = []
  let engagement = {}
  let total = 0
  let page = pagination.page || 1
  let limit = pagination.limit || 50
  let pageCount = 1

  switch (type) {
    case 'alumni_directory': {
      const r = await paginate(InstitutionAlumni, query, pagination)
      alumni = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'mentorship': {
      const r = await paginate(InstitutionAlumniMentorship, { institutionId: cid }, pagination)
      mentorships = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'career_referral': {
      const r = await paginate(InstitutionAlumniCareerContribution, { institutionId: cid }, pagination)
      careerContributions = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'event_participation': {
      events = await InstitutionAlumniEvent.find({ institutionId: cid }).lean()
      total = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0)
      break
    }
    case 'community_growth': {
      const r = await paginate(InstitutionAlumniGroup, { institutionId: cid }, pagination)
      groups = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'donation': {
      const r = await paginate(InstitutionAlumniInstitutionalContribution, { institutionId: cid }, pagination)
      donations = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'volunteer_activity': {
      const r = await paginate(InstitutionAlumniVolunteerRecord, { institutionId: cid }, pagination)
      volunteers = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'alumni_engagement': {
      const { getAlumniAnalytics } = require('./institutionAlumniAnalyticsService')
      const analytics = await getAlumniAnalytics(institutionId, filters)
      engagement = {
        totalAlumni: analytics.totalAlumni,
        verifiedAlumni: analytics.verifiedAlumni,
        activeAlumni: analytics.activeAlumni,
        mentorAvailable: analytics.mentorshipParticipation.mentorsAvailable,
        activeMentorships: analytics.mentorshipParticipation.activeMentorships,
        totalReferrals: analytics.referralActivity.totalReferrals,
        eventRegistrations: analytics.eventParticipation.totalRegistrations,
        donationAmount: analytics.donationsContributions.totalAmount,
        volunteerHours: analytics.volunteerEngagement.totalHours,
        communityGroups: analytics.communityGroups,
        connections: await InstitutionAlumniConnection.countDocuments({ institutionId: cid, status: 'accepted' }),
        discussionPosts: await InstitutionAlumniGroupPost.countDocuments({ institutionId: cid }),
      }
      total = Object.keys(engagement).length
      page = 1
      pageCount = 1
      break
    }
    default:
      throw err('Unknown report type')
  }

  const report = buildReportRows(type, {
    alumni,
    mentorships,
    careerContributions,
    events,
    groups,
    donations,
    volunteers,
    engagement,
  })

  return { report, total, page, limit, pageCount }
}

async function generateAlumniReport(institutionId, actorUserId, actorName, type, filters = {}, pagination = {}) {
  if (!ALUMNI_REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const { report, total, page, limit, pageCount } = await fetchReportData(
    institutionId,
    type,
    filters,
    pagination,
  )

  await recordAlumniAudit({
    institutionId,
    action: 'report_generated',
    actorUserId,
    actorName,
    description: `Alumni report: ${type}`,
    metadata: { type, filters, rowCount: report.rows.length },
  }).catch(() => {})

  return { type, header: report.header, rows: report.rows, total, page, limit, pageCount }
}

function exportReportCsv(report) {
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
  return [report.header, ...report.rows].map((row) => row.map(escape).join(',')).join('\n')
}

async function exportAlumniReport(institutionId, actorUserId, actorName, type, filters, format = 'csv') {
  const report = await generateAlumniReport(
    institutionId,
    actorUserId,
    actorName,
    type,
    filters,
    { page: 1, limit: 5000 },
  )

  await recordAlumniAudit({
    institutionId: oid(institutionId),
    action: 'report_exported',
    actorUserId,
    actorName,
    description: `Alumni report exported: ${type} (${format})`,
    metadata: { type, format, rowCount: report.rows.length },
  }).catch(() => {})

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `alumni-${type}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Alumni Report: ${type.replace(/_/g, ' ')}`,
      `Generated: ${new Date().toISOString()}`,
      `Total rows: ${report.rows.length}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `alumni-${type}.pdf`,
      content: lines.join('\n'),
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generateAlumniReport,
  exportAlumniReport,
  ALUMNI_REPORT_TYPES,
}
