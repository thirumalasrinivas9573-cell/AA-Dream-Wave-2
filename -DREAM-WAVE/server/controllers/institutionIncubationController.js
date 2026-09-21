const incubationService = require('../services/institutionIncubationService')
const {
  INCUBATION_STAGES,
  STARTUP_CATEGORIES,
  STARTUP_STAGES,
  STARTUP_STATUSES,
  MENTOR_TYPES,
  SESSION_STATUSES,
  SESSION_TYPES,
  FUNDING_TYPES,
  FUNDING_STATUSES,
  INVESTOR_TYPES,
  INNOVATION_EVENT_TYPES,
  EVENT_STATUSES,
  COLLABORATION_TYPES,
  TASK_STATUSES,
} = require('../constants/institutionIncubation')
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
    incubationStages: INCUBATION_STAGES,
    startupCategories: STARTUP_CATEGORIES,
    startupStages: STARTUP_STAGES,
    startupStatuses: STARTUP_STATUSES,
    mentorTypes: MENTOR_TYPES,
    sessionStatuses: SESSION_STATUSES,
    sessionTypes: SESSION_TYPES,
    fundingTypes: FUNDING_TYPES,
    fundingStatuses: FUNDING_STATUSES,
    investorTypes: INVESTOR_TYPES,
    eventTypes: INNOVATION_EVENT_TYPES,
    eventStatuses: EVENT_STATUSES,
    collaborationTypes: COLLABORATION_TYPES,
    taskStatuses: TASK_STATUSES,
  })
}

exports.getStats = async (req, res) => {
  try {
    const stats = await incubationService.getIncubationStats(institutionId(req))
    res.json({ success: true, stats })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = await incubationService.getIncubationWorkspace(institutionId(req))
    res.json({ success: true, workspace })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listStartups = async (req, res) => {
  try {
    const result = await incubationService.listStartups(institutionId(req), req.query, req.query)
    res.json({ success: true, startups: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createStartup = async (req, res) => {
  try {
    const startup = await incubationService.createStartup(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, startup })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateStartup = async (req, res) => {
  try {
    const startup = await incubationService.updateStartup(institutionId(req), req.params.id, req.body)
    res.json({ success: true, startup })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getIncubationRecord = async (req, res) => {
  try {
    const record = await incubationService.getIncubationRecord(institutionId(req), req.params.startupId)
    res.json({ success: true, record })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.advanceIncubation = async (req, res) => {
  try {
    const record = await incubationService.advanceIncubationStage(
      institutionId(req),
      req.params.startupId,
      req.body.stage,
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, record })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.assignMentor = async (req, res) => {
  try {
    const result = await incubationService.assignMentorToStartup(
      institutionId(req),
      req.params.startupId,
      req.body.mentorId,
      req.user._id,
    )
    res.json({ success: true, ...result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listMentors = async (req, res) => {
  try {
    const result = await incubationService.listMentors(institutionId(req), req.query, req.query)
    res.json({ success: true, mentors: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createMentor = async (req, res) => {
  try {
    const mentor = await incubationService.createMentor(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, mentor })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateMentor = async (req, res) => {
  try {
    const mentor = await incubationService.updateMentor(institutionId(req), req.params.id, req.body)
    res.json({ success: true, mentor })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listSessions = async (req, res) => {
  try {
    const result = await incubationService.listSessions(institutionId(req), req.query, req.query)
    res.json({ success: true, sessions: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createSession = async (req, res) => {
  try {
    const session = await incubationService.createSession(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, session })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.completeSession = async (req, res) => {
  try {
    const session = await incubationService.completeSession(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, session })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listFunding = async (req, res) => {
  try {
    const result = await incubationService.listFunding(institutionId(req), req.query, req.query)
    res.json({ success: true, funding: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createFunding = async (req, res) => {
  try {
    const funding = await incubationService.createFunding(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, funding })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateFunding = async (req, res) => {
  try {
    const funding = await incubationService.updateFunding(
      institutionId(req),
      req.params.id,
      req.body,
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, funding })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listInvestors = async (req, res) => {
  try {
    const result = await incubationService.listInvestors(institutionId(req), req.query, req.query)
    res.json({ success: true, investors: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createInvestor = async (req, res) => {
  try {
    const investor = await incubationService.createInvestor(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, investor })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.connectInvestor = async (req, res) => {
  try {
    const investor = await incubationService.connectInvestorToStartup(
      institutionId(req),
      req.params.id,
      req.body.startupId,
    )
    res.json({ success: true, investor })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listEvents = async (req, res) => {
  try {
    const result = await incubationService.listEvents(institutionId(req), req.query, req.query)
    res.json({ success: true, events: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createEvent = async (req, res) => {
  try {
    const event = await incubationService.createEvent(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.publishEvent = async (req, res) => {
  try {
    const event = await incubationService.publishEvent(institutionId(req), req.params.id)
    res.json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.registerForEvent = async (req, res) => {
  try {
    const event = await incubationService.registerForEvent(
      req.user._id,
      req.user.name,
      req.user.email,
      req.params.id,
    )
    res.status(201).json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.recordAttendance = async (req, res) => {
  try {
    const event = await incubationService.recordEventAttendance(
      institutionId(req),
      req.params.id,
      req.params.registrationId,
      req.body.status,
      req.body.outcomeNotes,
    )
    res.json({ success: true, event })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listCollaboration = async (req, res) => {
  try {
    const result = await incubationService.listCollaboration(institutionId(req), req.query, req.query)
    res.json({ success: true, items: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createCollaboration = async (req, res) => {
  try {
    const item = await incubationService.createCollaboration(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.body,
    )
    res.status(201).json({ success: true, item })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateCollaborationTask = async (req, res) => {
  try {
    const item = await incubationService.updateCollaborationTask(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, item })
  } catch (e) {
    sendApiError(res, e)
  }
}
