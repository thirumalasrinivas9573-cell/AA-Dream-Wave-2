const { EXECUTIVE_REPORT_TYPES } = require('../constants/institutionCommandCenter')
const { getExecutiveAnalytics } = require('./institutionExecutiveAnalyticsService')
const { getCommandCenterOverview } = require('./institutionCommandCenterService')
const { recordExecutiveAudit } = require('./institutionExecutiveAuditService')
const InstitutionStudent = require('../models/InstitutionStudent')
const mongoose = require('mongoose')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

async function paginateStudents(institutionId, filters, pagination) {
  const query = { institutionId: oid(institutionId) }
  if (filters.department) query.department = filters.department
  if (filters.academicYear) query.academicYear = filters.academicYear
  if (filters.semester) query.semester = filters.semester
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ fullName: regex }, { department: regex }, { studentId: regex }]
  }

  const safePage = Math.max(1, parseInt(pagination.page, 10) || 1)
  const safeLimit = Math.min(500, Math.max(1, parseInt(pagination.limit, 10) || 50))
  const skip = (safePage - 1) * safeLimit
  const sortField = pagination.sortField || 'fullName'
  const sortDir = pagination.sortDir === 'desc' ? -1 : 1

  const [items, total] = await Promise.all([
    InstitutionStudent.find(query)
      .select('fullName department course semester batch cgpa attendance placement status academicYear')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    InstitutionStudent.countDocuments(query),
  ])

  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

function buildReportRows(type, data) {
  switch (type) {
    case 'executive_summary':
      return {
        header: ['Metric', 'Value'],
        rows: data.kpis.map((k) => [k.label, k.value]),
      }
    case 'academic_intelligence':
      return {
        header: ['Department', 'Students'],
        rows: Object.entries(data.academic.byDepartment || {}).map(([d, c]) => [d, c]),
      }
    case 'student_success':
      return {
        header: ['Name', 'Department', 'CGPA', 'Attendance', 'Status'],
        rows: data.students.map((s) => [
          s.fullName,
          s.department || '',
          s.cgpa ?? '',
          s.attendance ?? '',
          s.status || '',
        ]),
      }
    case 'placement_performance':
      return {
        header: ['Department', 'Placed', 'Applications'],
        rows: Object.entries(data.placement.byDepartmentPlaced || {}).map(([d, c]) => [
          d,
          c,
          data.placement.byDepartment?.[d] ?? 0,
        ]),
      }
    case 'internship':
      return {
        header: ['Metric', 'Value'],
        rows: [
          ['Internship Listings', data.internship.internshipListings],
          ['Internship Opportunities', data.internship.internshipOpportunities],
          ['Applications Submitted', data.internship.applicationsSubmitted],
        ],
      }
    case 'industry_collaboration':
      return {
        header: ['Metric', 'Value'],
        rows: [
          ['Active Industry Partners', data.industry.activeIndustryPartners],
          ['Recruitment Partners', data.industry.recruitmentPartners],
          ['Internship Partners', data.industry.internshipPartners],
          ['Research Partners', data.industry.researchPartners],
          ['Hiring Organizations', data.industry.hiringOrganizations],
          ['Applications Submitted', data.industry.applicationsSubmitted],
        ],
      }
    case 'research_innovation':
      return {
        header: ['Metric', 'Value'],
        rows: [
          ['Active Research Projects', data.research.activeProjects],
          ['Publications', data.research.publications],
          ['Research Collaborations', data.research.collaborations],
          ['Innovation Ideas', data.research.innovationIdeas],
          ['Faculty Participation', data.research.facultyParticipation],
          ['Approved Funding', data.research.fundingAmount],
        ],
      }
    case 'startup_ecosystem':
      return {
        header: ['Stage', 'Count'],
        rows: Object.entries(data.startup.startupProgress || {}),
      }
    case 'alumni_engagement':
      return {
        header: ['Metric', 'Value'],
        rows: Object.entries(data.alumni).map(([k, v]) => [
          k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
          v,
        ]),
      }
    case 'institutional_health':
      return {
        header: ['Category', 'Severity', 'Title', 'Supporting Records'],
        rows: data.signals.map((s) => [s.category, s.severity, s.title, s.supportingRecords]),
      }
    case 'strategic_kpi':
      return {
        header: ['KPI', 'Category', 'Value', 'Previous', 'Change %'],
        rows: data.kpis.map((k) => [
          k.label,
          k.category,
          k.value,
          k.previousValue ?? '',
          k.percentageChange ?? '',
        ]),
      }
    default:
      throw err('Unknown report type')
  }
}

async function fetchReportData(institutionId, type, filters, pagination) {
  const analytics = await getExecutiveAnalytics(institutionId, filters)
  const overview = await getCommandCenterOverview(institutionId, filters)

  let students = []
  let total = 0
  let page = pagination.page || 1
  let limit = pagination.limit || 50
  let pageCount = 1

  if (type === 'student_success') {
    const r = await paginateStudents(institutionId, filters, pagination)
    students = r.items
    total = r.total
    page = r.page
    limit = r.limit
    pageCount = r.pageCount
  } else if (type === 'institutional_health') {
    total = overview.signals.length
  } else if (type === 'strategic_kpi') {
    total = analytics.strategicKPIs.length
  } else if (type === 'academic_intelligence') {
    total = Object.keys(analytics.academicPerformance.byDepartment || {}).length
  } else if (type === 'placement_performance') {
    total = Object.keys(analytics.placementStatistics.byDepartmentPlaced || {}).length
  } else {
    total = 10
  }

  const report = buildReportRows(type, {
    kpis: analytics.strategicKPIs,
    academic: analytics.academicPerformance,
    students,
    placement: analytics.placementStatistics,
    internship: analytics.internshipStatistics,
    industry: analytics.industryEngagement,
    research: analytics.researchProductivity,
    startup: { startupProgress: overview.researchIntelligence.startupProgress },
    alumni: analytics.alumniEngagement,
    signals: overview.signals,
  })

  return { report, total, page, limit, pageCount }
}

async function generateExecutiveReport(institutionId, actorUserId, actorName, type, filters = {}, pagination = {}) {
  if (!EXECUTIVE_REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const { report, total, page, limit, pageCount } = await fetchReportData(
    institutionId,
    type,
    filters,
    pagination,
  )

  await recordExecutiveAudit({
    institutionId,
    action: 'executive_report_generated',
    actorUserId,
    actorName,
    description: `Executive report: ${type}`,
    metadata: { type, filters, rowCount: report.rows.length },
  }).catch(() => {})

  return { type, header: report.header, rows: report.rows, total, page, limit, pageCount }
}

function exportReportCsv(report) {
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
  return [report.header, ...report.rows].map((row) => row.map(escape).join(',')).join('\n')
}

async function exportExecutiveReport(institutionId, actorUserId, actorName, type, filters, format = 'csv') {
  const report = await generateExecutiveReport(
    institutionId,
    actorUserId,
    actorName,
    type,
    filters,
    { page: 1, limit: 5000 },
  )

  await recordExecutiveAudit({
    institutionId,
    action: 'executive_report_exported',
    actorUserId,
    actorName,
    description: `Executive report exported: ${type} (${format})`,
    metadata: { type, format, rowCount: report.rows.length },
  }).catch(() => {})

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `executive-${type}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Executive Report: ${type.replace(/_/g, ' ')}`,
      `Generated: ${new Date().toISOString()}`,
      `Total rows: ${report.rows.length}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `executive-${type}.pdf`,
      content: lines.join('\n'),
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generateExecutiveReport,
  exportExecutiveReport,
  EXECUTIVE_REPORT_TYPES,
}
