const Task = require('../models/Task')
const TaskExam = require('../models/TaskExam')
const TaskCertificate = require('../models/TaskCertificate')
const FocusSession = require('../models/FocusSession')
const progressionConfig = require('../config/progression')
const {
  MIN_FOCUS_MINUTES_RATIO,
  RETAKE_MIN_NEW_FOCUS_MINUTES,
  MIN_REQUIRED_FOCUS_MINUTES,
  MAX_COUNTED_SESSION_MINUTES,
  MINIMUM_PASSING_PERCENTAGE,
  EXAM_QUESTION_COUNT,
  EXAM_TIME_LIMIT_MINUTES,
} = progressionConfig

function createProgressionError(message, code, statusCode = 400, extra = {}) {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  Object.assign(err, extra)
  return err
}

// Legal state-transition table
const LEGAL_TRANSITIONS = {
  learning_active: ['learning_completed', 'exam_active'],
  learning_completed: ['exam_active', 'exam_locked', 'learning_active'],
  exam_locked: ['exam_active', 'learning_active'],
  exam_active: ['exam_passed', 'exam_failed', 'learning_active'],
  exam_failed: ['learning_active'],
  exam_passed: ['certification_locked', 'certification_completed', 'task_completed'],
  certification_locked: ['certification_completed', 'task_completed'],
  certification_completed: ['task_completed'],
  task_completed: [],
}

/**
 * Computes total focus minutes as the length of the union of completed session intervals.
 * Enforces MIN_COUNTED_SESSION_SECONDS and caps each session at MAX_COUNTED_SESSION_MINUTES.
 */
function computeFocusSessionUnionMinutes(sessions = []) {
  const intervals = []
  const minSeconds = progressionConfig.MIN_COUNTED_SESSION_SECONDS || 60
  const maxSessionSeconds = (progressionConfig.MAX_COUNTED_SESSION_MINUTES || 120) * 60

  for (const s of sessions) {
    if (!s || s.status !== 'completed') continue

    let durationSec = 0
    let endMs = 0

    if (s.endedAt && s.startedAt) {
      endMs = new Date(s.endedAt).getTime()
      const startMs = new Date(s.startedAt).getTime()
      if (endMs > startMs) {
        const elapsed = Math.floor((endMs - startMs) / 1000)
        durationSec = Math.max(0, elapsed - (Number(s.pausedDurationSeconds) || 0))
      }
    } else if (s.durationSeconds) {
      durationSec = Number(s.durationSeconds) || 0
      endMs = s.endedAt
        ? new Date(s.endedAt).getTime()
        : (s.startedAt ? new Date(s.startedAt).getTime() + durationSec * 1000 : Date.now())
    }

    if (durationSec < minSeconds) continue

    const effectiveSeconds = Math.min(durationSec, maxSessionSeconds)
    const intervalStartMs = endMs - effectiveSeconds * 1000
    intervals.push([intervalStartMs, endMs])
  }

  if (intervals.length === 0) return 0

  intervals.sort((a, b) => a[0] - b[0])
  let totalMs = 0
  let [currStart, currEnd] = intervals[0]

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i]
    if (start <= currEnd) {
      currEnd = Math.max(currEnd, end)
    } else {
      totalMs += (currEnd - currStart)
      currStart = start
      currEnd = end
    }
  }
  totalMs += (currEnd - currStart)

  return Math.round(totalMs / 60000)
}

/**
 * Pure server-side learning verification.
 * Focus minutes are derived exclusively from server-written FocusSession records.
 * Deleting subtasks or checklist items after enable cannot reduce requirements.
 */
async function verifyLearning(task, { newEffortSince = null } = {}) {
  const requirements = []

  // Ensure learningSnapshot exists (lazy backfill for legacy workflow tasks)
  if (task.workflowEnabled && (!task.learningSnapshot || task.learningSnapshot.requiredFocusMinutes == null)) {
    const estimated = Number(task.estimatedMinutes) || 0
    const reqMins = Math.max(MIN_REQUIRED_FOCUS_MINUTES, Math.round(estimated * MIN_FOCUS_MINUTES_RATIO))
    task.learningSnapshot = {
      title: task.title ? task.title.slice(0, 200) : null,
      requiredFocusMinutes: reqMins,
      subtaskCount: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
      checklistCount: Array.isArray(task.checklist) ? task.checklist.length : 0,
    }
    if (typeof task.save === 'function') {
      await task.save()
    } else {
      await Task.updateOne({ _id: task._id }, { $set: { learningSnapshot: task.learningSnapshot } })
    }
  }

  // 1. Focus time requirement from server-persisted FocusSession records only
  const completedSessions = await FocusSession.find({
    userId: task.userId,
    taskId: task._id,
    status: 'completed',
  }).lean()

  const focusMinutes = computeFocusSessionUnionMinutes(completedSessions)

  const requiredFocusMinutes =
    task.learningSnapshot?.requiredFocusMinutes != null
      ? Number(task.learningSnapshot.requiredFocusMinutes)
      : Math.max(MIN_REQUIRED_FOCUS_MINUTES, Math.round((Number(task.estimatedMinutes) || 0) * MIN_FOCUS_MINUTES_RATIO))

  const focusMet = focusMinutes >= requiredFocusMinutes

  requirements.push({
    key: 'focus_time',
    met: focusMet,
    detail: focusMet
      ? `Focused study time satisfied (${focusMinutes} of ${requiredFocusMinutes} min recorded).`
      : `Need at least ${requiredFocusMinutes} min of focused study (${focusMinutes} min recorded).`,
    actual: focusMinutes,
    required: requiredFocusMinutes,
  })

  // 2. Subtasks requirement (enforces completion and count >= snapshot count)
  const currentSubtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const snapshotSubtaskCount = Number(task.learningSnapshot?.subtaskCount) || 0
  if (snapshotSubtaskCount > 0 || currentSubtasks.length > 0) {
    const incomplete = currentSubtasks.filter((s) => !s.completed)
    const countPreserved = currentSubtasks.length >= snapshotSubtaskCount
    const subtasksMet = incomplete.length === 0 && countPreserved
    let detail = ''
    if (!countPreserved) {
      detail = `Subtasks deleted: expected at least ${snapshotSubtaskCount} subtask(s), currently have ${currentSubtasks.length}.`
    } else if (incomplete.length > 0) {
      detail = `${incomplete.length} of ${currentSubtasks.length} subtask(s) incomplete.`
    } else {
      detail = `All ${currentSubtasks.length} subtask(s) completed.`
    }
    requirements.push({
      key: 'subtasks',
      met: subtasksMet,
      detail,
      total: Math.max(snapshotSubtaskCount, currentSubtasks.length),
      completed: currentSubtasks.length - incomplete.length,
    })
  }

  // 3. Checklist requirement (enforces completion and count >= snapshot count)
  const currentChecklist = Array.isArray(task.checklist) ? task.checklist : []
  const snapshotChecklistCount = Number(task.learningSnapshot?.checklistCount) || 0
  if (snapshotChecklistCount > 0 || currentChecklist.length > 0) {
    const incomplete = currentChecklist.filter((c) => !c.done)
    const countPreserved = currentChecklist.length >= snapshotChecklistCount
    const checklistMet = incomplete.length === 0 && countPreserved
    let detail = ''
    if (!countPreserved) {
      detail = `Checklist items deleted: expected at least ${snapshotChecklistCount} item(s), currently have ${currentChecklist.length}.`
    } else if (incomplete.length > 0) {
      detail = `${incomplete.length} of ${currentChecklist.length} checklist item(s) remaining.`
    } else {
      detail = `All ${currentChecklist.length} checklist item(s) done.`
    }
    requirements.push({
      key: 'checklist',
      met: checklistMet,
      detail,
      total: Math.max(snapshotChecklistCount, currentChecklist.length),
      completed: currentChecklist.length - incomplete.length,
    })
  }

  // 4. Retake new effort check
  if (newEffortSince) {
    const recentSessions = await FocusSession.find({
      userId: task.userId,
      taskId: task._id,
      status: 'completed',
      endedAt: { $gte: new Date(newEffortSince) },
    }).lean()

    const newMinutes = computeFocusSessionUnionMinutes(recentSessions)
    const retakeMet = newMinutes >= RETAKE_MIN_NEW_FOCUS_MINUTES

    requirements.push({
      key: 'retake_effort',
      met: retakeMet,
      detail: retakeMet
        ? `New study effort recorded since previous exam failure (${newMinutes} of ${RETAKE_MIN_NEW_FOCUS_MINUTES} min).`
        : `Retake requires at least ${RETAKE_MIN_NEW_FOCUS_MINUTES} min of new focus study after failed attempt (${newMinutes} min recorded).`,
      actual: newMinutes,
      required: RETAKE_MIN_NEW_FOCUS_MINUTES,
    })
  }

  const verified = requirements.every((r) => r.met)
  return { verified, requirements, focusMinutes, requiredFocusMinutes }
}

/**
 * Owner-scoped fetch of complete progression state conforming to Contract v2.
 * GET /progression is strictly read-only for learning state (does not auto-verify),
 * but applies expiry rollback if an active exam has expired.
 */
async function getProgressionState(taskId, userId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
  }

  if (!task.workflowEnabled) {
    throw createProgressionError(
      'Task progression workflow is not enabled for this task.',
      'WORKFLOW_NOT_ENABLED',
      400,
    )
  }

  let [exam, certificate] = await Promise.all([
    TaskExam.findOne({ taskId: task._id, userId }),
    TaskCertificate.findOne({ taskId: task._id, userId }),
  ])

  // Expiry rollback: if exam session was active but has expired, roll back to learning_active
  if (exam && exam.status === 'active' && exam.expiresAt && new Date() > new Date(exam.expiresAt)) {
    exam.status = 'abandoned'
    await exam.save()

    task.stageStatus = 'learning_active'
    task.progressionStage = 'learning'
    task.learningVerifiedAt = null
    await task.save()
  }

  const lastAttempt = exam?.attempts?.[exam.attempts.length - 1]
  const newEffortSince =
    lastAttempt && !lastAttempt.passed && task.stageStatus === 'learning_active'
      ? lastAttempt.evaluatedAt
      : null

  const learningVerification = await verifyLearning(task, { newEffortSince })

  // 1. Learning state derivation
  let learningState = 'current'
  if (task.learningVerifiedAt) {
    learningState = 'completed'
  } else if (learningVerification.verified) {
    learningState = 'ready_for_verification'
  } else {
    learningState = 'current'
  }

  // 2. Exam state derivation
  let examState = 'locked'
  let canUnlockExam = false

  const hasPassedExam =
    ['exam_passed', 'certification_locked', 'certification_completed', 'task_completed'].includes(
      task.stageStatus,
    ) || Boolean(task.completed)

  if (hasPassedExam) {
    examState = 'completed'
    canUnlockExam = false
  } else if (exam && exam.status === 'active') {
    examState = 'current'
    canUnlockExam = false
  } else if (task.examAttemptsCount > 0 && newEffortSince && !learningVerification.verified) {
    examState = 'failed'
    canUnlockExam = false
  } else if (learningState === 'ready_for_verification' || Boolean(task.learningVerifiedAt)) {
    examState = 'locked'
    canUnlockExam = true
  } else {
    examState = 'locked'
    canUnlockExam = false
  }

  // Active exam delivery projection if active and unexpired
  let activeExamDelivery = null
  if (exam && exam.status === 'active' && exam.expiresAt && new Date() <= new Date(exam.expiresAt)) {
    const now = Date.now()
    const exp = new Date(exam.expiresAt).getTime()
    const remainingSeconds = Math.max(0, Math.floor((exp - now) / 1000))

    activeExamDelivery = {
      examId: String(exam._id),
      startedAt: exam.startedAt,
      expiresAt: exam.expiresAt,
      serverNow: new Date().toISOString(),
      remainingSeconds,
      timeLimitMinutes: exam.timeLimitMinutes || EXAM_TIME_LIMIT_MINUTES,
      questionCount: exam.questions.length,
      questions: exam.questions.map((q) => ({
        questionId: q.questionId || q._id,
        question: q.question,
        options: q.options,
      })),
    }
  }

  // 3. Certification state derivation
  let certificationState = 'locked'
  if (task.certificationLastError?.code) {
    certificationState = 'failed'
  } else if (
    task.completed ||
    task.stageStatus === 'task_completed' ||
    task.stageStatus === 'certification_completed' ||
    Boolean(task.certificateId)
  ) {
    certificationState = 'completed'
  } else if (['exam_passed', 'certification_pending'].includes(task.stageStatus)) {
    certificationState = 'generating'
  } else {
    certificationState = 'locked'
  }

  const recoverableError = task.certificationLastError?.code
    ? {
        code: task.certificationLastError.code,
        message: task.certificationLastError.message,
        at: task.certificationLastError.at,
      }
    : null

  let locked = examState === 'locked' || examState === 'failed'
  let lockedReason = null
  let lockedMessage = null
  if (examState === 'locked') {
    if (!canUnlockExam) {
      lockedReason = 'learning_incomplete'
      lockedMessage = 'Complete learning stage requirements to unlock exam.'
    }
  } else if (examState === 'failed') {
    lockedReason = 'retake_requirements_unmet'
    lockedMessage = 'Complete required focus study time before retaking exam.'
  }

  const isRetakeRequired = Boolean(task.examAttemptsCount > 0 && lastAttempt && !lastAttempt.passed)
  const retake = {
    required: isRetakeRequired,
    requirements: isRetakeRequired
      ? learningVerification.requirements.filter((r) => r.key === 'retake_effort')
      : [],
  }

  return {
    taskId: String(task._id),
    title: task.title,
    workflowEnabled: task.workflowEnabled,
    stage: task.progressionStage,
    status: task.stageStatus,
    progressionStage: task.progressionStage,
    stageStatus: task.stageStatus,
    completed: Boolean(task.completed),
    serverNow: new Date().toISOString(),
    links: {
      goalId: task.goalId ? String(task.goalId) : null,
      roadmapId: task.roadmapId ? String(task.roadmapId) : null,
    },
    learning: {
      state: learningState,
      verified: Boolean(task.learningVerifiedAt),
      verifiedAt: task.learningVerifiedAt || null,
      learningVerifiedAt: task.learningVerifiedAt || null,
      requirements: learningVerification.requirements,
      focus: {
        minutes: learningVerification.focusMinutes,
        requiredMinutes: learningVerification.requiredFocusMinutes,
      },
    },
    exam: {
      state: examState,
      locked,
      canUnlock: canUnlockExam,
      lockedReason,
      lockedMessage,
      unlocked: canUnlockExam || Boolean(task.learningVerifiedAt),
      examId: exam?._id ? String(exam._id) : null,
      status: exam?.status || (hasPassedExam ? 'passed' : 'none'),
      minimumPassingPercentage: exam?.passingPercentage || MINIMUM_PASSING_PERCENTAGE,
      passingPercentage: exam?.passingPercentage || MINIMUM_PASSING_PERCENTAGE,
      questionCount: exam?.questionCount || EXAM_QUESTION_COUNT,
      timeLimitMinutes: exam?.timeLimitMinutes || EXAM_TIME_LIMIT_MINUTES,
      attemptsCount: task.examAttemptsCount || 0,
      lastAttempt: lastAttempt
        ? {
            attemptNumber: lastAttempt.attemptNumber,
            score: lastAttempt.score,
            passed: lastAttempt.passed,
            evaluatedAt: lastAttempt.evaluatedAt,
          }
        : null,
      retake,
      activeExam: activeExamDelivery,
    },
    certification: {
      state: certificationState,
      certificateId: certificate?.credentialId || task.certificateId || null,
      issuedAt: certificate?.issueDate || null,
      linkedToResume: certificate?.linkedToResume || false,
      certificate: certificate || null,
      recoverableError,
    },
    taskCompleted: Boolean(task.completed),
    completedAt: task.completedAt || null,
  }
}

function getStageForStatus(status) {
  if (status.startsWith('learning_')) return 'learning'
  if (status.startsWith('exam_')) return status === 'exam_passed' ? 'certification' : 'exam'
  if (status.startsWith('certification_')) return 'certification'
  if (status === 'task_completed') return 'completed'
  return 'learning'
}

/**
 * Central atomic state transition helper.
 */
async function transitionStage(taskId, userId, fromStatus, toStatus, extraUpdates = {}) {
  const allowed = LEGAL_TRANSITIONS[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    throw createProgressionError(
      `Illegal transition from '${fromStatus}' to '${toStatus}'.`,
      'ILLEGAL_STAGE_TRANSITION',
      409,
    )
  }

  const progressionStage = extraUpdates.progressionStage || getStageForStatus(toStatus)

  const updatedTask = await Task.findOneAndUpdate(
    { _id: taskId, userId, workflowEnabled: true, stageStatus: fromStatus },
    { $set: { stageStatus: toStatus, progressionStage, ...extraUpdates } },
    { new: true },
  )

  if (!updatedTask) {
    const existing = await Task.findOne({ _id: taskId, userId })
    if (!existing) {
      throw createProgressionError('Task not found.', 'TASK_NOT_FOUND', 404)
    }
    if (!existing.workflowEnabled) {
      throw createProgressionError(
        'Task progression workflow is not enabled for this task.',
        'WORKFLOW_NOT_ENABLED',
        400,
      )
    }
    throw createProgressionError(
      `Task status changed concurrently (expected '${fromStatus}', current '${existing.stageStatus}').`,
      'ILLEGAL_STAGE_TRANSITION',
      409,
    )
  }

  return updatedTask
}

module.exports = {
  createProgressionError,
  verifyLearning,
  getProgressionState,
  transitionStage,
  LEGAL_TRANSITIONS,
}
