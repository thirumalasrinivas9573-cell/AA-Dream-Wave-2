const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const personalDailyIntelligenceService = require('../services/personalDailyIntelligenceService')
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
  await handler({
    user: user ? { _id: user._id, role: user.role } : undefined,
    query: {},
    body: {},
    params: {},
    ...values,
  }, res)
  return res
}

describe('Version 3 Personal Daily Life Intelligence (Prompt 8)', () => {
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
    studentA = await User.create({ name: 'Asha Daily', email: 'asha.daily@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben Daily', email: 'ben.daily@example.com', password: 'Password123', role: 'student' })
  })

  it('loads Daily Life empty state without inventing tasks', async () => {
    const intel = await personalDailyIntelligenceService.getDailyLifeIntelligence(studentA._id)
    assert.equal(intel.empty, true)
    assert.equal(intel.nextAction.type, 'SETUP')
    assert.equal(intel.plan.ordered.length, 0)
    assert.match(intel.briefing.calendarNote, /not connected/i)
    assert.equal(intel.briefing.aiCalled, false)
  })

  it('next action and buckets use real overdue / due tasks', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Become an AI Engineer',
      status: 'active',
      priority: 'High',
    })
    await Roadmap.create({
      userId: studentA._id,
      goalId: goal._id,
      data: {},
      status: 'active',
      learningStages: [{ title: 'Machine Learning Fundamentals', order: 1, status: 'in-progress', skills: ['ML'] }],
    })
    const overdue = await Task.create({
      userId: studentA._id,
      goalId: goal._id,
      title: 'Complete ML evaluation module',
      status: 'todo',
      priority: 'High',
      dueDate: new Date(Date.now() - 86400000),
    })
    await Task.create({
      userId: studentA._id,
      goalId: goal._id,
      title: 'Optional reading',
      status: 'todo',
      priority: 'Low',
    })

    const intel = await personalDailyIntelligenceService.getDailyLifeIntelligence(studentA._id)
    assert.equal(intel.empty, false)
    assert.ok(intel.plan.buckets.Critical.some((i) => i.title.includes('ML evaluation')))
    assert.ok(intel.nextAction.title)
    assert.ok(intel.nextAction.why)
    assert.ok(intel.nextAction.source)
    assert.equal(intel.taskIntelligence.overdue[0].id, String(overdue._id))
    assert.ok(intel.taskIntelligence.overdue[0].goalAlignment?.goalTitle === 'Become an AI Engineer')
  })

  it('gap review and progress risk use neutral language from real data', async () => {
    await Goal.create({
      userId: studentA._id,
      title: 'Stalled goal',
      status: 'active',
      updatedAt: new Date(Date.now() - 20 * 86400000),
      createdAt: new Date(Date.now() - 30 * 86400000),
    })
    // force stale updatedAt (mongoose timestamps may overwrite on create)
    await Goal.updateOne(
      { userId: studentA._id, title: 'Stalled goal' },
      { $set: { updatedAt: new Date(Date.now() - 20 * 86400000) } },
    )

    const intel = await personalDailyIntelligenceService.getDailyLifeIntelligence(studentA._id)
    assert.ok(intel.gaps.items.some((g) => g.area === 'task' || g.area === 'learning' || g.area === 'project'))
    assert.ok(intel.risks.items.every((r) => r.language === 'Needs attention.'))
  })

  it('routes daily intents without a second engine', () => {
    assert.equal(personalDailyIntelligenceService.routeDailyIntent('What should I do now?'), 'NEXT_ACTION')
    assert.equal(personalDailyIntelligenceService.routeDailyIntent('Plan my day'), 'DAILY_PLAN')
    assert.equal(personalDailyIntelligenceService.routeDailyIntent('What am I falling behind on?'), 'PROGRESS_RISK')
    assert.equal(personalDailyIntelligenceService.routeDailyIntent('', 'gap-review'), 'GAP_REVIEW')
  })

  it('task breakdown requires confirmation and creates owner-scoped tasks only', async () => {
    const proposed = personalDailyIntelligenceService.proposeSafeAction(studentA._id, {
      type: 'breakdown_task',
      payload: { title: 'Build AI recommendation system', userId: studentB._id },
    })
    assert.equal(proposed.requiresConfirmation, true)
    assert.ok(proposed.previewId)
    assert.ok(proposed.breakdown.steps.length >= 3)

    const denied = await invoke(intelligenceController.dailyLifeConfirmAction, studentA, {
      body: { previewId: proposed.previewId, confirmed: false },
    })
    assert.equal(denied.statusCode, 400)

    const proposed2 = personalDailyIntelligenceService.proposeSafeAction(studentA._id, {
      type: 'breakdown_task',
      payload: { title: 'Build AI recommendation system' },
    })
    const confirmed = await invoke(intelligenceController.dailyLifeConfirmAction, studentA, {
      body: { previewId: proposed2.previewId, confirmed: true },
    })
    assert.equal(confirmed.statusCode, 200)
    assert.ok(confirmed.body.data.created.length >= 1)
    const created = await Task.find({ userId: studentA._id })
    assert.ok(created.length >= 1)
    assert.equal(created.every((t) => String(t.userId) === String(studentA._id)), true)
    const leaked = await Task.find({ userId: studentB._id })
    assert.equal(leaked.length, 0)
  })

  it('prevents IDOR on action confirm previews', async () => {
    const proposed = personalDailyIntelligenceService.proposeSafeAction(studentA._id, {
      type: 'breakdown_task',
      payload: { title: 'Private breakdown' },
    })
    const stolen = await invoke(intelligenceController.dailyLifeConfirmAction, studentB, {
      body: { previewId: proposed.previewId, confirmed: true },
    })
    assert.equal(stolen.statusCode, 404)
  })

  it('daily-life API returns structured data for authenticated student', async () => {
    await Goal.create({ userId: studentA._id, title: 'Ship portfolio', status: 'active' })
    const res = await invoke(intelligenceController.dailyLife, studentA)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.success, true)
    assert.ok(res.body.data.briefing)
    assert.ok(res.body.data.nextAction)
    assert.ok(res.body.data.plan.buckets)
  })

  it('personal tools never accept foreign user scope', async () => {
    await Task.create({ userId: studentA._id, title: 'A only', status: 'todo' })
    await Task.create({ userId: studentB._id, title: 'B only', status: 'todo' })
    const tasks = await personalDailyIntelligenceService.personalTools.getTasks(studentA._id)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].title, 'A only')
  })

  it('context block forbids inventing deadlines', async () => {
    const block = await personalDailyIntelligenceService.buildPersonalContextBlock(studentA._id, {
      message: 'What should I do now?',
    })
    assert.match(block.text, /Do not invent tasks/)
    assert.equal(block.intent, 'NEXT_ACTION')
  })
})
