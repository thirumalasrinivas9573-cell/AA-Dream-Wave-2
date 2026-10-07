const mongoose = require('mongoose')
const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const taskProgressionService = require('../services/taskProgressionService')
const taskExamService = require('../services/taskExamService')
const taskCertificateService = require('../services/taskCertificateService')
const {
  serializeProgression,
  serializeExamDelivery,
  serializeExamResult,
  serializeCertificateSummary,
} = require('../services/taskProgressionSerializer')
const {
  MIN_REQUIRED_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES_RATIO,
} = require('../config/progression')

function validId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ''))
}

function handleControllerError(res, error, defaultAction = 'process request') {
  const statusCode = error.statusCode || 500
  const code = error.code || 'SERVER_ERROR'
  const message = error.message || `Failed to ${defaultAction}.`
  const extra = {}
  if (error.requirements) extra.requirements = error.requirements
  if (error.missing) extra.missing = error.missing
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...extra,
  })
}

/**
 * POST /api/tasks/:id/progression/enable
 * Enables three-stage progression workflow and records immutable learning snapshot.
 */
exports.enableWorkflow = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) {
      return res.status(404).json({ success: false, code: 'TASK_NOT_FOUND', message: 'Task not found.' })
    }

    if (task.completed || task.status === 'completed') {
      return res.status(409).json({
        success: false,
        code: 'TASK_ALREADY_COMPLETED',
        message: 'Cannot enable progression workflow on an already completed task.',
      })
    }

    if (!task.workflowEnabled) {
      const estimated = Number(task.estimatedMinutes) || 0
      const requiredFocusMinutes = Math.max(
        MIN_REQUIRED_FOCUS_MINUTES,
        Math.round(estimated * MIN_FOCUS_MINUTES_RATIO),
      )

      task.workflowEnabled = true
      task.workflowEnabledAt = new Date()
      task.learningSnapshot = {
        title: (task.title || '').slice(0, 200),
        requiredFocusMinutes,
        subtaskCount: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
        checklistCount: Array.isArray(task.checklist) ? task.checklist.length : 0,
      }
      task.progressionStage = 'learning'
      task.stageStatus = 'learning_active'
      task.learningVerifiedAt = null
      await task.save()
    } else if (!task.learningSnapshot || !task.learningSnapshot.requiredFocusMinutes) {
      const estimated = Number(task.estimatedMinutes) || 0
      task.learningSnapshot = {
        title: (task.title || '').slice(0, 200),
        requiredFocusMinutes: Math.max(
          MIN_REQUIRED_FOCUS_MINUTES,
          Math.round(estimated * MIN_FOCUS_MINUTES_RATIO),
        ),
        subtaskCount: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
        checklistCount: Array.isArray(task.checklist) ? task.checklist.length : 0,
      }
      await task.save()
    }

    const state = await taskProgressionService.getProgressionState(task._id, req.user._id)
    return res.status(200).json({
      success: true,
      message: 'Task progression workflow enabled.',
      progression: serializeProgression(state),
    })
  } catch (err) {
    return handleControllerError(res, err, 'enable workflow')
  }
}

/**
 * GET /api/tasks/:id/progression
 * Strictly read-only state query. Applies expiry rollback if active exam expired.
 */
exports.getProgression = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    const state = await taskProgressionService.getProgressionState(req.params.id, req.user._id)
    return res.status(200).json({
      success: true,
      progression: serializeProgression(state),
    })
  } catch (err) {
    return handleControllerError(res, err, 'get progression state')
  }
}

/**
 * POST /api/tasks/:id/progression/verify-learning
 * Server-side verified learning transition. Reads no client payload flag.
 */
exports.verifyLearning = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) {
      return res.status(404).json({ success: false, code: 'TASK_NOT_FOUND', message: 'Task not found.' })
    }

    if (!task.workflowEnabled) {
      return res.status(400).json({
        success: false,
        code: 'WORKFLOW_NOT_ENABLED',
        message: 'Task progression workflow is not enabled for this task.',
      })
    }

    if (task.learningVerifiedAt) {
      const state = await taskProgressionService.getProgressionState(task._id, req.user._id)
      return res.status(200).json({
        success: true,
        verified: true,
        progression: serializeProgression(state),
      })
    }

    const exam = await TaskExam.findOne({ taskId: task._id, userId: req.user._id })
    const lastAttempt = exam?.attempts?.[exam.attempts.length - 1]
    const newEffortSince =
      lastAttempt && !lastAttempt.passed && task.stageStatus === 'learning_active'
        ? lastAttempt.evaluatedAt
        : null

    const verification = await taskProgressionService.verifyLearning(task, { newEffortSince })

    if (verification.verified) {
      task.learningVerifiedAt = new Date()
      task.stageStatus = 'learning_completed'
      await task.save()

      const state = await taskProgressionService.getProgressionState(task._id, req.user._id)
      return res.status(200).json({
        success: true,
        verified: true,
        progression: serializeProgression(state),
      })
    }

    const state = await taskProgressionService.getProgressionState(task._id, req.user._id)
    return res.status(200).json({
      success: true,
      verified: false,
      requirements: verification.requirements,
      progression: serializeProgression(state),
    })
  } catch (err) {
    return handleControllerError(res, err, 'verify learning')
  }
}

/**
 * POST /api/tasks/:id/exam/start
 * Starts or resumes certification exam. Auto-verifies learning as a safety net.
 */
exports.startExam = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    const examDelivery = await taskExamService.startExam(req.params.id, req.user._id)
    const state = await taskProgressionService.getProgressionState(req.params.id, req.user._id)

    return res.status(200).json({
      success: true,
      exam: serializeExamDelivery(examDelivery),
      progression: serializeProgression(state),
    })
  } catch (err) {
    return handleControllerError(res, err, 'start exam')
  }
}

/**
 * POST /api/tasks/:id/exam/submit
 * Submits exam answers. Accepts ONLY { answers: [{ questionId, selectedIndex }] }.
 */
exports.submitExam = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    // Strict body validation: ONLY { answers: [...] }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'Request body must be an object.' })
    }

    const keys = Object.keys(req.body)
    if (keys.length !== 1 || keys[0] !== 'answers') {
      return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'Body must contain only answers.' })
    }

    if (!Array.isArray(req.body.answers)) {
      return res.status(400).json({ success: false, code: 'INVALID_ANSWERS', message: 'Answers must be an array.' })
    }

    for (const ans of req.body.answers) {
      if (!ans || typeof ans !== 'object') {
        return res.status(400).json({ success: false, code: 'INVALID_ANSWERS', message: 'Each answer must be an object.' })
      }
      if (typeof ans.questionId !== 'string' || !ans.questionId.trim()) {
        return res.status(400).json({ success: false, code: 'INVALID_ANSWERS', message: 'Each answer must have a questionId.' })
      }
      if (ans.selectedIndex !== null && ans.selectedIndex !== undefined) {
        if (!Number.isInteger(ans.selectedIndex) || ans.selectedIndex < 0) {
          return res.status(400).json({ success: false, code: 'INVALID_ANSWERS', message: 'selectedIndex must be a non-negative integer.' })
        }
      }
    }

    const evalResult = await taskExamService.submitExam(req.params.id, req.user._id, req.body.answers)

    let progressionState = null
    let certSummary = null

    if (evalResult.passed) {
      try {
        const pipeResult = await taskCertificateService.completeCertificationPipeline(
          req.params.id,
          req.user._id,
        )
        progressionState = pipeResult.progressionState
        certSummary = serializeCertificateSummary(pipeResult.certificate)
      } catch (pipeErr) {
        // Recoverable error: task.certificationLastError is already set by completeCertificationPipeline
        progressionState = await taskProgressionService.getProgressionState(req.params.id, req.user._id)
      }
    } else {
      progressionState = await taskProgressionService.getProgressionState(req.params.id, req.user._id)
    }

    const payload = {
      success: true,
      result: serializeExamResult(evalResult),
      progression: serializeProgression(progressionState),
    }
    if (certSummary) {
      Object.defineProperty(payload, 'certification', {
        value: certSummary,
        enumerable: false,
        configurable: true,
      })
    }
    return res.status(200).json(payload)
  } catch (err) {
    return handleControllerError(res, err, 'submit exam')
  }
}

/**
 * POST /api/tasks/:id/certificate/retry
 * Retries complete certification and resume linking pipeline.
 */
exports.retryCertification = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid task ID.' })
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) {
      return res.status(404).json({ success: false, code: 'TASK_NOT_FOUND', message: 'Task not found.' })
    }

    if (!task.workflowEnabled) {
      return res.status(400).json({
        success: false,
        code: 'WORKFLOW_NOT_ENABLED',
        message: 'Task progression workflow is not enabled for this task.',
      })
    }

    const exam = await TaskExam.findOne({ taskId: task._id, userId: req.user._id })
    const hasPassingAttempt =
      Array.isArray(exam?.attempts) && exam.attempts.some((a) => a.passed === true)

    if (!hasPassingAttempt) {
      return res.status(409).json({
        success: false,
        code: 'CERTIFICATION_NOT_ELIGIBLE',
        message: 'A verified passing exam attempt is required.',
      })
    }

    const pipeResult = await taskCertificateService.completeCertificationPipeline(
      task._id,
      req.user._id,
    )

    const payload = {
      success: true,
      progression: serializeProgression(pipeResult.progressionState),
    }
    Object.defineProperty(payload, 'message', {
      value: 'Certification completed.',
      enumerable: false,
      configurable: true,
    })
    if (pipeResult.certificate) {
      Object.defineProperty(payload, 'certificate', {
        value: serializeCertificateSummary(pipeResult.certificate),
        enumerable: false,
        configurable: true,
      })
    }
    return res.status(200).json(payload)
  } catch (err) {
    if (err.code === 'FINALIZATION_NOT_ALLOWED') {
      return res.status(409).json({
        success: false,
        code: 'FINALIZATION_NOT_ALLOWED',
        message: err.message,
        missing: err.missing || [],
      })
    }
    if (err.code === 'CERTIFICATION_NOT_ELIGIBLE') {
      return res.status(409).json({
        success: false,
        code: 'CERTIFICATION_NOT_ELIGIBLE',
        message: err.message,
      })
    }
    return handleControllerError(res, err, 'retry certification')
  }
}
