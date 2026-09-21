const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCohort = require('../models/InstitutionCohort')
const InstitutionSavedFilter = require('../models/InstitutionSavedFilter')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const {
  IMPORT_MODES,
  PLACEMENT_LIFECYCLE,
  LEGACY_TO_LIFECYCLE,
} = require('../constants/institutionStudents')
const {
  buildListQuery,
  serializeDirectory,
  assertInstitutionStudent,
} = require('./institutionStudentService')
const { recordAudit, getAuditLog } = require('./institutionAuditService')
const institutionCache = require('./institutionCache')
const {
  isCertificateVisible,
  isDocumentVisible,
} = require('../utils/institutionStudentPrivacy')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordAuditEntry(payload) {
  invalidateInstitutionCache(payload.institutionId)
  return recordAudit(payload)
}

function invalidateInstitutionCache(institutionId) {
  institutionCache.invalidateInstitution(String(institutionId))
}

/** Rule-based NL → structured filters. Never fabricates data. */
function parseSmartSearch(query) {
  const text = sanitizeText(query, 500).toLowerCase()
  const filters = {}
  const reasons = []

  if (!text) return { filters, reasons, parsedQuery: text }

  if (/final\s*year|semester\s*[78]|graduating/.test(text)) {
    filters.finalYear = true
    reasons.push('Final year filter applied')
  }
  if (/\b(ai|ml|machine learning|artificial intelligence)\b/.test(text)) {
    filters.skill = filters.skill || 'AI'
    reasons.push('AI/ML skill filter applied')
  }
  if (/\breact\b/.test(text)) {
    filters.skill = 'React'
    filters.projectTech = 'React'
    reasons.push('React skill/project filter applied')
  }
  if (/\bpython\b/.test(text)) {
    filters.skill = 'Python'
    reasons.push('Python skill filter applied')
  }
  if (/\bnode\.?js\b/.test(text)) {
    filters.skill = 'Node.js'
    reasons.push('Node.js skill filter applied')
  }
  if (/cloud|aws|azure|gcp/.test(text)) {
    filters.skill = 'Cloud'
    reasons.push('Cloud skill filter applied')
  }
  if (/cyber\s*security|cybersecurity/.test(text)) {
    filters.skill = 'Cyber Security'
    reasons.push('Cyber security filter applied')
  }
  if (/placement|available for placement|placement ready/.test(text)) {
    filters.placementLifecycle = 'READY,ELIGIBLE,APPLYING'
    reasons.push('Placement availability filter applied')
  }
  if (/verified certificate/.test(text)) {
    filters.verifiedCertificate = true
    reasons.push('Verified certificate filter applied')
  }
  if (/shared project/.test(text)) {
    filters.hasSharedProjects = true
    reasons.push('Shared projects filter applied')
  }
  if (/hackathon/.test(text)) {
    filters.achievementType = 'hackathon'
    reasons.push('Hackathon achievement filter applied')
  }

  const deptMatch = text.match(/(?:department|dept)\s+([a-z\s]+)/i)
  if (deptMatch) {
    filters.department = deptMatch[1].trim()
    reasons.push(`Department filter: ${filters.department}`)
  }

  filters.q = text
  return { filters, reasons, parsedQuery: text }
}

function buildMatchExplanation(student, filters = {}) {
  const reasons = []
  const o = student.toObject ? student.toObject() : student
  const skills = [...(o.sharedSkills || []), ...(o.verifiedSkills || [])].map((s) =>
    s.toLowerCase(),
  )
  const projects = o.sharedProjects || []
  const certs = o.certifications || []

  if (filters.skill) {
    const needle = filters.skill.toLowerCase()
    if (skills.some((s) => s.includes(needle))) {
      reasons.push(`${filters.skill} skill shared`)
    }
    if (projects.some((p) => (p.technologies || []).some((t) => t.toLowerCase().includes(needle)))) {
      reasons.push(`${filters.skill} project available`)
    }
  }
  if (filters.projectTech) {
    const needle = filters.projectTech.toLowerCase()
    if (projects.some((p) => (p.title || '').toLowerCase().includes(needle) ||
      (p.technologies || []).some((t) => t.toLowerCase().includes(needle)))) {
      reasons.push(`${filters.projectTech} project available`)
    }
  }
  if (filters.finalYear) {
    const sem = Number(o.semester?.match(/\d+/)?.[0] ?? 0)
    if (sem >= 7) reasons.push('Final year / graduation cohort matches')
  }
  if (filters.placementLifecycle) {
    const allowed = filters.placementLifecycle.split(',')
    const lifecycle = o.placement?.lifecycleStatus || LEGACY_TO_LIFECYCLE[o.placement?.status] || 'NOT_ELIGIBLE'
    if (allowed.includes(lifecycle)) reasons.push('Eligible for placement')
  }
  if (filters.verifiedCertificate) {
    if (certs.some((c) => ['INSTITUTION_VERIFIED', 'INSTITUTION_ISSUED', 'EXTERNALLY_VERIFIED'].includes(c.verificationStatus))) {
      reasons.push('Verified certificate on record')
    }
  }
  if (filters.hasSharedProjects && projects.filter((p) => p.visibility !== 'private').length) {
    reasons.push('Shared projects available')
  }
  if (filters.department && o.department?.toLowerCase().includes(filters.department.toLowerCase())) {
    reasons.push('Department matches')
  }
  if (filters.batch && o.batch === filters.batch) {
    reasons.push('Batch matches')
  }
  if (o.expectedGraduation) {
    reasons.push(`Graduation year: ${o.expectedGraduation}`)
  }

  return reasons.length ? reasons : ['Matches directory search criteria']
}

function applyTalentFilters(baseQuery, filters) {
  const query = { ...baseQuery }
  if (filters.finalYear) {
    query.$and = query.$and || []
    query.$and.push({ semester: /Semester [78]|7|8/i })
  }
  if (filters.placementLifecycle) {
    const statuses = filters.placementLifecycle.split(',')
    query['placement.lifecycleStatus'] = { $in: statuses }
  }
  if (filters.verifiedCertificate) {
    query.$and = query.$and || []
    query.$and.push({
      'certifications.verificationStatus': {
        $in: ['INSTITUTION_VERIFIED', 'INSTITUTION_ISSUED', 'EXTERNALLY_VERIFIED'],
      },
    })
  }
  if (filters.hasSharedProjects) {
    query.$and = query.$and || []
    query.$and.push({ 'sharedProjects.0': { $exists: true } })
  }
  if (filters.achievementType) {
    query.$and = query.$and || []
    query.$and.push({ 'achievements.type': filters.achievementType })
  }
  if (filters.projectTech) {
    const regex = new RegExp(filters.projectTech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$and = query.$and || []
    query.$and.push({
      $or: [{ 'sharedProjects.title': regex }, { 'sharedProjects.technologies': regex }],
    })
  }
  return query
}

async function discoverTalent(institutionId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit

  let query = buildListQuery(institutionId, filters)
  query = applyTalentFilters(query, filters)

  const [items, total] = await Promise.all([
    InstitutionStudent.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    InstitutionStudent.countDocuments(query),
  ])

  return {
    items: items.map((doc) => ({
      ...serializeDirectory(doc),
      matchReasons: buildMatchExplanation(doc, filters),
    })),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

async function smartSearch(institutionId, nlQuery, pagination = {}) {
  const parsed = parseSmartSearch(nlQuery)
  const result = await discoverTalent(institutionId, { ...parsed.filters, ...pagination })
  return {
    parsedFilters: parsed.filters,
    parseReasons: parsed.reasons,
    ...result,
  }
}

function validateImportRow(row, index) {
  const errors = []
  const warnings = []
  if (!row.fullName?.trim()) errors.push('fullName is required')
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Invalid email format')
  }
  if (!row.department?.trim()) warnings.push('Department missing')
  return { rowIndex: index, row, errors, warnings, valid: errors.length === 0 }
}

async function previewImport(institutionId, rows, mode = 'CREATE_ONLY') {
  if (!IMPORT_MODES.includes(mode)) throw err('Invalid import mode')
  if (!Array.isArray(rows) || !rows.length) throw err('rows array required')

  const validRows = []
  const invalidRows = []
  const warnings = []
  const duplicates = []

  for (let i = 0; i < rows.length; i++) {
    const result = validateImportRow(rows[i], i)
    if (!result.valid) {
      invalidRows.push(result)
      continue
    }
    validRows.push(result)

    const studentId = sanitizeText(rows[i].studentId, 50)
    const email = sanitizeText(rows[i].email, 200)
    const or = []
    if (studentId) or.push({ studentId })
    if (email) or.push({ email })
    if (or.length) {
      const existing = await InstitutionStudent.findOne({
        institutionId,
        $or: or,
      }).lean()
      if (existing) {
        duplicates.push({
          rowIndex: i,
          existingId: existing._id.toString(),
          studentId: existing.studentId,
          fullName: existing.fullName,
          mode,
        })
        if (mode === 'CREATE_ONLY') {
          result.warnings = [...(result.warnings || []), 'Duplicate — will be skipped in CREATE_ONLY mode']
        }
      }
    }
    if (result.warnings?.length) warnings.push(...result.warnings.map((w) => ({ rowIndex: i, message: w })))
  }

  return {
    mode,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      duplicates: duplicates.length,
      warnings: warnings.length,
    },
    validRows: validRows.map((r) => r.row),
    invalidRows,
    duplicates,
    warnings,
  }
}

async function confirmImport(institutionId, actorUserId, actorName, rows, mode = 'CREATE_ONLY') {
  const preview = await previewImport(institutionId, rows, mode)
  if (preview.invalidRows.length && mode !== 'CREATE_AND_UPDATE') {
    throw err('Fix invalid rows before importing')
  }

  const results = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const validation = validateImportRow(row, i)
    if (!validation.valid) {
      results.push({ rowIndex: i, error: validation.errors.join(', ') })
      continue
    }

    const studentId = sanitizeText(row.studentId, 50) || `STU-${Date.now().toString(36).toUpperCase()}-${i}`
    const existing = await InstitutionStudent.findOne({
      institutionId,
      $or: [{ studentId }, ...(row.email ? [{ email: row.email }] : [])],
    })

    if (existing && mode === 'CREATE_ONLY') {
      results.push({ rowIndex: i, skipped: true, reason: 'Duplicate' })
      continue
    }

    if (existing && (mode === 'UPDATE_EXISTING' || mode === 'CREATE_AND_UPDATE')) {
      Object.assign(existing, {
        fullName: row.fullName || existing.fullName,
        email: row.email || existing.email,
        phone: row.phone || existing.phone,
        department: row.department || existing.department,
        course: row.course || existing.course,
        semester: row.semester || existing.semester,
        section: row.section || existing.section,
        batch: row.batch || existing.batch,
      })
      await existing.save()
      results.push({ rowIndex: i, updated: true, id: existing._id.toString() })
      continue
    }

    if (!existing) {
      try {
        const doc = await InstitutionStudent.create({
          institutionId,
          studentId,
          fullName: row.fullName,
          email: row.email || '',
          phone: row.phone || '',
          department: row.department || '',
          course: row.course || '',
          semester: row.semester || 'Semester 1',
          section: row.section || 'A',
          batch: row.batch || '',
          photoInitials: row.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
          createdByUserId: actorUserId,
        })
        results.push({ rowIndex: i, created: true, id: doc._id.toString() })
      } catch (e) {
        results.push({ rowIndex: i, error: e.message })
      }
    }
  }

  await recordAuditEntry({
    institutionId,
    action: 'import_confirmed',
    actorUserId,
    actorName,
    description: `Imported ${results.filter((r) => r.created || r.updated).length} students (${mode})`,
    metadata: { mode, total: rows.length },
  })

  return { results, preview: preview.summary }
}

async function getPlacementSummary(institutionId, studentRecordId) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const o = doc.toObject()

  let authorizedApplications = 0
  if (doc.linkedUserId) {
    authorizedApplications = await RecruitmentApplication.countDocuments({
      institutionId,
      candidateUserId: doc.linkedUserId,
    })
  }

  const visibleCerts = (o.certifications || []).filter(isCertificateVisible)
  const sharedProjects = (o.sharedProjects || []).filter((p) => p.visibility !== 'private')

  return {
    resumeUploaded: o.placement?.resumeUploaded ?? false,
    projectsShared: sharedProjects.length,
    certificatesShared: visibleCerts.length,
    placementLifecycle: o.placement?.lifecycleStatus || 'NOT_ELIGIBLE',
    placementStatusSource: o.placement?.statusSource || 'system',
    authorizedApplications,
    interviewReadiness: o.placement?.interviewProgress || '',
    sharedSkillsCount: (o.sharedSkills || []).length,
    verifiedSkillsCount: (o.verifiedSkills || []).length,
  }
}

async function getAuthorizedDocument(institutionId, studentRecordId, docIndex) {
  const student = await assertInstitutionStudent(institutionId, studentRecordId)
  const doc = student.documents?.[docIndex]
  if (!doc || !isDocumentVisible(doc)) throw err('Document not authorized', 403)
  if (!doc.storageKey) throw err('Document file not available', 404)
  return {
    name: doc.name,
    type: doc.type,
    fileName: doc.fileName,
    storageKey: doc.storageKey,
    uploadedAt: doc.uploadedAt,
  }
}

async function updatePlacementLifecycle(institutionId, studentRecordId, actorUserId, actorName, {
  lifecycleStatus,
  source = 'institution',
}) {
  if (!PLACEMENT_LIFECYCLE.includes(lifecycleStatus)) throw err('Invalid lifecycle status')
  if (!['institution', 'student', 'system'].includes(source)) throw err('Invalid status source')

  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const previous = doc.placement?.lifecycleStatus || 'NOT_ELIGIBLE'

  if (doc.placement?.statusSource && doc.placement.statusSource !== source && source === 'system') {
    throw err('Cannot silently overwrite status from another source')
  }

  doc.placement = doc.placement || {}
  doc.placement.lifecycleStatus = lifecycleStatus
  doc.placement.statusSource = source
  doc.placement.statusHistory = doc.placement.statusHistory || []
  doc.placement.statusHistory.push({
    status: lifecycleStatus,
    source,
    actorUserId,
    at: new Date(),
  })

  const legacyMap = {
    NOT_ELIGIBLE: 'not-started',
    PREPARING: 'preparing',
    READY: 'placement-ready',
    APPLYING: 'interviewing',
    PLACED: 'placed',
    ELIGIBLE: 'preparing',
  }
  if (legacyMap[lifecycleStatus]) doc.placement.status = legacyMap[lifecycleStatus]

  await doc.save()

  await recordAuditEntry({
    institutionId,
    studentId: doc._id,
    action: 'placement_status_changed',
    actorUserId,
    actorName,
    previousState: previous,
    newState: lifecycleStatus,
    metadata: { source },
  })

  return doc
}

async function verifyAchievement(institutionId, studentRecordId, achievementIndex, actorUserId, actorName) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const achievement = doc.achievements?.[achievementIndex]
  if (!achievement) throw err('Achievement not found', 404)

  achievement.verificationStatus = 'verified'
  achievement.verifiedAt = new Date()
  achievement.verifiedByUserId = actorUserId
  await doc.save()

  await recordAuditEntry({
    institutionId,
    studentId: doc._id,
    action: 'achievement_verified',
    actorUserId,
    actorName,
    description: achievement.title,
  })

  return achievement
}

async function verifyCertificate(institutionId, studentRecordId, certIndex, actorUserId, actorName) {
  const doc = await assertInstitutionStudent(institutionId, studentRecordId)
  const cert = doc.certifications?.[certIndex]
  if (!cert) throw err('Certificate not found', 404)

  cert.verificationStatus = cert.isInstitutionIssued ? 'INSTITUTION_ISSUED' : 'INSTITUTION_VERIFIED'
  if (cert.visibility === 'private') cert.visibility = 'shared'
  await doc.save()

  await recordAuditEntry({
    institutionId,
    studentId: doc._id,
    action: 'certificate_verified',
    actorUserId,
    actorName,
    description: cert.title,
  })

  return cert
}

async function bulkAction(institutionId, actorUserId, actorName, { action, studentIds, payload }) {
  if (!Array.isArray(studentIds) || !studentIds.length) throw err('studentIds required')
  const results = []

  for (const id of studentIds) {
    try {
      if (action === 'update_placement') {
        await updatePlacementLifecycle(institutionId, id, actorUserId, actorName, {
          lifecycleStatus: payload.lifecycleStatus,
          source: 'institution',
        })
        results.push({ id, ok: true })
      } else if (action === 'update_status') {
        const doc = await assertInstitutionStudent(institutionId, id)
        doc.status = payload.status
        await doc.save()
        await recordAuditEntry({
          institutionId,
          studentId: doc._id,
          action: 'bulk_status_update',
          actorUserId,
          actorName,
          newState: payload.status,
        })
        results.push({ id, ok: true })
      } else if (action === 'assign_cohort') {
        const cohort = await InstitutionCohort.findOne({ _id: payload.cohortId, institutionId })
        if (!cohort) throw err('Cohort not found', 404)
        if (!cohort.studentIds.map(String).includes(String(id))) {
          cohort.studentIds.push(id)
          await cohort.save()
        }
        const doc = await assertInstitutionStudent(institutionId, id)
        if (!doc.cohortIds.map(String).includes(String(cohort._id))) {
          doc.cohortIds.push(cohort._id)
          await doc.save()
        }
        results.push({ id, ok: true })
      } else {
        throw err(`Unknown bulk action: ${action}`)
      }
    } catch (e) {
      results.push({ id, error: e.message })
    }
  }

  await recordAuditEntry({
    institutionId,
    action: action === 'update_placement' ? 'bulk_placement_update' : 'bulk_status_update',
    actorUserId,
    actorName,
    description: `Bulk ${action} on ${studentIds.length} students`,
    metadata: { action, count: results.filter((r) => r.ok).length },
  })

  return results
}

async function listCohorts(institutionId) {
  return InstitutionCohort.find({ institutionId }).sort({ updatedAt: -1 }).lean()
}

async function createCohort(institutionId, actorUserId, payload) {
  return InstitutionCohort.create({
    institutionId,
    name: sanitizeText(payload.name, 200),
    description: sanitizeText(payload.description, 1000),
    type: payload.type || 'static',
    studentIds: payload.studentIds || [],
    filterConfig: payload.filterConfig || {},
    createdByUserId: actorUserId,
  })
}

async function resolveCohortMembers(institutionId, cohortId) {
  const cohort = await InstitutionCohort.findOne({ _id: cohortId, institutionId })
  if (!cohort) throw err('Cohort not found', 404)

  if (cohort.type === 'static') {
    const students = await InstitutionStudent.find({
      _id: { $in: cohort.studentIds },
      institutionId,
    }).lean()
    return students.map(serializeDirectory)
  }

  const query = applyTalentFilters(buildListQuery(institutionId, cohort.filterConfig || {}), cohort.filterConfig || {})
  const students = await InstitutionStudent.find(query).limit(500).lean()
  return students.map(serializeDirectory)
}

async function listSavedFilters(institutionId) {
  return InstitutionSavedFilter.find({ institutionId }).sort({ updatedAt: -1 }).lean()
}

async function createSavedFilter(institutionId, actorUserId, payload) {
  return InstitutionSavedFilter.create({
    institutionId,
    name: sanitizeText(payload.name, 200),
    description: sanitizeText(payload.description, 500),
    filterConfig: payload.filterConfig || {},
    createdByUserId: actorUserId,
  })
}

module.exports = {
  parseSmartSearch,
  buildMatchExplanation,
  discoverTalent,
  smartSearch,
  previewImport,
  confirmImport,
  getPlacementSummary,
  getAuthorizedDocument,
  updatePlacementLifecycle,
  verifyAchievement,
  verifyCertificate,
  bulkAction,
  listCohorts,
  createCohort,
  resolveCohortMembers,
  listSavedFilters,
  createSavedFilter,
}
