const {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  PROGRAM_LINK_TYPES,
} = require('../constants/institutionPrograms')
const {
  createProgram,
  listPrograms,
  getProgramById,
  updateProgram,
  updateProgramStatus,
  linkEntity,
  getProgramDashboard,
  updateParticipantStatus,
  assertProgramAccess,
} = require('../services/institutionProgramService')
const { generateOrganizerInsight, ORGANIZER_INTENTS } = require('../services/programAiService')
const ProgramParticipant = require('../models/ProgramParticipant')
const ProgramActivity = require('../models/ProgramActivity')

function actorFromReq(req) {
  return {
    userId: req.user._id,
    role: req.user.role,
    institution: req.institution,
    company: req.company,
  }
}

function serializeProgram(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return { ...o, id: o._id?.toString() }
}

exports.getMeta = (_req, res) => {
  res.json({
    success: true,
    programTypes: PROGRAM_TYPES,
    programStatuses: PROGRAM_STATUSES,
    linkTypes: PROGRAM_LINK_TYPES,
  })
}

exports.listPrograms = async (req, res) => {
  try {
    const result = await listPrograms(req.query, actorFromReq(req))
    res.json({
      success: true,
      programs: result.items.map(serializeProgram),
      pagination: result,
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createProgram = async (req, res) => {
  try {
    const program = await createProgram(req.body, actorFromReq(req))
    res.status(201).json({ success: true, program: serializeProgram(program) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProgram = async (req, res) => {
  try {
    const program = await getProgramById(req.params.id)
    await assertProgramAccess(program, actorFromReq(req))
    res.json({ success: true, program: serializeProgram(program) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateProgram = async (req, res) => {
  try {
    const blocked = ['status', 'ownerRole', 'institutionId', 'companyId', 'partnershipId', 'createdByUserId']
    const updates = { ...req.body }
    for (const k of blocked) delete updates[k]
    const program = await updateProgram(req.params.id, updates, actorFromReq(req))
    res.json({ success: true, program: serializeProgram(program) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ success: false, message: 'status is required' })
    const program = await updateProgramStatus(req.params.id, status, actorFromReq(req))
    res.json({ success: true, program: serializeProgram(program) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await getProgramDashboard(req.params.id, actorFromReq(req))
    res.json({
      success: true,
      dashboard: {
        ...dashboard,
        program: serializeProgram(dashboard.program),
      },
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.linkEntity = async (req, res) => {
  try {
    const { entityType, entityId, label } = req.body
    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, message: 'entityType and entityId required' })
    }
    const program = await linkEntity(req.params.id, entityType, entityId, actorFromReq(req), label)
    res.json({ success: true, program: serializeProgram(program) })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listParticipants = async (req, res) => {
  try {
    const program = await getProgramById(req.params.id)
    await assertProgramAccess(program, actorFromReq(req))
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20)
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      ProgramParticipant.find({ programId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProgramParticipant.countDocuments({ programId: req.params.id }),
    ])
    res.json({ success: true, participants: items, pagination: { total, page, limit, pageCount: Math.ceil(total / limit) || 1 } })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updateParticipant = async (req, res) => {
  try {
    const { status, reviewMessage } = req.body
    if (!status) return res.status(400).json({ success: false, message: 'status is required' })
    const participant = await updateParticipantStatus(
      req.params.id,
      req.params.participantId,
      status,
      actorFromReq(req),
      reviewMessage,
    )
    res.json({ success: true, participant })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getActivity = async (req, res) => {
  try {
    const program = await getProgramById(req.params.id)
    await assertProgramAccess(program, actorFromReq(req))
    const activity = await ProgramActivity.find({ programId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({ success: true, activity })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiInsights = async (req, res) => {
  try {
    const intent = req.body?.intent || 'PROGRAM_SUMMARY'
    if (!ORGANIZER_INTENTS.includes(intent)) {
      return res.status(400).json({ success: false, message: 'Invalid intent' })
    }
    const result = await generateOrganizerInsight({
      programId: req.params.id,
      actor: actorFromReq(req),
      intent,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
