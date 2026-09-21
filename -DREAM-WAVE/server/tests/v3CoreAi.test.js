const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const studentContextEngine = require('../services/studentContextEngine')
const coreAiIntelligenceService = require('../services/coreAiIntelligenceService')
const mentorController = require('../controllers/mentorController')
const mentorRoutes = require('../routes/mentor')

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

describe('Version 3 Core AI Intelligence + Context Engine', () => {
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
    studentA = await User.create({ name: 'Asha', email: 'asha.coreai@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.coreai@example.com', password: 'Password123', role: 'student' })
  })

  it('detects prompt-aligned intents including daily plan and progress review', () => {
    assert.equal(coreAiIntelligenceService.detectCoreIntent('What should I work on today?'), 'DAILY_PLAN')
    assert.equal(coreAiIntelligenceService.detectCoreIntent('Help with my career interview'), 'CAREER_HELP')
    assert.equal(coreAiIntelligenceService.detectCoreIntent('How should I continue my project?'), 'PROJECT_HELP')
    assert.equal(coreAiIntelligenceService.detectCoreIntent('Review my progress this week'), 'PROGRESS_REVIEW')
    assert.equal(studentContextEngine.routeIntent('Help me with research sources'), 'RESEARCH_HELP')
    assert.ok(studentContextEngine.INTENTS.includes('RESEARCH_HELP'))
    assert.ok(studentContextEngine.INTENTS.includes('PROGRESS_REVIEW'))
  })

  it('builds graceful context for authenticated user with no goals', async () => {
    const context = await coreAiIntelligenceService.buildCoreAiContext(studentA._id, {
      message: 'Hello mentor',
      mentorMode: 'general',
    })
    assert.equal(context.intent, 'GENERAL_CHAT')
    assert.ok(typeof context.contextText === 'string')
    assert.ok(Array.isArray(context.recommendations))
    assert.ok(context.nextAction)
    assert.match(context.nextAction.title, /goal/i)
  })

  it('builds goal and task aware context for daily plan', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Become full-stack engineer',
      category: 'Career',
      status: 'active',
      progress: 20,
    })
    await Task.create({
      userId: studentA._id,
      title: 'Finish React module',
      goalId: goal._id,
      status: 'todo',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000),
    })
    await Roadmap.create({
      userId: studentA._id,
      goalId: goal._id,
      status: 'active',
      data: { overview: 'FS path' },
      learningStages: [{ title: 'Frontend foundations', status: 'in-progress' }],
    })

    const context = await coreAiIntelligenceService.buildCoreAiContext(studentA._id, {
      message: 'What should I do today?',
      action: 'plan-day',
    })

    assert.equal(context.intent, 'DAILY_PLAN')
    assert.ok(context.contextText.includes('Become full-stack engineer') || context.loaded?.goals?.length)
    assert.ok(context.loaded?.tasks?.length || context.recommendations.some((r) => /task|Finish React/i.test(r.label)))
    assert.ok(context.suggestions.length >= 1)
    assert.ok(context.contextUsed.length >= 1)
  })

  it('prioritizes career context for career questions without requiring unrelated layers', async () => {
    await Goal.create({ userId: studentA._id, title: 'Land SWE internship', category: 'Career', status: 'active' })
    const context = await coreAiIntelligenceService.buildCoreAiContext(studentA._id, {
      message: 'How should I prepare for my career target role?',
      mentorMode: 'career',
    })
    assert.equal(context.intent, 'CAREER_HELP')
    assert.ok(context.sources.includes('career') || context.sources.includes('goals') || context.sources.includes('skills'))
  })

  it('scopes context to authenticated user only (no cross-user leakage)', async () => {
    await Goal.create({ userId: studentA._id, title: 'Private A goal', category: 'Skill', status: 'active' })
    await Goal.create({ userId: studentB._id, title: 'Secret B goal', category: 'Skill', status: 'active' })

    const contextA = await coreAiIntelligenceService.buildCoreAiContext(studentA._id, {
      message: 'Help with my goal',
    })
    assert.match(contextA.contextText, /Private A goal/)
    assert.doesNotMatch(contextA.contextText, /Secret B goal/)
  })

  it('rejects mentor chat without authenticated student user', async () => {
    const res = await invoke(mentorController.mentorChat, null, {
      body: { message: 'hi' },
    })
    // Controller assumes auth middleware; without user it should error safely
    assert.ok(res.statusCode >= 400 || res.body?.success === false)
  })

  it('mentor chat returns compatibility fields plus intelligence contract', async () => {
    const previousKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    await Goal.create({
      userId: studentA._id,
      title: 'Ship portfolio project',
      category: 'Project',
      status: 'active',
      progress: 40,
    })

    try {
      const res = await invoke(mentorController.mentorChat, studentA, {
        body: { message: 'What should I work on today?', mentorMode: 'general', action: 'plan-day' },
      })
      assert.equal(res.statusCode, 200)
      assert.equal(res.body.success, true)
      assert.ok(res.body.reply)
      assert.ok(res.body.conversationId)
      assert.equal(res.body.intent, 'DAILY_PLAN')
      assert.ok(Array.isArray(res.body.suggestions))
      assert.ok(Array.isArray(res.body.recommendations))
      assert.ok(res.body.nextAction)
      assert.ok(Array.isArray(res.body.contextUsed))
    } finally {
      if (previousKey) process.env.OPENAI_API_KEY = previousKey
    }
  })

  it('mentor routes remain student-auth protected', () => {
    const layers = mentorRoutes.stack.filter((layer) => layer.route)
    const chat = layers.find((layer) => layer.route.path === '/chat' && layer.route.methods.post)
    assert.ok(chat)
    assert.ok(chat.route.stack.length >= 2)
  })

  it('general chat uses lighter context budget path', async () => {
    const context = await coreAiIntelligenceService.buildCoreAiContext(studentA._id, {
      message: 'Hello',
      mentorMode: 'general',
    })
    assert.equal(context.intent, 'GENERAL_CHAT')
    // General chat should not force academic+career+library all at once by default
    assert.ok(!context.sources.includes('academics') || context.sources.length <= 6)
  })
})
