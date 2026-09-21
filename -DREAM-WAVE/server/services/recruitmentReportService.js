const mongoose = require('mongoose')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationActivity = require('../models/ApplicationActivity')
const { RECRUITMENT_REPORT_TYPES } = require('../constants/companyRecruitment')
const { buildAppMatch } = require('./recruitmentAnalyticsService')
const { recordRecruitmentAudit } = require('./recruitmentAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

const SORT_MAP = {
  candidateName: 'candidateSnapshot.name',
  department: 'department',
  stage: 'stage',
  appliedDate: 'createdAt',
  role: 'roleTitle',
}

async function fetchApplications(companyId, filters, pagination) {
  const match = buildAppMatch(companyId, filters)
  const page = Math.max(1, parseInt(pagination.page, 10) || 1)
  const limit = Math.min(500, Math.max(1, parseInt(pagination.limit, 10) || 50))
  const skip = (page - 1) * limit
  const sortField = SORT_MAP[pagination.sort] || 'createdAt'
  const sortDir = pagination.sortDir === 'desc' ? -1 : 1

  const [apps, total] = await Promise.all([
    RecruitmentApplication.find(match).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(match),
  ])
  return { apps, total, page, limit }
}

function buildReportRows(type, data) {
  const { apps, jobs, internships, interviews, offers, activities } = data

  switch (type) {
    case 'job_performance':
      return {
        header: ['Title', 'Type', 'Department', 'Status', 'Openings'],
        rows: [
          ...(jobs || []).map((j) => [j.title, 'Job', j.department || '', j.status, j.openings ?? 1]),
          ...(internships || []).map((i) => [i.title, 'Internship', i.department || '', i.status, i.openPositions ?? 1]),
        ],
      }
    case 'candidate_pipeline':
      return {
        header: ['Candidate', 'Role', 'Department', 'Stage', 'Applied Date'],
        rows: apps.map((a) => [
          a.candidateSnapshot?.name || '—',
          a.roleTitle,
          a.department || '',
          a.stage,
          a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'interview_summary':
      return {
        header: ['Candidate', 'Role', 'Round', 'Date', 'Status', 'Recommendation'],
        rows: (interviews || []).map((i) => {
          const app = apps.find((a) => a._id.toString() === i.applicationId?.toString())
          return [
            app?.candidateSnapshot?.name || '—',
            i.roleTitle || app?.roleTitle || '',
            i.round,
            i.scheduledDate ? new Date(i.scheduledDate).toISOString().slice(0, 10) : '',
            i.status,
            i.feedback?.recommendation || '',
          ]
        }),
      }
    case 'offer_report':
      return {
        header: ['Role', 'Department', 'Salary', 'Status', 'Joining Date', 'Released'],
        rows: (offers || []).map((o) => {
          const app = apps.find((a) => a._id.toString() === o.applicationId?.toString())
          return [
            o.roleTitle || app?.roleTitle || '',
            o.department || '',
            o.salary ?? 0,
            o.status,
            o.joiningDate ? new Date(o.joiningDate).toISOString().slice(0, 10) : '',
            o.releasedAt ? new Date(o.releasedAt).toISOString().slice(0, 10) : '',
          ]
        }),
      }
    case 'hiring_report':
      return {
        header: ['Candidate', 'Role', 'Department', 'Hired Date', 'Source'],
        rows: apps
          .filter((a) => a.stage === 'hired')
          .map((a) => [
            a.candidateSnapshot?.name || '—',
            a.roleTitle,
            a.department || '',
            a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : '',
            a.institutionName || a.opportunityType || 'Direct',
          ]),
      }
    case 'recruiter_activity':
      return {
        header: ['Date', 'Event', 'Description', 'Application'],
        rows: (activities || []).map((a) => [
          a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
          a.type,
          a.title,
          a.applicationId?.toString() || '',
        ]),
      }
    case 'recruitment_timeline':
      return {
        header: ['Date', 'Candidate', 'Role', 'Event', 'Stage'],
        rows: [...apps]
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .map((a) => [
            a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : '',
            a.candidateSnapshot?.name || '—',
            a.roleTitle,
            'Application Update',
            a.stage,
          ]),
      }
    case 'source_effectiveness':
      return {
        header: ['Source', 'Applications', 'Hired', 'Conversion %'],
        rows: Object.entries(
          apps.reduce((acc, a) => {
            const src = a.institutionName || a.opportunityType || 'Direct'
            if (!acc[src]) acc[src] = { total: 0, hired: 0 }
            acc[src].total++
            if (a.stage === 'hired') acc[src].hired++
            return acc
          }, {}),
        ).map(([src, v]) => [src, v.total, v.hired, v.total ? Math.round((v.hired / v.total) * 100) : 0]),
      }
    default:
      throw err('Unknown report type')
  }
}

async function generateRecruitmentReport(companyId, actorUserId, actorName, type, filters = {}, pagination = {}) {
  if (!RECRUITMENT_REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const cid = oid(companyId)
  const { apps, total, page, limit } = await fetchApplications(companyId, filters, pagination)

  let jobs = []
  let internships = []
  let interviews = []
  let offers = []
  let activities = []

  if (type === 'job_performance') {
    ;[jobs, internships] = await Promise.all([
      RecruitmentJob.find({ companyId: cid }).lean(),
      RecruitmentInternship.find({ companyId: cid }).lean(),
    ])
  }
  if (type === 'interview_summary') {
    interviews = await RecruitmentInterview.find({ companyId: cid }).sort({ scheduledDate: -1 }).lean()
  }
  if (type === 'offer_report') {
    offers = await RecruitmentOffer.find({ companyId: cid }).lean()
  }
  if (type === 'recruiter_activity') {
    activities = await ApplicationActivity.find({ companyId: cid })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
  }

  const report = buildReportRows(type, { apps, jobs, internships, interviews, offers, activities })

  await recordRecruitmentAudit({
    companyId: cid,
    action: 'report_generated',
    actorUserId,
    actorName,
    description: `Report generated: ${type}`,
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

async function exportRecruitmentReport(companyId, actorUserId, actorName, type, filters, format = 'csv') {
  const report = await generateRecruitmentReport(
    companyId,
    actorUserId,
    actorName,
    type,
    filters,
    { page: 1, limit: 5000 },
  )

  await recordRecruitmentAudit({
    companyId: oid(companyId),
    action: 'report_exported',
    actorUserId,
    actorName,
    description: `Report exported: ${type} (${format})`,
    metadata: { type, format, rowCount: report.rows.length },
  }).catch(() => {})

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `recruitment-${type}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Recruitment Report: ${type.replace(/_/g, ' ')}`,
      `Generated: ${new Date().toISOString()}`,
      `Total rows: ${report.rows.length}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `recruitment-${type}.pdf`,
      content: lines.join('\n'),
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generateRecruitmentReport,
  exportRecruitmentReport,
  RECRUITMENT_REPORT_TYPES,
}
