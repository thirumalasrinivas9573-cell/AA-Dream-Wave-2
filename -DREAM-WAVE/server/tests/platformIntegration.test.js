const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const CompanyProfile = require('../models/CompanyProfile')
const Job = require('../models/Job')
const Notification = require('../models/Notification')
const LibraryBook = require('../models/LibraryBook')
const LibraryProgress = require('../models/LibraryProgress')
const SearchIndex = require('../models/SearchIndex')
const search = require('../controllers/searchController')
const notifications = require('../controllers/notificationController')
const dashboard = require('../controllers/studentDashboardController')
const notificationService = require('../services/notificationService')

let mongod
let student
let otherStudent

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
    app: { get: () => ({ to: () => ({ emit: () => {} }) }) },
    ...values,
  }
}

async function invoke(handler, currentUser, values) {
  const res = response()
  await handler(request(currentUser, values), res)
  return res
}

describe('Prompt 9 platform integration', () => {
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
    student = await User.create({ name: 'Asha Student', email: 'asha.platform@example.com', password: 'StrongPass123!', role: 'student' })
    otherStudent = await User.create({ name: 'Private Student', email: 'private.platform@example.com', password: 'StrongPass123!', role: 'student' })
  })

  it('keeps private students out of public search and excludes unapproved company jobs', async () => {
    await StudentProfile.create({ userId: student._id, username: 'asha-public', displayName: 'Asha Student', privacy: { visibility: 'public', discoverable: true } })
    await StudentProfile.create({ userId: otherStudent._id, username: 'private-student', displayName: 'Private Student', privacy: { visibility: 'private', discoverable: false } })
    const approvedOwner = await User.create({ name: 'Approved Employer', email: 'approved@example.com', password: 'StrongPass123!', role: 'company' })
    const pendingOwner = await User.create({ name: 'Pending Employer', email: 'pending@example.com', password: 'StrongPass123!', role: 'company' })
    const approved = await CompanyProfile.create({ ownerId: approvedOwner._id, slug: 'approved-employer', name: 'Approved Employer', status: 'approved', isPublic: true })
    const pending = await CompanyProfile.create({ ownerId: pendingOwner._id, slug: 'pending-employer', name: 'Pending Employer', status: 'pending', isPublic: false })
    await Job.create({ companyId: approved._id, title: 'Public Engineer', status: 'open' })
    await Job.create({ companyId: pending._id, title: 'Hidden Engineer', status: 'open' })

    const people = await invoke(search.globalSearch, null, { query: { q: 'Student', type: 'students' } })
    assert.equal(people.statusCode, 200)
    assert.deepEqual(people.body.results.students.map((item) => item.name), ['Asha Student'])

    const jobs = await invoke(search.unifiedSearch, null, { query: { q: 'Engineer', types: 'jobs' } })
    assert.equal(jobs.statusCode, 200)
    assert.deepEqual(jobs.body.data.items.map((item) => item.title), ['Public Engineer'])
  })

  it('searches only the authenticated student workspace and maintains history', async () => {
    await StudentProfile.create({ userId: student._id, username: 'asha-workspace', displayName: 'Asha Student', credentials: [{ title: 'Cloud Certificate', issuer: 'Dream Institute' }] })
    await Goal.create({ userId: student._id, title: 'Master React', category: 'Skill' })
    await Goal.create({ userId: otherStudent._id, title: 'Private React Goal', category: 'Skill' })
    await Task.create({ userId: student._id, title: 'Build React project', status: 'todo' })

    const result = await invoke(search.unifiedSearch, student, { query: { q: 'React', types: 'goals,tasks' } })
    assert.equal(result.statusCode, 200)
    assert.deepEqual(result.body.data.items.map((item) => item.title).sort(), ['Build React project', 'Master React'])
    assert.equal(result.body.data.items.some((item) => item.title === 'Private React Goal'), false)

    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(await SearchIndex.countDocuments({ userId: student._id, scope: 'workspace', query: 'React' }), 1)
  })

  it('supports read, pin, priority, archive, restore and owner-scoped deletion', async () => {
    const item = await notificationService.createForUser(student._id, { title: 'Interview scheduled', type: 'job', priority: 'high' })
    const other = await notificationService.createForUser(otherStudent._id, { title: 'Private update', type: 'system' })

    const crossUser = await invoke(notifications.markRead, student, { params: { id: other._id.toString() } })
    assert.equal(crossUser.statusCode, 404)

    assert.equal((await invoke(notifications.markRead, student, { params: { id: item._id.toString() } })).body.item.read, true)
    assert.ok((await invoke(notifications.pin, student, { params: { id: item._id.toString() }, body: { pinned: true } })).body.item.pinnedAt)
    assert.equal((await invoke(notifications.setPriority, student, { params: { id: item._id.toString() }, body: { priority: 'urgent' } })).body.item.priority, 'urgent')
    assert.ok((await invoke(notifications.archive, student, { params: { id: item._id.toString() } })).body.item.archivedAt)

    const activeList = await invoke(notifications.listMine, student, { query: {} })
    assert.equal(activeList.body.items.length, 0)
    assert.equal(activeList.body.unread, 0)

    await invoke(notifications.restore, student, { params: { id: item._id.toString() } })
    const removed = await invoke(notifications.remove, student, { params: { id: item._id.toString() } })
    assert.equal(removed.body.deleted, true)
    assert.equal(await Notification.countDocuments({ _id: item._id }), 0)
    assert.equal(await Notification.countDocuments({ _id: other._id }), 1)
  })

  it('aggregates dashboard cards from synchronized domain collections', async () => {
    await StudentProfile.create({ userId: student._id, username: 'asha-dashboard', displayName: 'Asha Student', credentials: [{ title: 'React Certificate', issuer: 'Dream Institute' }] })
    await Goal.create({ userId: student._id, title: 'Finish React', category: 'Skill', status: 'active', progress: 60 })
    await Task.create({ userId: student._id, title: 'Complete lesson', status: 'completed', completed: true })
    const book = await LibraryBook.create({ title: 'React Systems', author: 'Dream Wave', pdfUrl: 'https://example.com/react.pdf', status: 'active' })
    await LibraryProgress.create({ userId: student._id, bookId: book._id, percent: 50, currentPage: 50, totalPages: 100 })
    await notificationService.createForUser(student._id, { title: 'Task reminder', type: 'task' })

    const result = await invoke(dashboard.studentDashboard, student)
    assert.equal(result.statusCode, 200)
    assert.equal(result.body.data.stats.goals, 1)
    assert.equal(result.body.data.stats.tasks, 1)
    assert.equal(result.body.data.stats.completedTasks, 1)
    assert.equal(result.body.data.stats.books, 1)
    assert.equal(result.body.data.stats.certificates, 1)
    assert.equal(result.body.data.stats.unreadNotifications, 1)
    assert.equal(result.body.data.books[0].bookId.title, 'React Systems')
    assert.ok(result.body.data.stats.learningProgress > 0)
    assert.ok(result.body.data.commandCenter?.dailyBrief)
    assert.ok(Array.isArray(result.body.data.activity))
  })
})
