const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const FocusSession = require('../models/FocusSession')
const Notification = require('../models/Notification')
const controller = require('../controllers/taskController')

let mongod
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, currentUserId = userId } = {}) {
  const res = response()
  await handler({ body, params, query, user: { _id: currentUserId } }, res)
  return res
}

describe('smart tasks and productivity', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([
      Task.deleteMany({}),
      Goal.deleteMany({}),
      Roadmap.deleteMany({}),
      FocusSession.deleteMany({}),
      Notification.deleteMany({}),
    ])
  })

  it('creates rich tasks and enforces linked-goal ownership', async () => {
    const goal = await Goal.create({ userId, title: 'Learn systems design', category: 'Skill' })
    const created = await invoke(controller.createTask, {
      body: {
        title: 'Review load balancing',
        description: 'Compare common balancing strategies.',
        goalId: goal._id.toString(),
        priority: 'High',
        category: 'Systems',
        dueDate: new Date(Date.now() + 3600000).toISOString(),
        estimatedMinutes: 45,
        tags: ['architecture', 'revision'],
        subtasks: [{ title: 'Read notes' }],
        checklist: [{ text: 'Write summary' }],
        reminder: { enabled: true, dueSoon: true, overdue: true },
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.body.task.status, 'todo')
    assert.equal(created.body.task.tags.length, 2)
    assert.equal(created.body.task.subtasks.length, 1)
    assert.equal(created.body.task.estimatedMinutes, 45)

    const foreignGoal = await Goal.create({ userId: otherUserId, title: 'Private goal' })
    const denied = await invoke(controller.createTask, {
      body: { title: 'Invalid link', goalId: foreignGoal._id.toString() },
    })
    assert.equal(denied.statusCode, 404)
  })

  it('supports completion, pause, archive and duplication', async () => {
    const task = await Task.create({ userId, title: 'Practice algorithms' })
    const completed = await invoke(controller.updateTask, {
      params: { id: task._id.toString() },
      body: { completed: true },
    })
    assert.equal(completed.body.task.completed, true)
    assert.equal(completed.body.task.status, 'completed')
    assert.ok(completed.body.task.completedAt)

    const duplicate = await invoke(controller.duplicateTask, { params: { id: task._id.toString() } })
    assert.equal(duplicate.statusCode, 201)
    assert.equal(duplicate.body.task.completed, false)
    assert.equal(duplicate.body.task.source, 'duplicate')

    const paused = await invoke(controller.updateTask, {
      params: { id: duplicate.body.task._id.toString() },
      body: { status: 'paused' },
    })
    assert.equal(paused.body.task.status, 'paused')
    assert.equal(paused.body.task.completed, false)

    const archived = await invoke(controller.updateTask, {
      params: { id: duplicate.body.task._id.toString() },
      body: { status: 'archived' },
    })
    assert.equal(archived.body.task.status, 'archived')
  })

  it('tracks focus time and productivity analytics', async () => {
    const task = await Task.create({
      userId,
      title: 'Focused study',
      status: 'completed',
      completed: true,
      completedAt: new Date(),
      dueDate: new Date(),
    })
    const started = await invoke(controller.startFocus, { params: { id: task._id.toString() } })
    assert.equal(started.statusCode, 201)

    await FocusSession.updateOne(
      { _id: started.body.session._id },
      { $set: { startedAt: new Date(Date.now() - 120000) } },
    )
    const stopped = await invoke(controller.stopFocus, { params: { id: task._id.toString() } })
    assert.equal(stopped.statusCode, 200)
    assert.ok(stopped.body.session.durationSeconds >= 119)

    const analytics = await invoke(controller.getAnalytics)
    assert.equal(analytics.statusCode, 200)
    assert.equal(analytics.body.analytics.total, 1)
    assert.equal(analytics.body.analytics.completed, 1)
    assert.ok(analytics.body.analytics.focusMinutes >= 2)
    assert.equal(analytics.body.analytics.weeklyCompleted, 1)
  })

  it('updates task details and isolates task reads by owner', async () => {
    const task = await Task.create({ userId, title: 'Build project' })
    const updated = await invoke(controller.updateTask, {
      params: { id: task._id.toString() },
      body: {
        progress: 60,
        notes: [{ text: 'API complete' }],
        attachments: [{ name: 'Design', url: 'https://example.com/design' }],
        subtasks: [{ title: 'Backend', completed: true }],
        checklist: [{ text: 'Tests pass', done: true }],
      },
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.body.task.progress, 60)
    assert.equal(updated.body.task.notes[0].text, 'API complete')
    assert.equal(updated.body.task.attachments.length, 1)

    const denied = await invoke(controller.getTask, {
      params: { id: task._id.toString() },
      currentUserId: otherUserId,
    })
    assert.equal(denied.statusCode, 404)
  })
})
