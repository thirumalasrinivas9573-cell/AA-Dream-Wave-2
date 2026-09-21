const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.ACADEMIC_V3_ENABLED = 'true'
process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Task = require('../models/Task')
const KnowledgeGraphEdge = require('../models/KnowledgeGraphEdge')
const academicService = require('../services/academicService')
const syllabusService = require('../services/syllabusService')
const conceptMasteryService = require('../services/conceptMasteryService')
const examPrepService = require('../services/examPrepService')
const questionPaperService = require('../services/questionPaperService')
const academicStudyPlanService = require('../services/academicStudyPlanService')
const decisionSupportService = require('../services/decisionSupportService')
const knowledgeGraphService = require('../services/knowledgeGraphService')
const academicController = require('../controllers/academicController')

let mongod
let studentA
let studentB
let companyUser

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

async function invoke(handler, user, values = {}) {
  const res = response()
  await handler({ user: user ? { _id: user._id, role: user.role } : undefined, ...values }, res)
  return res
}

describe('Version 3 academic intelligence layer', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await mongoose.connection.dropDatabase()
    studentA = await User.create({ name: 'Asha', email: 'asha.academic@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.academic@example.com', password: 'Password123', role: 'student' })
    companyUser = await User.create({ name: 'Corp', email: 'corp.academic@example.com', password: 'Password123', role: 'company' })
  })

  it('creates academic profile, period, and subject with ownership', async () => {
    await academicService.addPeriod(studentA._id, { label: 'Semester 3', setActive: true, semester: 3 })
    const subject = await academicService.createSubject(studentA._id, { name: 'Data Structures', code: 'CS201' })
    const overview = await academicService.getOverview(studentA._id)
    assert.equal(overview.stats.subjectCount, 1)
    assert.equal(overview.profile.activePeriod.label, 'Semester 3')

    const cross = await AcademicSubjectFindSafe(studentB._id, subject._id)
    assert.equal(cross, null)
  })

  it('applies syllabus with validation and concept mapping without hallucinated marks', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Physics' })
    const units = [{
      title: 'Unit 1: Mechanics',
      topics: [{ title: 'Newton Laws' }, { title: 'Work Energy' }],
    }]
    const updated = await syllabusService.applySyllabus(studentA._id, subject._id, { units, source: 'manual' })
    assert.equal(updated.units.length, 1)
    assert.equal(updated.units[0].topics.length, 2)
    const concepts = await conceptMasteryService.listConcepts(studentA._id, subject._id)
    assert.equal(concepts.length, 2)
    assert.ok(!JSON.stringify(updated).includes('marks'))
  })

  it('proposes syllabus extraction for review and rejects empty structure commit', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Math' })
    const raw = 'Unit 1: Algebra\n1. Linear equations\n2. Quadratic equations'
    const proposal = await syllabusService.proposeExtraction(studentA._id, subject._id, raw)
    assert.ok(proposal.validated.length >= 1)
    assert.ok(proposal.disclaimer.includes('review'))
    assert.throws(() => syllabusService.validateSyllabusStructure([{ title: 'Bad', topics: [{ title: '' }] }]))
  })

  it('creates private notes and assignments linked to tasks', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'DBMS' })
    const note = await academicService.createNote(studentA._id, { subjectId: subject._id, title: 'Normalization', content: '1NF 2NF 3NF' })
    const assignment = await academicService.createAssignment(studentA._id, {
      subjectId: subject._id,
      title: 'ER Diagram assignment',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      createTask: true,
    })
    assert.ok(note._id)
    assert.ok(assignment.taskId)
    const task = await Task.findById(assignment.taskId)
    assert.equal(task.userId.toString(), studentA._id.toString())

    const bNotes = await academicService.listNotes(studentB._id, { q: 'Normalization' })
    assert.equal(bNotes.total, 0)
  })

  it('builds exam countdown and preparation plan from real syllabus', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Data Structures' })
    await syllabusService.applySyllabus(studentA._id, subject._id, {
      units: [{ title: 'Unit 1', topics: [{ title: 'Arrays' }, { title: 'Linked Lists', status: 'NEEDS_REVISION' }] }],
    })
    const examDate = new Date(Date.now() + 5 * 86400000)
    const exam = await academicService.createExam(studentA._id, {
      subjectId: subject._id,
      name: 'Midterm',
      scheduledAt: examDate.toISOString(),
    })
    const ownedSubject = await academicService.getOwnedSubject(studentA._id, subject._id)
    const prep = await examPrepService.buildExamPrepPlan(studentA._id, exam, ownedSubject, { dailyMinutes: 90 })
    assert.equal(prep.countdown.daysRemaining, 5)
    assert.ok(prep.plan.length >= 1)
    assert.ok(prep.readiness.disclaimer.includes('not official'))
    assert.ok(!prep.readiness.message?.includes('100%'))
  })

  it('parses question papers and analyzes frequency without guaranteed predictions', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'OS' })
    await syllabusService.applySyllabus(studentA._id, subject._id, {
      units: [{ title: 'Unit 2', topics: [{ title: 'Scheduling' }] }],
    })
    const raw = 'Section A\n1. Explain Scheduling (10 marks)\n2. What is deadlock? (5 marks)'
    const paper = await questionPaperService.createFromText(studentA._id, { subjectId: subject._id, rawText: raw })
    assert.ok(paper.questions.length >= 2)
    assert.equal(paper.questions[0].marks, 10)
    const analysis = await questionPaperService.analyzeSubjectPapers(studentA._id, subject._id)
    assert.ok(analysis.disclaimer.includes('not guaranteed'))
  })

  it('records practice evidence and revision queue', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Networks' })
    await syllabusService.applySyllabus(studentA._id, subject._id, {
      units: [{ title: 'Unit 1', topics: [{ title: 'TCP/IP' }] }],
    })
    const concepts = await conceptMasteryService.listConcepts(studentA._id, subject._id)
    await conceptMasteryService.recordPractice(studentA._id, concepts[0]._id, { correct: false })
    await conceptMasteryService.recordPractice(studentA._id, concepts[0]._id, { correct: false })
    const queue = await conceptMasteryService.getRevisionQueue(studentA._id, { subjectId: subject._id })
    assert.ok(queue.some((item) => item.name === 'TCP/IP'))
  })

  it('generates realistic daily study plan', async () => {
    await academicService.addPeriod(studentA._id, { label: 'Sem 1', setActive: true })
    const subject = await academicService.createSubject(studentA._id, { name: 'C Programming' })
    await syllabusService.applySyllabus(studentA._id, subject._id, {
      units: [{ title: 'Unit 1', topics: [{ title: 'Pointers' }] }],
    })
    const plan = await academicStudyPlanService.buildDailyPlan(studentA._id, { minutes: 60 })
    assert.ok(plan.totalMinutes <= 60)
    assert.ok(Array.isArray(plan.items))
  })

  it('syncs academic graph edges', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'AI' })
    await syllabusService.applySyllabus(studentA._id, subject._id, {
      units: [{ title: 'Unit 1', topics: [{ title: 'Search' }] }],
    })
    await knowledgeGraphService.syncFromCanonical(studentA._id, { force: true })
    const edges = await KnowledgeGraphEdge.find({ studentId: studentA._id })
    assert.ok(edges.some((e) => e.relationType === 'STUDIES_SUBJECT'))
    assert.ok(edges.some((e) => e.relationType === 'TOPIC_MAPS_CONCEPT'))
  })

  it('prioritizes academic next action when exam is imminent', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Digital Logic' })
    await academicService.createExam(studentA._id, {
      subjectId: subject._id,
      name: 'Internal',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    })
    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    const action = decisionSupportService.buildNextBestAction(snapshot)
    assert.equal(action.type, 'ACADEMIC')
    assert.ok(action.reason.includes('day'))
  })

  it('enforces cross-student isolation on subject detail', async () => {
    const subject = await academicService.createSubject(studentA._id, { name: 'Private Subject' })
    const bRes = await invoke(academicController.getSubject, studentB, { params: { id: String(subject._id) } })
    assert.equal(bRes.statusCode, 404)
  })

  it('controller overview returns setup guidance for empty students', async () => {
    const res = await invoke(academicController.overview, studentA)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.setupRequired, true)
  })
})

async function AcademicSubjectFindSafe(studentId, subjectId) {
  const AcademicSubject = require('../models/AcademicSubject')
  return AcademicSubject.findOne({ _id: subjectId, studentId })
}
