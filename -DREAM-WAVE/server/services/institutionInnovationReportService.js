const mongoose = require('mongoose')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionResearchPublication = require('../models/InstitutionResearchPublication')
const InstitutionInnovationIdea = require('../models/InstitutionInnovationIdea')
const InstitutionStartup = require('../models/InstitutionStartup')
const InstitutionIncubationRecord = require('../models/InstitutionIncubationRecord')
const InstitutionMentor = require('../models/InstitutionMentor')
const InstitutionMentorshipSession = require('../models/InstitutionMentorshipSession')
const InstitutionFundingRecord = require('../models/InstitutionFundingRecord')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionIncubationCollaboration = require('../models/InstitutionIncubationCollaboration')
const { INNOVATION_REPORT_TYPES } = require('../constants/institutionResearch')
const { recordInnovationAudit } = require('./institutionInnovationAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

const SORT_MAP = {
  title: 'title',
  name: 'name',
  status: 'status',
  date: 'createdAt',
  stage: 'currentStage',
}

async function paginate(Model, query, { page = 1, limit = 50, sort = '-createdAt', sortField, sortDir }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50))
  const skip = (safePage - 1) * safeLimit
  const field = SORT_MAP[sortField || sort] || 'createdAt'
  const dir = sortDir === 'asc' ? 1 : -1
  const sortObj = sortField || sort ? { [field]: dir } : { createdAt: -1 }

  const [items, total] = await Promise.all([
    Model.find(query).sort(sortObj).skip(skip).limit(safeLimit).lean(),
    Model.countDocuments(query),
  ])
  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

function buildReportRows(type, data) {
  const {
    projects, publications, startups, incubations, mentors, sessions,
    funding, ideas, events, collaborations, startupMap,
  } = data

  switch (type) {
    case 'research_project':
      return {
        header: ['Title', 'Domain', 'Status', 'PI', 'Members', 'Created'],
        rows: projects.map((p) => [
          p.title,
          p.domain || '',
          p.status,
          p.principalInvestigator?.name || '',
          (p.members || []).length,
          p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'publication':
      return {
        header: ['Title', 'Type', 'Venue', 'Year', 'Authors'],
        rows: publications.map((p) => [
          p.title,
          p.publicationType,
          p.journalOrVenue || '',
          p.year ?? '',
          (p.authors || []).join('; '),
        ]),
      }
    case 'startup_progress':
      return {
        header: ['Startup', 'Category', 'Stage', 'Status', 'Founders'],
        rows: startups.map((s) => [
          s.name,
          s.category || '',
          s.stage || '',
          s.status,
          (s.founders || []).join('; '),
        ]),
      }
    case 'incubation':
      return {
        header: ['Startup', 'Current Stage', 'Started', 'Graduated'],
        rows: incubations.map((r) => [
          startupMap[r.startupId?.toString()] || r.startupId?.toString() || '',
          r.currentStage,
          r.startedAt ? new Date(r.startedAt).toISOString().slice(0, 10) : '',
          r.graduatedAt ? new Date(r.graduatedAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'mentor_activity':
      return {
        header: ['Mentor', 'Type', 'Session Date', 'Startup', 'Status', 'Goals'],
        rows: sessions.map((s) => {
          const mentor = mentors.find((m) => m._id.toString() === s.mentorId?.toString())
          return [
            mentor?.name || '',
            mentor?.mentorType || '',
            s.scheduledDate ? new Date(s.scheduledDate).toISOString().slice(0, 10) : '',
            startupMap[s.startupId?.toString()] || '',
            s.status,
            (s.goals || []).join('; '),
          ]
        }),
      }
    case 'funding':
      return {
        header: ['Source', 'Type', 'Amount', 'Status', 'Startup', 'Date'],
        rows: funding.map((f) => [
          f.fundingSource,
          f.fundingType,
          f.amount ?? 0,
          f.status,
          startupMap[f.startupId?.toString()] || '',
          f.fundingDate ? new Date(f.fundingDate).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'innovation_ideas':
      return {
        header: ['Title', 'Type', 'Submitter', 'Status', 'Submitted'],
        rows: ideas.map((i) => [
          i.title,
          i.ideaType,
          i.submitterName || '',
          i.reviewStatus,
          i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : '',
        ]),
      }
    case 'event_participation':
      return {
        header: ['Event', 'Type', 'Date', 'Registrant', 'Status'],
        rows: events.flatMap((e) =>
          (e.registrations || []).map((r) => [
            e.title,
            e.eventType,
            e.startDate ? new Date(e.startDate).toISOString().slice(0, 10) : '',
            r.registrantName,
            r.status,
          ]),
        ),
      }
    case 'collaboration':
      return {
        header: ['Type', 'Title', 'Author', 'Startup', 'Date'],
        rows: collaborations.map((c) => [
          c.collaborationType,
          c.title,
          c.authorName || '',
          startupMap[c.startupId?.toString()] || '',
          c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
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
    query.$or = [{ title: regex }, { name: regex }]
  }

  const startups = await InstitutionStartup.find({ institutionId: cid }).select('name').lean()
  const startupMap = Object.fromEntries(startups.map((s) => [s._id.toString(), s.name]))

  let items = []
  let total = 0
  let page = pagination.page || 1
  let limit = pagination.limit || 50
  let pageCount = 1

  let startupRows = []
  let projects = []
  let publications = []
  let incubations = []
  let mentors = []
  let sessions = []
  let funding = []
  let ideas = []
  let events = []
  let collaborations = []

  switch (type) {
    case 'research_project': {
      const r = await paginate(InstitutionResearchProject, query, pagination)
      projects = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'publication': {
      const r = await paginate(InstitutionResearchPublication, query, pagination)
      publications = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'startup_progress': {
      const r = await paginate(InstitutionStartup, query, pagination)
      startupRows = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'incubation': {
      const r = await paginate(InstitutionIncubationRecord, { institutionId: cid }, pagination)
      incubations = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'mentor_activity': {
      mentors = await InstitutionMentor.find({ institutionId: cid }).lean()
      const r = await paginate(InstitutionMentorshipSession, { institutionId: cid }, pagination)
      sessions = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'funding': {
      const r = await paginate(InstitutionFundingRecord, { institutionId: cid }, pagination)
      funding = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'innovation_ideas': {
      const r = await paginate(InstitutionInnovationIdea, query, pagination)
      ideas = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    case 'event_participation': {
      events = await InstitutionInnovationEvent.find({ institutionId: cid }).lean()
      total = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0)
      page = 1
      pageCount = 1
      break
    }
    case 'collaboration': {
      const r = await paginate(InstitutionIncubationCollaboration, { institutionId: cid }, pagination)
      collaborations = r.items
      total = r.total
      page = r.page
      limit = r.limit
      pageCount = r.pageCount
      break
    }
    default:
      throw err('Unknown report type')
  }

  const report = buildReportRows(type, {
    projects,
    publications,
    startups: startupRows,
    incubations,
    mentors,
    sessions,
    funding,
    ideas,
    events,
    collaborations,
    startupMap,
  })

  return { report, total, page, limit, pageCount }
}

async function generateInnovationReport(institutionId, actorUserId, actorName, type, filters = {}, pagination = {}) {
  if (!INNOVATION_REPORT_TYPES.includes(type)) throw err('Invalid report type')

  const { report, total, page, limit, pageCount } = await fetchReportData(
    institutionId,
    type,
    filters,
    pagination,
  )

  await recordInnovationAudit({
    institutionId,
    action: 'report_generated',
    actorUserId,
    actorName,
    description: `Innovation report: ${type}`,
    metadata: { type, filters, rowCount: report.rows.length },
  }).catch(() => {})

  return {
    type,
    header: report.header,
    rows: report.rows,
    total,
    page,
    limit,
    pageCount,
  }
}

function exportReportCsv(report) {
  const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
  return [report.header, ...report.rows].map((row) => row.map(escape).join(',')).join('\n')
}

async function exportInnovationReport(institutionId, actorUserId, actorName, type, filters, format = 'csv') {
  const report = await generateInnovationReport(
    institutionId,
    actorUserId,
    actorName,
    type,
    filters,
    { page: 1, limit: 5000 },
  )

  await recordInnovationAudit({
    institutionId: oid(institutionId),
    action: 'report_exported',
    actorUserId,
    actorName,
    description: `Innovation report exported: ${type} (${format})`,
    metadata: { type, format, rowCount: report.rows.length },
  }).catch(() => {})

  if (format === 'csv' || format === 'xlsx') {
    return {
      format,
      mimeType: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      filename: `innovation-${type}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      content: exportReportCsv(report),
    }
  }

  if (format === 'pdf') {
    const lines = [
      `Innovation Report: ${type.replace(/_/g, ' ')}`,
      `Generated: ${new Date().toISOString()}`,
      `Total rows: ${report.rows.length}`,
      '',
      report.header.join(' | '),
      ...report.rows.map((r) => r.join(' | ')),
    ]
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      filename: `innovation-${type}.pdf`,
      content: lines.join('\n'),
    }
  }

  throw err('Unsupported export format')
}

module.exports = {
  generateInnovationReport,
  exportInnovationReport,
  INNOVATION_REPORT_TYPES,
}
