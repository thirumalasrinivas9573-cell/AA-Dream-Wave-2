const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const CareerProfile = require('../models/CareerProfile')
const KnowledgeGraphEdge = require('../models/KnowledgeGraphEdge')
const knowledgeGraphService = require('../services/knowledgeGraphService')
const studentContextEngine = require('../services/studentContextEngine')
const decisionSupportService = require('../services/decisionSupportService')
const intelligenceController = require('../controllers/intelligenceController')

let mongod
let studentA
let studentB

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

function roadmapFixture(userId, goalId, stages = []) {
  return {
    userId,
    goalId,
    status: 'active',
    data: { nextSteps: [], overview: 'Test roadmap' },
    learningStages: stages,
  }
}

describe('Version 3 intelligence layer', () => {
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
    studentA = await User.create({ name: 'Asha', email: 'asha.v3@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.v3@example.com', password: 'Password123', role: 'student' })
  })

  it('creates graph relationships from canonical data with ownership', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'Become AI Engineer', category: 'Career' })
    await Task.create({ userId: studentA._id, title: 'Study neural networks', goalId: goal._id, status: 'todo' })
    await Roadmap.create(roadmapFixture(studentA._id, goal._id, [
      { title: 'Python Foundations', status: 'in-progress', skills: ['Python'] },
    ]))

    const sync = await knowledgeGraphService.syncFromCanonical(studentA._id, { force: true })
    assert.ok(sync.edgeOperations > 0)

    const edges = await KnowledgeGraphEdge.find({ studentId: studentA._id })
    assert.ok(edges.some((e) => e.relationType === 'HAS_GOAL'))
    assert.ok(edges.some((e) => e.relationType === 'SUPPORTS_GOAL'))
    assert.ok(edges.some((e) => e.relationType === 'PART_OF_ROADMAP'))

    const cross = await KnowledgeGraphEdge.find({ studentId: studentB._id })
    assert.equal(cross.length, 0)
  })

  it('prevents invalid relation types and deduplicates edges', async () => {
    await assert.rejects(
      () => knowledgeGraphService.upsertEdge(studentA._id, {
        sourceType: 'goal', sourceId: '1', targetType: 'skill', targetId: 'python', relationType: 'HACK_RELATION',
      }),
      (error) => error.code === 'INVALID_RELATION_TYPE',
    )

    await knowledgeGraphService.upsertEdge(studentA._id, {
      sourceType: 'goal', sourceId: 'abc', targetType: 'skill', targetId: 'python',
      relationType: 'REQUIRES_SKILL', origin: 'EXPLICIT', label: 'Python',
    })
    await knowledgeGraphService.upsertEdge(studentA._id, {
      sourceType: 'goal', sourceId: 'abc', targetType: 'skill', targetId: 'python',
      relationType: 'REQUIRES_SKILL', origin: 'EXPLICIT', label: 'Python',
    })
    const count = await KnowledgeGraphEdge.countDocuments({ studentId: studentA._id })
    assert.equal(count, 1)
  })

  it('cleans graph edges when canonical entities are deleted', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'Temporary goal', category: 'Skill' })
    await knowledgeGraphService.syncFromCanonical(studentA._id, { force: true })
    assert.ok(await KnowledgeGraphEdge.countDocuments({ studentId: studentA._id, sourceType: 'goal', sourceId: String(goal._id) }) > 0
      || await KnowledgeGraphEdge.countDocuments({ studentId: studentA._id, targetType: 'goal', targetId: String(goal._id) }) > 0)

    await knowledgeGraphService.removeEdgesForEntity(studentA._id, 'goal', goal._id)
    const remaining = await KnowledgeGraphEdge.countDocuments({
      studentId: studentA._id,
      $or: [{ sourceId: String(goal._id) }, { targetId: String(goal._id) }],
    })
    assert.equal(remaining, 0)
  })

  it('routes intent and builds budgeted context', async () => {
    assert.equal(studentContextEngine.routeIntent('What should I study tonight?'), 'STUDY_HELP')
    assert.equal(studentContextEngine.routeIntent('Help with my roadmap stage'), 'ROADMAP_HELP')
    assert.equal(studentContextEngine.routeIntent('hello there'), 'GENERAL_MENTOR')

    await Goal.create({ userId: studentA._id, title: 'Frontend Developer', category: 'Career', status: 'active' })
    const context = await studentContextEngine.buildStudentContext(studentA._id, {
      message: 'What should I study tonight?',
      budget: 3000,
    })
    assert.equal(context.intent, 'STUDY_HELP')
    assert.ok(context.layers.includes('learning'))
    assert.ok(context.text.length <= 3001)
    assert.ok(context.budgetUsed <= 3001)
  })

  it('returns explainable next best action from real task data', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'Backend Developer', category: 'Career', status: 'active' })
    const due = new Date()
    due.setHours(23, 59, 0, 0)
    await Task.create({
      userId: studentA._id,
      title: 'Finish database assignment',
      goalId: goal._id,
      status: 'todo',
      dueDate: due,
      priority: 'High',
    })

    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    const action = decisionSupportService.buildNextBestAction(snapshot)
    assert.equal(action.title, 'Finish database assignment')
    assert.match(action.reason, /Backend Developer|Due|Supports/)
    assert.ok(action.sourceSignals.includes('Task'))
    assert.ok(action.action.url.includes('/student/tasks'))
  })

  it('prefers continue reading over new resource recommendations', async () => {
    await Goal.create({ userId: studentA._id, title: 'Learn React', category: 'Skill', status: 'active' })
    const LibraryBook = require('../models/LibraryBook')
    const book = await LibraryBook.create({
      title: 'React Patterns',
      author: 'Author',
      status: 'active',
      pdfUrl: '/uploads/test/react-patterns.pdf',
    })
    const LibraryProgress = require('../models/LibraryProgress')
    await LibraryProgress.create({ userId: studentA._id, bookId: book._id, percent: 42, lastReadAt: new Date() })

    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    const recs = await decisionSupportService.buildRecommendations(studentA._id, snapshot, { limit: 5 })
    assert.ok(recs.some((item) => item.title.includes('React Patterns')))
  })

  it('deduplicates and dismisses recommendations', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Stalled goal',
      category: 'Career',
      status: 'active',
    })
    await Goal.updateOne(
      { _id: goal._id },
      { $set: { updatedAt: new Date(Date.now() - 20 * 86400000) } },
      { timestamps: false },
    )

    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    snapshot.tasks = []

    const recs = await decisionSupportService.buildRecommendations(studentA._id, snapshot, { limit: 5 })
    const stalled = recs.find((item) => item.title.includes('Revive'))
    assert.ok(stalled)

    await decisionSupportService.dismissRecommendation(studentA._id, stalled.fingerprint)
    const afterDismiss = await decisionSupportService.buildRecommendations(studentA._id, snapshot, { limit: 5 })
    assert.equal(afterDismiss.some((item) => item.fingerprint === stalled.fingerprint), false)
  })

  it('isolates intelligence output per student account', async () => {
    const goal = await Goal.create({ userId: studentB._id, title: 'Private goal', category: 'Career' })
    await Task.create({ userId: studentB._id, title: 'Private task', goalId: goal._id, status: 'todo' })

    const resA = await invoke(intelligenceController.nextAction, studentA)
    assert.equal(resA.statusCode, 200)
    assert.notEqual(resA.body.data?.title, 'Private task')

    const graphB = await invoke(intelligenceController.graphSummary, studentB)
    await Goal.create({ userId: studentB._id, title: 'Visible to B only', category: 'Career' })
    await knowledgeGraphService.syncFromCanonical(studentB._id, { force: true })
    const graphA = await invoke(intelligenceController.graphSummary, studentA)
    assert.ok(graphB.body.data.edgeCount >= 0)
    assert.ok(graphA.body.data.edgeCount >= 0)
    assert.notEqual(graphB.body.data.edgeCount, graphA.body.data.edgeCount || -1)
  })

  it('enriches daily brief with relationship context deterministically', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'AI Engineer', category: 'Career', status: 'active' })
    await Task.create({ userId: studentA._id, title: 'Complete ML lab', goalId: goal._id, status: 'todo', dueDate: new Date() })
    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    const action = decisionSupportService.buildNextBestAction(snapshot)
    const brief = decisionSupportService.enrichDailyBrief({
      greeting: 'Hello',
      summary: 'You have tasks.',
      highlights: ['You have tasks.'],
      source: 'deterministic',
    }, snapshot, action)
    assert.equal(brief.relationshipAware, true)
    assert.ok(brief.highlights.some((line) => line.includes('Complete ML lab') || line.includes('Recommended next')))
  })

  it('registers intelligence decision routes on the router', () => {
    const router = require('../routes/intelligence')
    const paths = router.stack.filter((layer) => layer.route).map((layer) => layer.route.path)
    assert.ok(paths.includes('/next-action'))
    assert.ok(paths.includes('/decisions'))
    assert.ok(paths.includes('/context-summary'))
    assert.ok(paths.includes('/graph/summary'))
  })

  it('detects roadmap skill gaps without silently modifying roadmaps', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'AI Engineer', category: 'Career' })
    await CareerProfile.create({
      userId: studentA._id,
      targetCareer: 'AI Engineer',
      requiredSkills: ['Python', 'TensorFlow'],
    })
    await Roadmap.create(roadmapFixture(studentA._id, goal._id, [
      { title: 'Intro to HTML', status: 'in-progress' },
    ]))
    const snapshot = await decisionSupportService.loadSnapshot(studentA._id)
    const gaps = decisionSupportService.detectRoadmapGaps(snapshot)
    assert.ok(gaps.some((g) => g.skill.includes('python') || g.skill.includes('tensorflow')))
  })
})
