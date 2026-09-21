const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Notification = require('../models/Notification')
const goalController = require('../controllers/goalController')
const taskController = require('../controllers/taskController')
const notifications = require('../controllers/notificationController')

let mongod
let studentA
let studentB

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

async function invoke(handler, user, values = {}) {
  const res = response()
  await handler(
    {
      user: user ? { _id: user._id, id: user._id, role: user.role } : undefined,
      body: {},
      params: {},
      query: {},
      ...values,
    },
    res,
  )
  return res
}

describe('student IDOR isolation', () => {
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
    studentA = await User.create({
      name: 'Student A',
      email: 'student-a@example.com',
      password: 'Password123',
      role: 'student',
    })
    studentB = await User.create({
      name: 'Student B',
      email: 'student-b@example.com',
      password: 'Password123',
      role: 'student',
    })
  })

  it('denies cross-student goal read, update, and delete', async () => {
    const goal = await Goal.create({ userId: studentB._id, title: 'Private goal', category: 'Career' })

    const read = await invoke(goalController.getGoal, studentA, { params: { id: goal._id.toString() } })
    assert.equal(read.statusCode, 404)

    const update = await invoke(goalController.updateGoal, studentA, {
      params: { id: goal._id.toString() },
      body: { title: 'Hijacked goal' },
    })
    assert.equal(update.statusCode, 404)

    const remove = await invoke(goalController.deleteGoal, studentA, { params: { id: goal._id.toString() } })
    assert.equal(remove.statusCode, 404)

    const stillThere = await Goal.findById(goal._id)
    assert.equal(stillThere.title, 'Private goal')
  })

  it('denies cross-student task read, update, and delete', async () => {
    const task = await Task.create({ userId: studentB._id, title: 'Private task', status: 'todo' })

    const read = await invoke(taskController.getTask, studentA, { params: { id: task._id.toString() } })
    assert.equal(read.statusCode, 404)

    const update = await invoke(taskController.updateTask, studentA, {
      params: { id: task._id.toString() },
      body: { title: 'Hijacked task', status: 'done' },
    })
    assert.equal(update.statusCode, 404)

    const remove = await invoke(taskController.deleteTask, studentA, { params: { id: task._id.toString() } })
    assert.equal(remove.statusCode, 404)

    const stillThere = await Task.findById(task._id)
    assert.equal(stillThere.title, 'Private task')
  })

  it('denies cross-student notification mark-read', async () => {
    const note = await Notification.create({
      userId: studentB._id,
      title: 'Private alert',
      message: 'Only for B',
      type: 'system',
      read: false,
    })

    const mark = await invoke(notifications.markRead, studentA, { params: { id: note._id.toString() } })
    assert.equal(mark.statusCode, 404)

    const fresh = await Notification.findById(note._id)
    assert.equal(fresh.read, false)
  })
})
