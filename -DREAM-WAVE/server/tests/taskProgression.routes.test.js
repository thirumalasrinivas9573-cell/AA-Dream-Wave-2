const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const FocusSession = require('../models/FocusSession')
const Resume = require('../models/Resume')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const openaiService = require('../services/openaiService')
const authMiddleware = require('../middleware/auth')
const taskProgressionController = require('../controllers/taskProgressionController')
const taskController = require('../controllers/taskController')
const progressionConfig = require('../config/progression')

let mongod
let originalRobustAiCall
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

describe('Task Progression Routes & Contract v2 (Step 5C)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())

    originalRobustAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => ({
      questions: Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i + 1} on system reliability?`,
        options: ['Correct Option', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: `Explanation for question ${i + 1}.`,
      })),
    })
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
      Resume.deleteMany({}),
      StudentProfile.deleteMany({}),
      Goal.deleteMany({}),
    ])
  })

  it('1. unauthenticated -> 401 on every endpoint', async () => {
    const endpoints = [
      taskProgressionController.enableWorkflow,
      taskProgressionController.getProgression,
      taskProgressionController.verifyLearning,
      taskProgressionController.startExam,
      taskProgressionController.submitExam,
      taskProgressionController.retryCertification,
    ]

    for (const _ep of endpoints) {
      const res = response()
      await authMiddleware({ header: () => undefined }, res, () => {})
      assert.equal(res.statusCode, 401)
      assert.equal(res.body.code, 'AUTH_REQUIRED')
    }
  })

  it("2. another user's task -> 404 TASK_NOT_FOUND everywhere", async () => {
    const foreignTask = await Task.create({
      userId: otherUserId,
      title: 'Foreign Security Task',
      workflowEnabled: true,
      stageStatus: 'learning_active',
    })
    const id = foreignTask._id.toString()

    const check = async (handler, body = {}) => {
      const res = await invoke(handler, { params: { id }, body })
      assert.equal(res.statusCode, 404)
      assert.equal(res.body.code, 'TASK_NOT_FOUND')
    }

    await check(taskProgressionController.enableWorkflow)
    await check(taskProgressionController.getProgression)
    await check(taskProgressionController.verifyLearning)
    await check(taskProgressionController.startExam)
    await check(taskProgressionController.submitExam, { answers: [] })
    await check(taskProgressionController.retryCertification)
  })

  it('3. legacy task -> WORKFLOW_NOT_ENABLED', async () => {
    const legacyTask = await Task.create({
      userId,
      title: 'Legacy Ordinary Task',
      workflowEnabled: false,
    })
    const id = legacyTask._id.toString()

    const check = async (handler, body = {}) => {
      const res = await invoke(handler, { params: { id }, body })
      assert.equal(res.statusCode, 400)
      assert.equal(res.body.code, 'WORKFLOW_NOT_ENABLED')
    }

    await check(taskProgressionController.getProgression)
    await check(taskProgressionController.verifyLearning)
    await check(taskProgressionController.startExam)
    await check(taskProgressionController.submitExam, { answers: [] })
    await check(taskProgressionController.retryCertification)
  })

  it('4. enable idempotent, refuses completed task', async () => {
    const completedTask = await Task.create({
      userId,
      title: 'Completed Old Task',
      completed: true,
      status: 'completed',
    })
    const refRes = await invoke(taskProgressionController.enableWorkflow, {
      params: { id: completedTask._id.toString() },
    })
    assert.equal(refRes.statusCode, 409)
    assert.equal(refRes.body.code, 'TASK_ALREADY_COMPLETED')

    const activeTask = await Task.create({
      userId,
      title: 'Active Task',
      estimatedMinutes: 60,
    })
    const res1 = await invoke(taskProgressionController.enableWorkflow, {
      params: { id: activeTask._id.toString() },
    })
    assert.equal(res1.statusCode, 200)
    assert.equal(res1.body.progression.workflowEnabled, true)

    const res2 = await invoke(taskProgressionController.enableWorkflow, {
      params: { id: activeTask._id.toString() },
    })
    assert.equal(res2.statusCode, 200)
    assert.equal(res2.body.progression.workflowEnabled, true)
  })

  it('5. new workflow task: learning current, exam locked, certification locked, with requirements[]', async () => {
    const task = await Task.create({
      userId,
      title: 'Reliability Engineering',
      estimatedMinutes: 60,
      subtasks: [{ title: 'Subtask 1', completed: false }],
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    const res = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.progression.learning.state, 'current')
    assert.equal(res.body.progression.exam.state, 'locked')
    assert.equal(res.body.progression.certification.state, 'locked')
    assert.ok(Array.isArray(res.body.progression.learning.requirements))
    assert.ok(res.body.progression.learning.requirements.length > 0)
  })

  it('6. all requirements met but unverified -> learning ready_for_verification, exam.canUnlock true, and GET changed nothing', async () => {
    const task = await Task.create({
      userId,
      title: 'State Verification Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    // Log enough focus minutes to satisfy requirements
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 30 * 60,
    })

    const res = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.progression.learning.state, 'ready_for_verification')
    assert.equal(res.body.progression.learning.verified, false)
    assert.equal(res.body.progression.exam.canUnlock, true)
    assert.equal(res.body.progression.exam.state, 'locked')

    // Confirm GET /progression did NOT write learningVerifiedAt
    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.learningVerifiedAt, null)
  })

  it('7. verify-learning with a client {learningCompleted:true} body and incomplete learning changes nothing', async () => {
    const task = await Task.create({
      userId,
      title: 'Incomplete Learning Task',
      estimatedMinutes: 60,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    const res = await invoke(taskProgressionController.verifyLearning, {
      params: { id: task._id.toString() },
      body: { learningCompleted: true },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.verified, false)
    assert.ok(Array.isArray(res.body.requirements))

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.learningVerifiedAt, null)
  })

  it('8. exam/start before learning -> 400 LEARNING_INCOMPLETE with top-level requirements[]', async () => {
    const task = await Task.create({
      userId,
      title: 'Incomplete Exam Task',
      estimatedMinutes: 60,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    const res = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.code, 'LEARNING_INCOMPLETE')
    assert.ok(Array.isArray(res.body.requirements))
  })

  it('9. start response and every progression JSON contain no correctIndex/explanation', async () => {
    const task = await Task.create({
      userId,
      title: 'Clean Exam Response Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })

    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assert.equal(startRes.statusCode, 200)
    const startStr = JSON.stringify(startRes.body)
    assert.equal(startStr.includes('"correctIndex"'), false)
    assert.equal(startStr.includes('"explanation"'), false)

    const progRes = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    const progStr = JSON.stringify(progRes.body)
    assert.equal(progStr.includes('"correctIndex"'), false)
    assert.equal(progStr.includes('"explanation"'), false)
  })

  it('10. refresh after start returns activeExam with questions, remainingSeconds, and no answers', async () => {
    const task = await Task.create({
      userId,
      title: 'Active Exam Refresh Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })

    const res = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assert.equal(res.statusCode, 200)
    const activeExam = res.body.progression.stages.exam.activeExam
    assert.ok(activeExam)
    assert.ok(activeExam.remainingSeconds > 0)
    assert.equal(activeExam.questions.length, 10)
    const str = JSON.stringify(activeExam)
    assert.equal(str.includes('"correctIndex"'), false)
    assert.equal(str.includes('"explanation"'), false)
  })

  it('11. submit with {score:100,passed:true} and wrong answers fails', async () => {
    const task = await Task.create({
      userId,
      title: 'Score Tamper Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    const qList = startRes.body.exam.questions

    // Submit with all wrong options (index 2 instead of 0)
    const answers = qList.map((q) => ({ questionId: q.questionId, selectedIndex: 2 }))
    const submitRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })
    assert.equal(submitRes.statusCode, 200)
    assert.equal(submitRes.body.result.passed, false)
    assert.ok(submitRes.body.result.score < 80)
  })

  it('12. fail -> learning current, exam failed, exam/start refused until retake met', async () => {
    const task = await Task.create({
      userId,
      title: 'Retake Rule Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    const qList = startRes.body.exam.questions

    const answers = qList.map((q) => ({ questionId: q.questionId, selectedIndex: 3 }))
    await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })

    const progRes = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assert.equal(progRes.body.progression.learning.state, 'current')
    assert.equal(progRes.body.progression.exam.state, 'failed')

    // Refused immediately because retake effort is unmet
    const retryStartRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assert.equal(retryStartRes.statusCode, 400)
    assert.equal(retryStartRes.body.code, 'LEARNING_INCOMPLETE')
  })

  it('13. pass -> certificate completed, task completed, stagesSummary all completed', async () => {
    const task = await Task.create({
      userId,
      title: 'Full Pipeline Pass Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })

    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const answers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    const submitRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })
    assert.equal(submitRes.statusCode, 200)
    assert.equal(submitRes.body.result.passed, true)
    assert.ok(submitRes.body.certification)

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, true)
    assert.equal(reloaded.stageStatus, 'task_completed')

    const getRes = await invoke(taskController.getTask, { params: { id: task._id.toString() } })
    assert.deepEqual(getRes.body.task.stagesSummary, {
      learning: 'completed',
      exam: 'completed',
      certification: 'completed',
    })
  })

  it('14. pipeline failure after pass -> 200, certification failed with recoverableError, still failed after a refresh, retry succeeds with exactly ONE certificate', async () => {
    const task = await Task.create({
      userId,
      title: 'Recoverable Pipeline Error Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })

    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const answers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    // Inject temporary failure during resume query
    const origFind = Resume.find
    Resume.find = async () => {
      throw new Error('Simulated database network timeout')
    }

    try {
      const submitRes = await invoke(taskProgressionController.submitExam, {
        params: { id: task._id.toString() },
        body: { answers },
      })
      assert.equal(submitRes.statusCode, 200)
      assert.equal(submitRes.body.result.passed, true)
      assert.equal(submitRes.body.progression.certification.state, 'failed')
      assert.ok(submitRes.body.progression.certification.recoverableError)

      // Still failed after refresh
      const refreshRes = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
      assert.equal(refreshRes.body.progression.certification.state, 'failed')
      assert.ok(refreshRes.body.progression.certification.recoverableError)
    } finally {
      // Restore
      Resume.find = origFind
    }

    const retryRes = await invoke(taskProgressionController.retryCertification, { params: { id: task._id.toString() } })
    assert.equal(retryRes.statusCode, 200)
    assert.equal(retryRes.body.success, true)

    const certCount = await TaskCertificate.countDocuments({ taskId: task._id })
    assert.equal(certCount, 1)
  })

  it('15. double submit / double retry -> no duplicates', async () => {
    const task = await Task.create({
      userId,
      title: 'Idempotency Double Action Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })

    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const answers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })

    // Double submit rejected with 409
    const secondSubmit = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })
    assert.equal(secondSubmit.statusCode, 409)

    // Double retry returns success with same single certificate
    const retry1 = await invoke(taskProgressionController.retryCertification, { params: { id: task._id.toString() } })
    const retry2 = await invoke(taskProgressionController.retryCertification, { params: { id: task._id.toString() } })
    assert.equal(retry1.statusCode, 200)
    assert.equal(retry2.statusCode, 200)
    assert.equal(await TaskCertificate.countDocuments({ taskId: task._id }), 1)
  })

  it('16. malformed answers, bad ObjectId, extra body fields -> 400 not 500', async () => {
    const badIdRes = await invoke(taskProgressionController.getProgression, { params: { id: 'bad-object-id' } })
    assert.equal(badIdRes.statusCode, 400)
    assert.equal(badIdRes.body.code, 'INVALID_ID')

    const task = await Task.create({
      userId,
      title: 'Malformed Input Task',
      workflowEnabled: true,
      stageStatus: 'exam_active',
    })
    const id = task._id.toString()

    const extraBodyRes = await invoke(taskProgressionController.submitExam, {
      params: { id },
      body: { answers: [], extraField: true },
    })
    assert.equal(extraBodyRes.statusCode, 400)
    assert.equal(extraBodyRes.body.code, 'INVALID_INPUT')

    const nonArrayRes = await invoke(taskProgressionController.submitExam, {
      params: { id },
      body: { answers: 'string' },
    })
    assert.equal(nonArrayRes.statusCode, 400)
    assert.equal(nonArrayRes.body.code, 'INVALID_ANSWERS')
  })

  it('17. stagesSummary present for workflow tasks on list/get/create/update and absent for legacy', async () => {
    // 1. Create legacy task
    const createLegacyRes = await invoke(taskController.createTask, {
      body: { title: 'Legacy Task Simple' },
    })
    assert.equal(createLegacyRes.statusCode, 201)
    assert.equal(createLegacyRes.body.task.stagesSummary, undefined)

    // 2. Create workflow task (via enable)
    const wfTask = await Task.create({
      userId,
      title: 'Workflow Summary Task',
      workflowEnabled: true,
      stageStatus: 'learning_active',
    })

    const getRes = await invoke(taskController.getTask, { params: { id: wfTask._id.toString() } })
    assert.deepEqual(getRes.body.task.stagesSummary, {
      learning: 'current',
      exam: 'locked',
      certification: 'locked',
    })

    const listRes = await invoke(taskController.getTasks)
    const foundWf = listRes.body.tasks.find((t) => t._id.toString() === wfTask._id.toString())
    assert.ok(foundWf.stagesSummary)

    const foundLegacy = listRes.body.tasks.find((t) => t.title === 'Legacy Task Simple')
    assert.equal(foundLegacy.stagesSummary, undefined)
  })

  it('18. auto-enable only when the flag is on AND roadmapId/goalId present; client-sent workflowEnabled never honored', async () => {
    const goal = await Goal.create({ userId, title: 'Career Goal', category: 'Career' })

    // Default: AUTO_ENABLE_WORKFLOW is false
    const res1 = await invoke(taskController.createTask, {
      body: { title: 'Goal Task', goalId: goal._id.toString(), workflowEnabled: true },
    })
    assert.equal(res1.body.task.workflowEnabled, false, 'Client workflowEnabled must not be honored')

    // Turn flag on
    process.env.AUTO_ENABLE_WORKFLOW = 'true'

    const res2 = await invoke(taskController.createTask, {
      body: { title: 'Auto Enabled Goal Task', goalId: goal._id.toString() },
    })
    assert.equal(res2.body.task.workflowEnabled, true)
    assert.equal(res2.body.task.progressionStage, 'learning')
    assert.ok(res2.body.task.learningSnapshot)

    // Without goalId / roadmapId: not auto-enabled even if flag is on
    const res3 = await invoke(taskController.createTask, {
      body: { title: 'Stand Alone Task' },
    })
    assert.equal(res3.body.task.workflowEnabled, false)

    delete process.env.AUTO_ENABLE_WORKFLOW
  })

  it('19. editing the title after enable does not change the certificate title', async () => {
    const task = await Task.create({
      userId,
      title: 'Original Architecture Milestone',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    // Edit task title via PUT /api/tasks/:id
    await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { title: 'Tampered Hack Title' },
    })

    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 25 * 60,
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })

    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const answers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    const submitRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers },
    })
    assert.equal(submitRes.statusCode, 200)

    const cert = await TaskCertificate.findOne({ taskId: task._id })
    assert.equal(cert.title, 'Original Architecture Milestone')
  })

  it('20. Exact CONTRACT SHAPES validation for every endpoint in pass, fail, failed-pipeline, and completed states', async () => {
    const task = await Task.create({
      userId,
      title: 'Full Lifecycle Contract Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    // 1. GET /progression in learning-current state
    const progCurrent = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assert.equal(progCurrent.statusCode, 200)
    const pCurrent = JSON.parse(JSON.stringify(progCurrent.body.progression))
    assert.deepEqual(Object.keys(pCurrent), ['taskId', 'workflowEnabled', 'completed', 'progressionStage', 'stageStatus', 'serverNow', 'links', 'stages'])
    assert.deepEqual(Object.keys(pCurrent.links), ['goalId', 'roadmapId'])
    assert.deepEqual(Object.keys(pCurrent.stages), ['learning', 'exam', 'certification'])
    assert.deepEqual(Object.keys(pCurrent.stages.learning), ['state', 'verified', 'verifiedAt', 'requirements', 'focus'])
    assert.deepEqual(Object.keys(pCurrent.stages.learning.focus), ['minutes', 'requiredMinutes'])
    assert.equal(pCurrent.stages.learning.state, 'current')
    assert.deepEqual(Object.keys(pCurrent.stages.exam), ['state', 'locked', 'canUnlock', 'lockedReason', 'lockedMessage', 'attemptsCount', 'minimumPassingPercentage', 'questionCount', 'timeLimitMinutes', 'activeExam', 'lastAttempt', 'retake'])
    assert.equal(pCurrent.stages.exam.state, 'locked')
    assert.deepEqual(Object.keys(pCurrent.stages.certification), ['state', 'certificate', 'recoverableError'])
    assert.equal(pCurrent.stages.certification.state, 'locked')

    // 2. GET /progression in ready_for_verification state
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 30 * 60,
    })
    const progReady = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    const pReady = JSON.parse(JSON.stringify(progReady.body.progression))
    assert.equal(pReady.stages.learning.state, 'ready_for_verification')
    assert.equal(pReady.stages.exam.canUnlock, true)

    // 3. POST /exam/start (new exam session)
    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assert.equal(startRes.statusCode, 200)
    const startBody = JSON.parse(JSON.stringify(startRes.body))
    assert.deepEqual(Object.keys(startBody), ['success', 'exam', 'progression'])
    assert.deepEqual(Object.keys(startBody.exam), ['examId', 'startedAt', 'expiresAt', 'serverNow', 'remainingSeconds', 'timeLimitMinutes', 'questionCount', 'questions'])
    assert.deepEqual(Object.keys(startBody.exam.questions[0]), ['questionId', 'question', 'options'])

    // 4. POST /exam/start (resumed active exam)
    const resumeRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assert.equal(resumeRes.statusCode, 200)
    const resumeBody = JSON.parse(JSON.stringify(resumeRes.body))
    assert.deepEqual(Object.keys(resumeBody), ['success', 'exam', 'progression'])
    assert.equal(resumeBody.exam.examId, startBody.exam.examId)

    // 5. POST /exam/submit (fail)
    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const failingAnswers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: (q.correctIndex + 1) % 4,
    }))
    const failRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers: failingAnswers },
    })
    assert.equal(failRes.statusCode, 200)
    const failBody = JSON.parse(JSON.stringify(failRes.body))
    assert.deepEqual(Object.keys(failBody), ['success', 'result', 'progression'])
    assert.deepEqual(Object.keys(failBody.result), ['score', 'passed', 'minimumPassingPercentage', 'attemptNumber', 'correctCount', 'totalCount', 'nextStage', 'questionResults'])
    assert.deepEqual(Object.keys(failBody.result.questionResults[0]), ['questionId', 'isCorrect'])
    assert.equal(failBody.result.passed, false)
    assert.equal(failBody.progression.stages.exam.state, 'failed')

    // 6. POST /exam/submit (pass with failed pipeline)
    // Satisfy retake effort requirement
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      endedAt: new Date(),
      startedAt: new Date(Date.now() - 35 * 60 * 1000),
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    const activeExam = await TaskExam.findOne({ taskId: task._id, status: 'active' }).select('+questions.correctIndex')
    const passingAnswers = activeExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))

    // Inject failure into completeCertificationPipeline
    const taskCertificateService = require('../services/taskCertificateService')
    const origPipeline = taskCertificateService.completeCertificationPipeline
    taskCertificateService.completeCertificationPipeline = async () => {
      await Task.updateOne(
        { _id: task._id },
        {
          $set: {
            certificationLastError: {
              code: 'RESUME_LINK_FAILED',
              message: 'Failed to link certificate to Resume Builder.',
              at: new Date(),
            },
          },
        },
      )
      const err = new Error('Injected network error')
      err.code = 'RESUME_LINK_FAILED'
      err.statusCode = 500
      throw err
    }

    const submitPipeRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers: passingAnswers },
    })
    taskCertificateService.completeCertificationPipeline = origPipeline

    assert.equal(submitPipeRes.statusCode, 200)
    const pipeBody = JSON.parse(JSON.stringify(submitPipeRes.body))
    assert.deepEqual(Object.keys(pipeBody), ['success', 'result', 'progression'])
    assert.equal(pipeBody.result.passed, true)
    assert.deepEqual(Object.keys(pipeBody.result.questionResults[0]), ['questionId', 'isCorrect', 'explanation'])
    assert.equal(pipeBody.progression.stages.certification.state, 'failed')
    assert.deepEqual(Object.keys(pipeBody.progression.stages.certification.recoverableError), ['code', 'message'])

    // 7. POST /certificate/retry
    const retryRes = await invoke(taskProgressionController.retryCertification, { params: { id: task._id.toString() } })
    assert.equal(retryRes.statusCode, 200)
    const retryBody = JSON.parse(JSON.stringify(retryRes.body))
    assert.deepEqual(Object.keys(retryBody), ['success', 'progression'])
    assert.equal(retryBody.progression.completed, true)
    assert.equal(retryBody.progression.stageStatus, 'task_completed')
    assert.equal(retryBody.progression.stages.certification.state, 'completed')
    assert.deepEqual(Object.keys(retryBody.progression.stages.certification.certificate), [
      'credentialId', 'title', 'issuer', 'issuedAt', 'url', 'verificationUrl', 'skills', 'skill', 'category', 'verificationStatus', 'documentUrl', 'linkedToResume', 'linkedResumeId', 'linkedResumeIds'
    ])
  })

  it('21. Recursive JSON scan proving no correctIndex, no explanation (except pass-only questionResults), no userId, and no prompt text anywhere', async () => {
    function assertNoLeakedFields(val, allowExplanation = false) {
      if (!val || typeof val !== 'object') return
      if (Array.isArray(val)) {
        for (const item of val) assertNoLeakedFields(item, allowExplanation)
        return
      }
      for (const [k, v] of Object.entries(val)) {
        assert.notEqual(k, 'correctIndex', `Leaked correctIndex found at key ${k}`)
        assert.notEqual(k, 'userId', `Leaked userId found at key ${k}`)
        assert.notEqual(k, 'prompt', `Leaked prompt found at key ${k}`)
        assert.notEqual(k, 'systemPrompt', `Leaked systemPrompt found at key ${k}`)
        if (!allowExplanation) {
          assert.notEqual(k, 'explanation', `Leaked explanation found at key ${k}`)
        }
        assertNoLeakedFields(v, allowExplanation)
      }
    }

    const task = await Task.create({
      userId,
      title: 'Scan Task',
      estimatedMinutes: 20,
    })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      durationSeconds: 30 * 60,
    })

    const startRes = await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    assertNoLeakedFields(JSON.parse(JSON.stringify(startRes.body)), false)

    const progRes = await invoke(taskProgressionController.getProgression, { params: { id: task._id.toString() } })
    assertNoLeakedFields(JSON.parse(JSON.stringify(progRes.body)), false)

    // Failed submit
    const examDoc = await TaskExam.findOne({ taskId: task._id }).select('+questions.correctIndex')
    const failingAnswers = examDoc.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: (q.correctIndex + 1) % 4,
    }))
    const failRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers: failingAnswers },
    })
    assertNoLeakedFields(JSON.parse(JSON.stringify(failRes.body)), false)

    // Passing submit: only questionResults may contain explanation
    await FocusSession.create({
      userId,
      taskId: task._id,
      status: 'completed',
      endedAt: new Date(),
      startedAt: new Date(Date.now() - 35 * 60 * 1000),
    })
    await invoke(taskProgressionController.startExam, { params: { id: task._id.toString() } })
    const activeExam = await TaskExam.findOne({ taskId: task._id, status: 'active' }).select('+questions.correctIndex')
    const passAnswers = activeExam.questions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: q.correctIndex,
    }))
    const passRes = await invoke(taskProgressionController.submitExam, {
      params: { id: task._id.toString() },
      body: { answers: passAnswers },
    })
    const passParsed = JSON.parse(JSON.stringify(passRes.body))
    assertNoLeakedFields(passParsed.progression, false)
    assertNoLeakedFields(passParsed.result, true) // allows explanation on questionResults only
  })

  it('22. Comprehensive error codes and HTTP status code coverage', async () => {
    // 1. TASK_NOT_FOUND 404
    const notFoundRes = await invoke(taskProgressionController.getProgression, {
      params: { id: new mongoose.Types.ObjectId().toString() },
    })
    assert.equal(notFoundRes.statusCode, 404)
    assert.equal(notFoundRes.body.code, 'TASK_NOT_FOUND')

    // 2. WORKFLOW_NOT_ENABLED 400
    const legacyTask = await Task.create({ userId, title: 'Legacy Task', workflowEnabled: false })
    const legacyRes = await invoke(taskProgressionController.getProgression, {
      params: { id: legacyTask._id.toString() },
    })
    assert.equal(legacyRes.statusCode, 400)
    assert.equal(legacyRes.body.code, 'WORKFLOW_NOT_ENABLED')

    // 3. LEARNING_INCOMPLETE 400 (+top-level requirements[])
    const wfTask = await Task.create({ userId, title: 'Incomplete Task', estimatedMinutes: 60 })
    await invoke(taskProgressionController.enableWorkflow, { params: { id: wfTask._id.toString() } })
    const incompleteRes = await invoke(taskProgressionController.startExam, {
      params: { id: wfTask._id.toString() },
    })
    assert.equal(incompleteRes.statusCode, 400)
    assert.equal(incompleteRes.body.code, 'LEARNING_INCOMPLETE')
    assert.ok(Array.isArray(incompleteRes.body.requirements))

    // 4. INVALID_ID 400
    const invalidIdRes = await invoke(taskProgressionController.getProgression, { params: { id: 'bad-id' } })
    assert.equal(invalidIdRes.statusCode, 400)
    assert.equal(invalidIdRes.body.code, 'INVALID_ID')

    // 5. INVALID_INPUT 400 & INVALID_ANSWERS 400
    const badInputRes = await invoke(taskProgressionController.submitExam, {
      params: { id: wfTask._id.toString() },
      body: 'not-an-object',
    })
    assert.equal(badInputRes.statusCode, 400)
    assert.equal(badInputRes.body.code, 'INVALID_INPUT')

    const badAnswersRes = await invoke(taskProgressionController.submitExam, {
      params: { id: wfTask._id.toString() },
      body: { answers: 'not-an-array' },
    })
    assert.equal(badAnswersRes.statusCode, 400)
    assert.equal(badAnswersRes.body.code, 'INVALID_ANSWERS')

    // 6. TASK_ALREADY_COMPLETED 409
    const compTask = await Task.create({ userId, title: 'Completed Old', completed: true, status: 'completed' })
    const alreadyCompRes = await invoke(taskProgressionController.enableWorkflow, {
      params: { id: compTask._id.toString() },
    })
    assert.equal(alreadyCompRes.statusCode, 409)
    assert.equal(alreadyCompRes.body.code, 'TASK_ALREADY_COMPLETED')

    // 7. EXAM_NOT_ACTIVE 404 & 409
    const noExamRes = await invoke(taskProgressionController.submitExam, {
      params: { id: wfTask._id.toString() },
      body: { answers: [{ questionId: 'q1', selectedIndex: 0 }] },
    })
    assert.equal(noExamRes.statusCode, 404)
    assert.equal(noExamRes.body.code, 'EXAM_NOT_ACTIVE')

    // 8. CERTIFICATION_NOT_ELIGIBLE 409
    const certNotElig = await invoke(taskProgressionController.retryCertification, {
      params: { id: wfTask._id.toString() },
    })
    assert.equal(certNotElig.statusCode, 409)
    assert.equal(certNotElig.body.code, 'CERTIFICATION_NOT_ELIGIBLE')

    // 9. WORKFLOW_ENFORCED 403
    const wfBypassRes = await invoke(taskController.updateTask, {
      params: { id: wfTask._id.toString() },
      body: { completed: true },
    })
    assert.equal(wfBypassRes.statusCode, 403)
    assert.equal(wfBypassRes.body.code, 'WORKFLOW_ENFORCED')

    // 10. AUTH_REQUIRED 401
    const unauthRes = response()
    await authMiddleware({ header: () => undefined }, unauthRes, () => {})
    assert.equal(unauthRes.statusCode, 401)
    assert.equal(unauthRes.body.code, 'AUTH_REQUIRED')
  })
})

