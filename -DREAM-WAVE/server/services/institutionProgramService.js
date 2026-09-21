const mongoose = require('mongoose')
const InstitutionProgram = require('../models/InstitutionProgram')
const ProgramParticipant = require('../models/ProgramParticipant')
const ProgramActivity = require('../models/ProgramActivity')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCohort = require('../models/InstitutionCohort')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const CampusOpportunity = require('../models/CampusOpportunity')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionResearchOpportunity = require('../models/InstitutionResearchOpportunity')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  VALID_PROGRAM_TRANSITIONS,
  PARTICIPANT_STATUSES,
  VALID_PARTICIPANT_TRANSITIONS,
  PROGRAM_LINK_TYPES,
  DEFAULT_MILESTONES,
} = require('../constants/institutionPrograms')
const { evaluateEligibility } = require('./institutionPlacementEligibilityService')
const { assertPartnershipScope } = require('../utils/partnershipScope')
const { notifyUser } = require('./platformNotificationService')
const { getSocketIo } = require('./socketRegistry')

function err(message, statusCode = 400) {
  const e = new Error(message)
  e.statusCode = statusCode
  return e
}

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function slugify(title) {
  return String(title || 'program')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function assertProgramTransition(current, next) {
  const allowed = VALID_PROGRAM_TRANSITIONS[current] || []
  if (!allowed.includes(next)) throw err(`Cannot transition program from ${current} to ${next}`)
}

function assertParticipantTransition(current, next) {
  const allowed = VALID_PARTICIPANT_TRANSITIONS[current] || []
  if (!allowed.includes(next)) throw err(`Cannot transition participant from ${current} to ${next}`)
}

async function recordProgramActivity({
  programId,
  institutionId = null,
  companyId = null,
  type,
  title,
  description = '',
  actorUserId = null,
  actorRole = 'system',
  metadata = {},
}) {
  return ProgramActivity.create({
    programId,
    institutionId,
    companyId,
    type,
    title,
    description,
    actorUserId,
    actorRole,
    metadata,
  })
}

async function emitProgramUpdate(program, event, extra = {}) {
  const io = getSocketIo()
  if (!io) return
  const payload = {
    event,
    programId: program._id?.toString(),
    status: program.status,
    ...extra,
  }
  io.to(`program:${program._id}`).emit('program:update', payload)
}

async function assertPartnershipForProgram(partnershipId, { institutionId, companyId }) {
  if (!partnershipId) return null
  const partnership = await InstitutionCompanyPartnership.findById(partnershipId).lean()
  if (!partnership) throw err('Partnership not found', 404)
  if (partnership.status !== 'active') throw err('Partnership is not active', 403)
  assertPartnershipScope(partnership, 'programs')
  const pInst = partnership.institutionId?.toString()
  const pComp = partnership.companyId?.toString()
  if (institutionId && pInst !== institutionId.toString()) {
    throw err('Partnership does not belong to this institution', 403)
  }
  if (companyId && pComp !== companyId.toString()) {
    throw err('Partnership does not belong to this company', 403)
  }
  return partnership
}

async function assertProgramAccess(program, actor) {
  const instId = actor.institution?._id?.toString()
  const compId = actor.company?._id?.toString()
  const pInst = program.institutionId?.toString()
  const pComp = program.companyId?.toString()

  if (actor.role === 'institution' && instId && pInst === instId) return true
  if (actor.role === 'company' && compId && pComp === compId) return true
  if (actor.role === 'student') {
    if (program.visibility !== 'published') throw err('Program not available', 403)
    if (actor.institutionId && pInst && actor.institutionId.toString() !== pInst) {
      throw err('Program not available for your institution', 403)
    }
    return true
  }
  throw err('Access denied', 403)
}

async function createProgram(payload, actor) {
  const {
    title,
    description = '',
    objectives = '',
    programType,
    partnershipId = null,
    companyId: bodyCompanyId = null,
    startDate = null,
    endDate = null,
    registrationOpensAt = null,
    registrationClosesAt = null,
    capacity = null,
    eligibilityRules = {},
    cohortIds = [],
    academicProgramKeys = [],
    skills = [],
    location = '',
    milestones = DEFAULT_MILESTONES,
  } = payload

  if (!title?.trim()) throw err('Title is required')
  if (!PROGRAM_TYPES.includes(programType)) throw err('Invalid program type')

  let institutionId = null
  let companyId = null
  let ownerRole = actor.role

  if (actor.role === 'institution') {
    if (!actor.institution) throw err('Institution profile required', 403)
    institutionId = actor.institution._id
    if (partnershipId) {
      const partnership = await assertPartnershipForProgram(partnershipId, { institutionId })
      companyId = partnership.companyId
    } else if (bodyCompanyId) {
      companyId = oid(bodyCompanyId)
    }
  } else if (actor.role === 'company') {
    if (!actor.company) throw err('Company profile required', 403)
    companyId = actor.company._id
    if (partnershipId) {
      const partnership = await assertPartnershipForProgram(partnershipId, { companyId })
      institutionId = partnership.institutionId
    }
  } else {
    throw err('Only institution or company users can create programs', 403)
  }

  const program = await InstitutionProgram.create({
    institutionId,
    companyId,
    partnershipId: partnershipId || null,
    ownerRole,
    createdByUserId: actor.userId,
    title: title.trim(),
    slug: slugify(title),
    description,
    objectives,
    programType,
    status: 'draft',
    startDate,
    endDate,
    registrationOpensAt,
    registrationClosesAt,
    capacity: capacity != null ? Math.max(0, parseInt(capacity, 10) || 0) : null,
    eligibilityRules,
    cohortIds: cohortIds.filter(oid),
    academicProgramKeys,
    skills,
    location,
    milestones: milestones.map((m, i) => ({
      key: m.key || `milestone-${i + 1}`,
      title: m.title,
      order: m.order ?? i + 1,
      status: 'pending',
    })),
    visibility: 'draft',
  })

  await recordProgramActivity({
    programId: program._id,
    institutionId,
    companyId,
    type: 'program_created',
    title: 'Program created',
    description: title,
    actorUserId: actor.userId,
    actorRole: actor.role,
  })

  return program
}

async function listPrograms(filters, actor) {
  const query = {}
  if (actor.role === 'institution' && actor.institution) {
    query.institutionId = actor.institution._id
  } else if (actor.role === 'company' && actor.company) {
    query.companyId = actor.company._id
  } else {
    throw err('Access denied', 403)
  }

  if (filters.status && filters.status !== 'all') query.status = filters.status
  if (filters.programType && filters.programType !== 'all') query.programType = filters.programType
  if (filters.q) query.$text = { $search: String(filters.q).trim() }

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 12))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    InstitutionProgram.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    InstitutionProgram.countDocuments(query),
  ])

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function listDiscoverablePrograms(studentUserId, institutionId, filters = {}) {
  const query = {
    visibility: 'published',
    status: { $in: ['registration_open', 'active', 'planned'] },
    institutionId: oid(institutionId),
  }
  if (filters.programType && filters.programType !== 'all') query.programType = filters.programType
  if (filters.q) query.$text = { $search: String(filters.q).trim() }

  const programs = await InstitutionProgram.find(query).sort({ startDate: 1 }).limit(50).lean()
  const student = await InstitutionStudent.findOne({ linkedUserId: studentUserId, institutionId: oid(institutionId) }).lean()

  const participantMap = {}
  if (programs.length) {
    const parts = await ProgramParticipant.find({
      programId: { $in: programs.map((p) => p._id) },
      studentUserId,
    }).lean()
    for (const p of parts) participantMap[p.programId.toString()] = p
  }

  return programs.map((program) => {
    const participant = participantMap[program._id.toString()]
    const eligibility = student
      ? evaluateEligibility(student, program.eligibilityRules || {})
      : { status: 'needs_review', eligible: false, reasons: ['Student profile not linked'] }
    return {
      ...program,
      id: program._id.toString(),
      eligibility,
      participantStatus: participant?.status || null,
    }
  })
}

async function getProgramById(programId) {
  if (!oid(programId)) throw err('Invalid program ID')
  const program = await InstitutionProgram.findById(programId)
  if (!program) throw err('Program not found', 404)
  return program
}

async function updateProgramStatus(programId, nextStatus, actor) {
  const program = await getProgramById(programId)
  await assertProgramAccess(program, actor)

  const blocked = ['status', 'ownerRole', 'institutionId', 'companyId', 'partnershipId', 'createdByUserId']
  assertProgramTransition(program.status, nextStatus)
  const previous = program.status
  program.status = nextStatus

  if (nextStatus === 'registration_open') {
    program.visibility = program.visibility === 'draft' ? 'published' : program.visibility
    program.registrationOpensAt = program.registrationOpensAt || new Date()
  }
  if (nextStatus === 'completed') program.endDate = program.endDate || new Date()
  if (nextStatus === 'cancelled') program.visibility = 'internal'

  await program.save()

  await recordProgramActivity({
    programId: program._id,
    institutionId: program.institutionId,
    companyId: program.companyId,
    type: nextStatus === 'cancelled' ? 'program_cancelled' : 'program_status_changed',
    title: `Program status: ${nextStatus}`,
    description: `Changed from ${previous}`,
    actorUserId: actor.userId,
    actorRole: actor.role,
    metadata: { previous, next: nextStatus },
  })

  await emitProgramUpdate(program, 'PROGRAM_UPDATED', { status: nextStatus })
  return program
}

async function updateProgram(programId, updates, actor) {
  const program = await getProgramById(programId)
  await assertProgramAccess(program, actor)

  const allowed = [
    'title', 'description', 'objectives', 'startDate', 'endDate',
    'registrationOpensAt', 'registrationClosesAt', 'capacity', 'eligibilityRules',
    'cohortIds', 'academicProgramKeys', 'skills', 'location', 'milestones', 'visibility',
  ]
  for (const key of allowed) {
    if (updates[key] !== undefined) program[key] = updates[key]
  }
  if (updates.title) program.slug = slugify(updates.title)

  await program.save()
  await recordProgramActivity({
    programId: program._id,
    institutionId: program.institutionId,
    companyId: program.companyId,
    type: 'program_updated',
    title: 'Program updated',
    actorUserId: actor.userId,
    actorRole: actor.role,
  })
  return program
}

async function getRegistrationCount(programId) {
  return ProgramParticipant.countDocuments({
    programId,
    status: { $nin: ['rejected', 'dropped'] },
  })
}

async function registerStudent(programId, studentUserId, institutionId) {
  const program = await getProgramById(programId)
  if (program.status !== 'registration_open') {
    throw err('Registration is not open for this program', 400)
  }
  if (program.visibility !== 'published') throw err('Program is not published', 403)
  if (program.institutionId?.toString() !== institutionId?.toString()) {
    throw err('Program not available for your institution', 403)
  }

  const existing = await ProgramParticipant.findOne({ programId, studentUserId })
  if (existing) throw err('Already registered for this program', 409)

  const count = await getRegistrationCount(programId)
  if (program.capacity != null && program.capacity > 0 && count >= program.capacity) {
    throw err('Registration full', 409)
  }

  const student = await InstitutionStudent.findOne({ linkedUserId: studentUserId, institutionId }).lean()
  if (!student) throw err('Institution student profile required', 403)

  const eligibility = evaluateEligibility(student, program.eligibilityRules || {})
  if (!eligibility.eligible) {
    throw err(`Not eligible: ${eligibility.reasons?.join('; ') || 'requirements not met'}`, 403)
  }

  if (program.cohortIds?.length) {
    const inCohort = await InstitutionCohort.findOne({
      _id: { $in: program.cohortIds },
      studentIds: student._id,
    }).lean()
    if (!inCohort) throw err('Not in an eligible program cohort', 403)
  }

  const participant = await ProgramParticipant.create({
    programId,
    institutionId,
    studentUserId,
    institutionStudentId: student._id,
    status: 'registered',
    eligibilitySnapshot: eligibility,
  })

  await recordProgramActivity({
    programId,
    institutionId,
    type: 'participant_registered',
    title: 'Student registered',
    description: student.fullName || studentUserId.toString(),
    actorUserId: studentUserId,
    actorRole: 'student',
  })

  return participant
}

async function updateParticipantStatus(programId, participantId, nextStatus, actor, reviewMessage = '') {
  const program = await getProgramById(programId)
  await assertProgramAccess(program, actor)

  const participant = await ProgramParticipant.findOne({ _id: participantId, programId })
  if (!participant) throw err('Participant not found', 404)

  assertParticipantTransition(participant.status, nextStatus)
  participant.status = nextStatus
  participant.reviewedByUserId = actor.userId
  participant.reviewMessage = reviewMessage

  if (nextStatus === 'approved') participant.approvedAt = new Date()
  if (nextStatus === 'completed') participant.completedAt = new Date()
  if (nextStatus === 'dropped') participant.droppedAt = new Date()

  await participant.save()

  const activityType =
    nextStatus === 'approved'
      ? 'participant_approved'
      : nextStatus === 'rejected'
        ? 'participant_rejected'
        : nextStatus === 'completed'
          ? 'participant_completed'
          : 'program_updated'

  await recordProgramActivity({
    programId,
    institutionId: program.institutionId,
    companyId: program.companyId,
    type: activityType,
    title: `Participant ${nextStatus}`,
    actorUserId: actor.userId,
    actorRole: actor.role,
  })

  if (['approved', 'rejected'].includes(nextStatus)) {
    await notifyUser({
      recipientUserId: participant.studentUserId,
      recipientRole: 'student',
      type:
        nextStatus === 'approved'
          ? 'program_registration_approved'
          : 'program_registration_rejected',
      title:
        nextStatus === 'approved'
          ? 'Program registration approved'
          : 'Program registration declined',
      body: reviewMessage || program.title,
      metadata: { programId: program._id.toString(), href: `/programs/${program._id}` },
    })
  }

  return participant
}

async function verifyEntityForLink(entityType, entityId, program) {
  if (!PROGRAM_LINK_TYPES.includes(entityType)) throw err('Invalid entity type')
  if (!oid(entityId)) throw err('Invalid entity ID')

  switch (entityType) {
    case 'drive':
    case 'event': {
      const opp = await CampusOpportunity.findById(entityId).lean()
      if (!opp || opp.institutionId?.toString() !== program.institutionId?.toString()) {
        throw err('Campus opportunity not found or not owned by program institution', 404)
      }
      return opp
    }
    case 'job': {
      const job = await RecruitmentJob.findById(entityId).lean()
      if (!job || job.companyId?.toString() !== program.companyId?.toString()) {
        throw err('Job not found or not owned by partner company', 404)
      }
      return job
    }
    case 'internship': {
      const internship = await RecruitmentInternship.findById(entityId).lean()
      if (!internship || internship.companyId?.toString() !== program.companyId?.toString()) {
        throw err('Internship not found or not owned by partner company', 404)
      }
      return internship
    }
    case 'innovation_event': {
      const ev = await InstitutionInnovationEvent.findById(entityId).lean()
      if (!ev || ev.institutionId?.toString() !== program.institutionId?.toString()) {
        throw err('Innovation event not found', 404)
      }
      return ev
    }
    case 'alumni_event': {
      const ev = await InstitutionAlumniEvent.findById(entityId).lean()
      if (!ev || ev.institutionId?.toString() !== program.institutionId?.toString()) {
        throw err('Alumni event not found', 404)
      }
      return ev
    }
    case 'research_opportunity': {
      const opp = await InstitutionResearchOpportunity.findById(entityId).lean()
      if (!opp || opp.institutionId?.toString() !== program.institutionId?.toString()) {
        throw err('Research opportunity not found', 404)
      }
      return opp
    }
    case 'research_project': {
      const proj = await InstitutionResearchProject.findById(entityId).lean()
      if (!proj || proj.institutionId?.toString() !== program.institutionId?.toString()) {
        throw err('Research project not found', 404)
      }
      return proj
    }
    default:
      throw err('Unsupported entity type', 400)
  }
}

async function linkEntity(programId, entityType, entityId, actor, label = '') {
  const program = await getProgramById(programId)
  await assertProgramAccess(program, actor)
  await verifyEntityForLink(entityType, entityId, program)

  const exists = (program.linkedEntities || []).some(
    (l) => l.entityType === entityType && l.entityId === String(entityId),
  )
  if (exists) throw err('Entity already linked', 409)

  program.linkedEntities.push({
    entityType,
    entityId: String(entityId),
    label,
    order: program.linkedEntities.length,
  })
  await program.save()

  if (entityType === 'drive' || entityType === 'event') {
    await CampusOpportunity.updateOne({ _id: entityId }, { $set: { programId: program._id } })
  }

  await recordProgramActivity({
    programId,
    institutionId: program.institutionId,
    companyId: program.companyId,
    type: 'entity_linked',
    title: `${entityType} linked`,
    description: label || entityId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    metadata: { entityType, entityId },
  })

  await emitProgramUpdate(program, 'PROGRAM_ENTITY_LINKED', { entityType, entityId })
  return program
}

async function getProgramDashboard(programId, actor) {
  const program = await getProgramById(programId)
  await assertProgramAccess(program, actor)

  const [participants, activity, registrationCount] = await Promise.all([
    ProgramParticipant.find({ programId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    ProgramActivity.find({ programId }).sort({ createdAt: -1 }).limit(30).lean(),
    getRegistrationCount(programId),
  ])

  const byStatus = {}
  for (const s of PARTICIPANT_STATUSES) byStatus[s] = 0
  for (const p of participants) byStatus[p.status] = (byStatus[p.status] || 0) + 1

  const capacity =
    program.capacity != null && program.capacity > 0
      ? { total: program.capacity, used: registrationCount, full: registrationCount >= program.capacity }
      : null

  return {
    program: program.toObject ? program.toObject() : program,
    participants: participants.slice(0, 50),
    participantCounts: byStatus,
    registrationCount,
    capacity,
    linkedEntities: program.linkedEntities || [],
    milestones: program.milestones || [],
    recentActivity: activity,
    analytics: {
      registered: byStatus.registered || 0,
      approved: byStatus.approved || 0,
      active: byStatus.active || 0,
      completed: byStatus.completed || 0,
      dropped: byStatus.dropped || 0,
      rejected: byStatus.rejected || 0,
      linkedEntityCount: (program.linkedEntities || []).length,
    },
  }
}

async function listStudentPrograms(studentUserId) {
  const participants = await ProgramParticipant.find({ studentUserId })
    .sort({ updatedAt: -1 })
    .lean()
  const programIds = participants.map((p) => p.programId)
  const programs = programIds.length
    ? await InstitutionProgram.find({ _id: { $in: programIds } }).lean()
    : []
  const programMap = Object.fromEntries(programs.map((p) => [p._id.toString(), p]))
  return participants.map((p) => ({
    participant: p,
    program: programMap[p.programId.toString()] || null,
  }))
}

module.exports = {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  createProgram,
  listPrograms,
  listDiscoverablePrograms,
  getProgramById,
  updateProgram,
  updateProgramStatus,
  registerStudent,
  updateParticipantStatus,
  linkEntity,
  getProgramDashboard,
  listStudentPrograms,
  assertProgramAccess,
  getRegistrationCount,
  recordProgramActivity,
}
