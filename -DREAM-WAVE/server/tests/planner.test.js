const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const Goal = require('../models/Goal')
const ScheduleItem = require('../models/ScheduleItem')
const PlannerPreferences = require('../models/PlannerPreferences')
const FocusSession = require('../models/FocusSession')
const plannerController = require('../controllers/plannerController')
const scheduleEngine = require('../services/scheduleEngine')
const priorityEngine = require('../services/priorityEngine')
const plannerService = require('../services/plannerService')
const { validatePlanItems } = require('../services/planValidator')

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

describe('study planner and focus mode', () => {
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
      ScheduleItem.deleteMany({}),
      PlannerPreferences.deleteMany({}),
      FocusSession.deleteMany({}),
    ])
  })

  it('detects schedule overlaps and overload', () => {
    const items = [
      { scheduledDate: '2026-08-02', startTime: '17:00', endTime: '18:00', status: 'scheduled', title: 'A' },
      { scheduledDate: '2026-08-02', startTime: '17:30', endTime: '18:30', status: 'scheduled', title: 'B' },
    ]
    const conflicts = scheduleEngine.detectConflicts(items.slice(0, 1), items[1])
    assert.equal(conflicts.length, 1)
    const overload = scheduleEngine.detectOverload(240, 120)
    assert.ok(overload.excessMinutes === 120)
  })

  it('scores overdue and due-soon tasks deterministically', async () => {
    const goal = await Goal.create({ userId, title: 'Learn React', priority: 'High' })
    const overdue = await Task.create({
      userId,
      goalId: goal._id,
      title: 'Overdue task',
      priority: 'High',
      dueDate: new Date(Date.now() - 86400000),
    })
    const { score, factors } = priorityEngine.scoreTask(overdue, { goals: [goal] })
    assert.ok(score > 50)
    assert.ok(factors.some((f) => f.key === 'overdue'))
  })

  it('creates schedule items with ownership and conflict checks', async () => {
    const task = await Task.create({ userId, title: 'Study algorithms', estimatedMinutes: 45 })
    const created = await invoke(plannerController.createSchedule, {
      body: {
        taskId: task._id.toString(),
        title: task.title,
        scheduledDate: scheduleEngine.dateKeyFromDate(),
        startTime: '18:00',
        endTime: '18:45',
        durationMinutes: 45,
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.body.item.title, 'Study algorithms')

    const conflict = await invoke(plannerController.createSchedule, {
      body: {
        taskId: task._id.toString(),
        title: task.title,
        scheduledDate: scheduleEngine.dateKeyFromDate(),
        startTime: '18:30',
        endTime: '19:00',
        durationMinutes: 30,
      },
    })
    assert.equal(conflict.statusCode, 409)
  })

  it('generates daily plan preview without auto-saving', async () => {
    const goal = await Goal.create({ userId, title: 'Backend mastery', priority: 'High' })
    await Task.create({
      userId,
      goalId: goal._id,
      title: 'API design',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000),
      estimatedMinutes: 40,
    })
    await PlannerPreferences.create({ userId, availableTodayMinutes: 120, sessionLengthMinutes: 40 })

    const beforeCount = await ScheduleItem.countDocuments({ userId })
    const preview = await invoke(plannerController.suggestDaily, { body: { availableMinutes: 120 } })
    assert.equal(preview.statusCode, 200)
    assert.ok(preview.body.preview.items.length >= 1)
    assert.equal(preview.body.preview.requiresApproval, true)
    const afterCount = await ScheduleItem.countDocuments({ userId })
    assert.equal(beforeCount, afterCount)
  })

  it('applies selected plan items after validation', async () => {
    const task = await Task.create({ userId, title: 'Read chapter', estimatedMinutes: 30 })
    const dateKey = scheduleEngine.dateKeyFromDate()
    const items = [{
      taskId: task._id.toString(),
      title: task.title,
      scheduledDate: dateKey,
      startTime: '19:00',
      endTime: '19:30',
      durationMinutes: 30,
      selected: true,
    }]
    const validation = validatePlanItems(items, { tasks: [task] })
    assert.equal(validation.valid, true)

    const applied = await invoke(plannerController.applyPlan, { body: { items, mode: 'selected' } })
    assert.equal(applied.statusCode, 201)
    assert.equal(applied.body.created.length, 1)
    const saved = await ScheduleItem.find({ userId })
    assert.equal(saved.length, 1)
    assert.equal(saved[0].source, 'ai')
  })

  it('supports focus session pause, resume, and timestamp-based elapsed time', async () => {
    const task = await Task.create({ userId, title: 'Deep work' })
    const started = await invoke(plannerController.startFocus, {
      body: { taskId: task._id.toString(), timerMode: '25' },
    })
    assert.equal(started.statusCode, 201)
    const sessionId = started.body.session._id

    await FocusSession.updateOne({ _id: sessionId }, { $set: { startedAt: new Date(Date.now() - 60000) } })

    const paused = await invoke(plannerController.pauseFocus, { params: { id: sessionId.toString() } })
    assert.equal(paused.statusCode, 200)
    assert.equal(paused.body.session.status, 'paused')

    const resumed = await invoke(plannerController.resumeFocus, { params: { id: sessionId.toString() } })
    assert.equal(resumed.statusCode, 200)
    assert.equal(resumed.body.session.status, 'active')

    const completed = await invoke(plannerController.completeFocus, {
      params: { id: sessionId.toString() },
      body: { markTaskComplete: false, note: 'Good session' },
    })
    assert.equal(completed.statusCode, 200)
    assert.ok(completed.body.session.durationSeconds >= 50)
  })

  it('isolates planner data by student owner', async () => {
    const task = await Task.create({ userId, title: 'Private plan' })
    const item = await ScheduleItem.create({
      userId,
      taskId: task._id,
      title: task.title,
      scheduledDate: scheduleEngine.dateKeyFromDate(),
      durationMinutes: 30,
    })

    const denied = await invoke(plannerController.updateSchedule, {
      params: { id: item._id.toString() },
      body: { title: 'Hacked' },
      currentUserId: otherUserId,
    })
    assert.equal(denied.statusCode, 404)

    const foreignFocus = await invoke(plannerController.getActiveFocus, { currentUserId: otherUserId })
    assert.equal(foreignFocus.statusCode, 200)
    assert.equal(foreignFocus.body.session, null)
  })

  it('builds today view with metrics from canonical tasks', async () => {
    const task = await Task.create({ userId, title: 'Morning review', estimatedMinutes: 30 })
    await ScheduleItem.create({
      userId,
      taskId: task._id,
      title: task.title,
      scheduledDate: scheduleEngine.dateKeyFromDate(),
      startTime: '08:00',
      endTime: '08:30',
      durationMinutes: 30,
      status: 'scheduled',
    })
    const view = await plannerService.buildTodayView(userId)
    assert.equal(view.items.length, 1)
    assert.ok(view.metrics.planned >= 1)
  })
})
