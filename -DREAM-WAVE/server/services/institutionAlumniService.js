const mongoose = require('mongoose')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const InstitutionAlumniConnection = require('../models/InstitutionAlumniConnection')
const InstitutionAlumniGroup = require('../models/InstitutionAlumniGroup')
const InstitutionAlumniMentorship = require('../models/InstitutionAlumniMentorship')
const InstitutionAlumniMentorshipSession = require('../models/InstitutionAlumniMentorshipSession')
const InstitutionAlumniCareerContribution = require('../models/InstitutionAlumniCareerContribution')
const InstitutionStudent = require('../models/InstitutionStudent')
const {
  normalizeEmail,
  MENTORSHIP_STATUSES,
  CONNECTION_STATUSES,
} = require('../constants/institutionAlumni')
const { notifyUser } = require('./platformNotificationService')

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

async function paginate(Model, query, { page = 1, limit = 20, sort = '-createdAt', sortField, sortDir } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip = (safePage - 1) * safeLimit
  let sortObj = { createdAt: -1 }
  if (sortField) {
    sortObj = { [sortField]: sortDir === 'asc' ? 1 : -1 }
  } else if (sort) {
    sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 }
  }

  const [items, total] = await Promise.all([
    Model.find(query).sort(sortObj).skip(skip).limit(safeLimit).lean(),
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

function recordProfileHistory(alumni, action, actorUserId, description) {
  alumni.profileHistory.push({
    action,
    description: sanitize(description),
    actorUserId,
    at: new Date(),
  })
}

function buildAlumniSearchQuery(institutionId, filters = {}) {
  const query = { institutionId: oid(institutionId), status: filters.status || 'active' }
  if (filters.department) query.department = new RegExp(String(filters.department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.graduationYear) query.graduationYear = String(filters.graduationYear)
  if (filters.company) query.currentCompany = new RegExp(String(filters.company).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.industry) query.industry = filters.industry
  if (filters.role) query.currentRole = new RegExp(String(filters.role).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.location) query['location.city'] = new RegExp(String(filters.location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.skill) query.skills = new RegExp(String(filters.skill).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (filters.higherEducation) {
    query['higherEducation.degree'] = new RegExp(String(filters.higherEducation).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }
  if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus
  if (filters.isMentorAvailable === 'true') query.isMentorAvailable = true
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [
      { fullName: regex },
      { currentCompany: regex },
      { currentRole: regex },
      { department: regex },
      { professionalSummary: regex },
    ]
  }
  return query
}

function sanitizePublicAlumni(alumni) {
  const copy = { ...alumni }
  if (copy.contactPreference === 'none') {
    delete copy.email
    delete copy.phone
  }
  if (copy.profileVisibility === 'private') {
    delete copy.email
    delete copy.phone
    delete copy.socialLinks
  }
  return copy
}

async function getAlumniStats(institutionId) {
  const cid = oid(institutionId)
  const [alumni, mentors, mentorships, connections, groups, contributions, sessions] = await Promise.all([
    InstitutionAlumni.find({ institutionId: cid }).select('verificationStatus department graduationYear industry isMentorAvailable').lean(),
    InstitutionAlumni.countDocuments({ institutionId: cid, isMentorAvailable: true, status: 'active' }),
    InstitutionAlumniMentorship.find({ institutionId: cid }).select('status').lean(),
    InstitutionAlumniConnection.find({ institutionId: cid }).select('status connectionType').lean(),
    InstitutionAlumniGroup.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionAlumniCareerContribution.find({ institutionId: cid }).select('contributionType status participantCount').lean(),
    InstitutionAlumniMentorshipSession.countDocuments({ institutionId: cid, status: 'completed' }),
  ])

  return {
    totalAlumni: alumni.length,
    verifiedAlumni: alumni.filter((a) => a.verificationStatus === 'verified').length,
    mentorAvailable: mentors,
    activeMentorships: mentorships.filter((m) => ['matched', 'active'].includes(m.status)).length,
    completedMentorships: mentorships.filter((m) => m.status === 'completed').length,
    pendingMentorshipRequests: mentorships.filter((m) => m.status === 'requested').length,
    totalConnections: connections.filter((c) => c.status === 'accepted').length,
    pendingConnections: connections.filter((c) => c.status === 'pending').length,
    activeGroups: groups,
    careerContributions: contributions.length,
    openOpportunities: contributions.filter((c) => c.status === 'open').length,
    totalCareerParticipants: contributions.reduce((sum, c) => sum + (c.participantCount || 0), 0),
    completedMentorshipSessions: sessions,
    byDepartment: alumni.reduce((acc, a) => {
      const key = a.department || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
    byGraduationYear: alumni.reduce((acc, a) => {
      const key = a.graduationYear || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
    byIndustry: alumni.reduce((acc, a) => {
      acc[a.industry || 'other'] = (acc[a.industry || 'other'] || 0) + 1
      return acc
    }, {}),
    hasData: alumni.length > 0 || groups > 0 || contributions.length > 0,
  }
}

async function getAlumniWorkspace(institutionId) {
  const stats = await getAlumniStats(institutionId)
  const cid = oid(institutionId)
  const [recentAlumni, pendingMentorships, recentContributions, activeGroups] = await Promise.all([
    InstitutionAlumni.find({ institutionId: cid }).sort({ updatedAt: -1 }).limit(5).lean(),
    InstitutionAlumniMentorship.find({ institutionId: cid, status: 'requested' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('alumniId', 'fullName currentCompany')
      .lean(),
    InstitutionAlumniCareerContribution.find({ institutionId: cid, status: 'open' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('alumniId', 'fullName')
      .lean(),
    InstitutionAlumniGroup.find({ institutionId: cid, status: 'active' })
      .sort({ memberCount: -1 })
      .limit(5)
      .lean(),
  ])
  return { stats, recentAlumni, pendingMentorships, recentContributions, activeGroups }
}

async function listAlumni(institutionId, filters = {}, pagination = {}) {
  const query = buildAlumniSearchQuery(institutionId, filters)
  return paginate(InstitutionAlumni, query, pagination)
}

async function getAlumni(institutionId, alumniId) {
  const alumni = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    _id: alumniId,
  }).lean()
  if (!alumni) throw err('Alumni profile not found', 404)
  return alumni
}

async function createAlumni(institutionId, actorUserId, payload) {
  if (!payload.fullName) throw err('Full name is required')

  if (payload.email) {
    const normalized = normalizeEmail(payload.email)
    const existing = await InstitutionAlumni.findOne({ institutionId: oid(institutionId), emailNormalized: normalized })
    if (existing) throw err('An alumni record with this email already exists', 409)
  }

  if (payload.linkedStudentId) {
    const dup = await InstitutionAlumni.findOne({
      institutionId: oid(institutionId),
      linkedStudentId: payload.linkedStudentId,
    })
    if (dup) throw err('This student already has an alumni profile', 409)
  }

  const alumni = await InstitutionAlumni.create({
    institutionId: oid(institutionId),
    linkedUserId: payload.linkedUserId || null,
    linkedStudentId: payload.linkedStudentId || null,
    fullName: sanitize(payload.fullName, 200),
    email: sanitize(payload.email, 200),
    phone: sanitize(payload.phone, 50),
    graduationYear: sanitize(payload.graduationYear, 10),
    department: sanitize(payload.department, 200),
    degree: sanitize(payload.degree, 200),
    currentCompany: sanitize(payload.currentCompany, 200),
    currentRole: sanitize(payload.currentRole, 200),
    industry: payload.industry || 'other',
    skills: payload.skills || [],
    location: payload.location || {},
    professionalSummary: sanitize(payload.professionalSummary),
    contactPreference: payload.contactPreference || 'platform_message',
    socialLinks: payload.socialLinks || {},
    verificationStatus: payload.verificationStatus || 'pending',
    profileVisibility: payload.profileVisibility || 'institution',
    careerHistory: payload.careerHistory || [],
    education: payload.education || [],
    higherEducation: payload.higherEducation || {},
    certifications: payload.certifications || [],
    achievements: payload.achievements || [],
    awards: payload.awards || [],
    publications: payload.publications || [],
    portfolioLinks: payload.portfolioLinks || [],
    resumeUrl: sanitize(payload.resumeUrl, 500),
    isMentorAvailable: Boolean(payload.isMentorAvailable),
    status: payload.status || 'active',
    profileHistory: [{
      action: 'profile_created',
      description: `Alumni profile created: ${payload.fullName}`,
      actorUserId,
      at: new Date(),
    }],
    createdByUserId: actorUserId,
  })

  return alumni
}

async function createAlumniFromStudent(institutionId, studentId, actorUserId) {
  const student = await InstitutionStudent.findOne({
    institutionId: oid(institutionId),
    _id: studentId,
  }).lean()
  if (!student) throw err('Student record not found', 404)

  const existing = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    linkedStudentId: studentId,
  })
  if (existing) throw err('Alumni profile already exists for this student', 409)

  return createAlumni(institutionId, actorUserId, {
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    graduationYear: student.batch || student.expectedGraduation || '',
    department: student.department,
    degree: student.course,
    linkedUserId: student.linkedUserId,
    linkedStudentId: student._id,
    skills: [...(student.sharedSkills || []), ...(student.verifiedSkills || [])],
    location: { city: student.city, state: student.state, country: student.country },
    verificationStatus: student.status === 'graduated' ? 'verified' : 'pending',
  })
}

async function updateAlumni(institutionId, alumniId, actorUserId, payload) {
  const alumni = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    _id: alumniId,
  })
  if (!alumni) throw err('Alumni profile not found', 404)

  if (payload.email && normalizeEmail(payload.email) !== alumni.emailNormalized) {
    const normalized = normalizeEmail(payload.email)
    const dup = await InstitutionAlumni.findOne({
      institutionId: oid(institutionId),
      emailNormalized: normalized,
      _id: { $ne: alumniId },
    })
    if (dup) throw err('An alumni record with this email already exists', 409)
    alumni.email = sanitize(payload.email, 200)
    alumni.emailNormalized = normalized
  }

  const allowed = [
    'fullName', 'phone', 'graduationYear', 'department', 'degree',
    'currentCompany', 'currentRole', 'industry', 'skills', 'location',
    'professionalSummary', 'contactPreference', 'socialLinks', 'profileVisibility',
    'careerHistory', 'education', 'higherEducation', 'certifications',
    'achievements', 'awards', 'publications', 'portfolioLinks', 'resumeUrl',
    'isMentorAvailable', 'status', 'linkedUserId',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) alumni[key] = payload[key]
  }

  recordProfileHistory(alumni, 'profile_updated', actorUserId, `Profile updated: ${alumni.fullName}`)
  await alumni.save()
  return alumni
}

async function verifyAlumni(institutionId, alumniId, actorUserId, verificationStatus) {
  const alumni = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    _id: alumniId,
  })
  if (!alumni) throw err('Alumni profile not found', 404)
  alumni.verificationStatus = verificationStatus
  recordProfileHistory(alumni, 'verification_updated', actorUserId, `Verification set to ${verificationStatus}`)
  await alumni.save()

  if (alumni.linkedUserId) {
    await notifySafe({
      recipientUserId: alumni.linkedUserId,
      recipientRole: 'student',
      type: 'alumni_profile_verified',
      title: 'Alumni profile verified',
      body: `Your alumni profile at ${alumni.currentCompany || 'your institution'} has been ${verificationStatus}.`,
      metadata: { alumniId: alumni._id.toString() },
    })
  }

  return alumni
}

async function listConnections(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.status) query.status = filters.status
  if (filters.connectionType) query.connectionType = filters.connectionType
  if (filters.alumniId) {
    query.$or = [{ fromAlumniId: oid(filters.alumniId) }, { toAlumniId: oid(filters.alumniId) }]
  }
  return paginate(InstitutionAlumniConnection, query, pagination)
}

async function createConnectionRequest(institutionId, fromAlumniId, actorUserId, payload) {
  if (!payload.toAlumniId && !payload.toUserId) {
    throw err('Connection target is required')
  }
  if (payload.toAlumniId && String(fromAlumniId) === String(payload.toAlumniId)) {
    throw err('Cannot connect to yourself', 400)
  }

  const existing = await InstitutionAlumniConnection.findOne({
    institutionId: oid(institutionId),
    fromAlumniId,
    toAlumniId: payload.toAlumniId || null,
    status: { $in: ['pending', 'accepted'] },
  })
  if (existing) throw err('Connection request already exists', 409)

  const connection = await InstitutionAlumniConnection.create({
    institutionId: oid(institutionId),
    fromAlumniId,
    toAlumniId: payload.toAlumniId || null,
    toUserId: payload.toUserId || null,
    connectionType: payload.connectionType || 'professional',
    message: sanitize(payload.message),
    initiatedByUserId: actorUserId,
  })

  if (payload.toAlumniId) {
    const target = await InstitutionAlumni.findById(payload.toAlumniId)
    if (target?.linkedUserId) {
      await notifySafe({
        recipientUserId: target.linkedUserId,
        recipientRole: 'student',
        type: 'alumni_connection_request',
        title: 'New alumni connection request',
        body: payload.message || 'You have received a professional networking invitation.',
        metadata: { connectionId: connection._id.toString() },
      })
    }
  }

  return connection
}

async function respondToConnection(institutionId, connectionId, status, actorUserId) {
  if (!CONNECTION_STATUSES.includes(status) || status === 'pending') {
    throw err('Invalid connection response status')
  }
  const connection = await InstitutionAlumniConnection.findOne({
    institutionId: oid(institutionId),
    _id: connectionId,
  })
  if (!connection) throw err('Connection not found', 404)
  connection.status = status
  connection.respondedAt = new Date()
  await connection.save()
  return connection
}

async function listGroups(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.groupType) query.groupType = filters.groupType
  if (filters.status) query.status = filters.status
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ name: regex }, { description: regex }]
  }
  return paginate(InstitutionAlumniGroup, query, pagination)
}

async function createGroup(institutionId, actorUserId, payload) {
  if (!payload.name) throw err('Group name is required')
  const normalized = String(payload.name).trim().toLowerCase().replace(/\s+/g, ' ')
  const existing = await InstitutionAlumniGroup.findOne({ institutionId: oid(institutionId), nameNormalized: normalized })
  if (existing) throw err('A group with this name already exists', 409)

  return InstitutionAlumniGroup.create({
    institutionId: oid(institutionId),
    name: sanitize(payload.name, 200),
    description: sanitize(payload.description),
    groupType: payload.groupType || 'interest',
    chapterLocation: sanitize(payload.chapterLocation, 200),
    interestTags: payload.interestTags || [],
    memberIds: payload.memberIds || [],
    memberCount: (payload.memberIds || []).length,
    status: payload.status || 'active',
    createdByUserId: actorUserId,
  })
}

async function addGroupMember(institutionId, groupId, alumniId) {
  const group = await InstitutionAlumniGroup.findOne({ institutionId: oid(institutionId), _id: groupId })
  if (!group) throw err('Group not found', 404)
  const alumni = await InstitutionAlumni.findOne({ institutionId: oid(institutionId), _id: alumniId })
  if (!alumni) throw err('Alumni not found', 404)
  if (!group.memberIds.some((id) => id.toString() === alumniId)) {
    group.memberIds.push(alumniId)
    group.memberCount = group.memberIds.length
    await group.save()
  }
  return group
}

async function listMentorships(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.status) query.status = filters.status
  if (filters.alumniId) query.alumniId = oid(filters.alumniId)
  if (filters.studentUserId) query.studentUserId = oid(filters.studentUserId)
  return paginate(InstitutionAlumniMentorship, query, pagination)
}

async function requestMentorship(actorUserId, actorName, payload) {
  if (!payload.alumniId) throw err('Alumni mentor is required')
  const student = await InstitutionStudent.findOne({ linkedUserId: actorUserId }).lean()
  if (!student) throw err('Institution membership required to request mentorship', 403)
  const institutionId = student.institutionId

  const alumni = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    _id: payload.alumniId,
    isMentorAvailable: true,
    status: 'active',
  })
  if (!alumni) throw err('Mentor alumni profile not found or not available', 404)

  const existing = await InstitutionAlumniMentorship.findOne({
    institutionId: oid(institutionId),
    alumniId: payload.alumniId,
    studentUserId: actorUserId,
    status: { $in: ['requested', 'matched', 'active'] },
  })
  if (existing) throw err('An active mentorship request already exists', 409)

  const mentorship = await InstitutionAlumniMentorship.create({
    institutionId: oid(institutionId),
    alumniId: payload.alumniId,
    studentUserId: actorUserId,
    studentName: sanitize(actorName, 100),
    studentDepartment: sanitize(payload.studentDepartment, 200),
    goals: payload.goals || [],
    requestMessage: sanitize(payload.requestMessage),
    status: 'requested',
    createdByUserId: actorUserId,
  })

  if (alumni.linkedUserId) {
    await notifySafe({
      recipientUserId: alumni.linkedUserId,
      recipientRole: 'student',
      type: 'alumni_mentorship_request',
      title: 'New mentorship request',
      body: `${actorName} requested mentorship guidance.`,
      metadata: { mentorshipId: mentorship._id.toString() },
    })
  }

  return mentorship
}

async function updateMentorshipStatus(institutionId, mentorshipId, status, actorUserId) {
  if (!MENTORSHIP_STATUSES.includes(status)) throw err('Invalid mentorship status')
  const mentorship = await InstitutionAlumniMentorship.findOne({
    institutionId: oid(institutionId),
    _id: mentorshipId,
  })
  if (!mentorship) throw err('Mentorship not found', 404)

  mentorship.status = status
  if (status === 'matched' || status === 'active') mentorship.matchedAt = new Date()
  if (status === 'completed') mentorship.completedAt = new Date()
  await mentorship.save()

  await notifySafe({
    recipientUserId: mentorship.studentUserId,
    recipientRole: 'student',
    type: 'alumni_mentorship_updated',
    title: 'Mentorship status updated',
    body: `Your mentorship request is now ${status.replace(/_/g, ' ')}.`,
    metadata: { mentorshipId: mentorship._id.toString(), status },
  })

  return mentorship
}

async function addMentorshipFeedback(institutionId, mentorshipId, feedback) {
  const mentorship = await InstitutionAlumniMentorship.findOne({
    institutionId: oid(institutionId),
    _id: mentorshipId,
  })
  if (!mentorship) throw err('Mentorship not found', 404)
  mentorship.feedback.push({
    rating: feedback.rating ?? null,
    notes: sanitize(feedback.notes),
    fromRole: feedback.fromRole || 'student',
    submittedAt: new Date(),
  })
  await mentorship.save()
  return mentorship
}

async function listMentorshipSessions(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.mentorshipId) query.mentorshipId = oid(filters.mentorshipId)
  if (filters.alumniId) query.alumniId = oid(filters.alumniId)
  if (filters.status) query.status = filters.status
  return paginate(InstitutionAlumniMentorshipSession, query, pagination)
}

async function scheduleMentorshipSession(institutionId, actorUserId, payload) {
  if (!payload.mentorshipId || !payload.scheduledDate) {
    throw err('Mentorship and scheduled date are required')
  }
  const mentorship = await InstitutionAlumniMentorship.findOne({
    institutionId: oid(institutionId),
    _id: payload.mentorshipId,
    status: { $in: ['matched', 'active'] },
  })
  if (!mentorship) throw err('Active mentorship not found', 404)

  const session = await InstitutionAlumniMentorshipSession.create({
    institutionId: oid(institutionId),
    mentorshipId: payload.mentorshipId,
    alumniId: mentorship.alumniId,
    scheduledDate: payload.scheduledDate,
    durationMinutes: payload.durationMinutes ?? 60,
    goals: payload.goals || mentorship.goals || [],
    createdByUserId: actorUserId,
  })

  await notifySafe({
    recipientUserId: mentorship.studentUserId,
    recipientRole: 'student',
    type: 'alumni_mentorship_session_scheduled',
    title: 'Mentorship session scheduled',
    body: `A mentorship session has been scheduled for ${new Date(payload.scheduledDate).toLocaleDateString()}.`,
    metadata: { sessionId: session._id.toString() },
  })

  return session
}

async function completeMentorshipSession(institutionId, sessionId, payload) {
  const session = await InstitutionAlumniMentorshipSession.findOne({
    institutionId: oid(institutionId),
    _id: sessionId,
  })
  if (!session) throw err('Session not found', 404)
  session.status = 'completed'
  if (payload.notes !== undefined) session.notes = sanitize(payload.notes)
  if (payload.feedback !== undefined) session.feedback = sanitize(payload.feedback)
  await session.save()
  return session
}

async function listCareerContributions(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.contributionType) query.contributionType = filters.contributionType
  if (filters.status) query.status = filters.status
  if (filters.alumniId) query.alumniId = oid(filters.alumniId)
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: regex }, { company: regex }, { description: regex }]
  }
  return paginate(InstitutionAlumniCareerContribution, query, pagination)
}

async function createCareerContribution(institutionId, actorUserId, payload) {
  if (!payload.alumniId || !payload.contributionType || !payload.title) {
    throw err('Alumni, contribution type, and title are required')
  }
  const alumni = await InstitutionAlumni.findOne({
    institutionId: oid(institutionId),
    _id: payload.alumniId,
  })
  if (!alumni) throw err('Alumni not found', 404)

  return InstitutionAlumniCareerContribution.create({
    institutionId: oid(institutionId),
    alumniId: payload.alumniId,
    contributionType: payload.contributionType,
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    company: sanitize(payload.company, 200),
    role: sanitize(payload.role, 200),
    location: sanitize(payload.location, 200),
    applicationUrl: sanitize(payload.applicationUrl, 500),
    status: payload.status || 'open',
    createdByUserId: actorUserId,
  })
}

async function updateCareerContribution(institutionId, contributionId, payload) {
  const record = await InstitutionAlumniCareerContribution.findOne({
    institutionId: oid(institutionId),
    _id: contributionId,
  })
  if (!record) throw err('Career contribution not found', 404)
  const allowed = ['title', 'description', 'company', 'role', 'location', 'applicationUrl', 'status', 'participantCount']
  for (const key of allowed) {
    if (payload[key] !== undefined) record[key] = payload[key]
  }
  await record.save()
  return record
}

async function browseAlumniDirectory(userId, filters = {}, pagination = {}) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student) throw err('Institution membership required to browse alumni directory', 403)

  const query = buildAlumniSearchQuery(student.institutionId, {
    ...filters,
    verificationStatus: 'verified',
    status: 'active',
  })
  query.profileVisibility = { $in: ['public', 'institution'] }

  const result = await paginate(InstitutionAlumni, query, pagination)
  result.items = result.items.map(sanitizePublicAlumni)
  return result
}

async function browseCareerOpportunities(userId, filters = {}, pagination = {}) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student) throw err('Institution membership required', 403)

  const query = {
    institutionId: student.institutionId,
    status: 'open',
  }
  if (filters.contributionType) query.contributionType = filters.contributionType
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: regex }, { company: regex }]
  }
  return paginate(InstitutionAlumniCareerContribution, query, pagination)
}

module.exports = {
  getAlumniStats,
  getAlumniWorkspace,
  listAlumni,
  getAlumni,
  createAlumni,
  createAlumniFromStudent,
  updateAlumni,
  verifyAlumni,
  listConnections,
  createConnectionRequest,
  respondToConnection,
  listGroups,
  createGroup,
  addGroupMember,
  listMentorships,
  requestMentorship,
  updateMentorshipStatus,
  addMentorshipFeedback,
  listMentorshipSessions,
  scheduleMentorshipSession,
  completeMentorshipSession,
  listCareerContributions,
  createCareerContribution,
  updateCareerContribution,
  browseAlumniDirectory,
  browseCareerOpportunities,
}
