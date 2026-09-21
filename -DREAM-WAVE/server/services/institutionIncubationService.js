const mongoose = require('mongoose')
const InstitutionStartup = require('../models/InstitutionStartup')
const InstitutionIncubationRecord = require('../models/InstitutionIncubationRecord')
const InstitutionMentor = require('../models/InstitutionMentor')
const InstitutionMentorshipSession = require('../models/InstitutionMentorshipSession')
const InstitutionFundingRecord = require('../models/InstitutionFundingRecord')
const InstitutionInvestor = require('../models/InstitutionInvestor')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionIncubationCollaboration = require('../models/InstitutionIncubationCollaboration')
const {
  assertIncubationTransition,
  normalizeStartupName,
  INCUBATION_STAGES,
} = require('../constants/institutionIncubation')
const { notifyUser } = require('./platformNotificationService')
const { recordInnovationAudit } = require('./institutionInnovationAuditService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function sanitize(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function paginate(Model, query, { page = 1, limit = 20, sort = '-createdAt' }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (safePage - 1) * safeLimit
  const [items, total] = await Promise.all([
    Model.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
    Model.countDocuments(query),
  ])
  return { items, total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) || 1 }
}

async function notifySafe(payload) {
  try {
    await notifyUser(payload)
  } catch {
    /* non-blocking */
  }
}

async function getIncubationStats(institutionId) {
  const cid = oid(institutionId)
  const [startups, incubations, mentors, sessions, funding, investors, events] = await Promise.all([
    InstitutionStartup.find({ institutionId: cid }).select('status stage category').lean(),
    InstitutionIncubationRecord.find({ institutionId: cid }).select('currentStage').lean(),
    InstitutionMentor.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionMentorshipSession.countDocuments({ institutionId: cid }),
    InstitutionFundingRecord.find({ institutionId: cid }).select('status amount fundingType').lean(),
    InstitutionInvestor.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionInnovationEvent.find({ institutionId: cid }).select('status eventType').lean(),
  ])

  const activeStartups = startups.filter((s) => s.status === 'active').length
  const graduated = startups.filter((s) => s.status === 'graduated').length
  const totalFunding = funding
    .filter((f) => ['approved', 'disbursed'].includes(f.status))
    .reduce((sum, f) => sum + (f.amount || 0), 0)
  const publishedEvents = events.filter((e) => ['published', 'ongoing', 'completed'].includes(e.status)).length

  return {
    totalStartups: startups.length,
    activeStartups,
    graduatedStartups: graduated,
    totalMentors: mentors,
    totalSessions: sessions,
    totalFundingRecords: funding.length,
    totalFundingAmount: totalFunding,
    totalInvestors: investors,
    totalEvents: events.length,
    publishedEvents,
    byIncubationStage: incubations.reduce((acc, r) => {
      acc[r.currentStage] = (acc[r.currentStage] || 0) + 1
      return acc
    }, {}),
    byStartupCategory: startups.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1
      return acc
    }, {}),
    hasData: startups.length > 0 || mentors > 0 || events.length > 0,
  }
}

async function getIncubationWorkspace(institutionId) {
  const stats = await getIncubationStats(institutionId)
  const cid = oid(institutionId)
  const [recentStartups, upcomingSessions, upcomingEvents] = await Promise.all([
    InstitutionStartup.find({ institutionId: cid }).sort({ updatedAt: -1 }).limit(5).lean(),
    InstitutionMentorshipSession.find({ institutionId: cid, status: 'scheduled' })
      .sort({ scheduledDate: 1 })
      .limit(5)
      .populate('mentorId', 'name')
      .populate('startupId', 'name')
      .lean(),
    InstitutionInnovationEvent.find({ institutionId: cid, status: 'published' })
      .sort({ startDate: 1 })
      .limit(5)
      .lean(),
  ])

  return { stats, recentStartups, upcomingSessions, upcomingEvents }
}

async function listStartups(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.status) query.status = filters.status
  if (filters.category) query.category = filters.category
  if (filters.stage) query.stage = filters.stage
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ name: regex }, { description: regex }, { industry: regex }]
  }
  return paginate(InstitutionStartup, query, pagination)
}

async function createStartup(institutionId, actorUserId, payload) {
  if (!payload.name) throw err('Startup name is required')
  const normalized = normalizeStartupName(payload.name)
  const existing = await InstitutionStartup.findOne({ institutionId: oid(institutionId), nameNormalized: normalized })
  if (existing) throw err('A startup with this name already exists at your institution', 409)

  const startup = await InstitutionStartup.create({
    institutionId: oid(institutionId),
    name: sanitize(payload.name, 200),
    nameNormalized: normalized,
    founders: payload.founders || [],
    coFounders: payload.coFounders || [],
    category: payload.category || 'technology',
    industry: sanitize(payload.industry, 200),
    stage: payload.stage || 'idea',
    description: sanitize(payload.description),
    vision: sanitize(payload.vision),
    mission: sanitize(payload.mission),
    website: sanitize(payload.website, 500),
    contactEmail: sanitize(payload.contactEmail, 200),
    contactPhone: sanitize(payload.contactPhone, 50),
    teamMembers: payload.teamMembers || [],
    status: payload.status || 'draft',
    linkedIdeaId: payload.linkedIdeaId || null,
    isConfidential: Boolean(payload.isConfidential),
    createdByUserId: actorUserId,
  })

  await InstitutionIncubationRecord.create({
    institutionId: oid(institutionId),
    startupId: startup._id,
    currentStage: 'idea_evaluation',
    history: [{
      stage: 'idea_evaluation',
      action: 'incubation_started',
      description: `Incubation started for ${startup.name}`,
      actorUserId,
      at: new Date(),
    }],
    createdByUserId: actorUserId,
  })

  await recordInnovationAudit({
    institutionId,
    action: 'startup_registered',
    actorUserId,
    description: `Startup registered: ${startup.name}`,
    metadata: { startupId: startup._id.toString() },
  }).catch(() => {})

  return startup
}

async function updateStartup(institutionId, startupId, payload) {
  const startup = await InstitutionStartup.findOne({ institutionId: oid(institutionId), _id: startupId })
  if (!startup) throw err('Startup not found', 404)

  if (payload.name && normalizeStartupName(payload.name) !== startup.nameNormalized) {
    const normalized = normalizeStartupName(payload.name)
    const dup = await InstitutionStartup.findOne({
      institutionId: oid(institutionId),
      nameNormalized: normalized,
      _id: { $ne: startupId },
    })
    if (dup) throw err('A startup with this name already exists', 409)
    startup.name = sanitize(payload.name, 200)
    startup.nameNormalized = normalized
  }

  const allowed = [
    'founders', 'coFounders', 'category', 'industry', 'stage', 'description',
    'vision', 'mission', 'website', 'contactEmail', 'contactPhone', 'teamMembers',
    'status', 'linkedIdeaId', 'isConfidential',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) startup[key] = payload[key]
  }
  await startup.save()
  return startup
}

async function getIncubationRecord(institutionId, startupId) {
  const record = await InstitutionIncubationRecord.findOne({
    institutionId: oid(institutionId),
    startupId,
  }).lean()
  if (!record) throw err('Incubation record not found', 404)
  return record
}

async function advanceIncubationStage(institutionId, startupId, nextStage, actorUserId, actorName) {
  const record = await InstitutionIncubationRecord.findOne({
    institutionId: oid(institutionId),
    startupId,
  })
  if (!record) throw err('Incubation record not found', 404)

  const previous = record.currentStage
  assertIncubationTransition(previous, nextStage)
  record.currentStage = nextStage
  record.history.push({
    stage: nextStage,
    action: 'stage_advanced',
    description: `Advanced from ${previous} to ${nextStage}`,
    actorUserId,
    actorName: sanitize(actorName, 100),
    at: new Date(),
  })

  if (nextStage === 'graduation') {
    record.graduatedAt = new Date()
    await InstitutionStartup.updateOne(
      { _id: startupId, institutionId: oid(institutionId) },
      { status: 'graduated', stage: 'graduated' },
    )
  }

  await record.save()

  await recordInnovationAudit({
    institutionId,
    action: 'incubation_stage_updated',
    actorUserId,
    actorName,
    description: `Incubation stage updated to ${nextStage}`,
    metadata: { startupId: startupId.toString(), previousStage: previous, nextStage },
  }).catch(() => {})

  const startup = await InstitutionStartup.findById(startupId)
  if (startup?.teamMembers?.length) {
    for (const member of startup.teamMembers) {
      if (member.linkedUserId) {
        await notifySafe({
          recipientUserId: member.linkedUserId,
          recipientRole: 'student',
          type: 'incubation_status_updated',
          title: 'Incubation status updated',
          body: `${startup.name} moved to ${nextStage.replace(/_/g, ' ')}.`,
          metadata: { startupId: startup._id.toString(), stage: nextStage },
        })
      }
    }
  }

  return record
}

async function assignMentorToStartup(institutionId, startupId, mentorId, actorUserId) {
  const [startup, mentor, record] = await Promise.all([
    InstitutionStartup.findOne({ institutionId: oid(institutionId), _id: startupId }),
    InstitutionMentor.findOne({ institutionId: oid(institutionId), _id: mentorId }),
    InstitutionIncubationRecord.findOne({ institutionId: oid(institutionId), startupId }),
  ])
  if (!startup || !mentor || !record) throw err('Startup, mentor, or incubation record not found', 404)

  if (!record.assignedMentorIds.some((id) => id.toString() === mentorId)) {
    record.assignedMentorIds.push(mentorId)
  }
  if (!mentor.assignedStartupIds.some((id) => id.toString() === startupId)) {
    mentor.assignedStartupIds.push(startupId)
  }

  record.history.push({
    stage: record.currentStage,
    action: 'mentor_assigned',
    description: `Mentor assigned: ${mentor.name}`,
    actorUserId,
    at: new Date(),
    metadata: { mentorId },
  })

  await Promise.all([record.save(), mentor.save()])

  await recordInnovationAudit({
    institutionId,
    action: 'mentor_assigned',
    actorUserId,
    description: `Mentor assigned: ${mentor.name} to ${startup.name}`,
    metadata: { startupId: startupId.toString(), mentorId: mentorId.toString() },
  }).catch(() => {})

  if (mentor.linkedUserId) {
    await notifySafe({
      recipientUserId: mentor.linkedUserId,
      recipientRole: 'institution',
      type: 'mentor_assigned',
      title: 'Mentor assignment',
      body: `You have been assigned to mentor ${startup.name}.`,
      metadata: { startupId: startup._id.toString(), mentorId: mentor._id.toString() },
    })
  }

  return { record, mentor }
}

async function listMentors(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.mentorType) query.mentorType = filters.mentorType
  if (filters.status) query.status = filters.status
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ name: regex }, { organization: regex }, { expertise: regex }]
  }
  return paginate(InstitutionMentor, query, pagination)
}

async function createMentor(institutionId, actorUserId, payload) {
  if (!payload.name || !payload.mentorType) throw err('Mentor name and type are required')
  return InstitutionMentor.create({
    institutionId: oid(institutionId),
    name: sanitize(payload.name, 200),
    email: sanitize(payload.email, 200),
    phone: sanitize(payload.phone, 50),
    mentorType: payload.mentorType,
    organization: sanitize(payload.organization, 200),
    expertise: payload.expertise || [],
    experience: sanitize(payload.experience),
    mentoringDomains: payload.mentoringDomains || [],
    availability: sanitize(payload.availability, 500),
    linkedUserId: payload.linkedUserId || null,
    createdByUserId: actorUserId,
  })
}

async function updateMentor(institutionId, mentorId, payload) {
  const mentor = await InstitutionMentor.findOne({ institutionId: oid(institutionId), _id: mentorId })
  if (!mentor) throw err('Mentor not found', 404)
  const allowed = [
    'name', 'email', 'phone', 'mentorType', 'organization', 'expertise',
    'experience', 'mentoringDomains', 'availability', 'linkedUserId', 'status',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) mentor[key] = payload[key]
  }
  await mentor.save()
  return mentor
}

async function listSessions(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.startupId) query.startupId = oid(filters.startupId)
  if (filters.mentorId) query.mentorId = oid(filters.mentorId)
  if (filters.status) query.status = filters.status
  return paginate(InstitutionMentorshipSession, query, { ...pagination, sort: 'scheduledDate' })
}

async function createSession(institutionId, actorUserId, payload) {
  if (!payload.startupId || !payload.mentorId || !payload.scheduledDate) {
    throw err('Startup, mentor, and scheduled date are required')
  }
  const session = await InstitutionMentorshipSession.create({
    institutionId: oid(institutionId),
    startupId: payload.startupId,
    mentorId: payload.mentorId,
    sessionType: payload.sessionType || 'general',
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime || '',
    durationMinutes: payload.durationMinutes ?? 60,
    goals: payload.goals || [],
    createdByUserId: actorUserId,
  })

  const [startup, mentor] = await Promise.all([
    InstitutionStartup.findById(payload.startupId),
    InstitutionMentor.findById(payload.mentorId),
  ])

  if (mentor?.linkedUserId) {
    await notifySafe({
      recipientUserId: mentor.linkedUserId,
      recipientRole: 'institution',
      type: 'mentorship_session_scheduled',
      title: 'Mentorship session scheduled',
      body: `Session scheduled with ${startup?.name || 'startup'} on ${new Date(payload.scheduledDate).toLocaleDateString()}.`,
      metadata: { sessionId: session._id.toString() },
    })
  }

  return session
}

async function completeSession(institutionId, sessionId, actorUserId, payload) {
  const session = await InstitutionMentorshipSession.findOne({
    institutionId: oid(institutionId),
    _id: sessionId,
  })
  if (!session) throw err('Session not found', 404)

  session.status = 'completed'
  if (payload.meetingNotes !== undefined) session.meetingNotes = sanitize(payload.meetingNotes)
  if (payload.feedback !== undefined) session.feedback = sanitize(payload.feedback)
  if (payload.rating !== undefined) session.rating = payload.rating
  if (payload.actionItems) session.actionItems = payload.actionItems
  await session.save()
  return session
}

async function listFunding(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.startupId) query.startupId = oid(filters.startupId)
  if (filters.fundingType) query.fundingType = filters.fundingType
  if (filters.status) query.status = filters.status
  return paginate(InstitutionFundingRecord, query, pagination)
}

async function createFunding(institutionId, actorUserId, payload) {
  if (!payload.fundingType || !payload.fundingSource) {
    throw err('Funding type and source are required')
  }
  const record = await InstitutionFundingRecord.create({
    institutionId: oid(institutionId),
    startupId: payload.startupId || null,
    projectId: payload.projectId || null,
    fundingType: payload.fundingType,
    fundingSource: sanitize(payload.fundingSource, 300),
    amount: payload.amount ?? 0,
    currency: payload.currency || 'INR',
    status: payload.status || 'proposed',
    purpose: sanitize(payload.purpose),
    fundingDate: payload.fundingDate || null,
    documents: payload.documents || [],
    investorId: payload.investorId || null,
    createdByUserId: actorUserId,
  })

  if (payload.startupId) {
    const startup = await InstitutionStartup.findById(payload.startupId)
    if (startup?.teamMembers?.length) {
      for (const member of startup.teamMembers) {
        if (member.linkedUserId) {
          await notifySafe({
            recipientUserId: member.linkedUserId,
            recipientRole: 'student',
            type: 'funding_opportunity_available',
            title: 'Funding record created',
            body: `A ${payload.fundingType.replace(/_/g, ' ')} record was created for ${startup.name}.`,
            metadata: { fundingId: record._id.toString() },
          })
        }
      }
    }
  }

  return record
}

async function updateFunding(institutionId, fundingId, payload, actorUserId = null, actorName = '') {
  const record = await InstitutionFundingRecord.findOne({ institutionId: oid(institutionId), _id: fundingId })
  if (!record) throw err('Funding record not found', 404)
  const previousStatus = record.status
  const allowed = ['status', 'amount', 'purpose', 'fundingDate', 'documents', 'investorId']
  for (const key of allowed) {
    if (payload[key] !== undefined) record[key] = payload[key]
  }
  await record.save()

  if (payload.status === 'approved' && previousStatus !== 'approved') {
    await recordInnovationAudit({
      institutionId,
      action: 'funding_approved',
      actorUserId,
      actorName,
      description: `Funding approved: ${record.fundingSource} (${record.amount})`,
      metadata: { fundingId: record._id.toString(), amount: record.amount },
    }).catch(() => {})
  }

  return record
}

async function listInvestors(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.investorType) query.investorType = filters.investorType
  if (filters.status) query.status = filters.status
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ name: regex }, { organization: regex }]
  }
  return paginate(InstitutionInvestor, query, pagination)
}

async function createInvestor(institutionId, actorUserId, payload) {
  if (!payload.name || !payload.investorType) throw err('Investor name and type are required')
  return InstitutionInvestor.create({
    institutionId: oid(institutionId),
    name: sanitize(payload.name, 200),
    investorType: payload.investorType,
    organization: sanitize(payload.organization, 200),
    email: sanitize(payload.email, 200),
    phone: sanitize(payload.phone, 50),
    website: sanitize(payload.website, 500),
    preferredSectors: payload.preferredSectors || [],
    preferredStages: payload.preferredStages || [],
    investmentInterests: sanitize(payload.investmentInterests),
    minTicketSize: payload.minTicketSize ?? null,
    maxTicketSize: payload.maxTicketSize ?? null,
    notes: sanitize(payload.notes),
    createdByUserId: actorUserId,
  })
}

async function connectInvestorToStartup(institutionId, investorId, startupId) {
  const [investor, startup] = await Promise.all([
    InstitutionInvestor.findOne({ institutionId: oid(institutionId), _id: investorId }),
    InstitutionStartup.findOne({ institutionId: oid(institutionId), _id: startupId }),
  ])
  if (!investor || !startup) throw err('Investor or startup not found', 404)
  if (!investor.connectedStartupIds.some((id) => id.toString() === startupId)) {
    investor.connectedStartupIds.push(startupId)
    await investor.save()
  }
  return investor
}

async function listEvents(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.eventType) query.eventType = filters.eventType
  if (filters.status) query.status = filters.status
  return paginate(InstitutionInnovationEvent, query, pagination)
}

async function createEvent(institutionId, actorUserId, payload) {
  if (!payload.title || !payload.eventType || !payload.startDate) {
    throw err('Title, event type, and start date are required')
  }
  return InstitutionInnovationEvent.create({
    institutionId: oid(institutionId),
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    eventType: payload.eventType,
    venue: sanitize(payload.venue, 300),
    mode: payload.mode || 'offline',
    meetingLink: sanitize(payload.meetingLink, 500),
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    registrationDeadline: payload.registrationDeadline || null,
    capacity: payload.capacity ?? null,
    status: payload.status || 'draft',
    createdByUserId: actorUserId,
  }).then(async (event) => {
    await recordInnovationAudit({
      institutionId,
      action: 'event_created',
      actorUserId,
      description: `Innovation event created: ${payload.title}`,
      metadata: { eventId: event._id.toString(), eventType: payload.eventType },
    }).catch(() => {})
    return event
  })
}

async function publishEvent(institutionId, eventId) {
  const event = await InstitutionInnovationEvent.findOne({ institutionId: oid(institutionId), _id: eventId })
  if (!event) throw err('Event not found', 404)
  event.status = 'published'
  event.publishedAt = new Date()
  await event.save()
  return event
}

async function registerForEvent(userId, userName, userEmail, eventId) {
  const event = await InstitutionInnovationEvent.findOne({ _id: eventId, status: 'published' })
  if (!event) throw err('Event not found or not open for registration', 404)
  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    throw err('Registration deadline has passed', 400)
  }
  if (event.capacity && event.registrations.length >= event.capacity) {
    throw err('Event is at full capacity', 409)
  }
  const existing = event.registrations.find(
    (r) => r.registrantUserId && r.registrantUserId.toString() === userId.toString(),
  )
  if (existing) throw err('Already registered for this event', 409)

  event.registrations.push({
    registrantUserId: userId,
    registrantName: userName || 'Participant',
    registrantEmail: userEmail || '',
    status: 'registered',
    registeredAt: new Date(),
  })
  await event.save()

  await notifySafe({
    recipientUserId: userId,
    recipientRole: 'student',
    type: 'event_registration_confirmed',
    title: 'Event registration confirmed',
    body: `You are registered for ${event.title}.`,
    metadata: { eventId: event._id.toString() },
  })

  return event
}

async function recordEventAttendance(institutionId, eventId, registrationId, status, outcomeNotes = '') {
  const event = await InstitutionInnovationEvent.findOne({ institutionId: oid(institutionId), _id: eventId })
  if (!event) throw err('Event not found', 404)
  const reg = event.registrations.id(registrationId)
  if (!reg) throw err('Registration not found', 404)
  reg.status = status
  reg.outcomeNotes = sanitize(outcomeNotes, 1000)
  await event.save()
  return event
}

async function listCollaboration(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.startupId) query.startupId = oid(filters.startupId)
  if (filters.projectId) query.projectId = oid(filters.projectId)
  if (filters.collaborationType) query.collaborationType = filters.collaborationType
  return paginate(InstitutionIncubationCollaboration, query, pagination)
}

async function createCollaboration(institutionId, actorUserId, actorName, payload) {
  if (!payload.collaborationType || !payload.title) {
    throw err('Collaboration type and title are required')
  }
  return InstitutionIncubationCollaboration.create({
    institutionId: oid(institutionId),
    startupId: payload.startupId || null,
    projectId: payload.projectId || null,
    collaborationType: payload.collaborationType,
    title: sanitize(payload.title, 300),
    content: sanitize(payload.content),
    fileUrl: sanitize(payload.fileUrl, 500),
    fileName: sanitize(payload.fileName, 200),
    taskStatus: payload.taskStatus || 'open',
    assigneeName: sanitize(payload.assigneeName, 200),
    assigneeUserId: payload.assigneeUserId || null,
    dueDate: payload.dueDate || null,
    authorUserId: actorUserId,
    authorName: sanitize(actorName, 100),
    participants: payload.participants || [],
    isConfidential: Boolean(payload.isConfidential),
  })
}

async function updateCollaborationTask(institutionId, collabId, payload) {
  const item = await InstitutionIncubationCollaboration.findOne({
    institutionId: oid(institutionId),
    _id: collabId,
    collaborationType: 'task',
  })
  if (!item) throw err('Task not found', 404)
  if (payload.taskStatus) item.taskStatus = payload.taskStatus
  if (payload.content !== undefined) item.content = sanitize(payload.content)
  await item.save()
  return item
}

module.exports = {
  getIncubationStats,
  getIncubationWorkspace,
  listStartups,
  createStartup,
  updateStartup,
  getIncubationRecord,
  advanceIncubationStage,
  assignMentorToStartup,
  listMentors,
  createMentor,
  updateMentor,
  listSessions,
  createSession,
  completeSession,
  listFunding,
  createFunding,
  updateFunding,
  listInvestors,
  createInvestor,
  connectInvestorToStartup,
  listEvents,
  createEvent,
  publishEvent,
  registerForEvent,
  recordEventAttendance,
  listCollaboration,
  createCollaboration,
  updateCollaborationTask,
  INCUBATION_STAGES,
}
