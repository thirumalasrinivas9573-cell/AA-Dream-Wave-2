const mongoose = require('mongoose')
const {
  STUDENT_STATUSES,
  PLACEMENT_STATUSES,
  PLACEMENT_LIFECYCLE,
  SORT_FIELDS,
} = require('../constants/institutionStudents')
const { NOTE_TYPES, ADMIN_TAGS } = require('../constants/institutionPermissions')
const { apiError, ERROR_CODES } = require('../utils/institutionApiErrors')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value))
}

function collectErrors(checks) {
  const errors = []
  for (const [field, message] of checks) {
    if (message) errors.push({ field, message })
  }
  return errors
}

function assertValid(errors) {
  if (errors.length) {
    throw apiError('Validation failed', 400, ERROR_CODES.VALIDATION_FAILED, errors)
  }
}

function validatePagination(query = {}) {
  const page = parseInt(query.page, 10)
  const limit = parseInt(query.limit, 10)
  const errors = collectErrors([
    ['page', Number.isNaN(page) && query.page ? 'page must be a number' : null],
    ['limit', Number.isNaN(limit) && query.limit ? 'limit must be a number' : null],
    ['page', page > 0 ? null : query.page && page <= 0 ? 'page must be positive' : null],
    ['limit', limit > 0 && limit <= 500 ? null : query.limit && (limit <= 0 || limit > 500) ? 'limit must be between 1 and 500' : null],
  ])
  assertValid(errors)
  return {
    page: Math.max(1, page || 1),
    limit: Math.min(500, Math.max(1, limit || 20)),
  }
}

function validateSort(query = {}) {
  const sort = query.sort ? String(query.sort) : 'fullName'
  const sortDir = query.sortDir === 'desc' ? 'desc' : 'asc'
  if (query.sort && !SORT_FIELDS[sort]) {
    throw apiError('Invalid sort field', 400, ERROR_CODES.VALIDATION_FAILED, [
      { field: 'sort', message: `Allowed: ${Object.keys(SORT_FIELDS).join(', ')}` },
    ])
  }
  return { sort, sortDir }
}

function validateListFilters(query = {}) {
  validatePagination(query)
  validateSort(query)

  const errors = collectErrors([
    ['status', query.status && !STUDENT_STATUSES.includes(query.status) ? 'Invalid academic status' : null],
    ['placementStatus', query.placementStatus && !PLACEMENT_STATUSES.includes(query.placementStatus) ? 'Invalid placement status' : null],
    ['placementLifecycle', query.placementLifecycle && !PLACEMENT_LIFECYCLE.includes(query.placementLifecycle) ? 'Invalid placement lifecycle' : null],
    ['dateFrom', query.dateFrom && Number.isNaN(Date.parse(query.dateFrom)) ? 'Invalid dateFrom' : null],
    ['dateTo', query.dateTo && Number.isNaN(Date.parse(query.dateTo)) ? 'Invalid dateTo' : null],
    ['email', query.email && !EMAIL_RE.test(String(query.email)) ? 'Invalid email filter' : null],
  ])
  assertValid(errors)

  return {
    q: sanitizeText(query.q, 200) || undefined,
    department: sanitizeText(query.department, 100) || undefined,
    course: sanitizeText(query.course, 100) || undefined,
    semester: sanitizeText(query.semester, 50) || undefined,
    section: sanitizeText(query.section, 20) || undefined,
    batch: sanitizeText(query.batch, 20) || undefined,
    status: query.status || undefined,
    placementStatus: query.placementStatus || undefined,
    placementLifecycle: query.placementLifecycle || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    sortDir: query.sortDir,
  }
}

function validateStudentIdParam(id) {
  if (!isObjectId(id)) {
    throw apiError('Invalid student ID', 400, ERROR_CODES.VALIDATION_FAILED, [
      { field: 'id', message: 'Must be a valid record ID' },
    ])
  }
}

function validateCreateStudent(body = {}) {
  const errors = collectErrors([
    ['fullName', !sanitizeText(body.fullName, 200) ? 'fullName is required' : null],
    ['email', body.email && !EMAIL_RE.test(String(body.email)) ? 'Invalid email' : null],
    ['status', body.status && !STUDENT_STATUSES.includes(body.status) ? 'Invalid academic status' : null],
    ['department', body.department && !sanitizeText(body.department, 100) ? 'Invalid department' : null],
    ['course', body.course && !sanitizeText(body.course, 100) ? 'Invalid program' : null],
    ['semester', body.semester && !sanitizeText(body.semester, 50) ? 'Invalid semester' : null],
    ['section', body.section && !sanitizeText(body.section, 20) ? 'Invalid section' : null],
  ])
  assertValid(errors)
  return body
}

function validateUpdateStudent(body = {}) {
  const errors = collectErrors([
    ['email', body.email !== undefined && body.email && !EMAIL_RE.test(String(body.email)) ? 'Invalid email' : null],
    ['status', body.status !== undefined && !STUDENT_STATUSES.includes(body.status) ? 'Invalid academic status' : null],
    ['adminTags', body.adminTags !== undefined && !Array.isArray(body.adminTags) ? 'adminTags must be an array' : null],
    [
      'adminTags',
      Array.isArray(body.adminTags) && body.adminTags.some((t) => !ADMIN_TAGS.includes(t))
        ? 'Invalid admin tag'
        : null,
    ],
  ])
  assertValid(errors)
  return body
}

function validateAddNote(body = {}) {
  const content = sanitizeText(body.content)
  const type = body.type || 'internal'
  const errors = collectErrors([
    ['content', !content ? 'content is required' : null],
    ['type', !NOTE_TYPES.includes(type) ? 'Invalid note type' : null],
  ])
  assertValid(errors)
  return { content, type }
}

function validateImportRows(body = {}) {
  if (!Array.isArray(body.rows)) {
    throw apiError('rows must be an array', 400, ERROR_CODES.VALIDATION_FAILED)
  }
  if (body.rows.length > 5000) {
    throw apiError('Import batch too large (max 5000 rows)', 400, ERROR_CODES.IMPORT_FAILED)
  }
  return body
}

function validateIdParam(req, res, next) {
  try {
    for (const key of ['id', 'opportunityId', 'studentId', 'cohortId', 'driveId', 'companyId']) {
      if (req.params[key]) validateStudentIdParam(req.params[key])
    }
    next()
  } catch (error) {
    const { sendApiError } = require('../utils/institutionApiErrors')
    sendApiError(res, error)
  }
}

function validateMiddleware(validator) {
  return (req, res, next) => {
    try {
      const source = req.method === 'GET' ? req.query : req.body
      const validated = validator(source, req)
      if (validated !== undefined) {
        if (req.method === 'GET') req.validatedQuery = validated
        else req.validatedBody = validated
      }
      next()
    } catch (error) {
      const { sendApiError } = require('../utils/institutionApiErrors')
      sendApiError(res, error)
    }
  }
}

module.exports = {
  validatePagination,
  validateSort,
  validateListFilters,
  validateStudentIdParam,
  validateIdParam,
  validateCreateStudent,
  validateUpdateStudent,
  validateAddNote,
  validateImportRows,
  validateMiddleware,
  isObjectId,
}
