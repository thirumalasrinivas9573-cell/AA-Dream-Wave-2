const InstitutionStudentAudit = require('../models/InstitutionStudentAudit')
const institutionCache = require('./institutionCache')

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordAudit({
  institutionId,
  studentId,
  action,
  actorUserId,
  actorName,
  previousState,
  newState,
  description,
  metadata,
}) {
  const entry = await InstitutionStudentAudit.create({
    institutionId,
    studentId: studentId || null,
    action,
    actorUserId,
    actorName: sanitizeText(actorName, 100),
    previousState: previousState || '',
    newState: newState || '',
    description: sanitizeText(description, 1000),
    metadata: metadata || {},
  })
  institutionCache.invalidateInstitution(String(institutionId))
  return entry
}

async function getAuditLog(institutionId, studentId, { page = 1, limit = 50, action } = {}) {
  const query = { institutionId }
  if (studentId) query.studentId = studentId
  if (action) query.action = action

  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const skip = (safePage - 1) * safeLimit

  const [items, total] = await Promise.all([
    InstitutionStudentAudit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select('-__v')
      .lean(),
    InstitutionStudentAudit.countDocuments(query),
  ])

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    pageCount: Math.ceil(total / safeLimit) || 1,
  }
}

module.exports = {
  recordAudit,
  getAuditLog,
}
