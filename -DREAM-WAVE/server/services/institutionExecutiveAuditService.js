const mongoose = require('mongoose')
const InstitutionExecutiveAuditLog = require('../models/InstitutionExecutiveAuditLog')

function sanitize(text, max = 1000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordExecutiveAudit({
  institutionId,
  action,
  actorUserId = null,
  actorName = '',
  description = '',
  metadata = {},
}) {
  return InstitutionExecutiveAuditLog.create({
    institutionId: new mongoose.Types.ObjectId(institutionId),
    action,
    actorUserId,
    actorName: sanitize(actorName, 100),
    description: sanitize(description),
    metadata,
  })
}

async function listExecutiveAuditLog(institutionId, { page = 1, limit = 50, action } = {}) {
  const query = { institutionId: new mongoose.Types.ObjectId(institutionId) }
  if (action) query.action = action
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
  const skip = (safePage - 1) * safeLimit

  const [items, total] = await Promise.all([
    InstitutionExecutiveAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    InstitutionExecutiveAuditLog.countDocuments(query),
  ])

  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

module.exports = {
  recordExecutiveAudit,
  listExecutiveAuditLog,
}
