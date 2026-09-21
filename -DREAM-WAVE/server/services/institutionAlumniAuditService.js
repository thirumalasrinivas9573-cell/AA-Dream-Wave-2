const mongoose = require('mongoose')
const InstitutionAlumniAuditLog = require('../models/InstitutionAlumniAuditLog')

function sanitize(text, max = 1000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordAlumniAudit({
  institutionId,
  action,
  alumniId = null,
  actorUserId = null,
  actorName = '',
  description = '',
  metadata = {},
}) {
  return InstitutionAlumniAuditLog.create({
    institutionId: new mongoose.Types.ObjectId(institutionId),
    alumniId,
    action,
    actorUserId,
    actorName: sanitize(actorName, 100),
    description: sanitize(description),
    metadata,
  })
}

module.exports = {
  recordAlumniAudit,
}
