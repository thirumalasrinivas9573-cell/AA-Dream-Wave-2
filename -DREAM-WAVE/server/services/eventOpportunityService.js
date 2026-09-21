const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionResearchOpportunity = require('../models/InstitutionResearchOpportunity')
const InstitutionResearchOpportunityApplication = require('../models/InstitutionResearchOpportunityApplication')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const EventTeam = require('../models/EventTeam')
const EventSubmission = require('../models/EventSubmission')
const EventSaved = require('../models/EventSaved')
const Company = require('../models/Company')
const UserProfile = require('../models/UserProfile')
const {
  EVENT_SOURCES,
  CAMPUS_TYPE_TO_CATEGORY,
  INNOVATION_TYPE_TO_CATEGORY,
  ALUMNI_TYPE_TO_CATEGORY,
  RESEARCH_TYPE_TO_CATEGORY,
  REGISTRATION_OPEN_STATUSES,
} = require('../constants/eventOpportunity')
const { registerForEvent: registerInnovationEvent } = require('./institutionIncubationService')
const { registerForEvent: registerAlumniEvent } = require('./institutionAlumniExtendedService')
const { buildEligibilityChecklist } = require('./recruitmentIntelligenceService')
const { applyToOpportunity } = require('./studentRecruitmentService')
const { applyToOpportunity: applyResearchOpportunity } = require('./institutionResearchService')
const { notifyUser } = require('./platformNotificationService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(value) {
  if (!value) return null
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
}

function notProvided(value) {
  if (value === null || value === undefined || value === '') return 'NOT PROVIDED'
  return value
}

async function notifySafe(payload) {
  try {
    await notifyUser(payload)
  } catch {
    /* non-blocking */
  }
}

function mapMode(record) {
  return record.mode || record.workMode || 'NOT PROVIDED'
}

function normalizeCampus(record, institutionName = '') {
  const category = CAMPUS_TYPE_TO_CATEGORY[record.opportunityType] || 'other'
  const isHackathon = record.opportunityType === 'hackathon'
  return {
    id: record._id.toString(),
    source: 'campus_opportunity',
    category,
    eventType: record.opportunityType,
    title: record.title,
    description: record.description || '',
    organizer: institutionName || 'NOT PROVIDED',
    organizerType: 'institution',
    institutionId: record.institutionId?.toString(),
    startDate: record.driveDate || record.publishedAt || record.createdAt,
    endDate: record.deadline,
    registrationDeadline: record.deadline,
    venue: notProvided(record.venue),
    city: notProvided(record.hackathonDetails?.city || record.location),
    country: notProvided(record.hackathonDetails?.country),
    mode: mapMode({ workMode: record.workMode }),
    website: notProvided(record.hackathonDetails?.website),
    requiredSkills: record.requiredSkills || record.eligibilityRules?.requiredSkills || [],
    status: record.status,
    capacity: record.capacity ?? record.openPositions ?? null,
    registrationCount: null,
    isHackathon,
    hackathonDetails: isHackathon ? record.hackathonDetails || null : null,
    eligibilityRules: record.eligibilityRules || {},
    publishedAt: record.publishedAt,
  }
}

function normalizeInnovation(record, institutionName = '') {
  const category = INNOVATION_TYPE_TO_CATEGORY[record.eventType] || 'event'
  const isHackathon = ['hackathon', 'innovation_challenge', 'startup_competition'].includes(record.eventType)
  return {
    id: record._id.toString(),
    source: 'innovation_event',
    category,
    eventType: record.eventType,
    title: record.title,
    description: record.description || '',
    organizer: institutionName || 'NOT PROVIDED',
    organizerType: 'institution',
    institutionId: record.institutionId?.toString(),
    startDate: record.startDate,
    endDate: record.endDate,
    registrationDeadline: record.registrationDeadline,
    venue: notProvided(record.venue),
    city: notProvided(record.hackathonDetails?.city),
    country: notProvided(record.hackathonDetails?.country),
    mode: mapMode(record),
    website: notProvided(record.hackathonDetails?.website || record.meetingLink),
    requiredSkills: record.requiredSkills || [],
    status: record.status,
    capacity: record.capacity,
    registrationCount: record.registrations?.length ?? 0,
    isHackathon,
    hackathonDetails: isHackathon ? record.hackathonDetails || null : null,
    eligibilityRules: {},
    publishedAt: record.publishedAt,
  }
}

function normalizeAlumni(record, institutionName = '') {
  const category = ALUMNI_TYPE_TO_CATEGORY[record.eventType] || 'event'
  return {
    id: record._id.toString(),
    source: 'alumni_event',
    category,
    eventType: record.eventType,
    title: record.title,
    description: record.description || '',
    organizer: notProvided(record.organizer || institutionName),
    organizerType: 'institution',
    institutionId: record.institutionId?.toString(),
    startDate: record.startDate,
    endDate: record.endDate,
    registrationDeadline: record.registrationDeadline,
    venue: notProvided(record.venue),
    city: 'NOT PROVIDED',
    country: 'NOT PROVIDED',
    mode: mapMode(record),
    website: notProvided(record.meetingLink),
    requiredSkills: [],
    status: record.status,
    capacity: record.capacity,
    registrationCount: record.registrations?.length ?? 0,
    isHackathon: false,
    hackathonDetails: null,
    eligibilityRules: {},
    publishedAt: record.publishedAt,
  }
}

function normalizeResearch(record, institutionName = '') {
  const category = RESEARCH_TYPE_TO_CATEGORY[record.opportunityType] || 'research_event'
  return {
    id: record._id.toString(),
    source: 'research_opportunity',
    category,
    eventType: record.opportunityType,
    title: record.title,
    description: record.description || '',
    organizer: notProvided(record.principalInvestigator || institutionName),
    organizerType: 'institution',
    institutionId: record.institutionId?.toString(),
    startDate: record.createdAt,
    endDate: null,
    registrationDeadline: record.applicationDeadline,
    venue: 'NOT PROVIDED',
    city: 'NOT PROVIDED',
    country: 'NOT PROVIDED',
    mode: 'NOT PROVIDED',
    website: 'NOT PROVIDED',
    requiredSkills: record.eligibility?.requiredSkills || record.tags || [],
    status: record.status,
    capacity: record.positions ?? null,
    registrationCount: null,
    isHackathon: record.opportunityType === 'innovation_challenge',
    hackathonDetails: null,
    eligibilityRules: record.eligibility || {},
    publishedAt: record.publishedAt,
  }
}

function applyBrowseFilters(items, filters = {}) {
  let result = items
  if (filters.category) {
    result = result.filter((i) => i.category === filters.category)
  }
  if (filters.mode) {
    result = result.filter((i) => String(i.mode).toLowerCase().includes(filters.mode.toLowerCase()))
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(q)
        || i.description.toLowerCase().includes(q)
        || i.organizer.toLowerCase().includes(q),
    )
  }
  if (filters.skill) {
    const s = filters.skill.toLowerCase()
    result = result.filter((i) => (i.requiredSkills || []).some((sk) => sk.toLowerCase().includes(s)))
  }
  if (filters.upcoming === 'true') {
    const now = new Date()
    result = result.filter((i) => !i.startDate || new Date(i.startDate) >= now)
  }
  if (filters.period === 'week') {
    const now = new Date()
    const week = new Date(now.getTime() + 7 * 86400000)
    result = result.filter((i) => i.startDate && new Date(i.startDate) <= week)
  }
  if (filters.period === 'month') {
    const now = new Date()
    const month = new Date(now.getTime() + 30 * 86400000)
    result = result.filter((i) => i.startDate && new Date(i.startDate) <= month)
  }
  return result
}

async function resolveStudentInstitution(userId) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' }).lean()
  if (!student) return null
  const institution = await Institution.findById(student.institutionId).select('name').lean()
  return { student, institution }
}

async function browseEvents(userId, filters = {}) {
  const ctx = await resolveStudentInstitution(userId)
  if (!ctx) {
    return { items: [], total: 0, page: 1, limit: 20, pageCount: 0, hasInstitutionLink: false }
  }

  const { student, institution } = ctx
  const iid = student.institutionId
  const instName = institution?.name || ''

  const [campus, innovation, alumni, research] = await Promise.all([
    CampusOpportunity.find({
      institutionId: iid,
      status: { $in: REGISTRATION_OPEN_STATUSES.campus_opportunity },
      ...(filters.eventType && filters.source === 'campus_opportunity'
        ? { opportunityType: filters.eventType }
        : {}),
    })
      .sort({ deadline: 1, createdAt: -1 })
      .lean(),
    InstitutionInnovationEvent.find({
      institutionId: iid,
      status: { $in: REGISTRATION_OPEN_STATUSES.innovation_event },
    })
      .sort({ startDate: 1 })
      .lean(),
    InstitutionAlumniEvent.find({
      institutionId: iid,
      status: { $in: REGISTRATION_OPEN_STATUSES.alumni_event },
    })
      .sort({ startDate: 1 })
      .lean(),
    InstitutionResearchOpportunity.find({
      institutionId: iid,
      status: { $in: REGISTRATION_OPEN_STATUSES.research_opportunity },
    })
      .sort({ applicationDeadline: 1 })
      .lean(),
  ])

  let items = [
    ...campus.map((r) => normalizeCampus(r, instName)),
    ...innovation.map((r) => normalizeInnovation(r, instName)),
    ...alumni.map((r) => normalizeAlumni(r, instName)),
    ...research.map((r) => normalizeResearch(r, instName)),
  ]

  if (filters.source) {
    items = items.filter((i) => i.source === filters.source)
  }
  if (filters.hackathon === 'true') {
    items = items.filter((i) => i.isHackathon || i.category === 'hackathon')
  }

  items = applyBrowseFilters(items, filters)
  items.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0))

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20))
  const total = items.length
  const start = (page - 1) * limit
  const paged = items.slice(start, start + limit)

  const saved = await EventSaved.find({ userId: oid(userId) }).lean()
  const savedSet = new Set(saved.map((s) => `${s.source}:${s.sourceId}`))

  const enriched = await Promise.all(
    paged.map(async (item) => {
      const registration = await getRegistrationStatus(userId, item.source, item.id)
      return {
        ...item,
        saved: savedSet.has(`${item.source}:${item.id}`),
        registrationStatus: registration.status,
        isRegistered: registration.isRegistered,
      }
    }),
  )

  return {
    items: enriched,
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
    hasInstitutionLink: true,
  }
}

async function loadSourceRecord(source, sourceId) {
  switch (source) {
    case 'campus_opportunity':
      return CampusOpportunity.findById(sourceId).lean()
    case 'innovation_event':
      return InstitutionInnovationEvent.findById(sourceId).lean()
    case 'alumni_event':
      return InstitutionAlumniEvent.findById(sourceId).lean()
    case 'research_opportunity':
      return InstitutionResearchOpportunity.findById(sourceId).lean()
    default:
      throw err('Invalid event source', 400)
  }
}

async function getEventDetails(userId, source, sourceId) {
  if (!EVENT_SOURCES.includes(source)) throw err('Invalid event source', 400)
  const record = await loadSourceRecord(source, sourceId)
  if (!record) throw err('Event not found', 404)

  const ctx = await resolveStudentInstitution(userId)
  if (!ctx || record.institutionId.toString() !== ctx.student.institutionId.toString()) {
    throw err('Event not found', 404)
  }

  const instName = ctx.institution?.name || ''
  let normalized
  switch (source) {
    case 'campus_opportunity':
      normalized = normalizeCampus(record, instName)
      break
    case 'innovation_event':
      normalized = normalizeInnovation(record, instName)
      break
    case 'alumni_event':
      normalized = normalizeAlumni(record, instName)
      break
    case 'research_opportunity':
      normalized = normalizeResearch(record, instName)
      break
    default:
      throw err('Invalid source', 400)
  }

  if (['draft', 'cancelled', 'archived'].includes(record.status)) {
    throw err('Event not found', 404)
  }

  const registration = await getRegistrationStatus(userId, source, sourceId)
  const eligibility = await checkEligibility(userId, source, sourceId)
  const saved = await EventSaved.findOne({ userId: oid(userId), source, sourceId: oid(sourceId) }).lean()

  let teamCount = 0
  let myTeam = null
  if (normalized.isHackathon) {
    teamCount = await EventTeam.countDocuments({ source, sourceId: oid(sourceId) })
    myTeam = await EventTeam.findOne({
      source,
      sourceId: oid(sourceId),
      $or: [{ captainUserId: oid(userId) }, { 'members.userId': oid(userId) }],
    }).lean()
  }

  return {
    ...normalized,
    registration,
    eligibility,
    saved: Boolean(saved),
    teamCount,
    myTeam: myTeam
      ? {
          id: myTeam._id.toString(),
          name: myTeam.name,
          role: myTeam.captainUserId.toString() === userId.toString() ? 'captain' : 'member',
          memberCount: myTeam.members.length,
          status: myTeam.status,
        }
      : null,
    registrationOpen: isRegistrationOpen(source, record),
    registrationFull: await isRegistrationFullAsync(source, record),
  }
}

function isRegistrationOpen(source, record) {
  if (!REGISTRATION_OPEN_STATUSES[source]?.includes(record.status)) return false
  const deadline = record.registrationDeadline || record.deadline || record.applicationDeadline
  if (deadline && new Date(deadline) < new Date()) return false
  return true
}

async function isRegistrationFullAsync(source, record) {
  const capacity = record.capacity ?? record.openPositions ?? record.positions
  if (!capacity) return false
  if (source === 'campus_opportunity') {
    const [appCount, opp] = await Promise.all([
      RecruitmentApplication.countDocuments({
        campusOpportunityId: record._id,
        stage: { $ne: 'withdrawn' },
      }),
      CampusOpportunity.findById(record._id).select('registrations').lean(),
    ])
    const regCount = (opp?.registrations || []).filter((r) => r.status !== 'cancelled').length
    return appCount + regCount >= capacity
  }
  const count = record.registrations?.length ?? 0
  return count >= capacity
}

async function getRegistrationStatus(userId, source, sourceId) {
  switch (source) {
    case 'campus_opportunity': {
      const app = await RecruitmentApplication.findOne({
        candidateUserId: oid(userId),
        campusOpportunityId: oid(sourceId),
        stage: { $ne: 'withdrawn' },
      }).lean()
      if (app) {
        return { isRegistered: true, status: app.stage, applicationId: app._id.toString() }
      }
      const opp = await CampusOpportunity.findById(sourceId).lean()
      const reg = opp?.registrations?.find(
        (r) => r.registrantUserId?.toString() === userId.toString() && r.status !== 'cancelled',
      )
      return { isRegistered: Boolean(reg), status: reg?.status || 'not_registered', registrationId: reg?._id?.toString() }
    }
    case 'innovation_event': {
      const event = await InstitutionInnovationEvent.findById(sourceId).lean()
      const reg = event?.registrations?.find(
        (r) => r.registrantUserId && r.registrantUserId.toString() === userId.toString() && r.status !== 'cancelled',
      )
      return { isRegistered: Boolean(reg), status: reg?.status || 'not_registered', registrationId: reg?._id?.toString() }
    }
    case 'alumni_event': {
      const event = await InstitutionAlumniEvent.findById(sourceId).lean()
      const reg = event?.registrations?.find(
        (r) => r.registrantUserId && r.registrantUserId.toString() === userId.toString() && r.status !== 'cancelled',
      )
      return { isRegistered: Boolean(reg), status: reg?.status || 'not_registered', registrationId: reg?._id?.toString() }
    }
    case 'research_opportunity': {
      const app = await InstitutionResearchOpportunityApplication.findOne({
        applicantUserId: oid(userId),
        opportunityId: oid(sourceId),
        status: { $ne: 'withdrawn' },
      }).lean()
      return { isRegistered: Boolean(app), status: app?.status || 'not_registered', applicationId: app?._id?.toString() }
    }
    default:
      return { isRegistered: false, status: 'not_registered' }
  }
}

async function checkEligibility(userId, source, sourceId) {
  const ctx = await resolveStudentInstitution(userId)
  if (!ctx) {
    return { result: 'NOT_ELIGIBLE', checks: [{ category: 'institution', label: 'Institution link', status: 'fail', detail: 'No institution membership' }] }
  }

  if (source === 'campus_opportunity') {
    const opp = await CampusOpportunity.findById(sourceId).lean()
    if (!opp) throw err('Event not found', 404)
    const eligibility = buildEligibilityChecklist(ctx.student, opp.eligibilityRules || {})
    const checks = eligibility.checks || []
    const failed = checks.filter((c) => c.status === 'fail')
    const unknown = checks.filter((c) => c.status === 'unknown' || c.status === 'needs_review')
    let result = eligibility.result || 'ELIGIBLE'
    if (result === 'ELIGIBLE' && failed.length) result = 'NOT_ELIGIBLE'
    else if (result === 'ELIGIBLE' && unknown.length) result = 'NEEDS_REVIEW'
    return { result, checks }
  }

  if (source === 'research_opportunity') {
    const opp = await InstitutionResearchOpportunity.findById(sourceId).lean()
    if (!opp) throw err('Event not found', 404)
    const checks = []
    if (opp.eligibility?.minCgpa && ctx.student.cgpa !== null && ctx.student.cgpa < opp.eligibility.minCgpa) {
      checks.push({ category: 'cgpa', label: 'Minimum CGPA', status: 'fail', detail: `CGPA ${ctx.student.cgpa} below ${opp.eligibility.minCgpa}` })
    } else {
      checks.push({ category: 'cgpa', label: 'Minimum CGPA', status: 'pass', detail: 'Meets CGPA requirement or not specified' })
    }
    const failed = checks.filter((c) => c.status === 'fail')
    return { result: failed.length ? 'NOT_ELIGIBLE' : 'ELIGIBLE', checks }
  }

  return { result: 'ELIGIBLE', checks: [{ category: 'general', label: 'Open registration', status: 'pass', detail: 'No additional eligibility rules configured' }] }
}

async function register(userId, userName, userEmail, source, sourceId) {
  if (!EVENT_SOURCES.includes(source)) throw err('Invalid event source', 400)

  const record = await loadSourceRecord(source, sourceId)
  if (!record) throw err('Event not found', 404)

  const ctx = await resolveStudentInstitution(userId)
  if (!ctx || record.institutionId.toString() !== ctx.student.institutionId.toString()) {
    throw err('Event not found', 404)
  }

  if (!isRegistrationOpen(source, record)) {
    throw err('Registration is closed', 400)
  }
  if (await isRegistrationFullAsync(source, record)) {
    throw err('REGISTRATION FULL', 409)
  }

  const eligibility = await checkEligibility(userId, source, sourceId)
  if (eligibility.result === 'NOT_ELIGIBLE') {
    throw err('Not eligible for this event', 403)
  }

  const existing = await getRegistrationStatus(userId, source, sourceId)
  if (existing.isRegistered) throw err('Already registered', 409)

  switch (source) {
    case 'campus_opportunity': {
      const opp = await CampusOpportunity.findById(sourceId)
      if (!opp) throw err('Event not found', 404)
      if (opp.companyId) {
        await applyToOpportunity(userId, 'campus_opportunity', sourceId, {})
      } else {
        const existing = (opp.registrations || []).find(
          (r) => r.registrantUserId?.toString() === userId.toString() && r.status !== 'cancelled',
        )
        if (existing) throw err('Already registered', 409)
        opp.registrations.push({
          registrantUserId: userId,
          registrantName: userName || 'Participant',
          registrantEmail: userEmail || '',
          status: 'registered',
          registeredAt: new Date(),
        })
        await opp.save()
      }
      await notifySafe({
        recipientUserId: userId,
        recipientRole: 'student',
        type: 'event_registration_confirmed',
        title: 'Event registration confirmed',
        body: `You are registered for ${record.title}.`,
        metadata: { source, sourceId, campusOpportunityId: sourceId },
        idempotencyKey: `event_reg:${source}:${sourceId}:${userId}`,
      })
      break
    }
    case 'innovation_event':
      await registerInnovationEvent(userId, userName, userEmail, sourceId)
      break
    case 'alumni_event':
      await registerAlumniEvent(userId, userName, userEmail, sourceId)
      break
    case 'research_opportunity':
      await applyResearchOpportunity(userId, userName, sourceId, {})
      await notifySafe({
        recipientUserId: userId,
        recipientRole: 'student',
        type: 'research_opportunity_published',
        title: 'Research opportunity application submitted',
        body: `Your application for ${record.title} was submitted.`,
        metadata: { source, sourceId },
      })
      break
    default:
      throw err('Unsupported source', 400)
  }

  return getRegistrationStatus(userId, source, sourceId)
}

async function getMyEvents(userId) {
  const ctx = await resolveStudentInstitution(userId)
  if (!ctx) return { upcoming: [], registered: [], past: [], teamInvites: [], saved: [] }

  const now = new Date()
  const [campusApps, innovationRegs, alumniRegs, researchApps, saved, teams, submissions] = await Promise.all([
    RecruitmentApplication.find({ candidateUserId: oid(userId), campusOpportunityId: { $ne: null } }).lean(),
    InstitutionInnovationEvent.find({
      institutionId: ctx.student.institutionId,
      'registrations.registrantUserId': oid(userId),
    }).lean(),
    InstitutionAlumniEvent.find({
      institutionId: ctx.student.institutionId,
      'registrations.registrantUserId': oid(userId),
    }).lean(),
    InstitutionResearchOpportunityApplication.find({ applicantUserId: oid(userId) }).lean(),
    EventSaved.find({ userId: oid(userId) }).lean(),
    EventTeam.find({ 'members.userId': oid(userId), 'members.status': 'pending' }).lean(),
    EventSubmission.find({ submittedByUserId: oid(userId) }).lean(),
  ])

  const instName = ctx.institution?.name || ''
  const registered = []

  for (const app of campusApps) {
    const opp = await CampusOpportunity.findById(app.campusOpportunityId).lean()
    if (opp) registered.push({ ...normalizeCampus(opp, instName), registrationStatus: app.stage, applicationId: app._id.toString() })
  }
  const campusWithRegs = await CampusOpportunity.find({
    institutionId: ctx.student.institutionId,
    'registrations.registrantUserId': oid(userId),
  }).lean()
  for (const opp of campusWithRegs) {
    const reg = opp.registrations.find((r) => r.registrantUserId?.toString() === userId.toString())
    if (reg && !registered.some((e) => e.id === opp._id.toString() && e.source === 'campus_opportunity')) {
      registered.push({ ...normalizeCampus(opp, instName), registrationStatus: reg.status, registrationId: reg._id?.toString() })
    }
  }
  for (const event of innovationRegs) {
    const reg = event.registrations.find((r) => r.registrantUserId?.toString() === userId.toString())
    if (reg) registered.push({ ...normalizeInnovation(event, instName), registrationStatus: reg.status, registrationId: reg._id.toString() })
  }
  for (const event of alumniRegs) {
    const reg = event.registrations.find((r) => r.registrantUserId?.toString() === userId.toString())
    if (reg) registered.push({ ...normalizeAlumni(event, instName), registrationStatus: reg.status, registrationId: reg._id.toString() })
  }

  const upcoming = registered.filter((e) => !e.startDate || new Date(e.startDate) >= now)
  const past = registered.filter((e) => e.startDate && new Date(e.startDate) < now)

  const savedItems = []
  for (const s of saved) {
    try {
      const details = await getEventDetails(userId, s.source, s.sourceId.toString())
      savedItems.push(details)
    } catch {
      /* skip stale */
    }
  }

  return {
    upcoming,
    registered,
    past,
    teamInvites: teams.map((t) => ({ teamId: t._id.toString(), teamName: t.name, source: t.source, sourceId: t.sourceId.toString() })),
    submissions: submissions.map((s) => ({ id: s._id.toString(), title: s.title, status: s.status, source: s.source, sourceId: s.sourceId.toString(), submittedAt: s.submittedAt })),
    saved: savedItems,
  }
}

async function toggleSaved(userId, source, sourceId) {
  const existing = await EventSaved.findOne({ userId: oid(userId), source, sourceId: oid(sourceId) })
  if (existing) {
    await existing.deleteOne()
    return { saved: false }
  }
  await EventSaved.create({ userId: oid(userId), source, sourceId: oid(sourceId) })
  return { saved: true }
}

async function createTeam(userId, userName, source, sourceId, payload) {
  if (!EVENT_SOURCES.includes(source)) throw err('Invalid source', 400)
  const record = await loadSourceRecord(source, sourceId)
  if (!record) throw err('Event not found', 404)

  const normalized = source === 'campus_opportunity'
    ? normalizeCampus(record)
    : normalizeInnovation(record)
  if (!normalized.isHackathon) throw err('Teams are only supported for hackathons and competitions', 400)

  const registration = await getRegistrationStatus(userId, source, sourceId)
  if (!registration.isRegistered) throw err('Register for the event before creating a team', 403)

  const existing = await EventTeam.findOne({ source, sourceId: oid(sourceId), captainUserId: oid(userId) })
  if (existing) throw err('You already have a team for this event', 409)

  const details = record.hackathonDetails || {}
  const maxSize = details.teamSizeMax || 4

  const team = await EventTeam.create({
    source,
    sourceId: oid(sourceId),
    institutionId: record.institutionId,
    name: String(payload.name || `${userName}'s Team`).trim().slice(0, 120),
    captainUserId: oid(userId),
    track: payload.track || '',
    theme: payload.theme || '',
    members: [{ userId: oid(userId), name: userName, role: 'captain', status: 'accepted', respondedAt: new Date() }],
    status: 'forming',
  })

  if (team.members.length > maxSize) throw err(`Team size cannot exceed ${maxSize}`, 400)
  return team
}

async function inviteTeamMember(captainUserId, teamId, inviteeUserId, inviteeName) {
  const team = await EventTeam.findById(teamId)
  if (!team) throw err('Team not found', 404)
  if (team.captainUserId.toString() !== captainUserId.toString()) throw err('Only team captain can invite members', 403)

  const record = await loadSourceRecord(team.source, team.sourceId)
  const maxSize = record?.hackathonDetails?.teamSizeMax || 4
  if (team.members.length >= maxSize) throw err('REGISTRATION FULL — team at capacity', 409)

  const existing = team.members.find((m) => m.userId.toString() === inviteeUserId.toString())
  if (existing) throw err('User already on team or invited', 409)

  team.members.push({ userId: oid(inviteeUserId), name: inviteeName, role: 'member', status: 'pending' })
  await team.save()

  await notifySafe({
    recipientUserId: inviteeUserId,
    recipientRole: 'student',
    type: 'event_team_invitation',
    title: 'Hackathon team invitation',
    body: `You were invited to join team "${team.name}".`,
    metadata: { teamId: team._id.toString(), source: team.source, sourceId: team.sourceId.toString() },
    idempotencyKey: `team_invite:${team._id}:${inviteeUserId}`,
  })

  return team
}

async function respondTeamInvite(userId, teamId, accept) {
  const team = await EventTeam.findById(teamId)
  if (!team) throw err('Team not found', 404)
  const member = team.members.find((m) => m.userId.toString() === userId.toString() && m.status === 'pending')
  if (!member) throw err('No pending invitation found', 404)

  member.status = accept ? 'accepted' : 'declined'
  member.respondedAt = new Date()
  if (accept) team.status = 'ready'
  await team.save()
  return team
}

async function submitProject(userId, source, sourceId, payload) {
  const record = await loadSourceRecord(source, sourceId)
  if (!record) throw err('Event not found', 404)

  const details = record.hackathonDetails || {}
  if (details.submissionDeadline && new Date(details.submissionDeadline) < new Date()) {
    throw err('Submission deadline has passed', 400)
  }

  let team = null
  if (payload.teamId) {
    team = await EventTeam.findById(payload.teamId)
    if (!team) throw err('Team not found', 404)
    const isMember = team.members.some(
      (m) => m.userId.toString() === userId.toString() && m.status === 'accepted',
    )
    if (!isMember) throw err('Not a team member', 403)
  }

  const existing = team
    ? await EventSubmission.findOne({ teamId: team._id })
    : await EventSubmission.findOne({ source, sourceId: oid(sourceId), submittedByUserId: oid(userId) })

  const data = {
    source,
    sourceId: oid(sourceId),
    institutionId: record.institutionId,
    teamId: team?._id || null,
    submittedByUserId: oid(userId),
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    repositoryUrl: payload.repositoryUrl || '',
    demoUrl: payload.demoUrl || '',
    presentationUrl: payload.presentationUrl || '',
    documentationUrl: payload.documentationUrl || '',
    linkedProjectId: payload.linkedProjectId || null,
    status: payload.submit ? 'submitted' : 'draft',
    submittedAt: payload.submit ? new Date() : null,
    isPublic: Boolean(payload.isPublic),
  }

  if (!data.title) throw err('Submission title is required', 400)

  if (existing) {
    Object.assign(existing, data)
    await existing.save()
    return existing
  }

  return EventSubmission.create(data)
}

async function setSubmissionResult(institutionId, submissionId, actorUserId, result, resultNotes = '') {
  const submission = await EventSubmission.findOne({ _id: submissionId, institutionId: oid(institutionId) })
  if (!submission) throw err('Submission not found', 404)
  submission.result = result
  submission.resultNotes = resultNotes
  submission.organizerSetResult = true
  await submission.save()
  return submission
}

async function getOrganizerDashboard(institutionId, filters = {}) {
  const iid = oid(institutionId)
  const [campus, innovation, alumni, teams, submissions] = await Promise.all([
    CampusOpportunity.find({ institutionId: iid, opportunityType: { $in: ['hackathon', 'training', 'campus_drive'] } }).lean(),
    InstitutionInnovationEvent.find({ institutionId: iid }).lean(),
    InstitutionAlumniEvent.find({ institutionId: iid }).lean(),
    EventTeam.find({ institutionId: iid }).lean(),
    EventSubmission.find({ institutionId: iid }).lean(),
  ])

  const events = [
    ...campus.map((r) => normalizeCampus(r)),
    ...innovation.map((r) => normalizeInnovation(r)),
    ...alumni.map((r) => normalizeAlumni(r)),
  ]

  return {
    events: events.filter((e) => !filters.status || e.status === filters.status),
    totals: {
      events: events.length,
      registrations: innovation.reduce((s, e) => s + (e.registrations?.length || 0), 0)
        + alumni.reduce((s, e) => s + (e.registrations?.length || 0), 0),
      teams: teams.length,
      submissions: submissions.length,
    },
    teams,
    submissions,
  }
}

async function buildAiContext(userId) {
  const [browse, profile, my] = await Promise.all([
    browseEvents(userId, { limit: 10 }),
    UserProfile.findOne({ userId: oid(userId) }).lean(),
    getMyEvents(userId),
  ])
  return {
    availableEvents: browse.items,
    skills: profile?.skills || [],
    registeredCount: my.registered.length,
    upcomingCount: my.upcoming.length,
  }
}

module.exports = {
  browseEvents,
  getEventDetails,
  checkEligibility,
  register,
  getRegistrationStatus,
  getMyEvents,
  toggleSaved,
  createTeam,
  inviteTeamMember,
  respondTeamInvite,
  submitProject,
  setSubmissionResult,
  getOrganizerDashboard,
  buildAiContext,
  normalizeCampus,
  normalizeInnovation,
  loadSourceRecord,
  isRegistrationOpen,
}
