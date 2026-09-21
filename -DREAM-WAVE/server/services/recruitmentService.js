const mongoose = require('mongoose')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationNote = require('../models/ApplicationNote')
const ApplicationActivity = require('../models/ApplicationActivity')
const ApplicationAssessment = require('../models/ApplicationAssessment')
const User = require('../models/User')
const UserProfile = require('../models/UserProfile')
const Company = require('../models/Company')
const {
  APPLICATION_STAGES,
  RECRUITER_TAGS,
  REJECTION_REASONS,
  INTERVIEW_ROUNDS,
  INTERVIEW_RECOMMENDATIONS,
  ASSESSMENT_TYPES,
  VALID_STAGE_TRANSITIONS,
  normalizeStage,
  assertStageTransition,
  isTerminalStage,
} = require('../constants/recruitment')
const {
  DEFAULT_PIPELINE_STAGES,
  normalizeListingStatus,
  isActiveListingStatus,
  JOB_ACTIONS,
  INTERNSHIP_ACTIONS,
} = require('../constants/companyRecruitment')
const { recordRecruitmentAudit } = require('./recruitmentAuditService')
const { notifyUser } = require('./platformNotificationService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function sanitizeText(text, max = 5000) {
  if (!text) return ''
  return String(text).slice(0, max).trim()
}

/** Safe candidate snapshot for company recruiters — no AI/private student data */
async function buildCandidateSnapshot(userId, overrides = {}) {
  if (!userId) return overrides
  const [user, profile] = await Promise.all([
    User.findById(userId).select('name email'),
    UserProfile.findOne({ userId }).select('skills currentRole targetRole'),
  ])
  if (!user) return overrides
  return {
    name: overrides.name || user.name || '',
    email: overrides.email || user.email || '',
    phone: overrides.phone || '',
    skills: overrides.skills || profile?.skills || [],
    education: overrides.education || [],
    experience: overrides.experience || [],
    projects: overrides.projects || [],
    certificates: overrides.certificates || [],
    portfolioUrl: overrides.portfolioUrl || '',
  }
}

function serializeApplication(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  const answers = (o.applicationAnswers || []).map((a) => ({
    question: a.question,
    answer: a.answer,
    type: a.answerType || a.type || 'text',
  }))
  return {
    id: o._id?.toString(),
    ...o,
    applicationAnswers: answers,
    _id: undefined,
  }
}

function normalizeApplicationAnswers(answers = []) {
  if (!Array.isArray(answers)) return []
  return answers.map((a) => ({
    question: a.question || '',
    answer: a.answer || '',
    answerType: a.answerType || a.type || 'text',
  }))
}

async function recordActivity({
  companyId,
  applicationId,
  type,
  title,
  description = '',
  actorUserId = null,
  previousState = null,
  newState = null,
  isInternal = true,
  metadata = {},
}) {
  return ApplicationActivity.create({
    companyId,
    applicationId,
    type,
    title,
    description,
    actorUserId,
    previousState,
    newState,
    isInternal,
    metadata,
  })
}

async function assertCompanyApplication(companyId, applicationId) {
  const app = await RecruitmentApplication.findOne({
    _id: applicationId,
    companyId,
  })
  if (!app) throw err('Application not found', 404)
  return app
}

async function getAtsStats(companyId) {
  const base = { companyId: new mongoose.Types.ObjectId(companyId) }
  const [stageCounts, total, interviewsToday, offersPending, hiredMonth] = await Promise.all([
    RecruitmentApplication.aggregate([
      { $match: base },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]),
    RecruitmentApplication.countDocuments({ companyId }),
    RecruitmentInterview.countDocuments({
      companyId,
      status: 'scheduled',
      scheduledDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    RecruitmentOffer.countDocuments({ companyId, status: 'released' }),
    RecruitmentApplication.countDocuments({
      companyId,
      stage: 'hired',
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ])

  const byStage = Object.fromEntries(stageCounts.map((s) => [s._id, s.count]))
  const count = (stages) =>
    stages.reduce((sum, st) => sum + (byStage[st] || 0), 0)

  return {
    totalApplicants: total,
    newApplicants: count(['applied']),
    underReview: count(['screening', 'under_review']),
    shortlisted: count(['shortlisted']),
    assessments: count(['assessment', 'assessment_passed']),
    interviews: count(['interview', 'final_interview']),
    selected: count(['selected']),
    offersReleased: count(['offer_released', 'offer_accepted', 'offer_declined']),
    hired: count(['hired']),
    rejected: count(['rejected']),
    withdrawn: count(['withdrawn']),
    interviewsToday,
    offersPending,
    hiredThisMonth: hiredMonth,
    byStage,
  }
}

async function getFunnel(companyId) {
  const stats = await getAtsStats(companyId)
  const { byStage } = stats
  const sum = (...stages) => stages.reduce((t, s) => t + (byStage[s] || 0), 0)

  const applicants = stats.totalApplicants
  const reviewed = sum('screening', 'under_review', 'shortlisted', 'assessment', 'assessment_passed', 'interview', 'final_interview', 'selected', 'offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const shortlisted = sum('shortlisted', 'assessment', 'assessment_passed', 'interview', 'final_interview', 'selected', 'offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const assessed = sum('assessment_passed', 'interview', 'final_interview', 'selected', 'offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const interviewed = sum('interview', 'final_interview', 'selected', 'offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const selected = sum('selected', 'offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const offered = sum('offer_released', 'offer_accepted', 'offer_declined', 'hired')
  const hired = byStage.hired || 0

  return {
    applicants,
    reviewed,
    shortlisted,
    assessed,
    interviewed,
    selected,
    offered,
    hired,
  }
}

async function listApplications(companyId, filters = {}) {
  const query = { companyId }
  if (filters.stage && filters.stage !== 'all') {
    query.stage = normalizeStage(filters.stage)
  }
  if (filters.jobId) query.jobId = filters.jobId
  if (filters.internshipId) query.internshipId = filters.internshipId
  if (filters.institutionId) query.institutionId = filters.institutionId
  if (filters.department) query.department = new RegExp(filters.department, 'i')
  if (filters.graduationYear) query.graduationYear = filters.graduationYear
  if (filters.tag) query.tags = filters.tag
  if (filters.assignedRecruiterUserId) {
    query.assignedRecruiterUserId = filters.assignedRecruiterUserId
  }
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {}
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom)
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo)
  }
  if (filters.q) query.$text = { $search: filters.q }

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    updated: { updatedAt: -1 },
    stage: { stage: 1, updatedAt: -1 },
    name: { 'candidateSnapshot.name': 1 },
  }
  const sort = sortMap[filters.sort] || sortMap.updated

  const [items, total] = await Promise.all([
    RecruitmentApplication.find(query).sort(sort).skip(skip).limit(limit).lean(),
    RecruitmentApplication.countDocuments(query),
  ])

  return {
    items: items.map((i) => ({ id: i._id.toString(), ...i, _id: undefined })),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

function getAllowedTransitions(stage) {
  const normalized = normalizeStage(stage)
  return VALID_STAGE_TRANSITIONS[normalized] || []
}

async function getApplicationDetail(companyId, applicationId) {
  const app = await assertCompanyApplication(companyId, applicationId)
  const [notes, activity, assessments, interviews, offer] = await Promise.all([
    ApplicationNote.find({ companyId, applicationId }).sort({ createdAt: -1 }).lean(),
    ApplicationActivity.find({ companyId, applicationId }).sort({ createdAt: -1 }).limit(50).lean(),
    ApplicationAssessment.find({ companyId, applicationId }).sort({ createdAt: -1 }).lean(),
    RecruitmentInterview.find({ companyId, applicationId }).sort({ scheduledDate: -1 }).lean(),
    RecruitmentOffer.findOne({ companyId, applicationId }).lean(),
  ])
  return {
    application: serializeApplication(app),
    notes,
    activity,
    assessments,
    interviews,
    offer,
  }
}

async function createApplication(companyId, actorUserId, payload) {
  const {
    candidateUserId,
    candidateSnapshot,
    opportunityType,
    jobId,
    internshipId,
    driveId,
    roleTitle,
    institutionId,
    institutionName,
    partnershipId,
    department,
    graduationYear,
    cgpa,
    skillsSummary,
    applicationAnswers,
    resumeUrl,
    resumeFileName,
  } = payload

  if (!opportunityType || !roleTitle) throw err('opportunityType and roleTitle are required')

  const snapshot = candidateUserId
    ? await buildCandidateSnapshot(candidateUserId, candidateSnapshot || {})
    : candidateSnapshot || {}

  if (!snapshot.name) throw err('Candidate name is required')

  const doc = await RecruitmentApplication.create({
    companyId,
    candidateUserId: candidateUserId || null,
    candidateSnapshot: snapshot,
    opportunityType,
    jobId: jobId || null,
    internshipId: internshipId || null,
    driveId: driveId || null,
    roleTitle,
    institutionId: institutionId || null,
    institutionName: institutionName || '',
    partnershipId: partnershipId || null,
    department: department || '',
    graduationYear: graduationYear || '',
    cgpa: cgpa ?? null,
    skillsSummary: skillsSummary || snapshot.skills?.join(', ') || '',
    applicationAnswers: normalizeApplicationAnswers(applicationAnswers),
    resumeUrl: resumeUrl || '',
    resumeFileName: resumeFileName || '',
    resumeUploadedAt: resumeUrl ? new Date() : null,
    stage: 'applied',
    createdByUserId: actorUserId,
  })

  await recordActivity({
    companyId,
    applicationId: doc._id,
    type: 'application_submitted',
    title: 'Application submitted',
    actorUserId,
    newState: 'applied',
    isInternal: false,
  })

  if (candidateUserId) {
    await notifyUser({
      recipientUserId: candidateUserId,
      recipientRole: 'student',
      type: 'recruitment_application_received',
      title: 'Application received',
      body: `Your application for ${roleTitle} was received.`,
      metadata: { applicationId: doc._id },
    }).catch(() => {})
  }

  await recordRecruitmentAudit({
    companyId,
    action: 'candidate_applied',
    actorUserId,
    description: `Candidate applied: ${snapshot.name} for ${roleTitle}`,
    metadata: { applicationId: doc._id, roleTitle },
  }).catch(() => {})

  return doc
}

async function transitionStage(companyId, applicationId, nextStage, actorUserId, options = {}) {
  const app = await assertCompanyApplication(companyId, applicationId)
  const current = normalizeStage(app.stage)
  const target = normalizeStage(nextStage)

  if (isTerminalStage(current) && current !== 'withdrawn') {
    throw err(`Cannot transition from terminal stage: ${current}`)
  }

  assertStageTransition(current, target)

  if (target === 'rejected') {
    app.rejectionInternalReason = sanitizeText(options.internalReason)
    app.rejectionCandidateMessage = sanitizeText(options.candidateMessage, 1000)
  }

  if (target === 'withdrawn') {
    app.withdrawnAt = new Date()
    app.withdrawnBy = options.withdrawnBy || 'recruiter'
  }

  const previous = app.stage
  app.stage = target
  await app.save()

  await recordActivity({
    companyId,
    applicationId: app._id,
    type: target === 'rejected' ? 'rejected' : target === 'hired' ? 'hired' : 'stage_changed',
    title: `Stage changed to ${target}`,
    description: options.note || '',
    actorUserId,
    previousState: previous,
    newState: target,
    isInternal: target === 'rejected',
  })

  if (target === 'shortlisted') {
    await recordRecruitmentAudit({
      companyId,
      action: 'candidate_shortlisted',
      actorUserId,
      description: `Candidate shortlisted: ${app.candidateSnapshot?.name || 'Unknown'}`,
      metadata: { applicationId: app._id, roleTitle: app.roleTitle },
    }).catch(() => {})
  }

  return app
}

async function assignRecruiter(companyId, applicationId, recruiterUserId, actorUserId) {
  const app = await assertCompanyApplication(companyId, applicationId)
  app.assignedRecruiterUserId = recruiterUserId
  app.assignedAt = new Date()
  app.assignedByUserId = actorUserId
  await app.save()

  await recordActivity({
    companyId,
    applicationId: app._id,
    type: 'recruiter_assigned',
    title: 'Recruiter assigned',
    actorUserId,
  })

  return app
}

async function bulkAssign(companyId, applicationIds, recruiterUserId, actorUserId) {
  const results = []
  for (const id of applicationIds) {
    try {
      results.push(await assignRecruiter(companyId, id, recruiterUserId, actorUserId))
    } catch (e) {
      results.push({ id, error: e.message })
    }
  }
  return results
}

async function bulkTransition(companyId, applicationIds, stage, actorUserId) {
  const results = []
  for (const id of applicationIds) {
    try {
      results.push(await transitionStage(companyId, id, stage, actorUserId))
    } catch (e) {
      results.push({ id, error: e.message })
    }
  }
  return results
}

async function addNote(companyId, applicationId, actorUserId, { content, type = 'internal' }) {
  await assertCompanyApplication(companyId, applicationId)
  const note = await ApplicationNote.create({
    companyId,
    applicationId,
    type,
    content: sanitizeText(content),
    authorUserId: actorUserId,
  })

  await recordActivity({
    companyId,
    applicationId,
    type: 'note_added',
    title: 'Note added',
    description: sanitizeText(content, 200),
    actorUserId,
    isInternal: true,
  })

  return note
}

async function updateTags(companyId, applicationId, tags, actorUserId) {
  const app = await assertCompanyApplication(companyId, applicationId)
  const valid = tags.filter((t) => RECRUITER_TAGS.includes(t))
  app.tags = valid
  await app.save()

  await recordActivity({
    companyId,
    applicationId: app._id,
    type: 'tag_added',
    title: 'Tags updated',
    description: valid.join(', '),
    actorUserId,
  })

  return app
}

async function updateRatings(companyId, applicationId, ratings) {
  const app = await assertCompanyApplication(companyId, applicationId)
  const fields = ['technicalFit', 'communication', 'experienceFit', 'roleFit']
  for (const f of fields) {
    if (ratings[f] != null) {
      const v = Number(ratings[f])
      if (v >= 1 && v <= 5) app.ratings[f] = v
    }
  }
  await app.save()
  return app
}

async function checkInterviewConflict(companyId, scheduledDate, scheduledTime, interviewers = [], excludeId = null) {
  if (!scheduledDate) return null
  const dayStart = new Date(scheduledDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(scheduledDate)
  dayEnd.setHours(23, 59, 59, 999)

  const query = {
    companyId: new mongoose.Types.ObjectId(companyId),
    status: { $in: ['scheduled', 'rescheduled'] },
    scheduledDate: { $gte: dayStart, $lte: dayEnd },
  }
  if (excludeId) query._id = { $ne: new mongoose.Types.ObjectId(excludeId) }
  if (scheduledTime) query.scheduledTime = scheduledTime

  const conflicts = await RecruitmentInterview.find(query).lean()
  if (!interviewers.length) return conflicts.length ? conflicts[0] : null

  const names = new Set(interviewers.map((n) => String(n).toLowerCase()))
  const panelConflict = conflicts.find((c) =>
    (c.interviewers || []).some((i) => names.has(String(i).toLowerCase())),
  )
  return panelConflict || (conflicts.length && scheduledTime ? conflicts[0] : null)
}

async function scheduleInterview(companyId, applicationId, actorUserId, payload) {
  const app = await assertCompanyApplication(companyId, applicationId)
  if (isTerminalStage(app.stage)) throw err('Cannot schedule interview for terminal application')

  let interviewers = payload.interviewers || []
  if (payload.panelId) {
    const InterviewPanel = require('../models/InterviewPanel')
    const panel = await InterviewPanel.findOne({ _id: payload.panelId, companyId })
    if (panel) {
      interviewers = panel.members.map((m) => m.name).filter(Boolean)
    }
  }

  const conflict = await checkInterviewConflict(
    companyId,
    payload.scheduledDate,
    payload.scheduledTime,
    interviewers,
  )
  if (conflict) throw err('Scheduling conflict detected for interviewer or time slot', 409)

  const interview = await RecruitmentInterview.create({
    companyId,
    applicationId: app._id,
    candidateUserId: app.candidateUserId,
    roleTitle: app.roleTitle,
    round: payload.round || 'Screening',
    interviewType: payload.interviewType || payload.mode || 'online',
    panelId: payload.panelId || null,
    interviewers,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime || '',
    mode: payload.mode || 'online',
    meetingLink: payload.meetingLink || '',
    venue: payload.venue || '',
    createdByUserId: actorUserId,
  })

  await recordActivity({
    companyId,
    applicationId: app._id,
    type: 'interview_scheduled',
    title: `Interview scheduled: ${interview.round}`,
    actorUserId,
    isInternal: false,
  })

  if (app.candidateUserId) {
    await notifyUser({
      recipientUserId: app.candidateUserId,
      recipientRole: 'student',
      type: 'recruitment_interview_scheduled',
      title: 'Interview scheduled',
      body: `An interview was scheduled for ${app.roleTitle}.`,
      metadata: { applicationId: app._id.toString(), interviewId: interview._id.toString() },
    }).catch(() => {})
  }

  await recordRecruitmentAudit({
    companyId,
    action: 'interview_scheduled',
    actorUserId,
    description: `Interview scheduled: ${interview.round} for ${app.roleTitle}`,
    metadata: { applicationId: app._id, interviewId: interview._id },
  }).catch(() => {})

  return interview
}

async function submitInterviewFeedback(companyId, interviewId, actorUserId, feedback) {
  const interview = await RecruitmentInterview.findOne({ _id: interviewId, companyId })
  if (!interview) throw err('Interview not found', 404)

  interview.feedback = {
    recommendation: feedback.recommendation,
    strengths: sanitizeText(feedback.strengths),
    concerns: sanitizeText(feedback.concerns),
    technicalFeedback: sanitizeText(feedback.technicalFeedback),
    communicationFeedback: sanitizeText(feedback.communicationFeedback),
    roleFit: sanitizeText(feedback.roleFit),
    privateNotes: sanitizeText(feedback.privateNotes),
    scores: feedback.scores || {},
    submittedByUserId: actorUserId,
    submittedAt: new Date(),
  }
  interview.status = 'completed'
  await interview.save()

  await recordActivity({
    companyId,
    applicationId: interview.applicationId,
    type: 'feedback_submitted',
    title: 'Interview feedback submitted',
    actorUserId,
    isInternal: true,
  })

  await recordRecruitmentAudit({
    companyId,
    action: 'interview_completed',
    actorUserId,
    description: `Interview completed with recommendation: ${feedback.recommendation || 'N/A'}`,
    metadata: { interviewId: interview._id, applicationId: interview.applicationId },
  }).catch(() => {})

  return interview
}

async function createAssessment(companyId, applicationId, actorUserId, payload) {
  await assertCompanyApplication(companyId, applicationId)
  const assessment = await ApplicationAssessment.create({
    companyId,
    applicationId,
    name: payload.name,
    type: payload.type,
    scheduledDate: payload.scheduledDate || null,
    createdByUserId: actorUserId,
  })

  await recordActivity({
    companyId,
    applicationId,
    type: 'assessment_scheduled',
    title: `Assessment scheduled: ${payload.name}`,
    actorUserId,
  })

  return assessment
}

async function completeAssessment(companyId, assessmentId, actorUserId, { score, result }) {
  const assessment = await ApplicationAssessment.findOne({ _id: assessmentId, companyId })
  if (!assessment) throw err('Assessment not found', 404)
  assessment.status = 'completed'
  assessment.score = score ?? null
  assessment.result = sanitizeText(result)
  assessment.reviewerUserId = actorUserId
  await assessment.save()

  await recordActivity({
    companyId,
    applicationId: assessment.applicationId,
    type: 'assessment_completed',
    title: 'Assessment completed',
    actorUserId,
  })

  return assessment
}

async function releaseOffer(companyId, applicationId, actorUserId, payload) {
  const app = await assertCompanyApplication(companyId, applicationId)
  if (!['selected', 'offer_released'].includes(normalizeStage(app.stage))) {
    assertStageTransition(app.stage, 'offer_released')
    app.stage = 'offer_released'
    await app.save()
  }

  let offer = await RecruitmentOffer.findOne({ companyId, applicationId })
  if (offer) {
    Object.assign(offer, payload, { status: 'released', releasedAt: new Date() })
    await offer.save()
  } else {
    offer = await RecruitmentOffer.create({
      companyId,
      applicationId,
      roleTitle: app.roleTitle,
      department: payload.department || app.department,
      salary: payload.salary || 0,
      location: payload.location || '',
      joiningDate: payload.joiningDate || null,
      expiryDate: payload.expiryDate || null,
      status: 'released',
      releasedAt: new Date(),
      createdByUserId: actorUserId,
    })
  }

  await recordActivity({
    companyId,
    applicationId,
    type: 'offer_released',
    title: 'Offer released',
    actorUserId,
    isInternal: false,
  })

  return offer
}

async function bulkUpdateTags(companyId, applicationIds, tags, actorUserId) {
  const valid = tags.filter((t) => RECRUITER_TAGS.includes(t))
  const results = []
  for (const id of applicationIds) {
    try {
      results.push(await updateTags(companyId, id, valid, actorUserId))
    } catch (e) {
      results.push({ id, error: e.message })
    }
  }
  return results
}

async function createJob(companyId, actorUserId, payload) {
  const job = await RecruitmentJob.create({
    ...payload,
    companyId,
    status: payload.status || 'draft',
    createdByUserId: actorUserId,
  })
  if (isActiveListingStatus(job.status)) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeJobsCount: 1 } })
  }
  await recordRecruitmentAudit({
    companyId,
    action: 'job_created',
    actorUserId,
    description: `Job created: ${job.title}`,
    metadata: { jobId: job._id, title: job.title },
  }).catch(() => {})
  return job
}

async function getJob(companyId, jobId) {
  const job = await RecruitmentJob.findOne({ _id: jobId, companyId })
  if (!job) throw err('Job not found', 404)
  return job
}

async function updateJob(companyId, jobId, payload) {
  const job = await getJob(companyId, jobId)
  const wasActive = isActiveListingStatus(job.status)
  const allowed = [
    'title', 'department', 'location', 'workMode', 'salary', 'salaryMin', 'salaryMax',
    'experience', 'eligibility', 'requiredSkills', 'responsibilities', 'qualifications',
    'hiringManager', 'jobType', 'deadline', 'openings', 'selectionProcess', 'applicationQuestions',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) job[key] = payload[key]
  }
  await job.save()
  const nowActive = isActiveListingStatus(job.status)
  if (!wasActive && nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeJobsCount: 1 } })
  } else if (wasActive && !nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeJobsCount: -1 } })
  }
  return job
}

async function transitionJobStatus(companyId, jobId, action) {
  if (!JOB_ACTIONS.includes(action)) throw err('Invalid job action')
  const job = await getJob(companyId, jobId)
  const wasActive = isActiveListingStatus(job.status)
  const current = normalizeListingStatus(job.status)

  switch (action) {
    case 'publish':
      if (!['draft', 'closed'].includes(current) && current !== 'published') {
        throw err(`Cannot publish job in status: ${job.status}`)
      }
      job.status = 'published'
      job.publishedAt = new Date()
      break
    case 'close':
      job.status = 'closed'
      job.closedAt = new Date()
      break
    case 'archive':
      job.status = 'archived'
      job.archivedAt = new Date()
      break
    case 'reopen':
      job.status = 'published'
      job.publishedAt = new Date()
      job.closedAt = null
      job.archivedAt = null
      break
    default:
      throw err('Invalid action')
  }
  await job.save()
  const nowActive = isActiveListingStatus(job.status)
  if (!wasActive && nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeJobsCount: 1 } })
  } else if (wasActive && !nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeJobsCount: -1 } })
  }
  if (['close', 'archive'].includes(action)) {
    await recordRecruitmentAudit({
      companyId,
      action: 'job_closed',
      description: `Job ${action === 'archive' ? 'archived' : 'closed'}: ${job.title}`,
      metadata: { jobId: job._id, action },
    }).catch(() => {})
  }
  return job
}

async function listInternships(companyId, filters = {}) {
  const query = { companyId }
  if (filters.status) query.status = filters.status
  return RecruitmentInternship.find(query).sort({ updatedAt: -1 }).lean()
}

async function createInternship(companyId, actorUserId, payload) {
  const internship = await RecruitmentInternship.create({
    ...payload,
    companyId,
    status: payload.status || 'draft',
    createdByUserId: actorUserId,
  })
  if (isActiveListingStatus(internship.status)) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeInternshipsCount: 1 } })
  }
  return internship
}

async function getInternship(companyId, internshipId) {
  const internship = await RecruitmentInternship.findOne({ _id: internshipId, companyId })
  if (!internship) throw err('Internship not found', 404)
  return internship
}

async function updateInternship(companyId, internshipId, payload) {
  const internship = await getInternship(companyId, internshipId)
  const wasActive = isActiveListingStatus(internship.status)
  const allowed = [
    'title', 'department', 'duration', 'location', 'workMode', 'stipend', 'eligibility',
    'requiredSkills', 'deadline', 'openPositions', 'startDate', 'endDate',
    'mentorName', 'mentorEmail', 'mentorTitle', 'applicationQuestions',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) internship[key] = payload[key]
  }
  await internship.save()
  const nowActive = isActiveListingStatus(internship.status)
  if (!wasActive && nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeInternshipsCount: 1 } })
  } else if (wasActive && !nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeInternshipsCount: -1 } })
  }
  return internship
}

async function transitionInternshipStatus(companyId, internshipId, action) {
  if (!INTERNSHIP_ACTIONS.includes(action)) throw err('Invalid internship action')
  const internship = await getInternship(companyId, internshipId)
  const wasActive = isActiveListingStatus(internship.status)
  const current = normalizeListingStatus(internship.status)

  switch (action) {
    case 'publish':
      if (!['draft', 'closed'].includes(current) && current !== 'published') {
        throw err(`Cannot publish internship in status: ${internship.status}`)
      }
      internship.status = 'published'
      internship.publishedAt = new Date()
      break
    case 'close':
      internship.status = 'closed'
      internship.closedAt = new Date()
      break
    case 'archive':
      internship.status = 'archived'
      internship.archivedAt = new Date()
      break
    case 'reopen':
      internship.status = 'published'
      internship.publishedAt = new Date()
      internship.closedAt = null
      internship.archivedAt = null
      break
    default:
      throw err('Invalid action')
  }
  await internship.save()
  const nowActive = isActiveListingStatus(internship.status)
  if (!wasActive && nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeInternshipsCount: 1 } })
  } else if (wasActive && !nowActive) {
    await Company.updateOne({ _id: companyId }, { $inc: { activeInternshipsCount: -1 } })
  }
  return internship
}

function serializeCompanyProfile(company) {
  const o = company.toObject ? company.toObject() : company
  return {
    id: o._id?.toString(),
    name: o.name,
    industry: o.industry,
    email: o.email,
    phone: o.phone,
    website: o.website,
    logoUrl: o.logoUrl,
    location: o.location,
    city: o.city,
    country: o.country,
    about: o.about,
    description: o.description || o.about,
    companySize: o.companySize,
    headquarters: o.headquarters || o.location,
    hiringDepartments: o.hiringDepartments || [],
    hiringLocations: o.hiringLocations || [],
    hrContacts: o.hrContacts || [],
    recruiterTeam: o.recruiterTeam || [],
    careersPageUrl: o.careersPageUrl,
    socialLinks: o.socialLinks || {},
    status: o.status,
    verified: o.verified,
    activeJobsCount: o.activeJobsCount,
    activeInternshipsCount: o.activeInternshipsCount,
    pipelineStages: o.pipelineStages?.length ? o.pipelineStages : DEFAULT_PIPELINE_STAGES,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

async function getCompanyProfile(companyId) {
  const company = await Company.findById(companyId)
  if (!company) throw err('Company not found', 404)
  return serializeCompanyProfile(company)
}

async function updateCompanyProfile(companyId, payload) {
  const company = await Company.findById(companyId)
  if (!company) throw err('Company not found', 404)

  const allowed = [
    'name', 'industry', 'email', 'phone', 'website', 'logoUrl', 'location', 'city', 'country',
    'about', 'description', 'companySize', 'headquarters', 'hiringDepartments', 'hiringLocations',
    'hrContacts', 'recruiterTeam', 'careersPageUrl', 'socialLinks', 'status',
  ]
  for (const key of allowed) {
    if (payload[key] !== undefined) company[key] = payload[key]
  }
  if (payload.description && !payload.about) company.about = payload.description

  if (payload.name) {
    const duplicate = await Company.findOne({
      name: new RegExp(`^${String(payload.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      _id: { $ne: companyId },
    })
    if (duplicate) throw err('A company with this name already exists', 409)
  }

  await company.save()
  return serializeCompanyProfile(company)
}

async function getPipelineConfig(companyId) {
  const company = await Company.findById(companyId).select('pipelineStages')
  if (!company) throw err('Company not found', 404)
  return {
    stages: company.pipelineStages?.length ? company.pipelineStages : DEFAULT_PIPELINE_STAGES,
    availableStages: APPLICATION_STAGES,
  }
}

async function updatePipelineConfig(companyId, stages) {
  if (!Array.isArray(stages) || !stages.length) throw err('Pipeline stages required')
  const validKeys = new Set(APPLICATION_STAGES)
  const sanitized = stages
    .filter((s) => validKeys.has(s.key))
    .map((s, i) => ({
      key: s.key,
      label: sanitizeText(s.label || s.key, 80),
      enabled: s.enabled !== false,
      order: s.order ?? i,
    }))

  if (!sanitized.length) throw err('No valid pipeline stages')

  await Company.updateOne({ _id: companyId }, { pipelineStages: sanitized })
  return getPipelineConfig(companyId)
}

async function listApplicantDirectory(companyId, filters = {}) {
  const match = { companyId: new mongoose.Types.ObjectId(companyId) }
  if (filters.q) {
    const regex = new RegExp(String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [
      { 'candidateSnapshot.name': regex },
      { 'candidateSnapshot.email': regex },
      { roleTitle: regex },
    ]
  }
  if (filters.department) match.department = new RegExp(filters.department, 'i')

  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          candidateKey: {
            $ifNull: [{ $toString: '$candidateUserId' }, '$candidateSnapshot.email'],
          },
        },
        candidateUserId: { $first: '$candidateUserId' },
        name: { $first: '$candidateSnapshot.name' },
        email: { $first: '$candidateSnapshot.email' },
        phone: { $first: '$candidateSnapshot.phone' },
        skills: { $first: '$candidateSnapshot.skills' },
        applicationCount: { $sum: 1 },
        latestStage: { $last: '$stage' },
        latestApplied: { $max: '$createdAt' },
        roles: { $addToSet: '$roleTitle' },
        departments: { $addToSet: '$department' },
        resumeUrl: { $last: '$resumeUrl' },
      },
    },
    { $sort: { latestApplied: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]

  const [result] = await RecruitmentApplication.aggregate(pipeline)
  const total = result.total[0]?.count || 0
  const items = (result.items || []).map((i) => ({
    id: i._id.candidateKey,
    candidateUserId: i.candidateUserId?.toString() || null,
    name: i.name || 'Unknown',
    email: i.email || '',
    phone: i.phone || '',
    skills: i.skills || [],
    applicationCount: i.applicationCount,
    latestStage: i.latestStage,
    latestApplied: i.latestApplied,
    roles: i.roles || [],
    departments: (i.departments || []).filter(Boolean),
    resumeUrl: i.resumeUrl || '',
  }))

  return { items, total, page, limit, pageCount: Math.ceil(total / limit) || 1 }
}

async function listShortlisted(companyId, filters = {}) {
  return listApplications(companyId, { ...filters, stage: 'shortlisted' })
}

async function bulkShortlistAction(companyId, applicationIds, action, actorUserId, options = {}) {
  const stageMap = {
    approve: 'shortlisted',
    reject: 'rejected',
    move_to_assessment: 'assessment',
    move_to_interview: 'interview',
  }
  const target = stageMap[action]
  if (!target) throw err('Invalid shortlist action')

  const results = []
  for (const id of applicationIds) {
    try {
      const app = await transitionStage(companyId, id, target, actorUserId, options)
      results.push({ id, success: true, application: serializeApplication(app) })
    } catch (e) {
      results.push({ id, success: false, error: e.message })
    }
  }
  return results
}

async function listJobs(companyId, filters = {}) {
  const query = { companyId }
  if (filters.status) query.status = filters.status
  if (filters.q) {
    query.$or = [
      { title: new RegExp(filters.q, 'i') },
      { department: new RegExp(filters.q, 'i') },
    ]
  }
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    RecruitmentJob.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    RecruitmentJob.countDocuments(query),
  ])

  return {
    items: items.map((j) => ({ id: j._id.toString(), ...j, _id: undefined })),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

module.exports = {
  APPLICATION_STAGES,
  RECRUITER_TAGS,
  REJECTION_REASONS,
  INTERVIEW_ROUNDS,
  INTERVIEW_RECOMMENDATIONS,
  ASSESSMENT_TYPES,
  getAtsStats,
  getFunnel,
  listApplications,
  getApplicationDetail,
  createApplication,
  transitionStage,
  assignRecruiter,
  bulkAssign,
  bulkTransition,
  addNote,
  updateTags,
  updateRatings,
  scheduleInterview,
  submitInterviewFeedback,
  createAssessment,
  completeAssessment,
  releaseOffer,
  bulkUpdateTags,
  getAllowedTransitions,
  getCompanyProfile,
  updateCompanyProfile,
  getPipelineConfig,
  updatePipelineConfig,
  listApplicantDirectory,
  listShortlisted,
  bulkShortlistAction,
  listJobs,
  getJob,
  createJob,
  updateJob,
  transitionJobStatus,
  listInternships,
  getInternship,
  createInternship,
  updateInternship,
  transitionInternshipStatus,
  assertCompanyApplication,
  serializeApplication,
  serializeCompanyProfile,
  checkInterviewConflict,
}
