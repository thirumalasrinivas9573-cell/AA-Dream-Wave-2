const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const StudentProfile = require('../models/StudentProfile')
const dashboardOrchestration = require('../services/dashboardOrchestrationService')
const activityService = require('../services/activityService')
const notificationService = require('../services/notificationService')
const dashboard = require('../controllers/studentDashboardController')
const activity = require('../controllers/activityController')

let mongod
let student

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

function request(currentUser, values = {}) {
  return {
    user: currentUser ? { _id: currentUser._id, id: currentUser._id, role: currentUser.role } : undefined,
    query: {},
    params: {},
    body: {},
    ...values,
  }
}

async function invoke(handler, currentUser, values) {
  const res = response()
  await handler(request(currentUser, values), res)
  return res
}

describe('Prompt 9 dashboard orchestration', () => {
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
    student = await User.create({ name: 'Command Student', email: 'command@example.com', password: 'StrongPass123!', role: 'student' })
  })

  it('builds deterministic daily brief and priorities from real task data', async () => {
    const yesterday = new Date(Date.now() - 86400000)
    await Goal.create({ userId: student._id, title: 'Master React', status: 'active', progress: 40 })
    await Task.create({ userId: student._id, title: 'Overdue homework', status: 'todo', dueDate: yesterday })
    await Task.create({ userId: student._id, title: 'Due today task', status: 'todo', dueDate: new Date() })

    const goals = await Goal.find({ userId: student._id }).lean()
    const tasks = await Task.find({ userId: student._id }).lean()
    const brief = dashboardOrchestration.buildDeterministicDailyBrief({
      user: student,
      goals,
      tasks,
      roadmaps: [],
      books: [],
      applications: [],
      plannerToday: null,
    })
    const priorities = dashboardOrchestration.buildPriorities({ tasks, goals, roadmaps: [], applications: [], plannerToday: null })

    assert.match(brief.summary, /overdue task/i)
    assert.match(brief.summary, /Master React/)
    assert.equal(brief.source, 'deterministic')
    assert.ok(priorities.some((item) => item.title === 'Overdue homework'))
    assert.equal(priorities[0].level, 'critical')
  })

  it('derives private activity feed for the authenticated student', async () => {
    await Goal.create({ userId: student._id, title: 'Finish React', status: 'completed', completed: true, progress: 100 })
    await Task.create({ userId: student._id, title: 'Complete lesson', status: 'completed', completed: true })

    const items = await activityService.buildRecentActivity(student._id, { limit: 10 })
    assert.ok(items.some((item) => item.title === 'Finish React'))
    assert.ok(items.some((item) => item.title === 'Complete lesson'))
  })

  it('groups repetitive notifications safely', () => {
    const grouped = notificationService.groupNotifications([
      { _id: '1', title: 'React task', type: 'task', priority: 'normal', read: false, createdAt: new Date(), dedupeKey: 'task:react' },
      { _id: '2', title: 'React task', type: 'task', priority: 'normal', read: false, createdAt: new Date(), dedupeKey: 'task:react' },
      { _id: '3', title: 'Interview', type: 'job', priority: 'high', read: true, createdAt: new Date(), link: '/student/career/applications' },
    ])
    assert.ok(grouped.some((group) => group.key === 'tasks'))
    const taskGroup = grouped.find((group) => group.key === 'tasks')
    assert.equal(taskGroup.items[0].count, 2)
    assert.equal(notificationService.safeInternalLink('https://evil.com'), null)
    assert.equal(notificationService.safeInternalLink('/student/tasks'), '/student/tasks')
  })

  it('returns command center and activity from dashboard endpoint', async () => {
    await StudentProfile.create({ userId: student._id, username: 'command-student', displayName: 'Command Student' })
    await Goal.create({ userId: student._id, title: 'Finish React', category: 'Skill', status: 'active', progress: 60 })
    await Task.create({ userId: student._id, title: 'Complete lesson', status: 'completed', completed: true })
    await notificationService.createForUser(student._id, { title: 'Task reminder', type: 'task' })

    const result = await invoke(dashboard.studentDashboard, student)
    assert.equal(result.statusCode, 200)
    assert.ok(result.body.data.commandCenter)
    assert.ok(result.body.data.commandCenter.dailyBrief.summary)
    assert.ok(Array.isArray(result.body.data.commandCenter.priorities))
    assert.ok(Array.isArray(result.body.data.activity))
    assert.ok(Array.isArray(result.body.data.notifications.grouped))
  })

  it('scopes activity endpoint to authenticated student', async () => {
    const other = await User.create({ name: 'Other', email: 'other@example.com', password: 'StrongPass123!', role: 'student' })
    await Task.create({ userId: other._id, title: 'Private task', status: 'completed', completed: true })

    const result = await invoke(activity.recent, student)
    assert.equal(result.statusCode, 200)
    assert.equal(result.body.items.some((item) => item.title === 'Private task'), false)
  })
})
