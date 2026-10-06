const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const FocusSession = require('../models/FocusSession')
const openaiService = require('../services/openaiService')
const taskProgressionService = require('../services/taskProgressionService')
const taskExamService = require('../services/taskExamService')

let mongod
let originalRobustAiCall
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

describe('Task Progression Services (Step 3)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())

    // Mock AI service to eliminate real network calls
    originalRobustAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => {
      return {
        questions: Array.from({ length: 10 }, (_, i) => ({
          question: `Mock Hard Scenario Question ${i + 1} regarding system performance and architecture?`,
          options: [
            `Distribute with event queue ${i + 1}`,
            `Monolithic single thread ${i + 1}`,
            `Unbounded memory cache ${i + 1}`,
            `Direct disk file write ${i + 1}`,
          ],
          correctIndex: 0,
          explanation: `Event queue architecture isolates load and guarantees fault tolerance for item ${i + 1}.`,
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
      FocusSession.deleteMany({}),
    ])
  })

  it('A. New workflow task starts in learning_active', async () => {
    const task = await Task.create({
      userId,
      title: 'Master Event-Driven Microservices',
      workflowEnabled: true,
      estimatedMinutes: 60,
    })

    assert.equal(task.workflowEnabled, true)
    assert.equal(task.progressionStage, 'learning')
    assert.equal(task.stageStatus, 'learning_active')
    assert.equal(Boolean(task.learningVerifiedAt), false)
    assert.equal(task.examAttemptsCount, 0)

    const state = await taskProgressionService.getProgressionState(task._id, userId)
    assert.equal(state.taskId, task._id.toString())
    assert.equal(state.stage, 'learning')
    assert.equal(state.status, 'learning_active')
    assert.equal(state.learning.verified, false)
    assert.equal(state.exam.unlocked, false)
  })

  it('B. Incomplete learning cannot start the exam (LEARNING_INCOMPLETE with requirements)', async () => {
    const task = await Task.create({
      userId,
      title: 'Distributed Consensus',
      workflowEnabled: true,
      estimatedMinutes: 60,
      actualMinutes: 5, // Ratio 0.5 requires 30 minutes
      subtasks: [
        { title: 'Read Raft paper', completed: true },
        { title: 'Implement leader election', completed: false },
      ],
    })

    await assert.rejects(
      async () => {
        await taskExamService.startExam(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'LEARNING_INCOMPLETE')
        assert.equal(err.statusCode, 400)
        assert.ok(Array.isArray(err.requirements))
        const focusReq = err.requirements.find((r) => r.key === 'focus_time')
        const subtasksReq = err.requirements.find((r) => r.key === 'subtasks')
        assert.equal(focusReq?.met, false)
        assert.equal(subtasksReq?.met, false)
        return true
      },
    )
  })

  it('C. Completed learning allows the exam to start and the response has no correctIndex', async () => {
    const task = await Task.create({
      userId,
      title: 'Database Sharding and Replication',
      workflowEnabled: true,
      estimatedMinutes: 40,
      actualMinutes: 25, // 25 >= 20 (40 * 0.5)
      subtasks: [{ title: 'Design partition key', completed: true }],
      checklist: [{ text: 'Review read replica latency', done: true }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 25 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)

    assert.ok(examData.examId)
    assert.equal(examData.taskId, task._id.toString())
    assert.equal(examData.questionCount, 10)
    assert.equal(examData.questions.length, 10)

    for (const q of examData.questions) {
      assert.ok(q.questionId)
      assert.ok(q.question)
      assert.equal(q.options.length, 4)
      assert.equal(q.correctIndex, undefined, 'correctIndex must never leak to client')
      assert.equal(q.explanation, undefined, 'explanation must never leak to client')
    }

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.progressionStage, 'exam')
    assert.equal(updatedTask.stageStatus, 'exam_active')
    assert.ok(updatedTask.learningVerifiedAt)
  })

  it('D. Score is computed server-side; extra { score:100, passed:true } in payload is ignored', async () => {
    const task = await Task.create({
      userId,
      title: 'Fault Tolerant Pipelines',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Reviewed circuit breakers' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)

    // Stored exam with answer key
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )

    // Intentionally construct answers where only 2 answers match correctIndex
    // and inject malicious score:100 and passed:true properties into the payload
    const submittedPayload = storedExam.questions.map((q, idx) => ({
      questionId: q.questionId,
      selectedIndex: idx < 2 ? q.correctIndex : (q.correctIndex + 1) % 4,
      score: 100, // Client forgery attempt
      passed: true, // Client forgery attempt
    }))

    const result = await taskExamService.submitExam(task._id, userId, submittedPayload)

    assert.equal(result.score, 20)
    assert.equal(result.passed, false)
    assert.equal(result.correctCount, 2)
    assert.equal(result.totalCount, 10)
  })

  it('E. Score >= minimum -> exam_passed + stage certification', async () => {
    const task = await Task.create({
      userId,
      title: 'Scalable Microservices',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied event sourcing' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)

    // Answer 9 out of 10 correctly (90% >= 80% passing threshold)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )
    const submittedPayload = storedExam.questions.map((q, idx) => ({
      questionId: q.questionId,
      selectedIndex: idx < 9 ? q.correctIndex : (q.correctIndex + 1) % 4,
    }))

    const result = await taskExamService.submitExam(task._id, userId, submittedPayload)

    assert.equal(result.score, 90)
    assert.equal(result.passed, true)
    assert.equal(result.nextStage, 'certification')
    // On pass, explanations are provided
    assert.ok(result.questions[0].explanation)

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'exam_passed')
    assert.equal(updatedTask.progressionStage, 'certification')
    assert.equal(updatedTask.examAttemptsCount, 1)
  })

  it('F. Score < minimum -> rolls back to learning_active, learningVerifiedAt cleared', async () => {
    const task = await Task.create({
      userId,
      title: 'Cache Invalidation Deep Dive',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied TTL strategies' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )

    // Answer all incorrectly
    const submittedPayload = storedExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: (q.correctIndex + 1) % 4,
    }))

    const result = await taskExamService.submitExam(task._id, userId, submittedPayload)

    assert.equal(result.score, 0)
    assert.equal(result.passed, false)
    assert.equal(result.nextStage, 'learning')
    // On fail, explanations must NOT be revealed
    assert.equal(result.questions[0].explanation, undefined)

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'learning_active')
    assert.equal(updatedTask.progressionStage, 'learning')
    assert.equal(updatedTask.learningVerifiedAt, null)
    assert.equal(updatedTask.examAttemptsCount, 1)
  })

  it('G. After a failure, startExam is refused until the retake rule is satisfied', async () => {
    const task = await Task.create({
      userId,
      title: 'Advanced API Security',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied OAuth2 flows' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )

    // Fail exam
    const failingAnswers = storedExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: (q.correctIndex + 1) % 4,
    }))
    await taskExamService.submitExam(task._id, userId, failingAnswers)

    // Retake attempt without new focus effort is immediately refused
    await assert.rejects(
      async () => {
        await taskExamService.startExam(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'LEARNING_INCOMPLETE')
        const retakeReq = err.requirements.find((r) => r.key === 'retake_effort')
        assert.ok(retakeReq)
        assert.equal(retakeReq.met, false)
        return true
      },
    )

    // Record required 10 minutes of new focus effort
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      startedAt: new Date(Date.now() - 11 * 60 * 1000),
      endedAt: new Date(),
      durationSeconds: 10 * 60,
    })

    // Now startExam succeeds
    const retakeData = await taskExamService.startExam(task._id, userId)
    assert.ok(retakeData.examId)
    assert.equal(retakeData.resumed, false)
    assert.equal(retakeData.questions.length, 10)
  })

  it('H. Double submit creates only one attempt', async () => {
    const task = await Task.create({
      userId,
      title: 'Concurrency Patterns in Node.js',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied worker threads' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)
    const storedExam = await TaskExam.findById(examData.examId).select(
      '+questions.correctIndex +questions.explanation',
    )

    const answers = storedExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    const [first, second] = await Promise.allSettled([
      taskExamService.submitExam(task._id, userId, answers),
      taskExamService.submitExam(task._id, userId, answers),
    ])

    const successCount = [first, second].filter((r) => r.status === 'fulfilled').length
    const rejectedCount = [first, second].filter((r) => r.status === 'rejected').length

    assert.equal(successCount, 1)
    assert.equal(rejectedCount, 1)

    const rejected = [first, second].find((r) => r.status === 'rejected')
    assert.equal(rejected.reason.code, 'EXAM_NOT_ACTIVE')
    assert.equal(rejected.reason.statusCode, 409)

    const exam = await TaskExam.findById(examData.examId)
    assert.equal(exam.attempts.length, 1)
  })

  it('I. Expired exam is rejected', async () => {
    const task = await Task.create({
      userId,
      title: 'Distributed Locking Algorithms',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied Redlock' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    const examData = await taskExamService.startExam(task._id, userId)

    // Artificially expire the exam
    await TaskExam.updateOne(
      { _id: examData.examId },
      { $set: { expiresAt: new Date(Date.now() - 60 * 1000) } },
    )

    await assert.rejects(
      async () => {
        await taskExamService.submitExam(task._id, userId, [])
      },
      (err) => {
        assert.equal(err.code, 'EXAM_EXPIRED')
        assert.equal(err.statusCode, 400)
        return true
      },
    )

    const exam = await TaskExam.findById(examData.examId)
    assert.equal(exam.status, 'abandoned')

    const updatedTask = await Task.findById(task._id)
    assert.equal(updatedTask.stageStatus, 'learning_active')
    assert.equal(updatedTask.progressionStage, 'learning')
    assert.equal(updatedTask.learningVerifiedAt, null)
  })

  it("J. A different user cannot read or submit someone else's exam (TASK_NOT_FOUND)", async () => {
    const task = await Task.create({
      userId,
      title: 'Secure Enclaves and Cryptography',
      workflowEnabled: true,
      estimatedMinutes: 20,
      actualMinutes: 15,
      notes: [{ text: 'Studied HSMs' }],
    })
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    await taskExamService.startExam(task._id, userId)

    // otherUserId cannot read progression state
    await assert.rejects(
      async () => {
        await taskProgressionService.getProgressionState(task._id, otherUserId)
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )

    // otherUserId cannot start exam
    await assert.rejects(
      async () => {
        await taskExamService.startExam(task._id, otherUserId)
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )

    // otherUserId cannot submit exam
    await assert.rejects(
      async () => {
        await taskExamService.submitExam(task._id, otherUserId, [])
      },
      (err) => {
        assert.equal(err.code, 'TASK_NOT_FOUND')
        assert.equal(err.statusCode, 404)
        return true
      },
    )
  })

  it('K. Legacy task (workflowEnabled:false) is rejected with WORKFLOW_NOT_ENABLED', async () => {
    const legacyTask = await Task.create({
      userId,
      title: 'Legacy Quick Todo Item',
      workflowEnabled: false,
      completed: false,
    })

    await assert.rejects(
      async () => {
        await taskProgressionService.getProgressionState(legacyTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        assert.equal(err.statusCode, 400)
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskExamService.startExam(legacyTask._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        assert.equal(err.statusCode, 400)
        return true
      },
    )

    await assert.rejects(
      async () => {
        await taskExamService.submitExam(legacyTask._id, userId, [])
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_NOT_ENABLED')
        assert.equal(err.statusCode, 400)
        return true
      },
    )
  })
})
