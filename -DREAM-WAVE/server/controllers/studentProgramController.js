const InstitutionStudent = require('../models/InstitutionStudent')
const {
  listDiscoverablePrograms,
  registerStudent,
  getProgramById,
  assertProgramAccess,
  listStudentPrograms,
  getProgramDashboard,
} = require('../services/institutionProgramService')
const { generateStudentInsight, STUDENT_INTENTS } = require('../services/programAiService')
const ProgramParticipant = require('../models/ProgramParticipant')

function serializeProgram(doc) {
  const o = doc?.toObject ? doc.toObject() : doc
  if (!o) return null
  return { ...o, id: o._id?.toString() }
}

async function resolveStudentInstitution(userId) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId }).lean()
  if (!student?.institutionId) {
    const err = new Error('Institution student profile required')
    err.statusCode = 403
    throw err
  }
  return { student, institutionId: student.institutionId }
}

exports.discover = async (req, res) => {
  try {
    const { institutionId } = await resolveStudentInstitution(req.user._id)
    const programs = await listDiscoverablePrograms(req.user._id, institutionId, req.query)
    res.json({ success: true, programs })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.myPrograms = async (req, res) => {
  try {
    const items = await listStudentPrograms(req.user._id)
    res.json({
      success: true,
      programs: items.map(({ participant, program }) => ({
        participant,
        program: serializeProgram(program),
      })),
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getProgram = async (req, res) => {
  try {
    const program = await getProgramById(req.params.id)
    const { institutionId } = await resolveStudentInstitution(req.user._id)
    await assertProgramAccess(program, {
      role: 'student',
      institutionId,
      userId: req.user._id,
    })
    const participant = await ProgramParticipant.findOne({
      programId: req.params.id,
      studentUserId: req.user._id,
    }).lean()
    res.json({ success: true, program: serializeProgram(program), participant })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.register = async (req, res) => {
  try {
    const { institutionId } = await resolveStudentInstitution(req.user._id)
    const participant = await registerStudent(req.params.id, req.user._id, institutionId)
    res.status(201).json({ success: true, participant })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudentDashboard = async (req, res) => {
  try {
    const program = await getProgramById(req.params.id)
    const { institutionId, student } = await resolveStudentInstitution(req.user._id)
    const participant = await ProgramParticipant.findOne({
      programId: req.params.id,
      studentUserId: req.user._id,
    }).lean()
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Not registered for this program' })
    }
    res.json({
      success: true,
      dashboard: {
        program: serializeProgram(program),
        participant,
        milestones: program.milestones || [],
        linkedEntities: program.linkedEntities || [],
        student: { name: student.name, course: student.course, department: student.department },
      },
    })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAiInsights = async (req, res) => {
  try {
    const intent = req.body?.intent || 'STUDENT_PROGRESS'
    if (!STUDENT_INTENTS.includes(intent)) {
      return res.status(400).json({ success: false, message: 'Invalid intent' })
    }
    const result = await generateStudentInsight({
      programId: req.params.id,
      studentUserId: req.user._id,
      intent,
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}
