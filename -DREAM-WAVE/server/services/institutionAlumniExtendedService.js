const mongoose = require('mongoose')
const InstitutionAlumni = require('../models/InstitutionAlumni')
const InstitutionAlumniEvent = require('../models/InstitutionAlumniEvent')
const InstitutionAlumniInstitutionalContribution = require('../models/InstitutionAlumniInstitutionalContribution')
const InstitutionAlumniGroup = require('../models/InstitutionAlumniGroup')
const InstitutionAlumniGroupPost = require('../models/InstitutionAlumniGroupPost')
const InstitutionAlumniGroupMembershipRequest = require('../models/InstitutionAlumniGroupMembershipRequest')
const InstitutionAlumniConversation = require('../models/InstitutionAlumniConversation')
const InstitutionAlumniMessage = require('../models/InstitutionAlumniMessage')
const InstitutionAlumniCareerContribution = require('../models/InstitutionAlumniCareerContribution')
const InstitutionAlumniCareerApplication = require('../models/InstitutionAlumniCareerApplication')
const InstitutionAlumniVolunteerRecord = require('../models/InstitutionAlumniVolunteerRecord')
const InstitutionAlumniAuditLog = require('../models/InstitutionAlumniAuditLog')
const InstitutionAlumniMentorship = require('../models/InstitutionAlumniMentorship')
const InstitutionAlumniConnection = require('../models/InstitutionAlumniConnection')
const InstitutionStudent = require('../models/InstitutionStudent')
const { recordAlumniAudit } = require('./institutionAlumniAuditService')
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
  if (sortField) sortObj = { [sortField]: sortDir === 'asc' ? 1 : -1 }
  else if (sort) sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 }

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

async function auditSafe(payload) {
  try {
    await recordAlumniAudit(payload)
  } catch {
    /* non-blocking */
  }
}

// ─── Engagement Analytics ───────────────────────────────────────────────────

async function getEngagementAnalytics(institutionId) {
  const cid = oid(institutionId)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

  const [
    alumni,
    newAlumni,
    mentors,
    mentorships,
    events,
    publishedEvents,
    groups,
    connections,
    careerContributions,
    careerApplications,
    institutionalContributions,
    volunteers,
    posts,
  ] = await Promise.all([
    InstitutionAlumni.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionAlumni.countDocuments({ institutionId: cid, createdAt: { $gte: thirtyDaysAgo } }),
    InstitutionAlumni.countDocuments({ institutionId: cid, isMentorAvailable: true, status: 'active' }),
    InstitutionAlumniMentorship.find({ institutionId: cid }).select('status').lean(),
    InstitutionAlumniEvent.find({ institutionId: cid }).select('status registrations').lean(),
    InstitutionAlumniEvent.countDocuments({ institutionId: cid, status: { $in: ['published', 'completed'] } }),
    InstitutionAlumniGroup.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionAlumniConnection.countDocuments({ institutionId: cid, status: 'accepted' }),
    InstitutionAlumniCareerContribution.find({ institutionId: cid }).select('status participantCount contributionType').lean(),
    InstitutionAlumniCareerApplication.countDocuments({ institutionId: cid }),
    InstitutionAlumniInstitutionalContribution.find({ institutionId: cid }).select('approvalStatus amount').lean(),
    InstitutionAlumniVolunteerRecord.find({ institutionId: cid }).select('status hoursContributed').lean(),
    InstitutionAlumniGroupPost.countDocuments({ institutionId: cid }),
  ])

  const totalDonations = institutionalContributions
    .filter((c) => ['approved', 'disbursed'].includes(c.approvalStatus))
    .reduce((sum, c) => sum + (c.amount || 0), 0)

  const eventRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0)

  return {
    activeAlumni: alumni,
    newRegistrations: newAlumni,
    mentorParticipation: mentors,
    activeMentorships: mentorships.filter((m) => ['matched', 'active'].includes(m.status)).length,
    completedMentorships: mentorships.filter((m) => m.status === 'completed').length,
    eventsConducted: publishedEvents,
    totalEventRegistrations: eventRegistrations,
    communityGrowth: groups,
    discussionPosts: posts,
    referralActivity: careerContributions.filter((c) =>
      ['job_referral', 'internship_referral', 'startup_hiring', 'freelance_opportunity', 'contract_position'].includes(c.contributionType),
    ).length,
    openReferrals: careerContributions.filter((c) => c.status === 'open').length,
    careerApplications,
    donationsReceived: totalDonations,
    institutionalContributions: institutionalContributions.length,
    volunteerParticipation: volunteers.filter((v) => v.status === 'completed').length,
    totalVolunteerHours: volunteers.reduce((sum, v) => sum + (v.hoursContributed || 0), 0),
    totalConnections: connections,
    hasData: alumni > 0 || events.length > 0 || groups > 0,
  }
}

// ─── Events ─────────────────────────────────────────────────────────────────

async function listEvents(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.eventType) query.eventType = filters.eventType
  if (filters.status) query.status = filters.status
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: regex }, { description: regex }, { organizer: regex }]
  }
  return paginate(InstitutionAlumniEvent, query, pagination)
}

async function createEvent(institutionId, actorUserId, payload) {
  if (!payload.title || !payload.eventType || !payload.startDate) {
    throw err('Title, event type, and start date are required')
  }
  const event = await InstitutionAlumniEvent.create({
    institutionId: oid(institutionId),
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    eventType: payload.eventType,
    organizer: sanitize(payload.organizer, 200),
    organizerAlumniId: payload.organizerAlumniId || null,
    venue: sanitize(payload.venue, 300),
    mode: payload.mode || 'offline',
    onlinePlatform: sanitize(payload.onlinePlatform, 200),
    meetingLink: sanitize(payload.meetingLink, 500),
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    registrationDeadline: payload.registrationDeadline || null,
    capacity: payload.capacity ?? null,
    speakers: payload.speakers || [],
    agenda: payload.agenda || [],
    linkedGroupId: payload.linkedGroupId || null,
    status: payload.status || 'draft',
    createdByUserId: actorUserId,
  })
  await auditSafe({
    institutionId,
    action: 'event_created',
    actorUserId,
    description: `Alumni event created: ${payload.title}`,
    metadata: { eventId: event._id.toString() },
  })
  return event
}

async function publishEvent(institutionId, eventId, actorUserId) {
  const event = await InstitutionAlumniEvent.findOne({ institutionId: oid(institutionId), _id: eventId })
  if (!event) throw err('Event not found', 404)
  event.status = 'published'
  event.publishedAt = new Date()
  await event.save()
  await auditSafe({
    institutionId,
    action: 'event_published',
    actorUserId,
    description: `Alumni event published: ${event.title}`,
    metadata: { eventId: event._id.toString() },
  })
  return event
}

async function registerForEvent(userId, userName, userEmail, eventId) {
  const event = await InstitutionAlumniEvent.findOne({ _id: eventId, status: 'published' })
  if (!event) throw err('Published event not found', 404)
  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    throw err('Registration deadline has passed', 400)
  }
  if (event.capacity && event.registrations.length >= event.capacity) {
    throw err('Event is at full capacity', 409)
  }
  const existing = event.registrations.find((r) => r.registrantUserId?.toString() === userId.toString())
  if (existing) throw err('Already registered', 409)

  const alumni = await InstitutionAlumni.findOne({ linkedUserId: userId, institutionId: event.institutionId }).lean()
  event.registrations.push({
    registrantUserId: userId,
    registrantAlumniId: alumni?._id || null,
    registrantName: userName,
    registrantEmail: userEmail || '',
    registrantType: alumni ? 'alumni' : 'student',
  })
  await event.save()

  await auditSafe({
    institutionId: event.institutionId,
    action: 'event_registration',
    actorUserId: userId,
    description: `Registered for event: ${event.title}`,
    metadata: { eventId: event._id.toString() },
  })

  await notifySafe({
    recipientUserId: userId,
    recipientRole: 'student',
    type: 'alumni_event_registration_confirmed',
    title: 'Event registration confirmed',
    body: `You are registered for ${event.title}.`,
    metadata: { eventId: event._id.toString() },
  })

  return event
}

async function recordEventAttendance(institutionId, eventId, registrationId, status, actorUserId) {
  const event = await InstitutionAlumniEvent.findOne({ institutionId: oid(institutionId), _id: eventId })
  if (!event) throw err('Event not found', 404)
  const reg = event.registrations.id(registrationId)
  if (!reg) throw err('Registration not found', 404)
  reg.status = status
  await event.save()
  return event
}

async function browsePublishedEvents(userId, filters = {}, pagination = {}) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student) throw err('Institution membership required', 403)
  const query = { institutionId: student.institutionId, status: 'published' }
  if (filters.eventType) query.eventType = filters.eventType
  return paginate(InstitutionAlumniEvent, query, pagination)
}

// ─── Institutional Contributions ──────────────────────────────────────────────

async function listInstitutionalContributions(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.contributionType) query.contributionType = filters.contributionType
  if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus
  return paginate(InstitutionAlumniInstitutionalContribution, query, pagination)
}

async function createInstitutionalContribution(institutionId, actorUserId, payload) {
  if (!payload.alumniId || !payload.contributionType || !payload.title) {
    throw err('Alumni, contribution type, and title are required')
  }
  const record = await InstitutionAlumniInstitutionalContribution.create({
    institutionId: oid(institutionId),
    alumniId: payload.alumniId,
    contributionType: payload.contributionType,
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    amount: payload.amount ?? 0,
    currency: payload.currency || 'INR',
    beneficiaries: sanitize(payload.beneficiaries, 500),
    approvalStatus: payload.approvalStatus || 'proposed',
    impactSummary: sanitize(payload.impactSummary),
    createdByUserId: actorUserId,
  })
  await auditSafe({
    institutionId,
    action: 'contribution_created',
    alumniId: payload.alumniId,
    actorUserId,
    description: `Institutional contribution: ${payload.title}`,
    metadata: { contributionId: record._id.toString() },
  })
  return record
}

async function approveInstitutionalContribution(institutionId, contributionId, actorUserId, approvalStatus) {
  const record = await InstitutionAlumniInstitutionalContribution.findOne({
    institutionId: oid(institutionId),
    _id: contributionId,
  })
  if (!record) throw err('Contribution not found', 404)
  record.approvalStatus = approvalStatus
  record.approvedByUserId = actorUserId
  record.approvedAt = new Date()
  await record.save()

  const alumni = await InstitutionAlumni.findById(record.alumniId)
  if (alumni?.linkedUserId) {
    await notifySafe({
      recipientUserId: alumni.linkedUserId,
      recipientRole: 'student',
      type: 'alumni_donation_confirmed',
      title: 'Contribution status updated',
      body: `Your ${record.contributionType.replace(/_/g, ' ')} contribution "${record.title}" is now ${approvalStatus}.`,
      metadata: { contributionId: record._id.toString() },
    })
  }

  await auditSafe({
    institutionId,
    action: 'contribution_approved',
    alumniId: record.alumniId,
    actorUserId,
    description: `Contribution ${approvalStatus}: ${record.title}`,
    metadata: { contributionId: record._id.toString(), amount: record.amount },
  })
  return record
}

// ─── Group Discussions ──────────────────────────────────────────────────────

async function listGroupPosts(institutionId, groupId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId), groupId: oid(groupId) }
  if (filters.postType) query.postType = filters.postType
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: regex }, { body: regex }]
  }
  return paginate(InstitutionAlumniGroupPost, query, pagination)
}

async function createGroupPost(institutionId, groupId, actorUserId, actorName, payload) {
  if (!payload.title) throw err('Post title is required')
  const group = await InstitutionAlumniGroup.findOne({ institutionId: oid(institutionId), _id: groupId })
  if (!group) throw err('Group not found', 404)

  const alumni = await InstitutionAlumni.findOne({ linkedUserId: actorUserId, institutionId: oid(institutionId) }).lean()
  const post = await InstitutionAlumniGroupPost.create({
    institutionId: oid(institutionId),
    groupId,
    postType: payload.postType || 'question',
    title: sanitize(payload.title, 300),
    body: sanitize(payload.body),
    authorUserId: actorUserId,
    authorName: sanitize(actorName, 100),
    authorAlumniId: alumni?._id || null,
  })

  await auditSafe({
    institutionId,
    action: 'group_post_created',
    actorUserId,
    description: `Group post: ${payload.title}`,
    metadata: { groupId, postId: post._id.toString() },
  })
  return post
}

async function addGroupPostComment(institutionId, postId, actorUserId, actorName, body) {
  const post = await InstitutionAlumniGroupPost.findOne({ institutionId: oid(institutionId), _id: postId })
  if (!post) throw err('Post not found', 404)
  post.comments.push({ authorUserId: actorUserId, authorName: sanitize(actorName, 100), body: sanitize(body) })
  await post.save()
  return post
}

async function requestGroupMembership(userId, userName, groupId, message = '') {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  const alumni = await InstitutionAlumni.findOne({ linkedUserId: userId }).lean()
  const institutionId = student?.institutionId || alumni?.institutionId
  if (!institutionId) throw err('Institution membership required', 403)

  const group = await InstitutionAlumniGroup.findOne({ _id: groupId, institutionId })
  if (!group) throw err('Group not found', 404)

  const existing = await InstitutionAlumniGroupMembershipRequest.findOne({
    groupId,
    requesterUserId: userId,
    status: 'pending',
  })
  if (existing) throw err('Membership request already pending', 409)

  return InstitutionAlumniGroupMembershipRequest.create({
    institutionId,
    groupId,
    alumniId: alumni?._id || null,
    requesterUserId: userId,
    requesterName: sanitize(userName, 100),
    message: sanitize(message),
  })
}

async function reviewGroupMembership(institutionId, requestId, status, actorUserId) {
  const request = await InstitutionAlumniGroupMembershipRequest.findOne({
    institutionId: oid(institutionId),
    _id: requestId,
  })
  if (!request) throw err('Membership request not found', 404)
  request.status = status
  request.reviewedByUserId = actorUserId
  request.reviewedAt = new Date()
  await request.save()

  if (status === 'approved' && request.alumniId) {
    const group = await InstitutionAlumniGroup.findById(request.groupId)
    if (group && !group.memberIds.some((id) => id.toString() === request.alumniId.toString())) {
      group.memberIds.push(request.alumniId)
      group.memberCount = group.memberIds.length
      await group.save()
    }
  }

  await notifySafe({
    recipientUserId: request.requesterUserId,
    recipientRole: 'student',
    type: 'alumni_group_membership_updated',
    title: 'Group membership update',
    body: `Your group membership request was ${status}.`,
    metadata: { requestId: request._id.toString(), groupId: request.groupId.toString() },
  })

  return request
}

// ─── Messaging ──────────────────────────────────────────────────────────────

async function listConversations(userId, institutionId = null) {
  const query = { participantUserIds: userId }
  if (institutionId) query.institutionId = oid(institutionId)
  return InstitutionAlumniConversation.find(query).sort({ lastMessageAt: -1 }).limit(50).lean()
}

async function getOrCreateDirectConversation(institutionId, actorUserId, targetUserId, actorName) {
  let conversation = await InstitutionAlumniConversation.findOne({
    institutionId: oid(institutionId),
    conversationType: 'direct',
    participantUserIds: { $all: [actorUserId, targetUserId] },
  })
  if (!conversation) {
    conversation = await InstitutionAlumniConversation.create({
      institutionId: oid(institutionId),
      conversationType: 'direct',
      participantUserIds: [actorUserId, targetUserId],
      createdByUserId: actorUserId,
    })
  }
  return conversation
}

async function sendMessage(institutionId, conversationId, senderUserId, senderName, body) {
  const conversation = await InstitutionAlumniConversation.findOne({
    institutionId: oid(institutionId),
    _id: conversationId,
    participantUserIds: senderUserId,
  })
  if (!conversation) throw err('Conversation not found or access denied', 404)

  const message = await InstitutionAlumniMessage.create({
    institutionId: oid(institutionId),
    conversationId,
    senderUserId,
    senderName: sanitize(senderName, 100),
    body: sanitize(body),
    readByUserIds: [senderUserId],
  })

  conversation.lastMessageAt = new Date()
  conversation.lastMessagePreview = sanitize(body, 200)
  await conversation.save()

  for (const participantId of conversation.participantUserIds) {
    if (participantId.toString() !== senderUserId.toString()) {
      await notifySafe({
        recipientUserId: participantId,
        recipientRole: 'student',
        type: 'alumni_message_received',
        title: 'New alumni message',
        body: conversation.lastMessagePreview,
        metadata: { conversationId: conversation._id.toString() },
      })
    }
  }

  await auditSafe({
    institutionId,
    action: 'message_sent',
    actorUserId: senderUserId,
    description: 'Alumni message sent',
    metadata: { conversationId, messageId: message._id.toString() },
  })

  return message
}

async function listMessages(institutionId, conversationId, userId, pagination = {}) {
  const conversation = await InstitutionAlumniConversation.findOne({
    institutionId: oid(institutionId),
    _id: conversationId,
    participantUserIds: userId,
  })
  if (!conversation) throw err('Conversation not found or access denied', 404)
  return paginate(
    InstitutionAlumniMessage,
    { institutionId: oid(institutionId), conversationId: oid(conversationId) },
    pagination,
  )
}

// ─── Career Applications ─────────────────────────────────────────────────────

async function applyToCareerOpportunity(userId, userName, userEmail, contributionId, payload) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student) throw err('Institution membership required to apply', 403)

  const contribution = await InstitutionAlumniCareerContribution.findOne({
    _id: contributionId,
    institutionId: student.institutionId,
    status: 'open',
  })
  if (!contribution) throw err('Career opportunity not found or closed', 404)

  const existing = await InstitutionAlumniCareerApplication.findOne({
    contributionId,
    applicantUserId: userId,
  })
  if (existing) throw err('You have already applied to this opportunity', 409)

  const application = await InstitutionAlumniCareerApplication.create({
    institutionId: student.institutionId,
    contributionId,
    applicantUserId: userId,
    applicantName: sanitize(userName, 100),
    applicantEmail: sanitize(userEmail, 200),
    coverLetter: sanitize(payload.coverLetter),
    resumeUrl: sanitize(payload.resumeUrl, 500),
  })

  contribution.participantCount = (contribution.participantCount || 0) + 1
  await contribution.save()

  const alumni = await InstitutionAlumni.findById(contribution.alumniId)
  if (alumni?.linkedUserId) {
    await notifySafe({
      recipientUserId: alumni.linkedUserId,
      recipientRole: 'student',
      type: 'alumni_career_application_received',
      title: 'New career application',
      body: `${userName} applied to "${contribution.title}".`,
      metadata: { applicationId: application._id.toString(), contributionId },
    })
  }

  await auditSafe({
    institutionId: student.institutionId,
    action: 'career_application_submitted',
    actorUserId: userId,
    description: `Applied to: ${contribution.title}`,
    metadata: { applicationId: application._id.toString() },
  })

  return application
}

async function listCareerApplications(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.contributionId) query.contributionId = oid(filters.contributionId)
  if (filters.status) query.status = filters.status
  return paginate(InstitutionAlumniCareerApplication, query, pagination)
}

async function reviewCareerApplication(institutionId, applicationId, status, actorUserId, reviewNotes = '') {
  const application = await InstitutionAlumniCareerApplication.findOne({
    institutionId: oid(institutionId),
    _id: applicationId,
  })
  if (!application) throw err('Application not found', 404)
  application.status = status
  application.reviewNotes = sanitize(reviewNotes)
  application.reviewedByUserId = actorUserId
  application.reviewedAt = new Date()
  await application.save()

  await notifySafe({
    recipientUserId: application.applicantUserId,
    recipientRole: 'student',
    type: 'alumni_career_application_updated',
    title: 'Application status updated',
    body: `Your application status is now ${status}.`,
    metadata: { applicationId: application._id.toString() },
  })

  return application
}

// ─── Volunteers ─────────────────────────────────────────────────────────────

async function listVolunteers(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.alumniId) query.alumniId = oid(filters.alumniId)
  if (filters.volunteerRole) query.volunteerRole = filters.volunteerRole
  if (filters.status) query.status = filters.status
  return paginate(InstitutionAlumniVolunteerRecord, query, pagination)
}

async function createVolunteerRecord(institutionId, actorUserId, payload) {
  if (!payload.alumniId || !payload.volunteerRole || !payload.title) {
    throw err('Alumni, volunteer role, and title are required')
  }
  const record = await InstitutionAlumniVolunteerRecord.create({
    institutionId: oid(institutionId),
    alumniId: payload.alumniId,
    volunteerRole: payload.volunteerRole,
    title: sanitize(payload.title, 300),
    description: sanitize(payload.description),
    eventId: payload.eventId || null,
    eventTitle: sanitize(payload.eventTitle, 300),
    participationDate: payload.participationDate || null,
    hoursContributed: payload.hoursContributed ?? 0,
    status: payload.status || 'completed',
    impactNotes: sanitize(payload.impactNotes),
    createdByUserId: actorUserId,
  })
  await auditSafe({
    institutionId,
    action: 'volunteer_registered',
    alumniId: payload.alumniId,
    actorUserId,
    description: `Volunteer record: ${payload.title}`,
    metadata: { volunteerId: record._id.toString() },
  })
  return record
}

// ─── Audit ──────────────────────────────────────────────────────────────────

async function listAuditLog(institutionId, filters = {}, pagination = {}) {
  const query = { institutionId: oid(institutionId) }
  if (filters.alumniId) query.alumniId = oid(filters.alumniId)
  if (filters.action) query.action = filters.action
  return paginate(InstitutionAlumniAuditLog, query, pagination)
}

module.exports = {
  getEngagementAnalytics,
  listEvents,
  createEvent,
  publishEvent,
  registerForEvent,
  recordEventAttendance,
  browsePublishedEvents,
  listInstitutionalContributions,
  createInstitutionalContribution,
  approveInstitutionalContribution,
  listGroupPosts,
  createGroupPost,
  addGroupPostComment,
  requestGroupMembership,
  reviewGroupMembership,
  listConversations,
  getOrCreateDirectConversation,
  sendMessage,
  listMessages,
  applyToCareerOpportunity,
  listCareerApplications,
  reviewCareerApplication,
  listVolunteers,
  createVolunteerRecord,
  listAuditLog,
}
