const mongoose = require('mongoose')
const CampusOpportunity = require('../models/CampusOpportunity')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const { PLACEMENT_REPORT_TYPES } = require('../constants/institutionPlacements')
const { buildPlacementMatch } = require('./institutionPlacementAnalyticsService')
const { recordAudit } = require('./institutionAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

const SORT_MAP = {
  studentName: 'candidateSnapshot.name',
  department: 'department',
  company: 'companyId',
  stage: 'stage',
  appliedDate: 'createdAt',
  role: 'roleTitle',
}

async function getCompanyMap(institutionId) {
  const partnerships = await InstitutionCompanyPartnership.find({
    institutionId: oid(institutionId),
    status: 'active',
  }).lean()
  const companies = await Company.find({ _id: { $in: partnerships.map((p) => p.companyId) } }).lean()
  return Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]))
}

async function fetchApplications(institutionId, filters, pagination) {
  const match = buildPlacementMatch(institutionId, filters)
  const page = Math.max(1, parseInt(pagination.page, 10) || 1)
  const limit = Math.min(500, Math.max(1, parseInt(pagination.limit, 10) || 50))
  const skip = (page - 1) * limit
  const sortField = SORT_MAP[pagination.sort] || 'createdAt'
  const sortDir = pagination.sortDir === 'desc' ? -1 : 1

  const [apps, total] = await Promise.all([
    RecruitmentApplication.find(match).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(match),
  ])

  const companyMap = await getCompanyMap(institutionId)
  return { apps, total, page, limit, companyMap }
}

function buildReportRows(type, data) {
  const { apps, companyMap, drives, offers, internships } = data

  switch (type) {
    case 'placement_summary':
      return {
        header: ['Metric', 'Value'],
        rows: [
          ['Total Applications', apps.length],
          ['Unique Companies', new Set(apps.map((a) => a.companyId?.toString())).size],
          ['Selected/Placed', apps.filter((a) => ['selected', 'hired', 'offer_accepted'].includes(a.stage)).length],
        ],
      }
    case 'company_hiring':
      return {
        header: ['Company', 'Applications', 'Selected', 'Offers'],
        rows: Object.entries(
          apps.reduce((acc, a) => {
            const name = companyMap[a.companyId?.toString()] || 'Unknown'
            if (!acc[name]) acc[name] = { apps: 0, selected: 0, offers: 0 }
            acc[name].apps++
            if (['selected', 'shortlisted', 'hired', 'offer_accepted'].includes(a.stage)) acc[name].selected++
            if (['offer_released', 'offer_accepted', 'hired'].includes(a.stage)) acc[name].offers++
            return acc
          }, {}),
        ).map(([name, v]) => [name, v.apps, v.selected, v.offers]),
      }
    case 'student_placement':
      return {
        header: ['Student', 'Company', 'Role', 'Department', 'CGPA', 'Stage', 'Applied Date'],
        rows: apps.map((a) => [
          a.candidateSnapshot?.name || '—',
          companyMap[a.companyId?.toString()] || '—',
          a.roleTitle,
          a.department || '',
          a.cgpa ?? '',
          a.stage,
          a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'internship':
      return {
        header: ['Title', 'Company', 'Location', 'Stipend', 'Deadline', 'Status'],
        rows: (internships || []).map((i) => [
          i.title,
          companyMap[i.companyId?.toString()] || '—',
          i.location || '',
          i.stipend ?? 0,
          i.deadline ? new Date(i.deadline).toISOString().slice(0, 10) : '',
          i.status,
        ]),
      }
    case 'offer_acceptance':
      return {
        header: ['Student', 'Company', 'Role', 'Package', 'Status', 'Joining Date'],
        rows: (offers || []).map((o) => {
          const app = apps.find((a) => a._id.toString() === o.applicationId?.toString())
          return [
            app?.candidateSnapshot?.name || '—',
            companyMap[o.companyId?.toString()] || '—',
            app?.roleTitle || '',
            o.salary ?? 0,
            o.status,
            o.joiningDate ? new Date(o.joiningDate).toISOString().slice(0, 10) : '',
          ]
        }),
      }
    case 'campus_drive':
      return {
        header: ['Drive', 'Company', 'Drive Date', 'Deadline', 'Venue', 'Status', 'Hiring Target'],
        rows: (drives || []).map((d) => [
          d.title,
          companyMap[d.companyId?.toString()] || '—',
          d.driveDate ? new Date(d.driveDate).toISOString().slice(0, 10) : '',
          d.deadline ? new Date(d.deadline).toISOString().slice(0, 10) : '',
          d.venue || d.onlinePlatform || '',
          d.status,
          d.expectedHiringCount ?? d.openPositions ?? '',
        ]),
      }
    case 'recruitment_timeline':
      return {
        header: ['Date', 'Student', 'Company', 'Role', 'Event', 'Stage'],
        rows: apps
          .toSorted((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .map((a) => [
            a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : '',
            a.candidateSnapshot?.name || '—',
            companyMap[a.companyId?.toString()] || '—',
            a.roleTitle,
            'Application Update',
            a.stage,
          ]),
      }
    case 'department_placement':
      return {
        header: ['Department', 'Applications', 'Selected', 'Placed'],
        rows: Object.entries(
          apps.reduce((acc, a) => {
            const d = a.department || 'Unknown'
            if (!acc[d]) acc[d] = { total: 0, selected: 0, placed: 0 }
            acc[d].total++
            if (['selected', 'shortlisted'].includes(a.stage)) acc[d].selected++
            if (['hired', 'offer_accepted'].includes(a.stage)) acc[d].placed++
            return acc
          }, {}),
        ).map(([dept, v]) => [dept, v.total, v.selected, v.placed]),
      }
    case 'batch_placement':
      return {
        header: ['Batch/Graduation Year', 'Applications', 'Selected', 'Placed'],
        rows: Object.entries(
          apps.reduce((acc, a) => {
            const b = a.graduationYear || 'Unknown'
            if (!acc[b]) acc[b] = { total: 0, selected: 0, placed: 0 }
            acc[b].total++
            if (['selected', 'shortlisted'].includes(a.stage)) acc[b].selected++
            if (['hired', 'offer_accepted'].includes(a.stage)) acc[b].placed++
            return acc
          }, {}),
        ).map(([batch, v]) => [batch, v.total, v.selected, v.placed]),
      }
    default:
      throw err('Unknown report type')
  }
}

async function generatePlacementReport(institutionId, actorUserId, actorName, type, filters = {}, pagination = {}) {
  if (!PLACEMENT_REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const iid = oid(institutionId)
  const { apps, total, page, limit, companyMap } = await fetchApplications(institutionId, filters, pagination)

  let drives = []
  let internships = []
  let offerDocs = []

  if (type === 'campus_drive') {
    drives = await CampusOpportunity.find({ institutionId: iid, opportunityType: 'campus_drive' }).lean()
  }
  if (type === 'internship') {
    internships = await CampusOpportunity.find({ institutionId: iid, opportunityType: 'internship' }).lean()
  }
  if (type === 'offer_acceptance') {
    const appIds = apps.map((a) => a._id)
    offerDocs = await RecruitmentOffer.find({ applicationId: { $in: appIds } }).lean()
  }

  const report = buildReportRows(type, { apps, companyMap, drives, offers: offerDocs, internships })

  await recordAudit({
    institutionId: iid,
    action: 'placement_report_generated',
    actorUserId,
    actorName,
    description: `Placement report: ${type}`,
    metadata: { type, filters, rowCount: report.rows.length },
  }).catch(() => {})

  return {
    type,
    header: report.header,
    rows: report.rows,
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

function exportReportCsv(report) {
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
  return [report.header, ...report.rows].map((row) => row.map(escape).join(',')).join('\n')
}

async function exportPlacementReport(institutionId, actorUserId, actorName, type, filters, format = 'csv') {
  const report = await generatePlacementReport(institutionId, actorUserId, actorName, type, filters, {
    page: 1,
    limit: 5000,
  })

  await recordAudit({
    institutionId: oid(institutionId),
    action: 'placement_report_exported',
    actorUserId,
    actorName,
    description: `Placement report exported: ${type} (${format})`,
    metadata: { type, format, rowCount: report.rows.length },
  }).catch(() => {})

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `placement-${type}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Placement Report: ${type.replace(/_/g, ' ')}`,
      `Generated: ${new Date().toISOString()}`,
      `Total rows: ${report.rows.length}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `placement-${type}.pdf`,
      content: lines.join('\n'),
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generatePlacementReport,
  exportPlacementReport,
  PLACEMENT_REPORT_TYPES,
}
