const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const Notification = require('../models/Notification')
const goalController = require('../controllers/goalController')
const roadmapController = require('../controllers/roadmapController')

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

describe('goals and roadmap foundation', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([Goal.deleteMany({}), Roadmap.deleteMany({}), Notification.deleteMany({})])
  })

  it('creates a structured goal and preserves ownership', async () => {
    const created = await invoke(goalController.createGoal, {
      body: {
        title: 'Become a platform engineer',
        description: 'Build production infrastructure skills',
        category: 'Career',
        priority: 'High',
        difficulty: 'Advanced',
        weeklyStudyHours: 8,
        estimatedDuration: '6 months',
        deadline: '2027-01-01',
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.body.goal.title, 'Become a platform engineer')
    assert.equal(created.body.goal.priority, 'High')
    assert.equal(created.body.goal.weeklyStudyHours, 8)

    const denied = await invoke(goalController.getGoal, {
      params: { id: created.body.goal._id.toString() },
      currentUserId: otherUserId,
    })
    assert.equal(denied.statusCode, 404)
  })

  it('tracks milestones and progress analytics', async () => {
    const goal = await Goal.create({ userId, title: 'Earn certification', category: 'Certification' })
    const milestone = await invoke(goalController.addMilestone, {
      params: { id: goal._id.toString() },
      body: { title: 'Finish core curriculum', targetDate: '2026-12-01' },
    })
    assert.equal(milestone.statusCode, 201)

    const milestoneId = milestone.body.milestone._id.toString()
    const updated = await invoke(goalController.updateMilestone, {
      params: { id: goal._id.toString(), milestoneId },
      body: { progress: 100, status: 'completed' },
    })
    assert.equal(updated.body.milestone.progress, 100)
    assert.equal(updated.body.milestone.status, 'completed')

    const progress = await invoke(goalController.addProgressEntry, {
      params: { id: goal._id.toString() },
      body: { progress: 60, studyHours: 2.5, note: 'Completed practice lab' },
    })
    assert.equal(progress.body.goal.progress, 60)

    const analytics = await invoke(goalController.getGoalAnalytics)
    assert.equal(analytics.statusCode, 200)
    assert.equal(analytics.body.analytics.total, 1)
    assert.equal(analytics.body.analytics.studyHours, 2.5)
  })

  it('initializes and updates a manual roadmap architecture', async () => {
    const goal = await Goal.create({ userId, title: 'Learn distributed systems', category: 'Skill' })
    const initialized = await invoke(roadmapController.initializeRoadmap, {
      body: { goalId: goal._id.toString() },
    })
    assert.equal(initialized.statusCode, 201)
    assert.equal(initialized.body.roadmap.architecture.source, 'manual')

    const updated = await invoke(roadmapController.updateArchitecture, {
      params: { goalId: goal._id.toString() },
      body: {
        learningStages: [{
          title: 'Foundations',
          order: 1,
          status: 'in-progress',
          progress: 25,
          skills: ['Networking', 'Concurrency'],
        }],
        weeklyPlans: [{
          week: 1,
          focus: 'Consensus basics',
          outcomes: ['Explain Raft'],
          studyHours: 6,
        }],
      },
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.body.roadmap.learningStages.length, 1)
    assert.equal(updated.body.roadmap.weeklyPlans[0].studyHours, 6)

    const duplicate = await invoke(roadmapController.initializeRoadmap, {
      body: { goalId: goal._id.toString() },
    })
    assert.equal(duplicate.statusCode, 200)
    assert.equal(duplicate.body.created, false)
    assert.equal(await Roadmap.countDocuments({ userId, goalId: goal._id }), 1)
  })
})
