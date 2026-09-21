const mongoose = require('mongoose')
const InstitutionInnovationAuditLog = require('../models/InstitutionInnovationAuditLog')

function sanitize(text, max = 1000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function recordInnovationAudit({
  institutionId,
  action,
  actorUserId = null,
  actorName = '',
  description = '',
  metadata = {},
}) {
  return InstitutionInnovationAuditLog.create({
    institutionId: new mongoose.Types.ObjectId(institutionId),
    action,
    actorUserId,
    actorName: sanitize(actorName, 100),
    description: sanitize(description),
    metadata,
  })
}

module.exports = {
  recordInnovationAudit,
}
