const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const Resume = require('../models/Resume')
const StudentProfile = require('../models/StudentProfile')
const FocusSession = require('../models/FocusSession')
const taskCertificateService = require('../services/taskCertificateService')
const profileController = require('../controllers/profileController')
const profilePortfolioService = require('../services/profilePortfolioService')

let mongod
const ownerId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    set(key, value) {
      this.headers[key] = value
      return this
    },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, currentUserId = ownerId } = {}) {
  const res = createRes()
  await handler({ body, params, query, user: { _id: currentUserId, id: currentUserId } }, res)
  return res
}

describe('Task Progression Privacy & Security Tests (Phase C)', () => {
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
      Task.deleteMany({}),
      TaskExam.deleteMany({}),
      TaskCertificate.deleteMany({}),
      Resume.deleteMany({}),
      StudentProfile.deleteMany({}),
      FocusSession.deleteMany({}),
    ])
  })

  it('1. Non-owner public portfolio excludes task certificate by default; visible only when listed in privacy.visibleItems.credentials with public visibility; owner always sees it', async () => {
    const ownerUser = await User.create({
      _id: ownerId,
      name: 'Owner Student',
      email: 'owner@example.com',
      password: 'password123',
    })

    const otherUser = await User.create({
      _id: otherUserId,
      name: 'Other Student',
      email: 'other@example.com',
      password: 'password123',
    })

    const task = await Task.create({
      userId: ownerId,
      title: 'Distributed Systems Mastery',
      workflowEnabled: true,
      stageStatus: 'exam_passed',
      progressionStage: 'certification',
      subtasks: [{ title: 'Consensus Algorithms', completed: true }],
    })

    await TaskExam.create({
      taskId: task._id,
      userId: ownerId,
      status: 'submitted',
      attempts: [{ attemptNumber: 1, score: 95, passed: true, evaluatedAt: new Date() }],
      questions: [],
    })

    // Issue certificate and link to profile
    const cert = await taskCertificateService.issueCertificate(task._id, ownerId)
    await taskCertificateService.linkCertificateToResume(task._id, ownerId)

    // Ensure student profile exists with public visibility for portfolio
    const profile = await StudentProfile.findOne({ userId: ownerId })
    profile.privacy.visibility = 'public'
    await profile.save()

    // 1A. Owner views own profile -> sees the certificate in credentials
    const ownerRes = await invoke(profileController.getProfile, { currentUserId: ownerId })
    assert.equal(ownerRes.statusCode, 200)
    assert.ok(Array.isArray(ownerRes.body.profile.credentials))
    const ownerCert = ownerRes.body.profile.credentials.find((c) => c.credentialId === cert.credentialId)
    assert.ok(ownerCert, 'Owner must always see their own certificate in their profile')
    assert.equal(ownerCert.title, 'Distributed Systems Mastery')

    // 1B. Non-owner requests public portfolio -> DOES NOT include task certificate by default
    const publicRes1 = await invoke(profileController.getPublicPortfolio, {
      params: { username: profile.username },
      currentUserId: otherUserId,
    })
    assert.equal(publicRes1.statusCode, 200)
    const publicCreds1 = publicRes1.body.portfolio.credentials || []
    assert.equal(
      publicCreds1.some((c) => c.credentialId === cert.credentialId),
      false,
      'Task certificate must NOT appear in public portfolio by default',
    )

    // 1C. Owner sets credential to visibility 'public' but NOT in visibleItems -> still NOT visible publicly
    const credIndex = profile.credentials.findIndex((c) => c.credentialId === cert.credentialId)
    profile.credentials[credIndex].visibility = 'public'
    await profile.save()

    const publicRes2 = await invoke(profileController.getPublicPortfolio, {
      params: { username: profile.username },
      currentUserId: otherUserId,
    })
    const publicCreds2 = publicRes2.body.portfolio.credentials || []
    assert.equal(
      publicCreds2.some((c) => c.credentialId === cert.credentialId),
      false,
      'Task certificate with public visibility but not in visibleItems.credentials must NOT appear',
    )

    // 1D. Owner lists the credential id in privacy.visibleItems.credentials -> NOW visible in public portfolio
    profile.privacy.visibleItems = {
      credentials: [cert.credentialId],
    }
    await profile.save()

    const publicRes3 = await invoke(profileController.getPublicPortfolio, {
      params: { username: profile.username },
      currentUserId: otherUserId,
    })
    const publicCreds3 = publicRes3.body.portfolio.credentials || []
    const visibleCert = publicCreds3.find((c) => c.credentialId === cert.credentialId)
    assert.ok(visibleCert, 'Certificate must appear in public portfolio after explicit inclusion in visibleItems.credentials')
    assert.equal(visibleCert.title, 'Distributed Systems Mastery')
  })

  it('2. Linking twice produces exactly one credential in profile and one in chosen resume; /api/profile returns real schema field names', async () => {
    await User.create({
      _id: ownerId,
      name: 'Resume Linker',
      email: 'linker@example.com',
      password: 'password123',
    })

    const task = await Task.create({
      userId: ownerId,
      title: 'Cloud Architecture Specialization',
      workflowEnabled: true,
      stageStatus: 'exam_passed',
      progressionStage: 'certification',
      subtasks: [{ title: 'Microservices', completed: true }],
    })

    await TaskExam.create({
      taskId: task._id,
      userId: ownerId,
      status: 'submitted',
      attempts: [{ attemptNumber: 1, score: 90, passed: true, evaluatedAt: new Date() }],
      questions: [],
    })

    const resume = await Resume.create({
      userId: ownerId,
      title: 'Primary Resume',
      isDefault: true,
      revision: 1,
      certifications: [],
    })

    const cert = await taskCertificateService.issueCertificate(task._id, ownerId)

    // Link first time
    await taskCertificateService.linkCertificateToResume(task._id, ownerId)

    // Link second time (idempotent duplicate call)
    await taskCertificateService.linkCertificateToResume(task._id, ownerId)

    // Verify Profile has exactly ONE credential entry
    const profile = await StudentProfile.findOne({ userId: ownerId })
    const matchingProfileCreds = (profile.credentials || []).filter((c) => c.credentialId === cert.credentialId)
    assert.equal(matchingProfileCreds.length, 1, 'Linking twice must produce exactly one credential in StudentProfile')

    // Verify Resume has exactly ONE certification entry
    const reloadedResume = await Resume.findById(resume._id)
    const matchingResumeCerts = (reloadedResume.certifications || []).filter((c) => c.credentialId === cert.credentialId)
    assert.equal(matchingResumeCerts.length, 1, 'Linking twice must produce exactly one certification in Resume')

    // Test /api/profile real schema field names:
    // issueDate, credentialUrl, verificationStatus, category, skills, credentialId
    const profileRes = await invoke(profileController.getProfile, { currentUserId: ownerId })
    assert.equal(profileRes.statusCode, 200)

    const rawProfileCred = profileRes.body.profile.credentials.find((c) => c.credentialId === cert.credentialId)
    assert.ok(rawProfileCred, 'Credential must exist in /api/profile response')

    // Convert via JSON to inspect serialized schema field names
    const jsonCred = JSON.parse(JSON.stringify(rawProfileCred))
    assert.ok(jsonCred.issueDate !== undefined, 'Credential must contain issueDate')
    assert.ok(jsonCred.credentialUrl !== undefined, 'Credential must contain credentialUrl')
    assert.equal(jsonCred.verificationStatus, 'verified')
    assert.equal(jsonCred.category, 'course')
    assert.ok(Array.isArray(jsonCred.skills), 'skills must be an array')
    assert.equal(jsonCred.credentialId, cert.credentialId)
  })

  it('3. No userId is written into any credential entry, and no public verification route was created', async () => {
    await User.create({
      _id: ownerId,
      name: 'Privacy Student',
      email: 'privacy@example.com',
      password: 'password123',
    })

    const task = await Task.create({
      userId: ownerId,
      title: 'Privacy and Cryptography',
      workflowEnabled: true,
      stageStatus: 'exam_passed',
      progressionStage: 'certification',
      subtasks: [{ title: 'Zero Knowledge', completed: true }],
    })

    await TaskExam.create({
      taskId: task._id,
      userId: ownerId,
      status: 'submitted',
      attempts: [{ attemptNumber: 1, score: 92, passed: true, evaluatedAt: new Date() }],
      questions: [],
    })

    const resume = await Resume.create({
      userId: ownerId,
      title: 'Security Resume',
      isDefault: true,
      revision: 1,
      certifications: [],
    })

    const cert = await taskCertificateService.issueCertificate(task._id, ownerId)
    await taskCertificateService.linkCertificateToResume(task._id, ownerId)

    // Inspect StudentProfile.credentials entry in DB
    const profile = await StudentProfile.findOne({ userId: ownerId }).lean()
    const profileCred = (profile.credentials || []).find((c) => c.credentialId === cert.credentialId)
    assert.ok(profileCred)
    assert.equal(profileCred.userId, undefined, 'StudentProfile.credentials must not contain userId')

    // Inspect Resume.certifications entry in DB
    const reloadedResume = await Resume.findById(resume._id).lean()
    const resumeCert = (reloadedResume.certifications || []).find((c) => c.credentialId === cert.credentialId)
    assert.ok(resumeCert)
    assert.equal(resumeCert.userId, undefined, 'Resume.certifications must not contain userId')

    // Verify no public verification route was created for task certificates
    const fs = require('fs')
    const path = require('path')
    const routeFiles = fs.readdirSync(path.join(__dirname, '../routes'))
    let foundPublicVerifyRoute = false
    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(__dirname, '../routes', file), 'utf8')
      if (content.includes('taskCertificate') && content.includes('/verify')) {
        foundPublicVerifyRoute = true
      }
    }
    assert.equal(foundPublicVerifyRoute, false, 'No public task certificate verification route exists')
  })
})
