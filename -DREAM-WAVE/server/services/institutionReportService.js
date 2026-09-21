const InstitutionStudent = require('../models/InstitutionStudent')
const { REPORT_TYPES } = require('../constants/institutionPermissions')
const { buildAnalyticsMatch } = require('./institutionAnalyticsService')
const { isCertificateVisible } = require('../utils/institutionStudentPrivacy')
const { recordAudit } = require('./institutionAuditService')
const institutionCache = require('./institutionCache')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

const SORT_MAP = {
  fullName: 'fullName',
  department: 'department',
  course: 'course',
  batch: 'batch',
  semester: 'semester',
  status: 'status',
  createdAt: 'createdAt',
}

function buildReportRows(type, students) {
  switch (type) {
    case 'student_directory':
      return {
        header: ['Student ID', 'Roll Number', 'Name', 'Department', 'Program', 'Batch', 'Semester', 'Status', 'Email'],
        rows: students.map((s) => [
          s.studentId,
          s.rollNumber,
          s.fullName,
          s.department,
          s.course,
          s.batch,
          s.semester,
          s.status,
          s.email,
        ]),
      }
    case 'department':
      return {
        header: ['Department', 'Student Count'],
        rows: Object.entries(
          students.reduce((acc, s) => {
            const d = s.department || 'Unknown'
            acc[d] = (acc[d] || 0) + 1
            return acc
          }, {}),
        ),
      }
    case 'program':
      return {
        header: ['Program', 'Student Count'],
        rows: Object.entries(
          students.reduce((acc, s) => {
            const c = s.course || 'Unknown'
            acc[c] = (acc[c] || 0) + 1
            return acc
          }, {}),
        ),
      }
    case 'placement':
      return {
        header: ['Name', 'Department', 'Lifecycle Status', 'Legacy Status', 'Resume Uploaded'],
        rows: students.map((s) => [
          s.fullName,
          s.department,
          s.placement?.lifecycleStatus || 'NOT_ELIGIBLE',
          s.placement?.status || 'not-started',
          s.placement?.resumeUploaded ? 'Yes' : 'No',
        ]),
      }
    case 'skills':
      return {
        header: ['Name', 'Department', 'Shared Skills', 'Verified Skills'],
        rows: students.map((s) => [
          s.fullName,
          s.department,
          (s.sharedSkills || []).join('; '),
          (s.verifiedSkills || []).join('; '),
        ]),
      }
    case 'projects':
      return {
        header: ['Name', 'Department', 'Project Titles', 'Technologies'],
        rows: students
          .filter((s) => (s.sharedProjects || []).length)
          .map((s) => [
            s.fullName,
            s.department,
            (s.sharedProjects || []).map((p) => p.title).join('; '),
            (s.sharedProjects || [])
              .flatMap((p) => p.technologies || [])
              .join('; '),
          ]),
      }
    case 'certificates':
      return {
        header: ['Name', 'Certificate', 'Issuer', 'Verification Status'],
        rows: students.flatMap((s) =>
          (s.certifications || [])
            .filter(isCertificateVisible)
            .map((c) => [
              s.fullName,
              c.title,
              c.issuer || c.issuingOrganization,
              c.verificationStatus,
            ]),
        ),
      }
    case 'academic_summary':
      return {
        header: ['Name', 'Department', 'CGPA', 'Attendance', 'Backlogs', 'Status'],
        rows: students.map((s) => [
          s.fullName,
          s.department,
          s.cgpa ?? '',
          s.attendance ?? '',
          s.backlogs ?? 0,
          s.status,
        ]),
      }
    case 'profile_completeness':
      return {
        header: ['Name', 'Profile Status', 'Email', 'Skills Count', 'Projects Count', 'Documents Count'],
        rows: students.map((s) => [
          s.fullName,
          s.profileStatus || 'partial',
          s.email ? 'Yes' : 'No',
          (s.sharedSkills || []).length,
          (s.sharedProjects || []).length,
          (s.documents || []).length,
        ]),
      }
    case 'attendance':
      return {
        header: ['Name', 'Department', 'Semester', 'Attendance %'],
        rows: students.map((s) => [s.fullName, s.department, s.semester, s.attendance ?? 0]),
      }
    default:
      throw err('Unknown report type')
  }
}

async function generateReport(
  institutionId,
  actorUserId,
  actorName,
  type,
  filters = {},
  pagination = {},
) {
  if (!REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const match = buildAnalyticsMatch(institutionId, filters)
  const page = Math.max(1, parseInt(pagination.page, 10) || 1)
  const limit = Math.min(500, Math.max(1, parseInt(pagination.limit, 10) || 50))
  const skip = (page - 1) * limit
  const sortField = SORT_MAP[pagination.sort] || 'fullName'
  const sortDir = pagination.sortDir === 'desc' ? -1 : 1

  const [students, total] = await Promise.all([
    InstitutionStudent.find(match).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    InstitutionStudent.countDocuments(match),
  ])

  const report = buildReportRows(type, students)

  await recordAudit({
    institutionId,
    action: 'report_generated',
    actorUserId,
    actorName,
    description: `Report: ${type}`,
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

async function exportReport(
  institutionId,
  actorUserId,
  actorName,
  type,
  filters,
  format = 'csv',
) {
  const report = await generateReport(institutionId, actorUserId, actorName, type, filters, {
    page: 1,
    limit: 5000,
  })

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `${type}-report.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Institution Report: ${type}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `${type}-report.pdf`,
      content: lines.join('\n'),
      note: 'Text-based PDF preview — use CSV for structured export',
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generateReport,
  exportReport,
  exportReportCsv,
  REPORT_TYPES,
}
