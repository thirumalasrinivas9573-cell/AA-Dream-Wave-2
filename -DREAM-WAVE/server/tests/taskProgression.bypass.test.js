const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Task = require('../models/Task')
const Goal = require('../models/Goal')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const FocusSession = require('../models/FocusSession')
const ScheduleItem = require('../models/ScheduleItem')
const openaiService = require('../services/openaiService')
const progressionConfig = require('../config/progression')
const taskProgressionService = require('../services/taskProgressionService')
const taskExamService = require('../services/taskExamService')
const plannerService = require('../services/plannerService')
const goalExecutionService = require('../services/goalExecutionService')
const { executeTool } = require('../services/agent/toolRegistry')

const taskController = require('../controllers/taskController')
const plannerController = require('../controllers/plannerController')
const taskProgressionController = require('../controllers/taskProgressionController')

let mongod
let originalRobustAiCall
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, currentUserId = userId } = {}) {
  const res = response()
  await handler({ body, params, query, user: { _id: currentUserId } }, res)
  return res
}

describe('Task Progression Bypass & Security Hardening (Step 5B)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())

    originalRobustAiCall = openaiService.robustAiCall
    openaiService.robustAiCall = async () => ({
      questions: Array.from({ length: 10 }, (_, i) => ({
        question: `Security Hardening Question ${i + 1}?`,
        options: ['Correct', 'Incorrect B', 'Incorrect C', 'Incorrect D'],
        correctIndex: 0,
        explanation: 'Detailed explanation.',
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
      Goal.deleteMany({}),
      TaskExam.deleteMany({}),
      TaskCertificate.deleteMany({}),
      FocusSession.deleteMany({}),
      ScheduleItem.deleteMany({}),
    ])
  })

  it('1. PUT /api/tasks/:id { completed:true } -> 403 WORKFLOW_ENFORCED, task unchanged', async () => {
    const task = await Task.create({
      userId,
      title: 'Workflow Task 1',
      workflowEnabled: true,
      progressionStage: 'learning',
      stageStatus: 'learning_active',
      completed: false,
    })

    const res = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { completed: true },
    })

    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'WORKFLOW_ENFORCED')

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
    assert.notEqual(reloaded.status, 'completed')
  })

  it('2. PUT { status: "completed" } and PUT { progress: 100 } -> 403 WORKFLOW_ENFORCED, unchanged', async () => {
    const task = await Task.create({
      userId,
      title: 'Workflow Task 2',
      workflowEnabled: true,
      progressionStage: 'learning',
      stageStatus: 'learning_active',
      completed: false,
      progress: 50,
    })

    const resStatus = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { status: 'completed' },
    })
    assert.equal(resStatus.statusCode, 403)
    assert.equal(resStatus.body.code, 'WORKFLOW_ENFORCED')

    const resProgress = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { progress: 100 },
    })
    assert.equal(resProgress.statusCode, 403)
    assert.equal(resProgress.body.code, 'WORKFLOW_ENFORCED')

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
    assert.equal(reloaded.progress, 50)
  })

  it('3. PUT { completed: false } on a completed workflow task -> 403 (cannot reopen)', async () => {
    const task = await Task.create({
      userId,
      title: 'Workflow Task 3',
      workflowEnabled: true,
      progressionStage: 'completed',
      stageStatus: 'task_completed',
      completed: true,
      status: 'completed',
      completedAt: new Date(),
    })

    const res = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { completed: false },
    })
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'WORKFLOW_ENFORCED')

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, true)
    assert.equal(reloaded.status, 'completed')
  })

  it('4. PUT { actualMinutes: 1000 } and { estimatedMinutes: 1 } -> ignored; learning still unmet afterwards', async () => {
    const task = await Task.create({
      userId,
      title: 'Workflow Task 4',
      workflowEnabled: true,
      estimatedMinutes: 60,
      actualMinutes: 0,
      learningSnapshot: { requiredFocusMinutes: 30, subtaskCount: 0, checklistCount: 0 },
    })

    const res = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { actualMinutes: 1000, estimatedMinutes: 1 },
    })
    assert.equal(res.statusCode, 200)

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.actualMinutes, 0)
    assert.equal(reloaded.estimatedMinutes, 60)

    const verify = await taskProgressionService.verifyLearning(reloaded)
    assert.equal(verify.verified, false)
  })

  it('5. POST create with workflowEnabled/progressionStage/stageStatus/certificateId etc. -> not persisted', async () => {
    const res = await invoke(taskController.createTask, {
      body: {
        title: 'Sneaky Client Task',
        workflowEnabled: true,
        workflowEnabledAt: new Date(),
        progressionStage: 'completed',
        stageStatus: 'task_completed',
        certificateId: 'DW-CERT-FAKE',
        actualMinutes: 500,
      },
    })
    assert.equal(res.statusCode, 201)

    const created = await Task.findById(res.body.task._id)
    assert.equal(created.workflowEnabled, false)
    assert.equal(created.workflowEnabledAt, null)
    assert.equal(created.progressionStage, 'learning')
    assert.equal(created.stageStatus, 'learning_active')
    assert.equal(created.certificateId, null)
    assert.equal(created.actualMinutes, 0) // Protected field stripped on create
  })

  it('6. PUT with workflowEnabled:true on a legacy task, or stageStatus:"exam_passed" on a workflow task -> not applied', async () => {
    const legacy = await Task.create({
      userId,
      title: 'Legacy Task',
      workflowEnabled: false,
    })

    await invoke(taskController.updateTask, {
      params: { id: legacy._id.toString() },
      body: { workflowEnabled: true },
    })
    const reloadedLegacy = await Task.findById(legacy._id)
    assert.equal(reloadedLegacy.workflowEnabled, false)

    const workflow = await Task.create({
      userId,
      title: 'Workflow Task',
      workflowEnabled: true,
      progressionStage: 'learning',
      stageStatus: 'learning_active',
    })

    await invoke(taskController.updateTask, {
      params: { id: workflow._id.toString() },
      body: { stageStatus: 'exam_passed' },
    })
    const reloadedWorkflow = await Task.findById(workflow._id)
    assert.equal(reloadedWorkflow.stageStatus, 'learning_active')
  })

  it('7. Completing all subtasks does NOT complete the task (and does not unlock the exam without focus time)', async () => {
    const task = await Task.create({
      userId,
      title: 'Task with Subtasks',
      workflowEnabled: true,
      estimatedMinutes: 60,
      learningSnapshot: { requiredFocusMinutes: 30, subtaskCount: 1, checklistCount: 0 },
      subtasks: [{ title: 'Subtask 1', completed: false }],
    })

    const res = await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { subtasks: [{ title: 'Subtask 1', completed: true }] },
    })
    assert.equal(res.statusCode, 200)

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
    assert.notEqual(reloaded.status, 'completed')

    await assert.rejects(
      async () => {
        await taskExamService.startExam(task._id, userId)
      },
      (err) => {
        assert.equal(err.code, 'LEARNING_INCOMPLETE')
        const focusReq = err.requirements.find((r) => r.key === 'focus_time')
        assert.equal(focusReq?.met, false)
        return true
      },
    )
  })

  it('8. Deleting subtasks/checklist items after enable cannot make learning verified', async () => {
    const task = await Task.create({
      userId,
      title: 'Subtask deletion attack',
      estimatedMinutes: 20,
      subtasks: [
        { title: 'Sub 1', completed: false },
        { title: 'Sub 2', completed: false },
      ],
      checklist: [{ text: 'Check 1', done: false }],
    })

    // Enable workflow to record snapshot
    await invoke(taskProgressionController.enableWorkflow, { params: { id: task._id.toString() } })

    // Provide required focus time via FocusSession
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 15 * 60,
      status: 'completed',
    })

    // Attacker deletes subtasks and checklist via updateTask to bypass requirement
    await invoke(taskController.updateTask, {
      params: { id: task._id.toString() },
      body: { subtasks: [], checklist: [] },
    })

    const reloaded = await Task.findById(task._id)
    const verification = await taskProgressionService.verifyLearning(reloaded)
    assert.equal(verification.verified, false)

    const subReq = verification.requirements.find((r) => r.key === 'subtasks')
    const checkReq = verification.requirements.find((r) => r.key === 'checklist')
    assert.equal(subReq?.met, false)
    assert.equal(checkReq?.met, false)
  })

  it('9. completeFocus with markTaskComplete:true -> focus recorded, task NOT completed, taskCompletionIgnored:true', async () => {
    const task = await Task.create({
      userId,
      title: 'Focus session task',
      workflowEnabled: true,
      completed: false,
    })

    const session = await FocusSession.create({
      userId,
      taskId: task._id,
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      status: 'active',
    })

    const res = await invoke(plannerController.completeFocus, {
      params: { id: session._id.toString() },
      body: { markTaskComplete: true },
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.taskCompletionIgnored, true)

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
    assert.notEqual(reloaded.status, 'completed')
    assert.ok(reloaded.actualMinutes > 0)
  })

  it('10. plannerService.completeScheduleItem with markTaskComplete -> task NOT completed', async () => {
    const task = await Task.create({
      userId,
      title: 'Schedule Item Task',
      workflowEnabled: true,
      completed: false,
    })

    const item = await ScheduleItem.create({
      userId,
      taskId: task._id,
      title: 'Daily Session',
      status: 'scheduled',
      dateKey: '2026-10-06',
      scheduledDate: new Date(),
    })

    await plannerService.completeScheduleItem(userId, item._id, { markTaskComplete: true })

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
    assert.notEqual(reloaded.status, 'completed')
  })

  it('11. POST /api/career/execution/tasks/:id/complete -> 403 WORKFLOW_ENFORCED', async () => {
    const goal = await Goal.create({ userId, title: 'Learn Systems' })
    const task = await Task.create({
      userId,
      goalId: goal._id,
      title: 'Goal execution task',
      workflowEnabled: true,
      completed: false,
    })

    await assert.rejects(
      async () => {
        await goalExecutionService.completeTask(userId, task._id)
      },
      (err) => {
        assert.equal(err.code, 'WORKFLOW_ENFORCED')
        assert.equal(err.statusCode, 403)
        return true
      },
    )

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
  })

  it('12. Agent toolRegistry completeTask -> refuses a workflow task', async () => {
    const task = await Task.create({
      userId,
      title: 'Agent completed task',
      workflowEnabled: true,
      completed: false,
    })

    const result = await executeTool(
      'completeTask',
      { taskId: task._id.toString() },
      { userId, role: 'student' },
    )

    assert.equal(result.result.success, false)
    assert.equal(result.result.code, 'WORKFLOW_ENFORCED')
    assert.ok(result.result.error.includes('Learning, Exam and Certification'))

    const reloaded = await Task.findById(task._id)
    assert.equal(reloaded.completed, false)
  })

  it('13. duplicateTask of a completed workflow task -> the copy has no workflow/certificate fields', async () => {
    const source = await Task.create({
      userId,
      title: 'Master Architect',
      workflowEnabled: true,
      workflowEnabledAt: new Date(),
      progressionStage: 'completed',
      stageStatus: 'task_completed',
      completed: true,
      status: 'completed',
      certificateId: 'DW-CERT-MASTER-1234',
      actualMinutes: 500,
    })

    const res = await invoke(taskController.duplicateTask, {
      params: { id: source._id.toString() },
    })
    assert.equal(res.statusCode, 201)

    const copy = await Task.findById(res.body.task._id)
    assert.equal(copy.workflowEnabled, false)
    assert.equal(copy.workflowEnabledAt, null)
    assert.ok(!copy.learningSnapshot?.requiredFocusMinutes)
    assert.equal(copy.progressionStage, 'learning')
    assert.equal(copy.stageStatus, 'learning_active')
    assert.equal(copy.certificateId, null)
    assert.equal(copy.actualMinutes, 0)
    assert.equal(copy.completed, false)
    assert.equal(copy.status, 'todo')
  })

  it('14. Focus time is counted from FocusSession; forced actualMinutes fails, and long sessions capped', async () => {
    const task = await Task.create({
      userId,
      title: 'Focus Audit Task',
      workflowEnabled: true,
      estimatedMinutes: 60,
      actualMinutes: 9999, // Forced high directly in DB
      learningSnapshot: { requiredFocusMinutes: 30, subtaskCount: 0, checklistCount: 0 },
    })

    // Without FocusSession records, verifyLearning must fail
    const verificationNoSession = await taskProgressionService.verifyLearning(task)
    assert.equal(verificationNoSession.verified, false)
    const req1 = verificationNoSession.requirements.find((r) => r.key === 'focus_time')
    assert.equal(req1.actual, 0)

    // Add a single session of 300 minutes; max counted per session is 120
    await FocusSession.create({
      userId,
      taskId: task._id,
      durationSeconds: 300 * 60,
      status: 'completed',
    })

    const verificationWithSession = await taskProgressionService.verifyLearning(task)
    assert.equal(verificationWithSession.verified, true)
    const req2 = verificationWithSession.requirements.find((r) => r.key === 'focus_time')
    assert.equal(req2.actual, 120) // Capped at MAX_COUNTED_SESSION_MINUTES (120)
  })

  it('15. Notes no longer count as engagement', async () => {
    const task = await Task.create({
      userId,
      title: 'Notes bypass attempt',
      workflowEnabled: true,
      estimatedMinutes: 30,
      learningSnapshot: { requiredFocusMinutes: 15, subtaskCount: 0, checklistCount: 0 },
      notes: [
        { text: 'Extensive note 1' },
        { text: 'Extensive note 2' },
      ],
    })

    const verification = await taskProgressionService.verifyLearning(task)
    assert.equal(verification.verified, false)
    assert.equal(verification.requirements.some((r) => r.key === 'engagement'), false)
  })

  it('16. Fallback exam is OFF by default and cannot be enabled in production mode', async () => {
    // Default mode: false
    assert.equal(progressionConfig.ALLOW_FALLBACK_EXAM, false)

    const prevEnv = process.env.NODE_ENV
    const prevFallback = process.env.ALLOW_FALLBACK_EXAM
    try {
      process.env.NODE_ENV = 'production'
      process.env.ALLOW_FALLBACK_EXAM = 'true'
      assert.equal(progressionConfig.ALLOW_FALLBACK_EXAM, false)
    } finally {
      process.env.NODE_ENV = prevEnv
      if (prevFallback !== undefined) process.env.ALLOW_FALLBACK_EXAM = prevFallback
      else delete process.env.ALLOW_FALLBACK_EXAM
    }
  })

  it('17. Legacy regression: legacy tasks complete as before', async () => {
    const goal = await Goal.create({ userId, title: 'Legacy Goal' })

    // A. Direct PUT { completed: true }
    const taskA = await Task.create({ userId, title: 'Legacy Task A', workflowEnabled: false })
    const resA = await invoke(taskController.updateTask, {
      params: { id: taskA._id.toString() },
      body: { completed: true },
    })
    assert.equal(resA.statusCode, 200)
    assert.equal(resA.body.task.completed, true)

    // B. Subtask auto-completion
    const taskB = await Task.create({
      userId,
      title: 'Legacy Task B',
      workflowEnabled: false,
      subtasks: [{ title: 'Sub', completed: false }],
    })
    const resB = await invoke(taskController.updateTask, {
      params: { id: taskB._id.toString() },
      body: { status: 'completed' },
    })
    assert.equal(resB.statusCode, 200)
    assert.equal(resB.body.task.completed, true)

    // C. completeFocus with markTaskComplete
    const taskC = await Task.create({ userId, title: 'Legacy Task C', workflowEnabled: false })
    const sessionC = await FocusSession.create({
      userId,
      taskId: taskC._id,
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      status: 'active',
    })
    const resC = await invoke(plannerController.completeFocus, {
      params: { id: sessionC._id.toString() },
      body: { markTaskComplete: true },
    })
    assert.equal(resC.statusCode, 200)
    const reloadedC = await Task.findById(taskC._id)
    assert.equal(reloadedC.completed, true)

    // D. goalExecution completeTask
    const taskD = await Task.create({ userId, goalId: goal._id, title: 'Legacy Task D', workflowEnabled: false })
    await goalExecutionService.completeTask(userId, taskD._id)
    const reloadedD = await Task.findById(taskD._id)
    assert.equal(reloadedD.completed, true)

    // E. duplicateTask
    const resE = await invoke(taskController.duplicateTask, { params: { id: taskD._id.toString() } })
    assert.equal(resE.statusCode, 201)
    assert.equal(resE.body.task.completed, false)
  })
})
