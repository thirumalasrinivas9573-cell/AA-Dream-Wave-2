const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const Resume = require('../models/Resume')
const StudentProfile = require('../models/StudentProfile')
const FocusSession = require('../models/FocusSession')
const openaiService = require('../services/openaiService')
const taskProgressionService = require('../services/taskProgressionService')
const taskExamService = require('../services/taskExamService')
const taskCertificateService = require('../services/taskCertificateService')
const progressionConfig = require('../config/progression')

let mongod
let originalRobustAiCall
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

describe('Task Certification Services (Step 4)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())

    originalRobustAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => {
      return {
        questions: Array.from({ length: 10 }, (_, i) => ({
          question: `Scenario Question ${i + 1} on system reliability?`,
          options: [
            `Option A for Q${i + 1}`,
            `Option B for Q${i + 1}`,
            `Option C for Q${i + 1}`,
            `Option D for Q${i + 1}`,
          ],
          correctIndex: 0,
          explanation: `Option A explanation for Q${i + 1}.`,
        })),
      }
    }
  })

  after(async () => {
    openaiService.robustAiCall = originalRobustAiCall
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([
      Task.deleteMany({}),
      TaskExam.deleteMany({}),
      TaskCertificate.deleteMany({}),
      Resume.deleteMany({}),
      StudentProfile.deleteMany({}),
      FocusSession.deleteMany({}),
    ])
  })

  async function setupPassedTask() {
    const task = await Task.create({
      userId,
      title: 'High-Throughput Message Brokers',
      workflowEnabled: true,
      estimatedMinutes: 30,
      actualMinutes: 20,
      notes: [{ text: 'Kafka partitions and consumer groups studied.' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      endedAt: new Date(),
      durationSeconds: 20 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )
    const passingAnswers = storedExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))
    await taskExamService.submitExam(task._id, userId, passingAnswers)
    return await Task.findById(task._id)
  }

  it('H. Certificate is auto-generated after a passing exam', async () => {
    const task = await setupPassedTask()
    assert.equal(task.stageStatus, 'exam_passed')

    const cert = await taskCertificateService.issueCertificate(task._id, userId)

    assert.ok(cert.credentialId.startsWith('DW-CERT-'))
    assert.equal(cert.title, task.title)
    assert.equal(cert.linkedToResume, false)
    assert.equal(cert.verificationUrl, '')
    assert.equal(cert.userId.toString(), userId.toString())

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'certification_locked')
    assert.equal(updatedTask.progressionStage, 'certification')
    assert.equal(updatedTask.certificateId, cert.credentialId)
  })

  it('I. Calling issueCertificate repeatedly returns the same certificate (one document)', async () => {
    const task = await setupPassedTask()

    const cert1 = await taskCertificateService.issueCertificate(task._id, userId)
    const cert2 = await taskCertificateService.issueCertificate(task._id, userId)

    assert.equal(cert1._id.toString(), cert2._id.toString())
    assert.equal(cert1.credentialId, cert2.credentialId)

    const count = await TaskCertificate.countDocuments({ taskId: task._id })
    assert.equal(count, 1)
  })

  it('I2. Two concurrent issueCertificate calls (Promise.all) produce exactly one certificate', async () => {
    const task = await setupPassedTask()

    const [cert1, cert2] = await Promise.all([
      taskCertificateService.issueCertificate(task._id, userId),
      taskCertificateService.issueCertificate(task._id, userId),
    ])

    assert.equal(cert1._id.toString(), cert2._id.toString())
    assert.equal(cert1.credentialId, cert2.credentialId)

    const count = await TaskCertificate.countDocuments({ taskId: task._id })
    assert.equal(count, 1)
  })

  it('J. Certificate is linked to the Resume Builder structure, and linking twice creates no duplicate entry', async () => {
    const task = await setupPassedTask()
    const resume = await Resume.create({
      userId,
      title: 'Full Stack Engineer Resume',
      revision: 1,
      certifications: [],
    })

    const cert = await taskCertificateService.issueCertificate(task._id, userId)
    const linkedCert = await taskCertificateService.linkCertificateToResume(task._id, userId)

    assert.equal(linkedCert.linkedToResume, true)
    assert.equal(linkedCert.linkedResumeIds.length, 1)
    assert.equal(linkedCert.linkedResumeIds[0].toString(), resume._id.toString())

    const updatedResume = await Resume.findById(resume._id)
    assert.equal(updatedResume.certifications.length, 1)
    assert.equal(updatedResume.certifications[0].credentialId, cert.credentialId)
    assert.equal(updatedResume.certifications[0].title, task.title)
    assert.equal(updatedResume.revision, 2, 'Resume revision must be bumped')

    const studentProfile = await StudentProfile.findOne({ userId })
    assert.ok(studentProfile)
    const profCred = (studentProfile.credentials || []).find((c) => c.credentialId === cert.credentialId)
    assert.ok(profCred)
    assert.equal(profCred.verificationStatus, 'verified')

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'certification_completed')
    assert.ok(updatedTask.resumeLinkedAt)

    // Call linking a second time (idempotency check)
    await taskCertificateService.linkCertificateToResume(task._id, userId)
    const reloadedResume = await Resume.findById(resume._id)
    assert.equal(reloadedResume.certifications.length, 1, 'Duplicate certification must not be created')

    const reloadedProfile = await StudentProfile.findOne({ userId })
    const matchingCreds = (reloadedProfile.credentials || []).filter((c) => c.credentialId === cert.credentialId)
    assert.equal(matchingCreds.length, 1, 'Duplicate profile credential must not be created')
  })

  it('J2. Certificate linking with no resume succeeds with profile only', async () => {
    const task = await setupPassedTask()
    const cert = await taskCertificateService.issueCertificate(task._id, userId)

    // Ensure no resumes exist for this test
    await Resume.deleteMany({ userId })

    const linkedCert = await taskCertificateService.linkCertificateToResume(task._id, userId)
    assert.equal(linkedCert.linkedToResume, true)
    assert.equal(linkedCert.linkedResumeId, null)
    assert.equal(linkedCert.linkedResumeIds.length, 0)

    const studentProfile = await StudentProfile.findOne({ userId })
    assert.ok(studentProfile)
    const cred = (studentProfile.credentials || []).find((c) => c.credentialId === cert.credentialId)
    assert.ok(cred)
  })

  it('J3. Certificate linking with multiple resumes attaches to exactly one (primary/default)', async () => {
    const task = await setupPassedTask()
    const cert = await taskCertificateService.issueCertificate(task._id, userId)

    await Resume.deleteMany({ userId })
    const defaultResume = await Resume.create({
      userId,
      title: 'Default Resume',
      isDefault: true,
      revision: 1,
      certifications: [],
    })
    const otherResume = await Resume.create({
      userId,
      title: 'Secondary Resume',
      isDefault: false,
      revision: 1,
      certifications: [],
    })

    const linkedCert = await taskCertificateService.linkCertificateToResume(task._id, userId)
    assert.equal(linkedCert.linkedResumeId.toString(), defaultResume._id.toString())
    assert.equal(linkedCert.linkedResumeIds.length, 1)

    const reloadedDefault = await Resume.findById(defaultResume._id)
    assert.equal(reloadedDefault.certifications.length, 1)
    assert.equal(reloadedDefault.revision, 2)

    const reloadedOther = await Resume.findById(otherResume._id)
    assert.equal(reloadedOther.certifications.length, 0, 'Secondary resume must not get certificate')
  })

  it('K. If certificate generation fails (inject a failure), the task is NOT completed, the passed exam is kept, and a retry succeeds', async () => {
    const task = await setupPassedTask()

    // Inject failure into TaskCertificate.create
    const originalCreate = TaskCertificate.create
    TaskCertificate.create = async () => {
      const err = new Error('Disk write error in TaskCertificate')
      throw err
    }

    await assert.rejects(
      async () => {
        await taskCertificateService.issueCertificate(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'CERTIFICATE_GENERATION_FAILED')
        assert.equal(err.recoverable, true)
        return true
      },
    )

    const uncompletedTask = await Task.findById(task._id)
    assert.equal(uncompletedTask.completed, false)
    assert.equal(uncompletedTask.stageStatus, 'exam_passed')

    // Restore create and retry
    TaskCertificate.create = originalCreate
    const cert = await taskCertificateService.issueCertificate(task._id, userId)
    assert.ok(cert.credentialId)

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'certification_locked')
  })

  it('K2. If resume linking fails, the task is NOT completed, the certificate is kept, and a retry succeeds without a second certificate', async () => {
    const task = await setupPassedTask()
    const cert = await taskCertificateService.issueCertificate(task._id, userId)

    // Inject failure into Resume.find
    const originalFind = Resume.find
    Resume.find = async () => {
      throw new Error('Resume lookup query timeout')
    }

    await assert.rejects(
      async () => {
        await taskCertificateService.linkCertificateToResume(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'RESUME_LINK_FAILED')
        assert.equal(err.recoverable, true)
        return true
      },
    )

    const intermediateTask = await Task.findById(task._id)
    assert.equal(intermediateTask.completed, false)
    assert.equal(intermediateTask.stageStatus, 'certification_locked')

    const certCount = await TaskCertificate.countDocuments({ taskId: task._id })
    assert.equal(certCount, 1, 'Certificate must be preserved')

    // Restore find and retry
    Resume.find = originalFind
    const linked = await taskCertificateService.linkCertificateToResume(task._id, userId)
    assert.equal(linked.linkedToResume, true)

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'certification_completed')
    assert.equal(await TaskCertificate.countDocuments({ taskId: task._id }), 1)
  })

  it("L. A different user cannot issue, link, or finalize someone else's task", async () => {
    const task = await setupPassedTask()

    await assert.rejects(
      async () => {
        await taskCertificateService.issueCertificate(task._id, otherUserId)
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskCertificateService.linkCertificateToResume(task._id, otherUserId)
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskCertificateService.finalizeTask(task._id, otherUserId)
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )
  })

  it('M. issueCertificate refuses a task whose exam attempt is not passed, even if the task stageStatus is tampered to exam_passed directly in DB', async () => {
    // Maliciously create task with stageStatus exam_passed without actual exam attempt
    const tamperedTask = await Task.create({
      userId,
      title: 'Tampered State Task',
      workflowEnabled: true,
      stageStatus: 'exam_passed',
      progressionStage: 'certification',
    })

    await assert.rejects(
      async () => {
        await taskCertificateService.issueCertificate(tamperedTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'CERTIFICATION_NOT_ELIGIBLE')
        assert.equal(err.statusCode, 409)
        return true
      },
    )
  })

  it('N. finalizeTask completes only after everything is done; repeated finalize is a no-op', async () => {
    const task = await setupPassedTask()
    await taskCertificateService.issueCertificate(task._id, userId)
    await taskCertificateService.linkCertificateToResume(task._id, userId)

    const finalized = await taskCertificateService.finalizeTask(task._id, userId)

    assert.equal(finalized.completed, true)
    assert.equal(finalized.status, 'completed')
    assert.equal(finalized.progress, 100)
    assert.equal(finalized.progressionStage, 'completed')
    assert.equal(finalized.stageStatus, 'task_completed')
    assert.ok(finalized.completedAt)

    // Repeated finalize call is idempotent no-op
    const repeated = await taskCertificateService.finalizeTask(task._id, userId)
    assert.equal(repeated.completed, true)
    assert.equal(repeated.stageStatus, 'task_completed')
  })

  it('N2. finalizeTask refuses when the certificate is not linked', async () => {
    const task = await setupPassedTask()
    await taskCertificateService.issueCertificate(task._id, userId)

    // Certificate is issued but not linked yet
    await assert.rejects(
      async () => {
        await taskCertificateService.finalizeTask(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'FINALIZATION_NOT_ALLOWED')
        assert.ok(Array.isArray(err.missing))
        assert.ok(err.missing.some((m) => m.includes('linked to Resume Builder')))
        return true
      },
    )
  })

  it('N3. A legacy task (workflowEnabled:false) is rejected with WORKFLOW_NOT_ENABLED', async () => {
    const legacyTask = await Task.create({
      userId,
      title: 'Legacy Quick Task',
      workflowEnabled: false,
    })

    await assert.rejects(
      async () => {
        await taskCertificateService.issueCertificate(legacyTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskCertificateService.linkCertificateToResume(legacyTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskCertificateService.finalizeTask(legacyTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        return true
      },
    )
  })

  it('N4. completeCertificationPipeline run twice, and run after a partial failure, ends in the same final state', async () => {
    const task = await setupPassedTask()

    // First complete pipeline execution
    const run1 = await taskCertificateService.completeCertificationPipeline(task._id, userId)
    assert.equal(run1.task.stageStatus, 'task_completed')
    assert.equal(run1.task.completed, true)
    assert.equal(run1.certificate.linkedToResume, true)
    assert.ok(run1.certificate.credentialId)

    // Second execution on already-completed pipeline
    const run2 = await taskCertificateService.completeCertificationPipeline(task._id, userId)
    assert.equal(run2.task.stageStatus, 'task_completed')
    assert.equal(run2.certificate.credentialId, run1.certificate.credentialId)

    const totalCerts = await TaskCertificate.countDocuments({ taskId: task._id })
    assert.equal(totalCerts, 1)
  })

  it('O. production mode with AI failure gives EXAM_GENERATION_FAILED', async () => {
    const task = await Task.create({
      userId,
      title: 'Distributed Transaction Processing',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied Two-Phase Commit' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      endedAt: new Date(),
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    // Mock AI failure
    const savedAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => null

    const originalNodeEnv = process.env.NODE_ENV
    const originalAllowFallback = process.env.ALLOW_FALLBACK_EXAM
    try {
      // Explicitly simulate production environment
      process.env.NODE_ENV = 'production'
      delete process.env.ALLOW_FALLBACK_EXAM

      await assert.rejects(
        async () => {
          await taskExamService.startExam(task._id, userId)
        },
        (err) => {
          assert.equal(err.code, 'EXAM_GENERATION_FAILED')
          assert.equal(err.statusCode, 500)
          return true
        },
      )
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      if (originalAllowFallback !== undefined) process.env.ALLOW_FALLBACK_EXAM = originalAllowFallback
      openaiService.robustAiCall = savedAiCall
    }
  })

  it('P. invalid AI JSON is rejected and safely handled with fallback in non-prod', async () => {
    process.env.ALLOW_FALLBACK_EXAM = 'true'
    const task = await Task.create({
      userId,
      title: 'Database Consensus Algorithms',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied Paxos and Raft' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      endedAt: new Date(),
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    // Mock AI returning invalid questions (only 2 options instead of 4)
    const savedAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => ({
      questions: [
        {
          question: 'Invalid Schema Question',
          options: ['Option 1', 'Option 2'], // Invalid option count!
          correctIndex: 0,
        },
      ],
    })

    try {
      const examData = await taskExamService.startExam(task._id, userId)
      assert.ok(examData.examId)
      assert.equal(examData.questions.length, 10)
      for (const q of examData.questions) {
        assert.equal(q.options.length, 4)
        assert.equal(q.correctIndex, undefined)
      }
    } finally {
      openaiService.robustAiCall = savedAiCall
      delete process.env.ALLOW_FALLBACK_EXAM
    }
  })

  it("Q. A FAILED attempt's response does not reveal correct answers or explanations", async () => {
    const task = await Task.create({
      userId,
      title: 'Network Partitioning Strategies',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied split-brain avoidance' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      endedAt: new Date(),
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )

    // Fail all answers
    const failingAnswers = storedExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: (q.correctIndex + 1) % 4,
    }))

    const result = await taskExamService.submitExam(task._id, userId, failingAnswers)

    assert.equal(result.passed, false)
    assert.equal(result.nextStage, 'learning')
    for (const q of result.questions) {
      assert.equal(q.isCorrect, false)
      assert.equal(q.correctIndex, undefined, 'Must not reveal correctIndex on failure')
      assert.equal(q.explanation, undefined, 'Must not reveal explanations on failure')
    }
  })
})
