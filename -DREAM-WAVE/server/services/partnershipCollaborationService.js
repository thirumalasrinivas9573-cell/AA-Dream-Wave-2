const mongoose = require('mongoose')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const PartnershipActivity = require('../models/PartnershipActivity')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const CampusOpportunity = require('../models/CampusOpportunity')
const {
  SHARING_SCOPES,
  ENTITY_LINK_TYPES,
  VALID_STATUS_TRANSITIONS,
} = require('../constants/partnership')
const {
  normalizeScopes,
  assertPartnershipScope,
  emitPartnershipRealtime,
  resolveDefaultScopes,
} = require('../utils/partnershipScope')
const {
  getPartnershipById,
  assertPartnershipAccess,
} = require('./partnershipService')
const {
  recordActivity,
  notifyOrgCounterparty,
} = require('./platformNotificationService')

const LINK_FIELD_MAP = {
  job: 'linkedJobIds',
  internship: 'linkedInternshipIds',
  drive: 'linkedDriveIds',
  event: 'linkedEventIds',
}

function err(message, statusCode = 400) {
  const e = new Error(message)
  e.statusCode = statusCode
  return e
}

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function assertStatusTransition(current, next) {
  const allowed = VALID_STATUS_TRANSITIONS[current] || []
  if (!allowed.includes(next)) {
    throw err(`Cannot transition from ${current} to ${next}`, 400)
  }
}

async function getCollaborationDashboard(orgId, role) {
  const filter =
    role === 'institution'
      ? { institutionId: oid(orgId) }
      : { companyId: oid(orgId) }

  const [active, pendingIncoming, pendingOutgoing, recentActivity] = await Promise.all([
    InstitutionCompanyPartnership.find({ ...filter, status: 'active' })
      .populate('institutionId', 'name type city country logoUrl')
      .populate('companyId', 'name industry location logoUrl')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
    InstitutionCompanyPartnership.find({
      ...filter,
      requestStatus: 'pending',
      initiatedBy: role === 'institution' ? 'company' : 'institution',
    })
      .populate('institutionId', 'name type city country logoUrl')
      .populate('companyId', 'name industry location logoUrl')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    InstitutionCompanyPartnership.find({
      ...filter,
      requestStatus: 'pending',
      initiatedBy: role,
    })
      .populate('institutionId', 'name type city country logoUrl')
      .populate('companyId', 'name industry location logoUrl')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    PartnershipActivity.find({
      ...(role === 'institution'
        ? { institutionId: oid(orgId) }
        : { companyId: oid(orgId) }),
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ])

  return {
    activePartners: active.map((p) => ({
      id: p._id.toString(),
      status: p.status,
      relationshipType: p.relationshipType,
      sharingScopes: p.sharingScopes || [],
      institution: p.institutionId,
      company: p.companyId,
      updatedAt: p.updatedAt,
    })),
    pendingIncoming,
    pendingOutgoing,
    recentActivity,
    counts: {
      active: active.length,
      pendingIncoming: pendingIncoming.length,
      pendingOutgoing: pendingOutgoing.length,
    },
  }
}

async function fetchLinkedJobs(partnership) {
  const ids = (partnership.linkedJobIds || []).map(String)
  const query = {
    companyId: partnership.companyId._id || partnership.companyId,
    status: { $in: ['open', 'published'] },
  }
  if (ids.length) {
    query.$or = [{ _id: { $in: ids.filter(oid) } }, { partnershipId: partnership._id }]
  } else {
    query.partnershipId = partnership._id
  }
  return RecruitmentJob.find(query)
    .select('title department location workMode status deadline partnershipId createdAt')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean()
}

async function fetchLinkedInternships(partnership) {
  const ids = (partnership.linkedInternshipIds || []).map(String)
  const query = {
    companyId: partnership.companyId._id || partnership.companyId,
    status: { $in: ['open', 'published'] },
  }
  if (ids.length) {
    query.$or = [{ _id: { $in: ids.filter(oid) } }, { partnershipId: partnership._id }]
  } else {
    query.partnershipId = partnership._id
  }
  return RecruitmentInternship.find(query)
    .select('title department location duration status deadline partnershipId createdAt')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean()
}

async function fetchLinkedDrives(partnership) {
  const ids = (partnership.linkedDriveIds || []).map(String)
  const institutionId = partnership.institutionId._id || partnership.institutionId
  const query = { institutionId, status: { $in: ['published', 'open', 'active'] } }
  if (ids.length) {
    query.$or = [{ _id: { $in: ids.filter(oid) } }, { partnershipId: partnership._id }]
  } else if (partnership.sharingScopes?.includes('placement')) {
    query.partnershipId = partnership._id
  } else {
    return []
  }
  return CampusOpportunity.find(query)
    .select('title type status startDate endDate partnershipId createdAt')
    .sort({ startDate: -1 })
    .limit(25)
    .lean()
}

async function fetchLinkedEvents(partnership) {
  const linked = partnership.linkedEventIds || []
  if (!linked.length) return []

  const campusIds = linked.filter((id) => !String(id).includes(':')).filter(oid)
  const events = campusIds.length
    ? await CampusOpportunity.find({ _id: { $in: campusIds } })
        .select('title type status startDate endDate')
        .lean()
    : []

  return events.map((e) => ({
    id: e._id.toString(),
    source: 'campus',
    title: e.title,
    type: e.type,
    status: e.status,
    startDate: e.startDate,
    endDate: e.endDate,
  }))
}

async function getPartnershipWorkspace(partnershipId, actor) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  const p = partnership.toObject ? partnership.toObject() : partnership
  const scopes = p.sharingScopes || []
  const shared = {
    jobs: [],
    internships: [],
    drives: [],
    events: [],
    projects: [],
    research: [],
  }

  if (p.status === 'active') {
    if (scopes.includes('recruitment') || scopes.includes('opportunities')) {
      if (scopes.includes('recruitment')) {
        shared.jobs = await fetchLinkedJobs(p)
        shared.internships = await fetchLinkedInternships(p)
      }
    }
    if (scopes.includes('placement')) {
      shared.drives = await fetchLinkedDrives(p)
    }
    if (scopes.includes('events') || scopes.includes('opportunities')) {
      shared.events = await fetchLinkedEvents(p)
    }
  }

  const analytics =
    scopes.includes('analytics') && p.status === 'active'
      ? {
          linkedJobs: (p.linkedJobIds || []).length,
          linkedInternships: (p.linkedInternshipIds || []).length,
          linkedDrives: (p.linkedDriveIds || []).length,
          linkedEvents: (p.linkedEventIds || []).length,
          openJobs: shared.jobs.length,
          openInternships: shared.internships.length,
        }
      : null

  const recentActivity = await PartnershipActivity.find({ partnershipId: p._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return {
    partnership: {
      ...p,
      id: p._id?.toString(),
      institution: p.institutionId,
      company: p.companyId,
    },
    sharingScopes: scopes,
    requestedScopes: p.requestedScopes || [],
    availableScopes: SHARING_SCOPES,
    shared,
    analytics,
    recentActivity,
    scopeAccess: Object.fromEntries(
      SHARING_SCOPES.map((scope) => [scope, p.status === 'active' && scopes.includes(scope)]),
    ),
  }
}

async function updateSharingScopes(partnershipId, scopes, actor, io = null) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  if (partnership.status !== 'active') {
    throw err('Scopes can only be updated for active partnerships', 400)
  }

  const normalized = normalizeScopes(scopes)
  if (!normalized.length) {
    throw err('At least one sharing scope is required', 400)
  }

  const previous = [...(partnership.sharingScopes || [])]
  partnership.sharingScopes = normalized
  await partnership.save()

  await recordActivity({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    type: 'partnership_scope_changed',
    title: 'Sharing scope updated',
    description: `Scopes: ${normalized.join(', ')}`,
    actorUserId: actor.userId,
    actorRole: actor.role,
    metadata: { previous, current: normalized },
  })

  await notifyOrgCounterparty({
    partnership,
    type: 'partnership_scope_changed',
    title: 'Partnership sharing scope updated',
    body: `Collaboration areas updated: ${normalized.join(', ')}`,
    initiatorRole: actor.role,
    io,
  })

  await emitPartnershipRealtime('PARTNERSHIP_UPDATED', partnership, {
    sharingScopes: normalized,
    scopeChanged: true,
  })

  return getPartnershipById(partnershipId)
}

async function pausePartnership(partnershipId, actor, io = null) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  assertStatusTransition(partnership.status, 'paused')
  partnership.status = 'paused'
  await partnership.save()

  await recordActivity({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    type: 'partnership_paused',
    title: 'Partnership paused',
    actorUserId: actor.userId,
    actorRole: actor.role,
  })

  await notifyOrgCounterparty({
    partnership,
    type: 'partnership_paused',
    title: 'Partnership paused',
    body: 'Collaboration has been paused. New shared activity may be restricted.',
    initiatorRole: actor.role,
    io,
  })

  await emitPartnershipRealtime('PARTNERSHIP_UPDATED', partnership, { status: 'paused' })
  return getPartnershipById(partnershipId)
}

async function cancelPartnership(partnershipId, actor, io = null) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  assertStatusTransition(partnership.status, 'terminated')
  partnership.status = 'terminated'
  await partnership.save()

  await recordActivity({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    type: 'partnership_terminated',
    title: 'Partnership cancelled',
    actorUserId: actor.userId,
    actorRole: actor.role,
  })

  await notifyOrgCounterparty({
    partnership,
    type: 'partnership_cancelled',
    title: 'Partnership cancelled',
    body: 'This partnership has been cancelled. Cross-organization access is no longer permitted.',
    initiatorRole: actor.role,
    io,
  })

  await emitPartnershipRealtime('PARTNERSHIP_UPDATED', partnership, { status: 'terminated' })
  return getPartnershipById(partnershipId)
}

async function verifyEntityOwnership(entityType, entityId, partnership) {
  if (!ENTITY_LINK_TYPES.includes(entityType)) {
    throw err('Invalid entity type', 400)
  }
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    throw err('Invalid entity ID', 400)
  }

  const companyId = partnership.companyId._id || partnership.companyId
  const institutionId = partnership.institutionId._id || partnership.institutionId

  switch (entityType) {
    case 'job': {
      const job = await RecruitmentJob.findById(entityId).lean()
      if (!job || job.companyId.toString() !== companyId.toString()) {
        throw err('Job not found or not owned by partner company', 404)
      }
      return { scope: 'recruitment', activityType: 'job_shared', title: job.title }
    }
    case 'internship': {
      const internship = await RecruitmentInternship.findById(entityId).lean()
      if (!internship || internship.companyId.toString() !== companyId.toString()) {
        throw err('Internship not found or not owned by partner company', 404)
      }
      return { scope: 'recruitment', activityType: 'internship_shared', title: internship.title }
    }
    case 'drive': {
      const drive = await CampusOpportunity.findById(entityId).lean()
      if (!drive || drive.institutionId.toString() !== institutionId.toString()) {
        throw err('Campus drive not found or not owned by partner institution', 404)
      }
      return { scope: 'placement', activityType: 'campus_drive_created', title: drive.title }
    }
    case 'event': {
      const event = await CampusOpportunity.findById(entityId).lean()
      if (!event || event.institutionId.toString() !== institutionId.toString()) {
        throw err('Event not found or not owned by partner institution', 404)
      }
      return { scope: 'events', activityType: 'event_scheduled', title: event.title }
    }
    default:
      throw err('Unsupported entity type', 400)
  }
}

async function linkEntity(partnershipId, entityType, entityId, actor, io = null) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  if (partnership.status !== 'active') {
    throw err('Cannot link resources to inactive partnerships', 400)
  }

  const { scope, activityType, title } = await verifyEntityOwnership(
    entityType,
    entityId,
    partnership,
  )
  assertPartnershipScope(partnership, scope)

  const field = LINK_FIELD_MAP[entityType]
  const ids = (partnership[field] || []).map(String)
  if (ids.includes(String(entityId))) {
    throw err('Entity is already linked to this partnership', 409)
  }

  partnership[field] = [...ids, String(entityId)]

  if (entityType === 'job' || entityType === 'internship') {
    const Model = entityType === 'job' ? RecruitmentJob : RecruitmentInternship
    await Model.updateOne({ _id: entityId }, { $set: { partnershipId: partnership._id } })
  } else {
    await CampusOpportunity.updateOne(
      { _id: entityId },
      { $set: { partnershipId: partnership._id } },
    )
  }

  await partnership.save()

  await recordActivity({
    partnershipId: partnership._id,
    institutionId: partnership.institutionId._id || partnership.institutionId,
    companyId: partnership.companyId._id || partnership.companyId,
    type: activityType,
    title: `${entityType} linked`,
    description: title,
    actorUserId: actor.userId,
    actorRole: actor.role,
    metadata: { entityType, entityId },
  })

  await emitPartnershipRealtime('SHARED_OPPORTUNITY_CREATED', partnership, {
    entityType,
    entityId,
  })

  return getPartnershipWorkspace(partnershipId, actor)
}

async function unlinkEntity(partnershipId, entityType, entityId, actor) {
  const partnership = await getPartnershipById(partnershipId)
  await assertPartnershipAccess(partnership, {
    institution: actor.institution,
    company: actor.company,
  })

  const field = LINK_FIELD_MAP[entityType]
  if (!field) throw err('Invalid entity type', 400)

  partnership[field] = (partnership[field] || []).filter((id) => String(id) !== String(entityId))
  await partnership.save()

  return getPartnershipWorkspace(partnershipId, actor)
}

module.exports = {
  SHARING_SCOPES,
  normalizeScopes,
  resolveDefaultScopes,
  assertPartnershipScope,
  emitPartnershipRealtime,
  getCollaborationDashboard,
  getPartnershipWorkspace,
  updateSharingScopes,
  pausePartnership,
  cancelPartnership,
  linkEntity,
  unlinkEntity,
}
