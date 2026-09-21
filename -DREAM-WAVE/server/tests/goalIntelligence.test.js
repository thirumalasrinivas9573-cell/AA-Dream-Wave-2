const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const progressEngine = require('../services/progressEngine')
const { validateRoadmapPayload, diffRoadmapAdaptation } = require('../services/roadmapValidator')
const goalIntelligenceController = require('../controllers/goalIntelligenceController')
const goalIntelligence = require('../services/goalIntelligenceService')

let mongod
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, currentUserId = userId } = {}) {
  const res = response()
  await handler({ body, params, query, user: { _id: currentUserId } }, res)
  return res
}

describe('goal intelligence foundation', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([Goal.deleteMany({}), Task.deleteMany({}), Roadmap.deleteMany({})])
  })

  it('validates structured roadmap payloads and rejects malformed output', () => {
    const valid = validateRoadmapPayload({
      nextSteps: [{ title: 'Learn HTML', description: 'Basics', duration: '1 week' }],
      milestones: ['Foundation complete'],
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data.nextSteps.length, 1)

    const invalid = validateRoadmapPayload({ overview: 'No stages here' })
    assert.equal(invalid.valid, false)
    assert.match(invalid.errors.join(' '), /nextSteps or learningStages/)
  })

  it('computes weighted goal progress from milestones, tasks and roadmap', async () => {
    const goal = await Goal.create({
      userId,
      title: 'Learn Python',
      category: 'Technical Skill',
      milestones: [
        { title: 'Basics', status: 'completed', progress: 100 },
        { title: 'OOP', status: 'in-progress', progress: 50 },
      ],
    })
    await Task.insertMany([
      { userId, goalId: goal._id, title: 'Practice loops', completed: true, status: 'completed' },
      { userId, goalId: goal._id, title: 'Build project', completed: false, status: 'todo' },
    ])
    await Roadmap.create({
      userId,
      goalId: goal._id,
      data: {
        nextSteps: [
          { title: 'Syntax', completed: true },
          { title: 'Functions', completed: false },
        ],
      },
      learningStages: [],
    })

    const progress = await progressEngine.computeGoalProgress(goal._id, userId)
    assert.ok(progress.percent > 0 && progress.percent < 100)
    assert.equal(typeof progress.breakdown.milestones, 'number')
    assert.equal(typeof progress.breakdown.tasks, 'number')
    assert.equal(typeof progress.breakdown.roadmap, 'number')
  })

  it('returns deterministic next best action prioritizing overdue tasks', async () => {
    const goal = await Goal.create({ userId, title: 'Placement prep', category: 'Placement' })
    await Task.create({
      userId,
      goalId: goal._id,
      title: 'Revise arrays',
      status: 'todo',
      dueDate: new Date(Date.now() - 86400000),
      priority: 'High',
    })

    const action = await progressEngine.getNextBestAction(goal._id, userId)
    assert.equal(action.type, 'task')
    assert.match(action.reason, /overdue/i)
  })

  it('detects high-priority goal deadline overlap warnings', async () => {
    const deadline = new Date('2026-12-01')
    await Goal.insertMany([
      { userId, title: 'Goal A', category: 'Career', priority: 'High', status: 'active', deadline },
      { userId, title: 'Goal B', category: 'Placement', priority: 'Critical', status: 'active', deadline },
    ])

    const conflicts = await goalIntelligence.detectGoalConflicts(userId)
    assert.equal(conflicts.warnings.length, 1)
    assert.equal(conflicts.warnings[0].type, 'deadline_overlap')
  })

  it('prevents cross-user access to goal intelligence endpoints', async () => {
    const goal = await Goal.create({ userId, title: 'Private goal', category: 'Personal' })
    const denied = await invoke(goalIntelligenceController.getReview, {
      params: { goalId: goal._id.toString() },
      currentUserId: otherUserId,
    })
    assert.equal(denied.statusCode, 404)
  })

  it('diffs roadmap adaptations for student approval preview', () => {
    const diff = diffRoadmapAdaptation(
      { nextSteps: [{ title: 'HTML' }, { title: 'CSS' }] },
      { nextSteps: [{ title: 'HTML' }, { title: 'JavaScript' }] },
    )
    assert.deepEqual(diff.stagesAdded, ['JavaScript'])
    assert.deepEqual(diff.stagesRemoved, ['CSS'])
    assert.equal(diff.orderChanged, true)
  })

  it('accepts suggested tasks only through explicit save endpoint', async () => {
    const goal = await Goal.create({ userId, title: 'Build portfolio', category: 'Project' })
    const accepted = await invoke(goalIntelligenceController.acceptTasks, {
      params: { goalId: goal._id.toString() },
      body: {
        tasks: [{ title: 'Draft project outline', reason: 'Start with scope', priority: 'Medium' }],
      },
    })
    assert.equal(accepted.statusCode, 200)
    assert.equal(accepted.body.tasks.length, 1)
    const saved = await Task.find({ goalId: goal._id, userId })
    assert.equal(saved.length, 1)
    assert.equal(saved[0].source, 'ai')
  })
})
