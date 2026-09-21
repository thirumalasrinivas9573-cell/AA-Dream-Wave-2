const mongoose = require('mongoose')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const InterviewPanel = require('../models/InterviewPanel')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const Institution = require('../models/Institution')
const {
  OFFER_ACTIONS,
  ONBOARDING_STATUSES,
  EVALUATION_CRITERIA,
  assertStageTransition,
  normalizeStage,
} = require('../constants/recruitment')
const { recordRecruitmentAudit } = require('./recruitmentAuditService')
const { COMPANY_ROLES } = require('../constants/companyPermissions')
const { notifyUser } = require('./platformNotificationService')
const ApplicationActivity = require('../models/ApplicationActivity')
const {
  assertCompanyApplication,
  submitInterviewFeedback,
  checkInterviewConflict,
} = require('./recruitmentService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

async function logActivity(payload) {
  return ApplicationActivity.create(payload)
}

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

async function notifyRecruitment(recipientUserId, recipientRole, type, title, body, metadata = {}) {
  if (!recipientUserId) return
  await notifyUser({ recipientUserId, recipientRole, type, title, body, metadata }).catch(() => {})
}

async function listInterviews(companyId, filters = {}) {
  const query = { companyId: oid(companyId) }
  if (filters.status) query.status = filters.status
  if (filters.applicationId) query.applicationId = oid(filters.applicationId)
  if (filters.dateFrom || filters.dateTo) {
    query.scheduledDate = {}
    if (filters.dateFrom) query.scheduledDate.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) query.scheduledDate.$lte = new Date(filters.dateTo)
  }
  return RecruitmentInterview.find(query).sort({ scheduledDate: 1 }).lean()
}

async function rescheduleInterview(companyId, interviewId, actorUserId, payload) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, companyId })
  if (!interview) throw err('Interview not found', 404)
  if (interview.status === 'cancelled') throw err('Cannot reschedule cancelled interview')

  const conflict = await checkInterviewConflict(
    companyId,
    payload.scheduledDate || interview.scheduledDate,
    payload.scheduledTime ?? interview.scheduledTime,
    payload.interviewers || interview.interviewers,
    interviewId,
  )
  if (conflict) throw err('Scheduling conflict detected for interviewer or time slot', 409)

  interview.rescheduledFrom = interview.scheduledDate
  if (payload.scheduledDate) interview.scheduledDate = payload.scheduledDate
  if (payload.scheduledTime !== undefined) interview.scheduledTime = payload.scheduledTime
  if (payload.venue !== undefined) interview.venue = payload.venue
  if (payload.meetingLink !== undefined) interview.meetingLink = payload.meetingLink
  if (payload.interviewers) interview.interviewers = payload.interviewers
  if (payload.mode) interview.mode = payload.mode
  if (payload.interviewType) interview.interviewType = payload.interviewType
  interview.status = 'scheduled'
  await interview.save()

  await logActivity({
    companyId,
    applicationId: interview.applicationId,
    type: 'interview_rescheduled',
    title: 'Interview rescheduled',
    actorUserId,
    isInternal: false,
  })

  const app = await RecruitmentApplication.findById(interview.applicationId)
  if (app?.candidateUserId) {
    await notifyRecruitment(
      app.candidateUserId,
      'student',
      'recruitment_interview_rescheduled',
      'Interview rescheduled',
      `Your interview for ${app.roleTitle} has been rescheduled.`,
      { interviewId: interview._id.toString() },
    )
  }

  return interview
}

async function cancelInterview(companyId, interviewId, actorUserId, reason = '') {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, companyId })
  if (!interview) throw err('Interview not found', 404)
  interview.status = 'cancelled'
  await interview.save()

  await logActivity({
    companyId,
    applicationId: interview.applicationId,
    type: 'interview_cancelled',
    title: 'Interview cancelled',
    description: reason,
    actorUserId,
    isInternal: false,
  })

  const app = await RecruitmentApplication.findById(interview.applicationId)
  if (app?.candidateUserId) {
    await notifyRecruitment(
      app.candidateUserId,
      'student',
      'recruitment_interview_cancelled',
      'Interview cancelled',
      `Your interview for ${app.roleTitle} was cancelled.`,
      { interviewId: interview._id.toString() },
    )
  }

  return interview
}

async function recordInterviewOutcome(companyId, interviewId, actorUserId, payload) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, companyId })
  if (!interview) throw err('Interview not found', 404)
  if (payload.attendance) interview.attendance = payload.attendance
  await interview.save()

  const feedback = { ...payload }
  if (payload.scores) {
    feedback.scores = {}
    for (const key of EVALUATION_CRITERIA) {
      if (payload.scores[key] != null) feedback.scores[key] = Number(payload.scores[key])
    }
  }

  return submitInterviewFeedback(companyId, interviewId, actorUserId, feedback)
}

async function listPanels(companyId) {
  return InterviewPanel.find({ companyId: oid(companyId), isActive: true }).sort({ name: 1 }).lean()
}

async function createPanel(companyId, actorUserId, payload) {
  return InterviewPanel.create({
    companyId,
    name: payload.name,
    department: payload.department || '',
    members: payload.members || [],
    createdByUserId: actorUserId,
  })
}

async function updatePanel(companyId, panelId, payload) {
  const panel = await InterviewPanel.findOne({ _id: panelId, companyId })
  if (!panel) throw err('Panel not found', 404)
  if (payload.name) panel.name = payload.name
  if (payload.department !== undefined) panel.department = payload.department
  if (payload.members) panel.members = payload.members
  if (payload.isActive !== undefined) panel.isActive = payload.isActive
  await panel.save()
  return panel
}

async function assignPanelToApplication(companyId, panelId, applicationId) {
  const panel = await InterviewPanel.findOne({ _id: panelId, companyId })
  if (!panel) throw err('Panel not found', 404)
  await assertCompanyApplication(companyId, applicationId)
  if (!panel.assignedApplicationIds.some((id) => id.toString() === applicationId)) {
    panel.assignedApplicationIds.push(applicationId)
    await panel.save()
  }
  return panel
}

async function createOfferDraft(companyId, applicationId, actorUserId, payload) {
  const app = await assertCompanyApplication(companyId, applicationId)
  let offer = await RecruitmentOffer.findOne({ companyId, applicationId })
  if (offer && !['draft', 'withdrawn'].includes(offer.status)) {
    throw err('Offer already exists in non-draft state', 409)
  }
  const data = {
    companyId,
    applicationId,
    roleTitle: payload.roleTitle || app.roleTitle,
    department: payload.department || app.department,
    salary: payload.salary || 0,
    benefits: payload.benefits || '',
    location: payload.location || '',
    joiningDate: payload.joiningDate || null,
    expiryDate: payload.expiryDate || null,
    status: 'draft',
    createdByUserId: actorUserId,
  }
  if (offer) {
    Object.assign(offer, data)
    await offer.save()
  } else {
    offer = await RecruitmentOffer.create(data)
  }
  await recordRecruitmentAudit({
    companyId,
    action: 'offer_generated',
    actorUserId,
    description: `Offer draft created for ${data.roleTitle}`,
    metadata: { offerId: offer._id, applicationId },
  }).catch(() => {})
  return offer
}

async function transitionOffer(companyId, offerId, action, actorUserId, options = {}) {
  if (!OFFER_ACTIONS.includes(action)) throw err('Invalid offer action')
  const offer = await RecruitmentOffer.findOne({ _id: offerId, companyId })
  if (!offer) throw err('Offer not found', 404)
  const app = await RecruitmentApplication.findById(offer.applicationId)

  switch (action) {
    case 'approve':
      if (offer.status !== 'draft') throw err('Only draft offers can be approved')
      offer.status = 'approved'
      offer.approvedByUserId = actorUserId
      offer.approvedAt = new Date()
      break
    case 'send':
      if (!['draft', 'approved'].includes(offer.status)) throw err('Offer cannot be sent')
      offer.status = 'released'
      offer.sentAt = new Date()
      offer.releasedAt = new Date()
      if (app) {
        const current = normalizeStage(app.stage)
        if (current !== 'offer_released') {
          assertStageTransition(current, 'offer_released')
          app.stage = 'offer_released'
          await app.save()
        }
      }
      if (app?.candidateUserId) {
        await notifyRecruitment(
          app.candidateUserId,
          'student',
          'recruitment_offer_released',
          'Offer released',
          `You have received an offer for ${offer.roleTitle || app?.roleTitle}.`,
          { offerId: offer._id.toString() },
        )
      }
      break
    case 'withdraw':
      offer.status = 'withdrawn'
      offer.withdrawnAt = new Date()
      offer.withdrawnReason = options.reason || ''
      break
    case 'accept':
      offer.status = 'accepted'
      if (app) {
        app.stage = 'offer_accepted'
        app.onboarding = app.onboarding || { history: [] }
        app.onboarding.status = 'offer_accepted'
        app.onboarding.history.push({
          status: 'offer_accepted',
          note: 'Offer accepted',
          actorUserId,
          at: new Date(),
        })
        await app.save()
      }
      await recordRecruitmentAudit({
        companyId,
        action: 'offer_accepted',
        actorUserId,
        description: `Offer accepted for ${offer.roleTitle}`,
        metadata: { offerId: offer._id, applicationId: offer.applicationId },
      }).catch(() => {})
      break
    case 'decline':
      offer.status = 'declined'
      if (app) {
        app.stage = 'offer_declined'
        await app.save()
      }
      break
    default:
      throw err('Invalid action')
  }
  await offer.save()
  return offer
}

async function updateOnboardingStatus(companyId, applicationId, status, actorUserId, note = '') {
  if (!ONBOARDING_STATUSES.includes(status)) throw err('Invalid onboarding status')
  const app = await assertCompanyApplication(companyId, applicationId)
  if (!app.onboarding) app.onboarding = { history: [] }
  app.onboarding.status = status
  app.onboarding.history.push({ status, note, actorUserId, at: new Date() })
  if (status === 'joined_successfully') app.stage = 'hired'
  await app.save()

  if (status === 'joining_confirmed' && app.candidateUserId) {
    await notifyRecruitment(
      app.candidateUserId,
      'student',
      'recruitment_joining_confirmed',
      'Joining confirmed',
      `Your joining for ${app.roleTitle} has been confirmed.`,
    )
  }

  return app
}

async function discoverTalent(companyId, filters = {}) {
  const match = { companyId: oid(companyId) }
  if (filters.skills) {
    const skills = String(filters.skills).split(',').map((s) => s.trim()).filter(Boolean)
    if (skills.length) match['candidateSnapshot.skills'] = { $in: skills }
  }
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [
      { 'candidateSnapshot.name': regex },
      { 'candidateSnapshot.email': regex },
      { skillsSummary: regex },
      { roleTitle: regex },
    ]
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    RecruitmentApplication.find(match).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(match),
  ])

  return {
    items: items.map((i) => ({
      id: i._id.toString(),
      name: i.candidateSnapshot?.name,
      email: i.candidateSnapshot?.email,
      skills: i.candidateSnapshot?.skills || [],
      education: i.candidateSnapshot?.education || [],
      experience: i.candidateSnapshot?.experience || [],
      certificates: i.candidateSnapshot?.certificates || [],
      portfolioUrl: i.candidateSnapshot?.portfolioUrl,
      roleTitle: i.roleTitle,
      stage: i.stage,
      resumeUrl: i.resumeUrl,
    })),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

async function sendBulkCommunication(companyId, actorUserId, { applicationIds, title, body, type = 'update' }) {
  if (!applicationIds?.length || !title) throw err('applicationIds and title required')
  const apps = await RecruitmentApplication.find({
    _id: { $in: applicationIds },
    companyId,
  })
  const results = []
  for (const app of apps) {
    if (app.candidateUserId) {
      await notifyRecruitment(
        app.candidateUserId,
        'student',
        'recruitment_bulk_announcement',
        title,
        body,
        { applicationId: app._id.toString() },
      )
    }
    results.push({ id: app._id.toString(), success: true })
  }
  return results
}

async function updateRecruiterTeam(companyId, team) {
  if (!Array.isArray(team)) throw err('Team array required')
  const sanitized = team.map((m) => ({
    userId: m.userId || null,
    name: m.name || '',
    email: m.email || '',
    role: COMPANY_ROLES.includes(m.role) ? m.role : 'recruiter',
  }))
  await Company.updateOne({ _id: companyId }, { recruiterTeam: sanitized })
  const company = await Company.findById(companyId)
  return company.recruiterTeam
}

async function listPartnerInstitutions(companyId) {
  const partnerships = await InstitutionCompanyPartnership.find({
    companyId: oid(companyId),
    status: 'active',
  }).lean()
  const institutions = await Institution.find({
    _id: { $in: partnerships.map((p) => p.institutionId) },
  }).select('name email location industry').lean()
  return partnerships.map((p) => {
    const inst = institutions.find((i) => i._id.toString() === p.institutionId.toString())
    return {
      partnershipId: p._id.toString(),
      institutionId: p.institutionId.toString(),
      institutionName: inst?.name || 'Unknown',
      relationshipType: p.relationshipType,
      status: p.status,
    }
  })
}

module.exports = {
  listInterviews,
  rescheduleInterview,
  cancelInterview,
  recordInterviewOutcome,
  listPanels,
  createPanel,
  updatePanel,
  assignPanelToApplication,
  createOfferDraft,
  transitionOffer,
  updateOnboardingStatus,
  discoverTalent,
  sendBulkCommunication,
  updateRecruiterTeam,
  listPartnerInstitutions,
}
