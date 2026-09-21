const { getSocketIo } = require('../services/socketRegistry')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const {
  SHARING_SCOPES,
  DEFAULT_SCOPES_BY_RELATIONSHIP,
} = require('../constants/partnership')

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return []
  return [...new Set(scopes.filter((s) => SHARING_SCOPES.includes(s)))]
}

function resolveDefaultScopes(relationshipType, requestedScopes = []) {
  const requested = normalizeScopes(requestedScopes)
  if (requested.length) return requested
  return normalizeScopes(DEFAULT_SCOPES_BY_RELATIONSHIP[relationshipType] || ['events', 'opportunities'])
}

function assertPartnershipScope(partnership, scope) {
  if (partnership.status !== 'active') {
    const e = new Error('Partnership is not active')
    e.statusCode = 403
    throw e
  }
  const scopes = partnership.sharingScopes || []
  if (!scopes.includes(scope)) {
    const e = new Error(`Sharing scope "${scope}" is not enabled for this partnership`)
    e.statusCode = 403
    throw e
  }
}

async function emitPartnershipRealtime(eventName, partnership, extra = {}) {
  const io = getSocketIo()
  if (!io) return

  const [institution, company] = await Promise.all([
    Institution.findById(partnership.institutionId).select('ownerUserId').lean(),
    Company.findById(partnership.companyId).select('ownerUserId').lean(),
  ])

  const payload = {
    event: eventName,
    partnershipId: partnership._id?.toString(),
    status: partnership.status,
    sharingScopes: partnership.sharingScopes || [],
    ...extra,
  }

  for (const userId of [institution?.ownerUserId, company?.ownerUserId]) {
    if (userId) io.to(`user:${userId}`).emit('partnership:update', payload)
  }
}

module.exports = {
  normalizeScopes,
  resolveDefaultScopes,
  assertPartnershipScope,
  emitPartnershipRealtime,
}
