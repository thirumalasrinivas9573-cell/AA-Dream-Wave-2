const mongoose = require('mongoose')
const { escapeRegex, sanitizeTextSearch } = require('../utils/escapeRegex')
const {
  PUBLIC_COMPANY_FIELDS,
  PUBLIC_INSTITUTION_FIELDS,
} = require('../constants/ecosystemProfiles')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const PartnershipDocument = require('../models/PartnershipDocument')
const PartnershipActivity = require('../models/PartnershipActivity')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const User = require('../models/User')
const {
  RELATIONSHIP_TYPES,
  PARTNERSHIP_STATUSES,
  VALID_STATUS_TRANSITIONS,
  ACTIVE_OR_PENDING_STATUSES,
} = require('../constants/partnership')
const {
  normalizeScopes,
  resolveDefaultScopes,
  emitPartnershipRealtime,
} = require('../utils/partnershipScope')
const {
  recordActivity,
  notifyOrgCounterparty,
} = require('./platformNotificationService')

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

function assertValidRelationshipType(type) {
  if (!RELATIONSHIP_TYPES.includes(type)) {
    const err = new Error(`Invalid relationship type: ${type}`)
    err.statusCode = 400
    throw err
  }
}

function assertStatusTransition(current, next) {
  const allowed = VALID_STATUS_TRANSITIONS[current] || []
  if (!allowed.includes(next)) {
    const err = new Error(`Cannot transition from ${current} to ${next}`)
    err.statusCode = 400
    throw err
  }
}

async function findDuplicatePartnership(institutionId, companyId) {
  return InstitutionCompanyPartnership.findOne({
    institutionId,
    companyId,
    status: { $in: ACTIVE_OR_PENDING_STATUSES },
  })
}

async function populatePartnership(query) {
  return query
    .populate('institutionId', 'name type city country logoUrl departments programs verified')
    .populate('companyId', 'name industry location logoUrl verified activeJobsCount activeInternshipsCount')
}

function toPublicPartnership(doc) {
  const p = doc.toObject ? doc.toObject() : doc
  return {
    ...p,
    id: p._id?.toString(),
    institution: p.institutionId,
    company: p.companyId,
  }
}

async function createPartnershipRequest({
  institutionId,
  companyId,
  initiatedBy,
  initiatorUserId,
  relationshipType,
  subject = '',
  message = '',
  proposedCollaboration = '',
  contactPerson = {},
  startDate = null,
  expectedDuration = '',
  supportingDocuments = [],
  requestedScopes = [],
  io = null,
}) {
  assertValidRelationshipType(relationshipType)
  const normalizedRequested = normalizeScopes(requestedScopes)

  const [institution, company] = await Promise.all([
    Institution.findById(institutionId),
    Company.findById(companyId),
  ])

  if (!institution) {
    const err = new Error('Institution not found')
    err.statusCode = 404
    throw err
  }
  if (!company) {
    const err = new Error('Company not found')
    err.statusCode = 404
    throw err
  }

  const duplicate = await findDuplicatePartnership(institutionId, companyId)
  if (duplicate) {
    const err = new Error('A pending or active partnership already exists between these organizations')
    err.statusCode = 409
    throw err
  }

  const partnership = await InstitutionCompanyPartnership.create({
    institutionId,
    companyId,
    status: 'pending',
    requestStatus: 'pending',
    relationshipType,
    initiatedBy,
    initiatorUserId,
    subject,
    message,
    proposedCollaboration,
    contactPerson,
    startDate,
    expectedDuration,
    supportingDocuments,
    requestedScopes: normalizedRequested.length
      ? normalizedRequested
      : resolveDefaultScopes(relationshipType),
  })

  await recordActivity({
    partnershipId: partnership._id,
    institutionId,
    companyId,
    type: 'partnership_request_sent',
    title: 'Partnership request sent',
    description: subject || message || `${relationshipType} request`,
    actorUserId: initiatorUserId,
    actorRole: initiatedBy,
  })

  await notifyOrgCounterparty({
    partnership,
    type: 'partnership_request',
    title: 'New partnership request',
    body: subject || `A ${relationshipType} partnership request was received.`,
    initiatorRole: initiatedBy,
    io,
  })

  await emitPartnershipRealtime('PARTNERSHIP_REQUESTED', partnership)

  return populatePartnership(InstitutionCompanyPartnership.findById(partnership._id))
}

async function respondToRequest({
  partnershipId,
  responderUserId,
  responderRole,
  action,
  responseMessage = '',
  io = null,
}) {
  const partnership = await InstitutionCompanyPartnership.findById(partnershipId)
  if (!partnership) {
    const err = new Error('Partnership not found')
    err.statusCode = 404
    throw err
  }

  if (partnership.requestStatus !== 'pending') {
    const err = new Error('Partnership request is no longer pending')
    err.statusCode = 400
    throw err
  }

  const now = new Date()
  partnership.respondedAt = now
  partnership.respondedByUserId = responderUserId
  partnership.responseMessage = responseMessage

  if (action === 'accept') {
    assertStatusTransition(partnership.status, 'active')
    partnership.status = 'active'
    partnership.requestStatus = 'accepted'
    partnership.sharingScopes = resolveDefaultScopes(
      partnership.relationshipType,
      partnership.requestedScopes,
    )

    await recordActivity({
      partnershipId: partnership._id,
      institutionId: partnership.institutionId,
      companyId: partnership.companyId,
      type: 'partnership_request_accepted',
      title: 'Partnership request accepted',
      description: responseMessage,
      actorUserId: responderUserId,
      actorRole: responderRole,
    })

    await recordActivity({
      partnershipId: partnership._id,
      institutionId: partnership.institutionId,
      companyId: partnership.companyId,
      type: 'partnership_activated',
      title: 'Partnership activated',
      actorUserId: responderUserId,
      actorRole: responderRole,
    })

    await notifyOrgCounterparty({
      partnership,
      type: 'partnership_accepted',
      title: 'Partnership accepted',
      body: responseMessage || 'Your partnership request was accepted.',
      initiatorRole: responderRole === 'institution' ? 'company' : 'institution',
      io,
    })

    await emitPartnershipRealtime('PARTNERSHIP_ACCEPTED', partnership, {
      sharingScopes: partnership.sharingScopes,
    })
  } else if (action === 'decline') {
    partnership.status = 'declined'
    partnership.requestStatus = 'declined'

    await recordActivity({
      partnershipId: partnership._id,
      institutionId: partnership.institutionId,
      companyId: partnership.companyId,
      type: 'partnership_request_declined',
      title: 'Partnership request declined',
      description: responseMessage,
      actorUserId: responderUserId,
      actorRole: responderRole,
    })

    await notifyOrgCounterparty({
      partnership,
      type: 'partnership_declined',
      title: 'Partnership declined',
      body: responseMessage || 'Your partnership request was declined.',
      initiatorRole: responderRole === 'institution' ? 'company' : 'institution',
      io,
    })

    await emitPartnershipRealtime('PARTNERSHIP_REJECTED', partnership)
  } else if (action === 'info_requested') {
    partnership.requestStatus = 'info_requested'

    await recordActivity({
      partnershipId: partnership._id,
      institutionId: partnership.institutionId,
      companyId: partnership.companyId,
      type: 'partnership_request_info_requested',
      title: 'More information requested',
      description: responseMessage,
      actorUserId: responderUserId,
      actorRole: responderRole,
    })

    await notifyOrgCounterparty({
      partnership,
      type: 'partnership_info_requested',
      title: 'More information requested',
      body: responseMessage || 'Additional information is needed for your partnership request.',
      initiatorRole: responderRole === 'institution' ? 'company' : 'institution',
      io,
    })
  } else {
    const err = new Error('Invalid response action')
    err.statusCode = 400
    throw err
  }

  await partnership.save()
  return populatePartnership(InstitutionCompanyPartnership.findById(partnership._id))
}

async function listPartnershipsForInstitution(institutionId, filters = {}) {
  const query = { institutionId }
  if (filters.status && filters.status !== 'all') query.status = filters.status
  if (filters.relationshipType && filters.relationshipType !== 'all') {
    query.relationshipType = filters.relationshipType
  }
  if (filters.requestStatus) query.requestStatus = filters.requestStatus

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    populatePartnership(
      InstitutionCompanyPartnership.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ),
    InstitutionCompanyPartnership.countDocuments(query),
  ])

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function listPartnershipsForCompany(companyId, filters = {}) {
  const query = { companyId }
  if (filters.status && filters.status !== 'all') query.status = filters.status
  if (filters.relationshipType && filters.relationshipType !== 'all') {
    query.relationshipType = filters.relationshipType
  }
  if (filters.requestStatus) query.requestStatus = filters.requestStatus

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    populatePartnership(
      InstitutionCompanyPartnership.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ),
    InstitutionCompanyPartnership.countDocuments(query),
  ])

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function getPartnershipById(partnershipId) {
  if (!isValidObjectId(partnershipId)) {
    const err = new Error('Invalid partnership ID')
    err.statusCode = 400
    throw err
  }
  const partnership = await populatePartnership(
    InstitutionCompanyPartnership.findById(partnershipId),
  )
  if (!partnership) {
    const err = new Error('Partnership not found')
    err.statusCode = 404
    throw err
  }
  return partnership
}

async function assertPartnershipAccess(partnership, { institution, company }) {
  const institutionId = institution?._id?.toString()
  const companyId = company?._id?.toString()
  const pInstitutionId = partnership.institutionId?._id?.toString() || partnership.institutionId?.toString()
  const pCompanyId = partnership.companyId?._id?.toString() || partnership.companyId?.toString()

  if (institutionId && pInstitutionId === institutionId) return true
  if (companyId && pCompanyId === companyId) return true

  const err = new Error('Access denied')
  err.statusCode = 403
  throw err
}

async function updatePartnership(partnershipId, updates, actor) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  const allowed = ['objectives', 'description', 'startDate', 'expectedDuration', 'contactPerson']
  for (const key of allowed) {
    if (updates[key] !== undefined) partnership[key] = updates[key]
  }

  if (updates.status) {
    assertStatusTransition(partnership.status, updates.status)
    partnership.status = updates.status

    if (updates.status === 'paused') {
      await recordActivity({
        partnershipId: partnership._id,
        institutionId: partnership.institutionId._id || partnership.institutionId,
        companyId: partnership.companyId._id || partnership.companyId,
        type: 'partnership_paused',
        title: 'Partnership paused',
        actorUserId: actor.userId,
        actorRole: actor.role,
      })
    } else if (updates.status === 'terminated') {
      await recordActivity({
        partnershipId: partnership._id,
        institutionId: partnership.institutionId._id || partnership.institutionId,
        companyId: partnership.companyId._id || partnership.companyId,
        type: 'partnership_terminated',
        title: 'Partnership terminated',
        actorUserId: actor.userId,
        actorRole: actor.role,
      })
    }
  }

  await partnership.save()
  return getPartnershipById(partnershipId)
}

async function getPartnershipStatsForInstitution(institutionId) {
  const [total, active, pending, byType] = await Promise.all([
    InstitutionCompanyPartnership.countDocuments({ institutionId, status: 'active' }),
    InstitutionCompanyPartnership.countDocuments({ institutionId, status: 'active' }),
    InstitutionCompanyPartnership.countDocuments({
      institutionId,
      requestStatus: 'pending',
      initiatedBy: 'company',
    }),
    InstitutionCompanyPartnership.aggregate([
      { $match: { institutionId: new mongoose.Types.ObjectId(institutionId), status: 'active' } },
      { $group: { _id: '$relationshipType', count: { $sum: 1 } } },
    ]),
  ])

  const recruitment = byType.find((t) => t._id === 'Recruitment Partner')?.count || 0
  const internship = byType.find((t) => t._id === 'Internship Partner')?.count || 0
  const research = byType.find((t) => t._id === 'Research Partner')?.count || 0

  return {
    totalIndustryPartners: total,
    activePartners: active,
    recruitmentPartners: recruitment,
    internshipPartners: internship,
    researchPartners: research,
    pendingInvitations: pending,
  }
}

async function getPartnershipStatsForCompany(companyId) {
  const [active, pending, byType, recent] = await Promise.all([
    InstitutionCompanyPartnership.countDocuments({ companyId, status: 'active' }),
    InstitutionCompanyPartnership.countDocuments({
      companyId,
      requestStatus: 'pending',
      initiatedBy: 'institution',
    }),
    InstitutionCompanyPartnership.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: 'active' } },
      { $group: { _id: '$relationshipType', count: { $sum: 1 } } },
    ]),
    InstitutionCompanyPartnership.countDocuments({
      companyId,
      status: 'active',
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ])

  const recruitment = byType.find((t) => t._id === 'Recruitment Partner')?.count || 0
  const internship = byType.find((t) => t._id === 'Internship Partner')?.count || 0
  const research = byType.find((t) => t._id === 'Research Partner')?.count || 0

  return {
    partnerInstitutions: active,
    pendingRequests: pending,
    recruitmentInstitutions: recruitment,
    internshipInstitutions: internship,
    researchPartners: research,
    recentlyConnected: recent,
  }
}

async function listPartnershipActivity(partnershipId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    PartnershipActivity.find({ partnershipId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PartnershipActivity.countDocuments({ partnershipId }),
  ])
  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function addPartnershipDocument({
  partnershipId,
  actor,
  name,
  type,
  fileUrl = '',
  fileName = '',
  expiryDate = null,
}) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  const doc = await PartnershipDocument.create({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    name,
    type,
    uploadedByUserId: actor.userId,
    uploadedByRole: actor.role,
    fileUrl,
    fileName,
    expiryDate,
  })

  await recordActivity({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    type: type === 'MoU' ? 'mou_uploaded' : 'document_added',
    title: `${type} added`,
    description: name,
    actorUserId: actor.userId,
    actorRole: actor.role,
  })

  return doc
}

async function listPartnershipDocuments(partnershipId, actor) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, actor)
  return PartnershipDocument.find({
    partnershipId,
    $or: [{ isPrivate: { $ne: true } }, { uploadedByUserId: actor.userId }],
  })
    .sort({ createdAt: -1 })
    .lean()
}

async function searchCompanies(filters = {}) {
  const query = { isPublic: true }
  if (filters.industry && filters.industry !== 'all') {
    query.industry = new RegExp(escapeRegex(filters.industry), 'i')
  }
  if (filters.location && filters.location !== 'all') {
    const loc = escapeRegex(filters.location)
    query.$or = [{ location: new RegExp(loc, 'i') }, { city: new RegExp(loc, 'i') }]
  }
  const searchText = sanitizeTextSearch(filters.q)
  if (searchText) {
    query.$text = { $search: searchText }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Company.find(query)
      .select(PUBLIC_COMPANY_FIELDS)
      .sort(searchText ? { score: { $meta: 'textScore' } } : { name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Company.countDocuments(query),
  ])

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function searchInstitutions(filters = {}) {
  const query = { isPublic: true }
  if (filters.type && filters.type !== 'all') query.type = filters.type
  if (filters.location && filters.location !== 'all') {
    const loc = escapeRegex(filters.location)
    query.$or = [{ city: new RegExp(loc, 'i') }, { country: new RegExp(loc, 'i') }]
  }
  if (filters.department && filters.department !== 'all') {
    query.departments = new RegExp(escapeRegex(filters.department), 'i')
  }
  if (filters.program && filters.program !== 'all') {
    query.programs = new RegExp(escapeRegex(filters.program), 'i')
  }
  const searchText = sanitizeTextSearch(filters.q)
  if (searchText) {
    query.$text = { $search: searchText }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Institution.find(query)
      .select(PUBLIC_INSTITUTION_FIELDS)
      .sort(searchText ? { score: { $meta: 'textScore' } } : { name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Institution.countDocuments(query),
  ])

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

module.exports = {
  isValidObjectId,
  createPartnershipRequest,
  respondToRequest,
  listPartnershipsForInstitution,
  listPartnershipsForCompany,
  getPartnershipById,
  assertPartnershipAccess,
  updatePartnership,
  getPartnershipStatsForInstitution,
  getPartnershipStatsForCompany,
  listPartnershipActivity,
  addPartnershipDocument,
  listPartnershipDocuments,
  searchCompanies,
  searchInstitutions,
  toPublicPartnership,
  RELATIONSHIP_TYPES,
  PARTNERSHIP_STATUSES,
}
