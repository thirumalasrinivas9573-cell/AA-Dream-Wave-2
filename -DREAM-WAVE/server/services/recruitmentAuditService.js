const mongoose = require('mongoose')
const RecruitmentAuditLog = require('../models/RecruitmentAuditLog')

async function recordRecruitmentAudit({
  companyId,
  action,
  actorUserId = null,
  actorName = '',
  description = '',
  metadata = {},
}) {
  return RecruitmentAuditLog.create({
    companyId: new mongoose.Types.ObjectId(companyId),
    action,
    actorUserId,
    actorName,
    description,
    metadata,
  })
}

module.exports = {
  recordRecruitmentAudit,
}
