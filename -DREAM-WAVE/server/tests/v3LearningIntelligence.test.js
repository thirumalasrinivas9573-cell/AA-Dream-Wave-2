const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const StudentProfile = require('../models/StudentProfile')
const learningIntelligenceService = require('../services/learningIntelligenceService')
const intelligenceController = require('../controllers/intelligenceController')
const goalController = require('../controllers/goalController')

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

describe('Version 3 Learning Intelligence (Prompt 7)', () => {
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
    studentA = await User.create({ name: 'Asha', email: 'asha.li@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.li@example.com', password: 'Password123', role: 'student' })
  })

  it('handles student with no goal via empty next-action setup', async () => {
    const intel = await learningIntelligenceService.getLearningIntelligence(studentA._id)
    assert.equal(intel.overview.empty, true)
    assert.equal(intel.nextAction.type, 'SETUP')
    assert.match(intel.nextAction.why, /No active goal/i)
    assert.equal(intel.skillGaps.requiredCount, 0)
  })

  it('persists requiredSkills on goal create/update (no mass assignment of userId)', async () => {
    const created = await invoke(goalController.createGoal, studentA, {
      body: {
        title: 'Become an AI Engineer',
        category: 'Career',
        requiredSkills: ['Python', 'Machine Learning', 'Deployment'],
        userId: studentB._id,
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(String(created.body.goal.userId), String(studentA._id))
    assert.deepEqual(created.body.goal.requiredSkills, ['Python', 'Machine Learning', 'Deployment'])

    const updated = await invoke(goalController.updateGoal, studentA, {
      params: { id: String(created.body.goal._id) },
      body: { requiredSkills: ['Python', 'ML', 'APIs'] },
    })
    assert.equal(updated.statusCode, 200)
    assert.deepEqual(updated.body.goal.requiredSkills, ['Python', 'ML', 'APIs'])
  })

  it('builds skill gaps from goal requiredSkills vs profile evidence', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'AI Engineer path',
      status: 'active',
      requiredSkills: ['Python', 'Machine Learning', 'Deployment'],
    })
    await StudentProfile.create({
      userId: studentA._id,
      username: 'asha-li',
      skills: [
        { name: 'Python', proficiency: 70, verified: false },
        { name: 'Machine Learning', proficiency: 40, verified: false },
      ],
      projects: [
        { title: 'ML Classifier', technologies: ['Python', 'scikit-learn'], status: 'in-progress' },
      ],
    })
    await Roadmap.create({
      userId: studentA._id,
      goalId: goal._id,
      data: { overview: 'test', nextSteps: [{ title: 'Python basics', completed: true }, { title: 'Model evaluation', completed: false }] },
      status: 'active',
      learningStages: [
        { title: 'Python fundamentals', order: 1, status: 'completed', skills: ['Python'] },
        { title: 'ML Basics', order: 2, status: 'in-progress', skills: ['Machine Learning'] },
        { title: 'Deep Learning', order: 3, status: 'available', skills: ['Deep Learning'] },
      ],
    })

    const gaps = await learningIntelligenceService.getLearningIntelligence(studentA._id, { goalId: goal._id })
    assert.ok(gaps.skillGaps.requiredCount >= 3)
    const deployment = gaps.skillGaps.items.find((i) => i.skill === 'Deployment')
    assert.ok(deployment)
    assert.equal(deployment.state, 'NOT_STARTED')
    assert.equal(deployment.gap, true)
    const python = gaps.skillGaps.items.find((i) => i.skill === 'Python')
    assert.ok(python)
    assert.ok(['LEARNING', 'PRACTICING', 'PROJECT_EVIDENCE'].includes(python.state))
    assert.ok(gaps.skillGaps.items.some((i) => i.skill === 'Machine Learning'))
  })

  it('next learning action uses incomplete roadmap topic / open tasks', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Learn ML',
      status: 'active',
      requiredSkills: ['Model Evaluation'],
    })
    await Roadmap.create({
      userId: studentA._id,
      goalId: goal._id,
      data: { nextSteps: [{ title: 'Model Evaluation', completed: false }] },
      status: 'active',
      learningStages: [
        { title: 'Model Evaluation', order: 1, status: 'in-progress', skills: ['Model Evaluation'] },
      ],
    })
    await Task.create({
      userId: studentA._id,
      goalId: goal._id,
      title: 'Practice ROC curves',
      type: 'practice',
      status: 'todo',
      priority: 'High',
    })

    const intel = await learningIntelligenceService.getLearningIntelligence(studentA._id, { goalId: goal._id })
    assert.equal(intel.nextAction.type, 'TASK')
    assert.match(intel.nextAction.title, /ROC/i)
    assert.ok(intel.nextAction.why)
  })

  it('adaptive suggestions do not auto-apply roadmap changes', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'AI path',
      status: 'active',
      requiredSkills: ['Python'],
    })
    await Roadmap.create({
      userId: studentA._id,
      goalId: goal._id,
      data: {},
      status: 'active',
      learningStages: [
        { title: 'Python fundamentals', order: 1, status: 'available', skills: ['Python'] },
        { title: 'Advanced Deep Learning', order: 2, status: 'in-progress', skills: ['Deep Learning'] },
      ],
    })
    const intel = await learningIntelligenceService.getLearningIntelligence(studentA._id, { goalId: goal._id })
    assert.ok(intel.adaptive.items.some((i) => i.type === 'ADAPTIVE_ROADMAP' || i.type === 'SKILL_GAP'))
    assert.equal(intel.adaptive.items.every((i) => i.appliesAutomatically === false), true)
    assert.match(intel.adaptive.note, /never rewritten automatically/i)
  })

  it('plan suggestion is editable and does not overwrite roadmap', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Learn Machine Learning',
      status: 'active',
      requiredSkills: ['Python', 'NumPy', 'Statistics'],
    })
    const intel = await learningIntelligenceService.getLearningIntelligence(studentA._id, { goalId: goal._id })
    assert.equal(intel.plan.editable, true)
    assert.equal(intel.plan.overwritesRoadmap, false)
    assert.equal(intel.plan.label, 'AI SUGGESTION')
    assert.ok(intel.plan.steps.length >= 2)
  })

  it('project learning needs derive from portfolio technologies', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Build APIs',
      status: 'active',
      requiredSkills: ['REST APIs'],
    })
    await StudentProfile.create({
      userId: studentA._id,
      username: 'asha-api',
      skills: [],
      projects: [{ title: 'Campus API', technologies: ['REST APIs', 'Express'], status: 'in-progress', goalId: goal._id }],
    })
    const intel = await learningIntelligenceService.getLearningIntelligence(studentA._id, { goalId: goal._id })
    assert.ok(intel.projectLearning.items.length >= 1)
    assert.ok(intel.projectLearning.items[0].learningNeeds.includes('REST APIs') || intel.projectLearning.items[0].recommendation?.study)
  })

  it('prevents IDOR — student B cannot load student A goal intelligence', async () => {
    const goal = await Goal.create({
      userId: studentA._id,
      title: 'Private learning goal',
      status: 'active',
      requiredSkills: ['SecretSkill'],
    })
    const denied = await invoke(intelligenceController.learningIntelligence, studentB, {
      query: { goalId: String(goal._id) },
    })
    assert.equal(denied.statusCode, 404)
    assert.equal(denied.body.success, false)

    const allowed = await invoke(intelligenceController.learningIntelligence, studentA, {
      query: { goalId: String(goal._id) },
    })
    assert.equal(allowed.statusCode, 200)
    assert.equal(allowed.body.data.overview.currentGoal.title, 'Private learning goal')
  })

  it('routes learning intents without a second intent engine', () => {
    assert.equal(learningIntelligenceService.routeLearningIntent('What should I learn next?'), 'LEARNING_NEXT')
    assert.equal(learningIntelligenceService.routeLearningIntent('What skill am I missing?'), 'SKILL_GAP')
    assert.equal(learningIntelligenceService.routeLearningIntent('', 'learning-plan'), 'LEARNING_PLAN')
  })

  it('learning context block states missing data safely', async () => {
    const block = await learningIntelligenceService.buildLearningContextBlock(studentA._id, {
      message: 'What should I learn next?',
    })
    assert.match(block.text, /Active goal: none/)
    assert.match(block.text, /Do not invent resources/)
    assert.equal(block.intent, 'LEARNING_NEXT')
  })
})
