const alumniService = require('../services/institutionAlumniService')
const extendedService = require('../services/institutionAlumniExtendedService')
const {
  ALUMNI_STATUSES,
  VERIFICATION_STATUSES,
  PROFILE_VISIBILITY,
  CONTACT_PREFERENCES,
  CONNECTION_TYPES,
  CONNECTION_STATUSES,
  GROUP_TYPES,
  GROUP_STATUSES,
  MENTORSHIP_STATUSES,
  MENTORSHIP_SESSION_STATUSES,
  CAREER_CONTRIBUTION_TYPES,
  CAREER_CONTRIBUTION_STATUSES,
  ALUMNI_INDUSTRIES,
} = require('../constants/institutionAlumni')
const {
  ALUMNI_EVENT_TYPES,
  ALUMNI_EVENT_STATUSES,
  INSTITUTIONAL_CONTRIBUTION_TYPES,
  CONTRIBUTION_APPROVAL_STATUSES,
  GROUP_POST_TYPES,
  VOLUNTEER_ROLES,
  CONVERSATION_TYPES,
  CAREER_APPLICATION_STATUSES,
  ALUMNI_REPORT_TYPES,
} = require('../constants/institutionAlumniExtended')
const { getAlumniAnalytics } = require('../services/institutionAlumniAnalyticsService')
const {
  generateAlumniReport,
  exportAlumniReport,
} = require('../services/institutionAlumniReportService')
const { sendApiError } = require('../utils/institutionApiErrors')

function institutionId(req) {
  if (!req.institution?._id) {
    const err = new Error('Institution profile required')
    err.statusCode = 403
    throw err
  }
  return req.institution._id
}

exports.getMeta = (_req, res) => {
  res.json({
    success: true,
    alumniStatuses: ALUMNI_STATUSES,
    verificationStatuses: VERIFICATION_STATUSES,
    profileVisibility: PROFILE_VISIBILITY,
    contactPreferences: CONTACT_PREFERENCES,
    connectionTypes: CONNECTION_TYPES,
    connectionStatuses: CONNECTION_STATUSES,
    groupTypes: GROUP_TYPES,
    groupStatuses: GROUP_STATUSES,
    mentorshipStatuses: MENTORSHIP_STATUSES,
    sessionStatuses: MENTORSHIP_SESSION_STATUSES,
    careerContributionTypes: CAREER_CONTRIBUTION_TYPES,
    careerContributionStatuses: CAREER_CONTRIBUTION_STATUSES,
    industries: ALUMNI_INDUSTRIES,
    alumniEventTypes: ALUMNI_EVENT_TYPES,
    alumniEventStatuses: ALUMNI_EVENT_STATUSES,
    institutionalContributionTypes: INSTITUTIONAL_CONTRIBUTION_TYPES,
    contributionApprovalStatuses: CONTRIBUTION_APPROVAL_STATUSES,
    groupPostTypes: GROUP_POST_TYPES,
    volunteerRoles: VOLUNTEER_ROLES,
    conversationTypes: CONVERSATION_TYPES,
    careerApplicationStatuses: CAREER_APPLICATION_STATUSES,
    reportTypes: ALUMNI_REPORT_TYPES,
  })
}

exports.getStats = async (req, res) => {
  try {
    const stats = await alumniService.getAlumniStats(institutionId(req))
    res.json({ success: true, stats })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = await alumniService.getAlumniWorkspace(institutionId(req))
    res.json({ success: true, workspace })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listAlumni = async (req, res) => {
  try {
    const result = await alumniService.listAlumni(institutionId(req), req.query, req.query)
    res.json({ success: true, alumni: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getAlumni = async (req, res) => {
  try {
    const alumni = await alumniService.getAlumni(institutionId(req), req.params.id)
    res.json({ success: true, alumni })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createAlumni = async (req, res) => {
  try {
    const alumni = await alumniService.createAlumni(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, alumni })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createAlumniFromStudent = async (req, res) => {
  try {
    const alumni = await alumniService.createAlumniFromStudent(
      institutionId(req),
      req.params.studentId,
      req.user._id,
    )
    res.status(201).json({ success: true, alumni })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateAlumni = async (req, res) => {
  try {
    const alumni = await alumniService.updateAlumni(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, alumni })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.verifyAlumni = async (req, res) => {
  try {
    const alumni = await alumniService.verifyAlumni(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body.verificationStatus,
    )
    res.json({ success: true, alumni })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listConnections = async (req, res) => {
  try {
    const result = await alumniService.listConnections(institutionId(req), req.query, req.query)
    res.json({ success: true, connections: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createConnection = async (req, res) => {
  try {
    const connection = await alumniService.createConnectionRequest(
      institutionId(req),
      req.body.fromAlumniId,
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, connection })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.respondConnection = async (req, res) => {
  try {
    const connection = await alumniService.respondToConnection(
      institutionId(req),
      req.params.id,
      req.body.status,
      req.user._id,
    )
    res.json({ success: true, connection })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listGroups = async (req, res) => {
  try {
    const result = await alumniService.listGroups(institutionId(req), req.query, req.query)
    res.json({ success: true, groups: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createGroup = async (req, res) => {
  try {
    const group = await alumniService.createGroup(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, group })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.addGroupMember = async (req, res) => {
  try {
    const group = await alumniService.addGroupMember(
      institutionId(req),
      req.params.id,
      req.body.alumniId,
    )
    res.json({ success: true, group })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listMentorships = async (req, res) => {
  try {
    const result = await alumniService.listMentorships(institutionId(req), req.query, req.query)
    res.json({ success: true, mentorships: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateMentorship = async (req, res) => {
  try {
    const mentorship = await alumniService.updateMentorshipStatus(
      institutionId(req),
      req.params.id,
      req.body.status,
      req.user._id,
    )
    res.json({ success: true, mentorship })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.addMentorshipFeedback = async (req, res) => {
  try {
    const mentorship = await alumniService.addMentorshipFeedback(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, mentorship })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listSessions = async (req, res) => {
  try {
    const result = await alumniService.listMentorshipSessions(institutionId(req), req.query, req.query)
    res.json({ success: true, sessions: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.scheduleSession = async (req, res) => {
  try {
    const session = await alumniService.scheduleMentorshipSession(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, session })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.completeSession = async (req, res) => {
  try {
    const session = await alumniService.completeMentorshipSession(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, session })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listContributions = async (req, res) => {
  try {
    const result = await alumniService.listCareerContributions(institutionId(req), req.query, req.query)
    res.json({ success: true, contributions: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createContribution = async (req, res) => {
  try {
    const contribution = await alumniService.createCareerContribution(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, contribution })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateContribution = async (req, res) => {
  try {
    const contribution = await alumniService.updateCareerContribution(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, contribution })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.browseDirectory = async (req, res) => {
  try {
    const result = await alumniService.browseAlumniDirectory(req.user._id, req.query, req.query)
    res.json({ success: true, alumni: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.requestMentorship = async (req, res) => {
  try {
    const mentorship = await alumniService.requestMentorship(
      req.user._id,
      req.user.name,
      req.body,
    )
    res.status(201).json({ success: true, mentorship })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.browseCareerOpportunities = async (req, res) => {
  try {
    const result = await alumniService.browseCareerOpportunities(req.user._id, req.query, req.query)
    res.json({ success: true, contributions: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getEngagement = async (req, res) => {
  try {
    const analytics = await extendedService.getEngagementAnalytics(institutionId(req))
    res.json({ success: true, analytics })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getAlumniAnalytics(institutionId(req), req.query)
    res.json({ success: true, analytics })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: ALUMNI_REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generateAlumniReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    res.json({ success: true, report })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.exportReport = async (req, res) => {
  try {
    const exported = await exportAlumniReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query.format || 'csv',
    )
    res.json({ success: true, export: exported })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listEvents = async (req, res) => {
  try {
    const result = await extendedService.listEvents(institutionId(req), req.query, req.query)
    res.json({ success: true, events: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createEvent = async (req, res) => {
  try {
    const event = await extendedService.createEvent(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.publishEvent = async (req, res) => {
  try {
    const event = await extendedService.publishEvent(institutionId(req), req.params.id, req.user._id)
    res.json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.recordEventAttendance = async (req, res) => {
  try {
    const event = await extendedService.recordEventAttendance(
      institutionId(req),
      req.params.id,
      req.params.registrationId,
      req.body.status,
      req.user._id,
    )
    res.json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listInstitutionalContributions = async (req, res) => {
  try {
    const result = await extendedService.listInstitutionalContributions(institutionId(req), req.query, req.query)
    res.json({ success: true, contributions: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createInstitutionalContribution = async (req, res) => {
  try {
    const contribution = await extendedService.createInstitutionalContribution(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, contribution })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.approveInstitutionalContribution = async (req, res) => {
  try {
    const contribution = await extendedService.approveInstitutionalContribution(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body.approvalStatus,
    )
    res.json({ success: true, contribution })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listGroupPosts = async (req, res) => {
  try {
    const result = await extendedService.listGroupPosts(
      institutionId(req),
      req.params.groupId,
      req.query,
      req.query,
    )
    res.json({ success: true, posts: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createGroupPost = async (req, res) => {
  try {
    const post = await extendedService.createGroupPost(
      institutionId(req),
      req.params.groupId,
      req.user._id,
      req.user.name,
      req.body,
    )
    res.status(201).json({ success: true, post })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.addGroupPostComment = async (req, res) => {
  try {
    const post = await extendedService.addGroupPostComment(
      institutionId(req),
      req.params.postId,
      req.user._id,
      req.user.name,
      req.body.body,
    )
    res.json({ success: true, post })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.reviewGroupMembership = async (req, res) => {
  try {
    const request = await extendedService.reviewGroupMembership(
      institutionId(req),
      req.params.id,
      req.body.status,
      req.user._id,
    )
    res.json({ success: true, request })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listConversations = async (req, res) => {
  try {
    const conversations = await extendedService.listConversations(req.user._id, institutionId(req))
    res.json({ success: true, conversations })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.sendMessage = async (req, res) => {
  try {
    const message = await extendedService.sendMessage(
      institutionId(req),
      req.params.conversationId,
      req.user._id,
      req.user.name,
      req.body.body,
    )
    res.status(201).json({ success: true, message })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listMessages = async (req, res) => {
  try {
    const result = await extendedService.listMessages(
      institutionId(req),
      req.params.conversationId,
      req.user._id,
      req.query,
    )
    res.json({ success: true, messages: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listCareerApplications = async (req, res) => {
  try {
    const result = await extendedService.listCareerApplications(institutionId(req), req.query, req.query)
    res.json({ success: true, applications: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.reviewCareerApplication = async (req, res) => {
  try {
    const application = await extendedService.reviewCareerApplication(
      institutionId(req),
      req.params.id,
      req.body.status,
      req.user._id,
      req.body.reviewNotes,
    )
    res.json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listVolunteers = async (req, res) => {
  try {
    const result = await extendedService.listVolunteers(institutionId(req), req.query, req.query)
    res.json({ success: true, volunteers: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createVolunteerRecord = async (req, res) => {
  try {
    const record = await extendedService.createVolunteerRecord(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, volunteer: record })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listAuditLog = async (req, res) => {
  try {
    const result = await extendedService.listAuditLog(institutionId(req), req.query, req.query)
    res.json({ success: true, auditLog: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.browseEvents = async (req, res) => {
  try {
    const result = await extendedService.browsePublishedEvents(req.user._id, req.query, req.query)
    res.json({ success: true, events: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.registerForEvent = async (req, res) => {
  try {
    const event = await extendedService.registerForEvent(
      req.user._id,
      req.user.name,
      req.user.email,
      req.params.id,
    )
    res.json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.applyToCareer = async (req, res) => {
  try {
    const application = await extendedService.applyToCareerOpportunity(
      req.user._id,
      req.user.name,
      req.user.email,
      req.params.id,
      req.body,
    )
    res.status(201).json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.requestGroupMembership = async (req, res) => {
  try {
    const request = await extendedService.requestGroupMembership(
      req.user._id,
      req.user.name,
      req.params.groupId,
      req.body.message,
    )
    res.status(201).json({ success: true, request })
  } catch (e) {
    sendApiError(res, e)
  }
}
