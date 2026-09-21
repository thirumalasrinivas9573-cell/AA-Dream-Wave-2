const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const FocusSession = require('../models/FocusSession')
const controller = require('../controllers/profileController')

let mongod
let student
let otherStudent

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    set(key, value) { this.headers[key] = value; return this },
  }
}

async function invoke(handler, { body = {}, params = {}, currentUser = student, file } = {}) {
  const res = response()
  await handler({ body, params, file, user: { _id: currentUser._id, id: currentUser._id, role: currentUser.role } }, res)
  return res
}

describe('student digital identity ecosystem', () => {
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
      User.deleteMany({}),
      StudentProfile.deleteMany({}),
      Goal.deleteMany({}),
      Task.deleteMany({}),
      Roadmap.deleteMany({}),
      LibraryProgress.deleteMany({}),
      FocusSession.deleteMany({}),
    ])
    student = await User.create({
      name: 'Asha Student',
      email: 'asha@example.com',
      password: 'StrongPass123!',
      role: 'student',
      phone: '+919999999999',
      verificationOTP: '123456',
      resetPasswordOTP: '654321',
      passwordHistory: ['should-not-leak'],
    })
    otherStudent = await User.create({
      name: 'Other Student',
      email: 'other@example.com',
      password: 'StrongPass123!',
      role: 'student',
    })
  })

  it('returns a safe profile projection and creates a stable username', async () => {
    const result = await invoke(controller.getProfile)
    assert.equal(result.statusCode, 200)
    assert.equal(result.body.user.email, 'asha@example.com')
    assert.ok(result.body.profile.username.startsWith('asha-student-'))
    for (const secret of ['password', 'passwordHistory', 'verificationOTP', 'resetPasswordOTP', 'failedLoginAttempts']) {
      assert.equal(Object.hasOwn(result.body.user, secret), false)
    }
    assert.equal(await StudentProfile.countDocuments({ userId: student._id }), 1)
  })

  it('updates academic identity, privacy and preferences with username uniqueness', async () => {
    const initial = await invoke(controller.getProfile)
    const updated = await invoke(controller.updateProfile, {
      body: {
        revision: initial.body.profile.revision,
        username: 'asha-builds',
        displayName: 'Asha Rao',
        headline: 'Computer science student',
        academic: {
          institution: 'Dream Institute',
          department: 'Computer Science',
          course: 'B.Tech',
          semester: '6',
          year: '3',
          cgpa: 9.2,
          activeCourses: ['Operating Systems'],
          completedCourses: ['Data Structures'],
        },
      },
    })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.body.profile.academic.cgpa, 9.2)
    assert.equal(updated.body.profile.username, 'asha-builds')

    const privacy = await invoke(controller.updatePrivacy, { body: { visibility: 'public', discoverable: true, showEmail: false } })
    assert.equal(privacy.body.privacy.discoverable, true)
    const preferences = await invoke(controller.updatePreferences, { body: { theme: 'dark', language: 'te', weeklySummary: false } })
    assert.equal(preferences.body.preferences.theme, 'dark')
  })

  it('manages skills, portfolio projects, achievements and unverified credentials', async () => {
    const goal = await Goal.create({ userId: student._id, title: 'Become a frontend engineer' })
    const project = await invoke(controller.addEntity, {
      params: { section: 'projects' },
      body: {
        title: 'Learning Dashboard',
        description: 'A student analytics dashboard.',
        technologies: ['React', 'Node.js'],
        githubUrl: 'https://github.com/example/dashboard',
        status: 'completed',
        goalId: goal._id,
        visibility: 'public',
      },
    })
    assert.equal(project.statusCode, 201)

    const foreignGoal = await Goal.create({ userId: otherStudent._id, title: 'Private goal' })
    const denied = await invoke(controller.addEntity, {
      params: { section: 'projects' },
      body: { title: 'Invalid project', goalId: foreignGoal._id },
    })
    assert.equal(denied.statusCode, 404)

    const skill = await invoke(controller.addEntity, {
      params: { section: 'skills' },
      body: { name: 'React', type: 'framework', proficiency: 82, visibility: 'public' },
    })
    assert.equal(skill.body.item.proficiency, 82)

    const achievement = await invoke(controller.addEntity, {
      params: { section: 'achievements' },
      body: { title: 'Campus Hackathon Winner', type: 'hackathon', visibility: 'public', verified: true },
    })
    assert.equal(achievement.body.item.verified, false)

    const credential = await invoke(controller.addEntity, {
      params: { section: 'credentials' },
      body: { title: 'Cloud Fundamentals', issuer: 'Open Academy', category: 'course', visibility: 'public', verificationStatus: 'verified' },
    })
    assert.equal(credential.body.item.verificationStatus, 'unverified')
  })

  it('builds deterministic learning summary and knowledge relationships', async () => {
    await invoke(controller.getProfile)
    const goal = await Goal.create({ userId: student._id, title: 'Learn React', status: 'active', progress: 50 })
    await Task.create({ userId: student._id, goalId: goal._id, title: 'Build components', status: 'completed', completed: true })
    await invoke(controller.addEntity, {
      params: { section: 'skills' },
      body: { name: 'React', type: 'framework', proficiency: 70, visibility: 'public' },
    })
    await invoke(controller.addEntity, {
      params: { section: 'projects' },
      body: { title: 'React Portfolio', technologies: ['React'], goalId: goal._id, visibility: 'public' },
    })
    const summary = await invoke(controller.getSummary)
    assert.equal(summary.body.summary.goals.total, 1)
    assert.equal(summary.body.summary.tasks.completed, 1)
    const graph = await invoke(controller.getKnowledgeGraph)
    assert.equal(graph.body.graph.schemaVersion, 'student-knowledge-graph-v1')
    assert.ok(graph.body.graph.nodes.some((node) => node.type === 'skill'))
    assert.ok(graph.body.graph.edges.some((edge) => edge.type === 'USES_SKILL'))
  })

  it('publishes only explicitly visible portfolio fields and emits SEO data', async () => {
    await invoke(controller.getProfile)
    await invoke(controller.updateProfile, { body: { username: 'asha-public', displayName: 'Asha Rao', headline: 'Builder', bio: 'Learning in public.' } })
    await invoke(controller.updatePrivacy, { body: { visibility: 'public', discoverable: true, showEmail: false, showPhone: false } })
    await invoke(controller.addEntity, {
      params: { section: 'credentials' },
      body: { title: 'Public Credential', issuer: 'Open Academy', visibility: 'public' },
    })
    await invoke(controller.addEntity, {
      params: { section: 'credentials' },
      body: { title: 'Private Credential', issuer: 'Private Academy', visibility: 'private' },
    })
    const publicResult = await invoke(controller.getPublicPortfolio, { params: { username: 'asha-public' } })
    assert.equal(publicResult.statusCode, 200)
    assert.equal(publicResult.body.portfolio.credentials.length, 1)
    assert.equal(publicResult.body.portfolio.person.email, undefined)
    assert.equal(publicResult.body.portfolio.schemaVersion, 'student-portfolio-v2')
    assert.equal(publicResult.body.portfolio.seo.robots, 'index,follow')
    assert.equal(publicResult.body.portfolio.jsonLd['@type'], 'ProfilePage')
  })

  it('rejects unsupported and spoofed profile uploads', async () => {
    const result = await invoke(controller.uploadProfileAsset, {
      body: { purpose: 'profile-photo' },
      file: {
        mimetype: 'image/png',
        buffer: Buffer.from('not-a-png'),
        size: 9,
      },
    })
    assert.equal(result.statusCode, 400)
  })

  it('supports academic journey, experience, portfolio customization and public preview', async () => {
    const initial = await invoke(controller.getProfile)
    await invoke(controller.addEntity, {
      params: { section: 'academicJourney' },
      body: { institution: 'Dream Institute', program: 'B.Tech CSE', level: 'undergraduate', startYear: 2022, status: 'in-progress', visibility: 'public' },
    })
    await invoke(controller.addEntity, {
      params: { section: 'experience' },
      body: { title: 'Frontend Intern', organization: 'Startup Lab', type: 'internship', visibility: 'public' },
    })
    const refreshed = await invoke(controller.getProfile)
    const portfolioUpdate = await invoke(controller.updatePortfolio, {
      body: {
        revision: refreshed.body.profile.revision,
        intro: 'Builder focused on AI and web products.',
        sections: { projects: true, credentials: true, experience: true },
      },
    })
    assert.equal(portfolioUpdate.statusCode, 200)
    const preview = await invoke(controller.getPublicPreview)
    assert.equal(preview.statusCode, 200)
    assert.equal(preview.body.preview, true)
    assert.ok(preview.body.portfolio.academicJourney.length >= 1)
    const completeness = await invoke(controller.getCompleteness)
    assert.ok(completeness.body.completeness.percent >= 0)
    await invoke(controller.updatePrivacy, { body: { visibility: 'public', discoverable: true } })
    const share = await invoke(controller.getShareInfo)
    assert.match(share.body.share.url, /\/students\//)
  })

  it('prevents cross-student profile entity deletion', async () => {
    await invoke(controller.getProfile)
    const created = await invoke(controller.addEntity, {
      params: { section: 'skills' },
      body: { name: 'Node.js', type: 'framework', proficiency: 70, visibility: 'public' },
    })
    const denied = await invoke(controller.deleteEntity, {
      params: { section: 'skills', itemId: created.body.item._id },
      currentUser: otherStudent,
    })
    assert.equal(denied.statusCode, 404)
  })
})
