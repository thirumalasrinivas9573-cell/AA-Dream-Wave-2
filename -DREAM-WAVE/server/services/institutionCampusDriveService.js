const mongoose = require('mongoose')
const CampusOpportunity = require('../models/CampusOpportunity')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const Company = require('../models/Company')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationActivity = require('../models/ApplicationActivity')
const {
  DRIVE_ACTIONS,
  DRIVE_ACTION_TO_STATUS,
  STAGE_TO_PLACEMENT_TRACKING,
  PLACEMENT_NOTIFICATION_TEMPLATES,
} = require('../constants/institutionPlacements')
const { evaluateEligibility } = require('./institutionPlacementEligibilityService')
const { recordAudit } = require('./institutionAuditService')
const institutionCache = require('./institutionCache')
const { notifyUser } = require('./platformNotificationService')
const {
  scheduleInterview: atsScheduleInterview,
  releaseOffer: atsReleaseOffer,
  transitionStage,
  submitInterviewFeedback,
} = require('./recruitmentService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function sanitizeText(text, max = 5000) {
  if (text == null) return ''
  return String(text).trim().slice(0, max)
}

async function assertDrive(institutionId, driveId) {
  const drive = await CampusOpportunity.findOne({
    _id: driveId,
    institutionId: oid(institutionId),
    opportunityType: 'campus_drive',
  })
  if (!drive) throw err('Campus drive not found', 404)
  return drive
}

async function assertInstitutionApplication(institutionId, applicationId) {
  const app = await RecruitmentApplication.findOne({
    _id: applicationId,
    institutionId: oid(institutionId),
  })
  if (!app) throw err('Application not found', 404)
  return app
}

const { recordStudentPlacementStatus } = require('./institutionPlacementHistoryService')

async function dispatchPlacementNotification({ recipientUserId, recipientRole, type, title, body, metadata = {} }) {
  if (!recipientUserId) return null
  return notifyUser({ recipientUserId, recipientRole, type, title, body, metadata }).catch(() => null)
}

async function transitionDrive(institutionId, driveId, action, actorUserId, actorName = 'Staff') {
  if (!DRIVE_ACTIONS.includes(action)) throw err('Invalid drive action')
  const drive = await assertDrive(institutionId, driveId)

  if (['cancelled', 'archived'].includes(drive.status) && action !== 'archive') {
    throw err(`Cannot ${action} a ${drive.status} drive`, 400)
  }

  if (action === 'publish') {
    drive.status = 'registration_open'
    drive.publishedAt = new Date()
    drive.currentWorkflowStage = 'registration_open'
    const stage = drive.workflowStages?.find((s) => s.key === 'registration_open')
    if (stage) stage.status = 'active'
  } else if (action === 'cancel') {
    drive.status = 'cancelled'
    drive.cancelledAt = new Date()
  } else if (action === 'archive') {
    drive.status = 'archived'
    drive.archivedAt = new Date()
  } else {
    const nextStatus = DRIVE_ACTION_TO_STATUS[action]
    if (!nextStatus) throw err('Invalid drive action')
    drive.status = nextStatus
    if (action === 'close_registration') drive.currentWorkflowStage = 'registration_closed'
  }

  await drive.save()
  institutionCache.invalidateInstitution(String(institutionId))

  await recordAudit({
    institutionId: oid(institutionId),
    action: 'placement_drive_updated',
    actorUserId,
    actorName,
    description: `Drive ${action}: ${drive.title}`,
    metadata: { driveId: drive._id.toString(), action, status: drive.status },
  }).catch(() => {})

  if (action === 'publish') {
    await dispatchPlacementNotification({
      recipientUserId: actorUserId,
      recipientRole: 'institution',
      type: 'placement_opportunity_published',
      title: 'Campus drive published',
      body: `${drive.title} is now open for registration.`,
      metadata: { driveId: drive._id.toString() },
    })
  }

  return drive
}

async function updateDriveWorkflow(institutionId, driveId, payload) {
  const drive = await assertDrive(institutionId, driveId)
  if (payload.workflowStages && Array.isArray(payload.workflowStages)) {
    drive.workflowStages = payload.workflowStages.map((s, i) => ({
      key: sanitizeText(s.key, 80),
      label: sanitizeText(s.label, 120),
      order: s.order ?? i + 1,
      status: s.status || 'pending',
    }))
  }
  if (payload.currentWorkflowStage) {
    drive.currentWorkflowStage = sanitizeText(payload.currentWorkflowStage, 80)
    for (const stage of drive.workflowStages) {
      if (stage.key === drive.currentWorkflowStage) stage.status = 'active'
    }
  }
  await drive.save()
  institutionCache.invalidateInstitution(String(institutionId))
  return drive
}

async function listDrives(institutionId, filters = {}) {
  const query = { institutionId: oid(institutionId), opportunityType: 'campus_drive' }
  if (filters.status) query.status = filters.status
  else if (filters.companyId) query.companyId = oid(filters.companyId)
  else if (filters.includeArchived !== 'true') query.status = { $ne: 'archived' }
  if (filters.companyId && filters.status) query.companyId = oid(filters.companyId)
  return CampusOpportunity.find(query).sort({ driveDate: 1, deadline: 1 }).lean()
}

async function generateShortlist(institutionId, driveId, actorUserId, options = {}) {
  const drive = await assertDrive(institutionId, driveId)
  const applications = await RecruitmentApplication.find({
    institutionId: oid(institutionId),
    campusOpportunityId: drive._id,
    stage: { $nin: ['rejected', 'withdrawn'] },
  }).lean()

  let applicationIds = applications.map((a) => a._id)
  if (options.mode === 'automatic') {
    const students = await InstitutionStudent.find({ institutionId: oid(institutionId), status: 'active' }).lean()
    const studentMap = Object.fromEntries(students.map((s) => [s._id.toString(), s]))
    applicationIds = applications
      .filter((a) => {
        const student = studentMap[a.institutionStudentId?.toString()]
        if (!student) return false
        const result = evaluateEligibility(student, drive.eligibilityRules || {}, a)
        return result.eligible
      })
      .map((a) => a._id)
    if (options.minCgpa != null) {
      applicationIds = applications
        .filter((a) => (a.cgpa ?? 0) >= options.minCgpa)
        .map((a) => a._id)
    }
  }
  if (options.manualApplicationIds?.length) {
    applicationIds = options.manualApplicationIds.map((id) => oid(id))
  }

  drive.shortlist = {
    status: 'draft',
    applicationIds,
    mode: options.mode || 'automatic',
    publishedAt: null,
    approvedByUserId: null,
  }
  await drive.save()

  await recordAudit({
    institutionId: oid(institutionId),
    action: 'placement_shortlist_generated',
    actorUserId,
    description: `Shortlist generated for ${drive.title}: ${applicationIds.length} candidates`,
    metadata: { driveId: drive._id.toString(), count: applicationIds.length },
  }).catch(() => {})

  return { driveId: drive._id.toString(), count: applicationIds.length, applicationIds: applicationIds.map(String) }
}

async function approveShortlist(institutionId, driveId, actorUserId) {
  const drive = await assertDrive(institutionId, driveId)
  if (!drive.shortlist?.applicationIds?.length) throw err('No shortlist to approve')
  drive.shortlist.status = 'pending_approval'
  drive.shortlist.approvedByUserId = actorUserId
  await drive.save()
  return { driveId: drive._id.toString(), status: drive.shortlist.status }
}

async function publishShortlist(institutionId, driveId, actorUserId) {
  const drive = await assertDrive(institutionId, driveId)
  const ids = drive.shortlist?.applicationIds || []
  if (!ids.length) throw err('No shortlist to publish')

  for (const appId of ids) {
    try {
      const app = await RecruitmentApplication.findById(appId)
      if (!app) continue
      await transitionStage(app.companyId, appId, 'shortlisted', actorUserId, {
        note: 'Published via campus drive shortlist',
      })
      if (app.institutionStudentId) {
        await recordStudentPlacementStatus(app.institutionStudentId, 'shortlisted', actorUserId)
      }
    } catch {
      // skip invalid transitions
    }
  }

  drive.shortlist.status = 'published'
  drive.shortlist.publishedAt = new Date()
  await drive.save()

  await recordAudit({
    institutionId: oid(institutionId),
    action: 'placement_shortlist_published',
    actorUserId,
    description: `Shortlist published for ${drive.title}`,
    metadata: { driveId: drive._id.toString(), count: ids.length },
  }).catch(() => {})

  await dispatchPlacementNotification({
    recipientUserId: actorUserId,
    recipientRole: 'institution',
    type: 'placement_results_published',
    title: 'Shortlist published',
    body: `Results published for ${drive.title}.`,
    metadata: { driveId: drive._id.toString() },
  })

  return { driveId: drive._id.toString(), published: ids.length }
}

async function rejectCandidates(institutionId, applicationIds, actorUserId, reason = '') {
  const results = []
  for (const id of applicationIds) {
    try {
      const app = await assertInstitutionApplication(institutionId, id)
      await transitionStage(app.companyId, id, 'rejected', actorUserId, { reason })
      if (app.institutionStudentId) {
        await recordStudentPlacementStatus(app.institutionStudentId, 'declined', actorUserId)
      }
      results.push({ id, success: true })
    } catch (e) {
      results.push({ id, success: false, error: e.message })
    }
  }
  return results
}

async function createInterview(institutionId, actorUserId, payload) {
  const app = await assertInstitutionApplication(institutionId, payload.applicationId)
  if (!app.companyId) throw err('Application has no linked company', 400)

  const interview = await atsScheduleInterview(app.companyId, app._id, actorUserId, {
    round: payload.round || 'Technical',
    interviewers: payload.interviewers || payload.panel || [],
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime || '',
    mode: payload.mode || 'online',
    meetingLink: payload.meetingLink || '',
    venue: payload.venue || '',
  })

  await RecruitmentInterview.updateOne({ _id: interview._id }, { $set: { institutionId: oid(institutionId) } })

  if (app.institutionStudentId) {
    await recordStudentPlacementStatus(app.institutionStudentId, 'interview_scheduled', actorUserId)
    const student = await InstitutionStudent.findById(app.institutionStudentId).select('linkedUserId')
    if (student?.linkedUserId) {
      await dispatchPlacementNotification({
        recipientUserId: student.linkedUserId,
        recipientRole: 'student',
        type: 'placement_interview_scheduled',
        title: 'Interview scheduled',
        body: `Your interview for ${app.roleTitle} has been scheduled.`,
        metadata: { applicationId: app._id.toString(), interviewId: interview._id.toString() },
      })
    }
  }

  return interview
}

async function rescheduleInterview(institutionId, interviewId, actorUserId, payload) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, institutionId: oid(institutionId) })
  if (!interview) throw err('Interview not found', 404)

  interview.rescheduledFrom = interview.scheduledDate
  if (payload.scheduledDate) interview.scheduledDate = payload.scheduledDate
  if (payload.scheduledTime !== undefined) interview.scheduledTime = payload.scheduledTime
  if (payload.venue !== undefined) interview.venue = payload.venue
  if (payload.meetingLink !== undefined) interview.meetingLink = payload.meetingLink
  if (payload.interviewers) interview.interviewers = payload.interviewers
  interview.status = 'scheduled'
  await interview.save()

  const app = await RecruitmentApplication.findById(interview.applicationId)
  if (app?.institutionStudentId) {
    const student = await InstitutionStudent.findById(app.institutionStudentId).select('linkedUserId')
    if (student?.linkedUserId) {
      await dispatchPlacementNotification({
        recipientUserId: student.linkedUserId,
        recipientRole: 'student',
        type: 'placement_interview_rescheduled',
        title: 'Interview rescheduled',
        body: `Your interview for ${app.roleTitle} has been rescheduled.`,
        metadata: { interviewId: interview._id.toString() },
      })
    }
  }

  return interview
}

async function cancelInterview(institutionId, interviewId) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, institutionId: oid(institutionId) })
  if (!interview) throw err('Interview not found', 404)
  interview.status = 'cancelled'
  await interview.save()
  return interview
}

async function recordInterviewOutcome(institutionId, interviewId, actorUserId, payload) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, institutionId: oid(institutionId) })
  if (!interview) throw err('Interview not found', 404)
  if (payload.attendance) interview.attendance = payload.attendance
  await interview.save()
  return submitInterviewFeedback(interview.companyId, interviewId, actorUserId, payload)
}

async function createOffer(institutionId, actorUserId, payload) {
  const app = await assertInstitutionApplication(institutionId, payload.applicationId)
  if (!app.companyId) throw err('Application has no linked company', 400)

  const offer = await atsReleaseOffer(app.companyId, app._id, actorUserId, {
    salary: payload.salary ?? payload.packageAmount ?? 0,
    location: payload.location || '',
    joiningDate: payload.joiningDate || null,
    expiryDate: payload.expiryDate || null,
    department: payload.department || app.department,
  })

  if (app.institutionStudentId) {
    await recordStudentPlacementStatus(app.institutionStudentId, 'offer_received', actorUserId)
    const student = await InstitutionStudent.findById(app.institutionStudentId)
    if (student) {
      student.placement.roleTitle = app.roleTitle
      student.placement.offerStatus = 'released'
      await student.save()
    }
    if (student?.linkedUserId) {
      await dispatchPlacementNotification({
        recipientUserId: student.linkedUserId,
        recipientRole: 'student',
        type: 'placement_offer_released',
        title: 'Offer released',
        body: `You have received an offer for ${app.roleTitle}.`,
        metadata: { applicationId: app._id.toString(), offerId: offer._id.toString() },
      })
    }
  }

  return offer
}

async function updateOfferStatus(institutionId, offerId, actorUserId, payload) {
  const apps = await RecruitmentApplication.find({ institutionId: oid(institutionId) }).select('_id')
  const appIds = apps.map((a) => a._id)
  const offer = await RecruitmentOffer.findOne({ _id: offerId, applicationId: { $in: appIds } })
  if (!offer) throw err('Offer not found', 404)

  if (payload.status) offer.status = payload.status
  await offer.save()

  const app = await RecruitmentApplication.findById(offer.applicationId)
  if (app?.institutionStudentId && payload.status === 'accepted') {
    await transitionStage(app.companyId, app._id, 'offer_accepted', actorUserId, {})
    await recordStudentPlacementStatus(app.institutionStudentId, 'offer_accepted', actorUserId)
  }
  if (app?.institutionStudentId && payload.status === 'declined') {
    await recordStudentPlacementStatus(app.institutionStudentId, 'declined', actorUserId)
  }

  return offer
}

async function getCompanyEngagement(institutionId, companyId) {
  const iid = oid(institutionId)
  const cid = oid(companyId)
  const partnership = await InstitutionCompanyPartnership.findOne({ institutionId: iid, companyId: cid, status: 'active' }).lean()
  if (!partnership) throw err('No active partnership with this company', 404)

  const [drives, applications, offers, company] = await Promise.all([
    CampusOpportunity.countDocuments({ institutionId: iid, companyId: cid, opportunityType: 'campus_drive' }),
    RecruitmentApplication.find({ institutionId: iid, companyId: cid }).lean(),
    RecruitmentOffer.find({ companyId: cid }).lean(),
    Company.findById(cid).lean(),
  ])

  const appIds = new Set(applications.map((a) => a._id.toString()))
  const institutionOffers = offers.filter((o) => appIds.has(o.applicationId.toString()))
  const hired = applications.filter((a) => ['hired', 'offer_accepted'].includes(a.stage)).length

  return {
    companyId: cid.toString(),
    companyName: company?.name || '',
    partnershipId: partnership._id.toString(),
    campusVisits: drives,
    totalApplications: applications.length,
    offersReleased: institutionOffers.length,
    offersAccepted: institutionOffers.filter((o) => o.status === 'accepted').length,
    studentsHired: hired,
    hiringSuccessRate: applications.length ? Math.round((hired / applications.length) * 100) : 0,
    preferredDepartments: company?.hiringDepartments || [],
    feedback: partnership.message || '',
    recruitmentHistory: applications.slice(0, 20).map((a) => ({
      applicationId: a._id.toString(),
      role: a.roleTitle,
      stage: a.stage,
      department: a.department,
      appliedAt: a.createdAt,
    })),
  }
}

async function sendPlacementNotification(institutionId, actorUserId, payload) {
  const template = payload.template
  if (!PLACEMENT_NOTIFICATION_TEMPLATES.includes(template)) throw err('Invalid notification template')

  const typeMap = {
    opportunity_published: 'placement_opportunity_published',
    registration_deadline_reminder: 'placement_registration_reminder',
    interview_scheduled: 'placement_interview_scheduled',
    interview_rescheduled: 'placement_interview_rescheduled',
    results_published: 'placement_results_published',
    offer_released: 'placement_offer_released',
    offer_accepted: 'placement_offer_accepted',
  }

  let recipients = []
  if (payload.driveId) {
    const drive = await assertDrive(institutionId, payload.driveId)
    const apps = await RecruitmentApplication.find({ institutionId: oid(institutionId), campusOpportunityId: drive._id }).select('institutionStudentId')
    const students = await InstitutionStudent.find({ _id: { $in: apps.map((a) => a.institutionStudentId).filter(Boolean) } }).select('linkedUserId')
    recipients = students.filter((s) => s.linkedUserId)
  }

  const title = payload.title || template.replace(/_/g, ' ')
  const body = payload.body || payload.message || title
  let sent = 0
  for (const student of recipients) {
    await dispatchPlacementNotification({
      recipientUserId: student.linkedUserId,
      recipientRole: 'student',
      type: typeMap[template] || 'placement_opportunity_published',
      title,
      body,
      metadata: { driveId: payload.driveId, template },
    })
    sent++
  }

  return { sent, template }
}

async function getDashboardWidgets(institutionId) {
  const iid = oid(institutionId)
  const partnerships = await InstitutionCompanyPartnership.find({ institutionId: iid, status: 'active' }).lean()
  const companyIds = partnerships.map((p) => p.companyId)

  const [activeOpportunities, upcomingDrives, applications, shortlisted, offers, placed, salaryAgg] = await Promise.all([
    CampusOpportunity.countDocuments({ institutionId: iid, status: { $in: ['open', 'registration_open', 'ongoing', 'published'] } }),
    CampusOpportunity.find({ institutionId: iid, opportunityType: 'campus_drive', driveDate: { $gte: new Date() }, status: { $nin: ['cancelled', 'archived'] } }).sort({ driveDate: 1 }).limit(5).lean(),
    RecruitmentApplication.countDocuments({ institutionId: iid }),
    RecruitmentApplication.countDocuments({ institutionId: iid, stage: 'shortlisted' }),
    RecruitmentOffer.countDocuments({ companyId: { $in: companyIds }, status: { $in: ['released', 'accepted'] } }),
    RecruitmentApplication.countDocuments({ institutionId: iid, stage: { $in: ['hired', 'offer_accepted'] } }),
    RecruitmentOffer.aggregate([{ $match: { companyId: { $in: companyIds }, salary: { $gt: 0 } } }, { $group: { _id: null, highest: { $max: '$salary' }, average: { $avg: '$salary' } } }]),
  ])

  const eligibleCount = await InstitutionStudent.countDocuments({ institutionId: iid, status: 'active', 'placement.lifecycleStatus': { $in: ['READY', 'ELIGIBLE', 'APPLYING'] } })

  return {
    activeOpportunities,
    upcomingDrives: upcomingDrives.map((d) => ({ id: d._id.toString(), title: d.title, companyId: d.companyId?.toString(), driveDate: d.driveDate, status: d.status, venue: d.venue })),
    applicationsReceived: applications,
    studentsShortlisted: shortlisted,
    offersReleased: offers,
    placementPercentage: eligibleCount ? Math.round((placed / eligibleCount) * 100) : 0,
    highestPackage: salaryAgg[0]?.highest ?? 0,
    averagePackage: Math.round(salaryAgg[0]?.average ?? 0),
    recentActivity: [],
  }
}

async function getStudentPlacementHistory(institutionId, studentId) {
  const student = await InstitutionStudent.findOne({ _id: studentId, institutionId: oid(institutionId) }).select('fullName placement')
  if (!student) throw err('Student not found', 404)
  const applications = await RecruitmentApplication.find({ institutionId: oid(institutionId), institutionStudentId: student._id }).sort({ createdAt: -1 }).lean()
  return {
    studentId: student._id.toString(),
    studentName: student.fullName,
    statusHistory: student.placement?.statusHistory || [],
    applications: applications.map((a) => ({
      id: a._id.toString(),
      role: a.roleTitle,
      stage: a.stage,
      trackingStatus: STAGE_TO_PLACEMENT_TRACKING[a.stage] || 'applied',
      appliedAt: a.createdAt,
    })),
  }
}

module.exports = {
  transitionDrive,
  updateDriveWorkflow,
  listDrives,
  generateShortlist,
  approveShortlist,
  publishShortlist,
  rejectCandidates,
  createInterview,
  rescheduleInterview,
  cancelInterview,
  recordInterviewOutcome,
  createOffer,
  updateOfferStatus,
  getCompanyEngagement,
  sendPlacementNotification,
  getDashboardWidgets,
  getStudentPlacementHistory,
}
