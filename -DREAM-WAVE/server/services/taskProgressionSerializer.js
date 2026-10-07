const progressionConfig = require('../config/progression')
const { isWorkflowTask } = require('./workflowGuard')

/**
 * Derives lightweight stagesSummary from stored Task fields only.
 * No FocusSession queries, no AI calls, no extra DB queries.
 *
 * @param {Object} task
 * @returns {{ learning: string, exam: string, certification: string } | undefined}
 */
function deriveStagesSummary(task) {
  if (!isWorkflowTask(task)) return undefined

  // 1. learning: 'completed' | 'current'
  let learning = 'current'
  if (
    task.learningVerifiedAt ||
    [
      'learning_completed',
      'exam_locked',
      'exam_active',
      'exam_passed',
      'exam_failed',
      'certification_locked',
      'certification_completed',
      'task_completed',
    ].includes(task.stageStatus) ||
    task.completed
  ) {
    learning = 'completed'
  }

  // 2. exam: 'locked' | 'current' | 'failed' | 'completed'
  let exam = 'locked'
  if (
    ['exam_passed', 'certification_completed', 'task_completed'].includes(task.stageStatus) ||
    task.completed
  ) {
    exam = 'completed'
  } else if (task.stageStatus === 'exam_active') {
    exam = 'current'
  } else if (
    task.stageStatus === 'exam_failed' ||
    (task.stageStatus === 'learning_active' && (task.examAttemptsCount || 0) > 0 && !task.learningVerifiedAt)
  ) {
    exam = 'failed'
  }

  // 3. certification: 'locked' | 'generating' | 'failed' | 'completed'
  let certification = 'locked'
  if (task.certificationLastError?.code) {
    certification = 'failed'
  } else if (
    task.completed ||
    task.stageStatus === 'task_completed' ||
    task.stageStatus === 'certification_completed' ||
    Boolean(task.certificateId)
  ) {
    certification = 'completed'
  } else if (['exam_passed', 'certification_pending'].includes(task.stageStatus)) {
    certification = 'generating'
  }

  return { learning, exam, certification }
}

/**
 * Attaches stagesSummary to workflow task responses.
 * Omitted for legacy tasks.
 */
function serializeTaskResponse(task) {
  if (!task) return task
  const plain = typeof task.toObject === 'function' ? task.toObject() : { ...task }
  if (isWorkflowTask(plain)) {
    plain.stagesSummary = deriveStagesSummary(plain)
  }
  return plain
}

/**
 * Serializes a TaskCertificate using real schema names from StudentProfile / Resume.
 * Excludes userId, internal mongo ids, and deprecated issueDate.
 */
function serializeCertificateSummary(cert) {
  if (!cert) return null
  const firstSkill = Array.isArray(cert.skills) && cert.skills.length > 0 ? cert.skills[0] : ''
  const issuedAtIso = cert.issueDate
    ? new Date(cert.issueDate).toISOString()
    : cert.issuedAt
      ? new Date(cert.issuedAt).toISOString()
      : new Date().toISOString()

  const linkedResumeId = cert.linkedResumeId ? String(cert.linkedResumeId) : null
  const linkedResumeIds = Array.isArray(cert.linkedResumeIds)
    ? cert.linkedResumeIds.map((id) => String(id))
    : linkedResumeId
      ? [linkedResumeId]
      : []

  return {
    credentialId: cert.credentialId,
    title: cert.title,
    issuer: cert.issuer || progressionConfig.CERTIFICATE_ISSUER || 'Dream Wave AI',
    issuedAt: issuedAtIso,
    url: cert.verificationUrl || cert.url || null,
    verificationUrl: cert.verificationUrl || null,
    skills: Array.isArray(cert.skills) ? cert.skills : [],
    skill: firstSkill,
    category: cert.category || 'course',
    verificationStatus: cert.verificationStatus || 'verified',
    documentUrl: cert.documentUrl || null,
    linkedToResume: Boolean(cert.linkedToResume),
    linkedResumeId,
    linkedResumeIds,
  }
}

/**
 * Serializes progression state conforming to Contract v2.
 * Never includes answers, correctIndex, or explanations.
 */
function serializeProgression(state) {
  if (!state) return null

  const learningSection = {
    state: state.learning?.state || (state.learning?.verified ? 'completed' : 'current'),
    verified: Boolean(state.learning?.verified),
    verifiedAt: state.learning?.verifiedAt || state.learning?.learningVerifiedAt || null,
    requirements: Array.isArray(state.learning?.requirements)
      ? state.learning.requirements.map((r) => ({
          key: r.key,
          met: Boolean(r.met),
          detail: r.detail,
        }))
      : [],
    focus: {
      minutes: state.learning?.focus?.minutes ?? 0,
      requiredMinutes: state.learning?.focus?.requiredMinutes ?? 0,
    },
  }
  Object.defineProperty(learningSection, 'learningVerifiedAt', {
    get() {
      return this.verifiedAt
    },
    enumerable: false,
    configurable: true,
  })

  const examSection = {
    state: state.exam?.state || 'locked',
    locked:
      state.exam?.locked !== undefined
        ? Boolean(state.exam.locked)
        : state.exam?.state === 'locked' || state.exam?.state === 'failed',
    canUnlock: Boolean(state.exam?.canUnlock),
    lockedReason: state.exam?.lockedReason || null,
    lockedMessage: state.exam?.lockedMessage || null,
    attemptsCount: state.exam?.attemptsCount || 0,
    minimumPassingPercentage:
      state.exam?.minimumPassingPercentage ||
      state.exam?.passingPercentage ||
      progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    questionCount: state.exam?.questionCount || progressionConfig.EXAM_QUESTION_COUNT,
    timeLimitMinutes: state.exam?.timeLimitMinutes || progressionConfig.EXAM_TIME_LIMIT_MINUTES,
    activeExam: state.exam?.activeExam
      ? {
          examId: state.exam.activeExam.examId,
          startedAt: state.exam.activeExam.startedAt,
          expiresAt: state.exam.activeExam.expiresAt,
          serverNow: state.exam.activeExam.serverNow || new Date().toISOString(),
          remainingSeconds: state.exam.activeExam.remainingSeconds,
          timeLimitMinutes: state.exam.activeExam.timeLimitMinutes,
          questionCount: state.exam.activeExam.questionCount,
          questions: state.exam.activeExam.questions,
        }
      : null,
    lastAttempt: state.exam?.lastAttempt
      ? {
          attemptNumber: state.exam.lastAttempt.attemptNumber,
          score: state.exam.lastAttempt.score,
          passed: state.exam.lastAttempt.passed,
          evaluatedAt: state.exam.lastAttempt.evaluatedAt,
        }
      : null,
    retake: state.exam?.retake || { required: false, requirements: [] },
  }
  Object.defineProperties(examSection, {
    unlocked: {
      get() {
        return Boolean(!this.locked || this.canUnlock)
      },
      enumerable: false,
      configurable: true,
    },
    examId: {
      get() {
        return this.activeExam?.examId || null
      },
      enumerable: false,
      configurable: true,
    },
    status: {
      get() {
        return this.state === 'completed' ? 'passed' : this.state === 'current' ? 'active' : 'none'
      },
      enumerable: false,
      configurable: true,
    },
    passingPercentage: {
      get() {
        return this.minimumPassingPercentage
      },
      enumerable: false,
      configurable: true,
    },
  })

  const certSection = {
    state: state.certification?.state || 'locked',
    certificate: state.certification?.certificate
      ? serializeCertificateSummary(state.certification.certificate)
      : null,
    recoverableError: state.certification?.recoverableError
      ? {
          code: state.certification.recoverableError.code,
          message: state.certification.recoverableError.message,
        }
      : null,
  }
  Object.defineProperties(certSection, {
    certificateId: {
      get() {
        return this.certificate?.credentialId || null
      },
      enumerable: false,
      configurable: true,
    },
    issuedAt: {
      get() {
        return this.certificate?.issuedAt || null
      },
      enumerable: false,
      configurable: true,
    },
    linkedToResume: {
      get() {
        return Boolean(this.certificate?.linkedToResume)
      },
      enumerable: false,
      configurable: true,
    },
  })
  if (state.certification?.recoverableError?.at && certSection.recoverableError) {
    Object.defineProperty(certSection.recoverableError, 'at', {
      value: state.certification.recoverableError.at,
      enumerable: false,
      configurable: true,
    })
  }

  const progressionResult = {
    taskId: state.taskId,
    workflowEnabled: Boolean(state.workflowEnabled),
    completed: Boolean(state.completed !== undefined ? state.completed : state.taskCompleted),
    progressionStage: state.progressionStage || state.stage || 'learning',
    stageStatus: state.stageStatus || state.status || 'learning_active',
    serverNow: state.serverNow || new Date().toISOString(),
    links: state.links || { goalId: null, roadmapId: null },
    stages: {
      learning: learningSection,
      exam: examSection,
      certification: certSection,
    },
  }

  const stagesSummary =
    state.stagesSummary ||
    deriveStagesSummary({
      workflowEnabled: true,
      stageStatus: progressionResult.stageStatus,
      learningVerifiedAt: learningSection.verifiedAt,
      completed: progressionResult.completed,
      examAttemptsCount: examSection.attemptsCount,
      certificationLastError: certSection.recoverableError,
      certificateId: certSection.certificateId,
    })

  Object.defineProperties(progressionResult, {
    stage: {
      get() {
        return this.progressionStage
      },
      enumerable: false,
      configurable: true,
    },
    status: {
      get() {
        return this.stageStatus
      },
      enumerable: false,
      configurable: true,
    },
    taskCompleted: {
      get() {
        return this.completed
      },
      enumerable: false,
      configurable: true,
    },
    title: {
      value: state.title || '',
      enumerable: false,
      configurable: true,
    },
    completedAt: {
      value: state.completedAt || null,
      enumerable: false,
      configurable: true,
    },
    stagesSummary: {
      value: stagesSummary,
      enumerable: false,
      configurable: true,
    },
    learning: {
      get() {
        return this.stages.learning
      },
      enumerable: false,
      configurable: true,
    },
    exam: {
      get() {
        return this.stages.exam
      },
      enumerable: false,
      configurable: true,
    },
    certification: {
      get() {
        return this.stages.certification
      },
      enumerable: false,
      configurable: true,
    },
  })

  return progressionResult
}

/**
 * Serializes active exam questions for delivery to the client.
 * Strip correctIndex, explanation, or internal answers.
 */
function serializeExamDelivery(examData) {
  if (!examData) return null
  const now = Date.now()
  const exp = examData.expiresAt ? new Date(examData.expiresAt).getTime() : now
  const remainingSeconds = Math.max(0, Math.floor((exp - now) / 1000))

  const examDelivery = {
    examId: examData.examId,
    startedAt: examData.startedAt,
    expiresAt: examData.expiresAt,
    serverNow: new Date().toISOString(),
    remainingSeconds,
    timeLimitMinutes: examData.timeLimitMinutes || progressionConfig.EXAM_TIME_LIMIT_MINUTES,
    questionCount: examData.questionCount || progressionConfig.EXAM_QUESTION_COUNT,
    questions: Array.isArray(examData.questions)
      ? examData.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options,
        }))
      : [],
  }

  Object.defineProperties(examDelivery, {
    taskId: { value: examData.taskId, enumerable: false, configurable: true },
    topic: { value: examData.topic, enumerable: false, configurable: true },
    difficulty: { value: examData.difficulty, enumerable: false, configurable: true },
    passingPercentage: {
      value:
        examData.passingPercentage ||
        examData.minimumPassingPercentage ||
        progressionConfig.MINIMUM_PASSING_PERCENTAGE,
      enumerable: false,
      configurable: true,
    },
    minimumPassingPercentage: {
      value:
        examData.minimumPassingPercentage ||
        examData.passingPercentage ||
        progressionConfig.MINIMUM_PASSING_PERCENTAGE,
      enumerable: false,
      configurable: true,
    },
    resumed: { value: Boolean(examData.resumed), enumerable: false, configurable: true },
  })

  return examDelivery
}

/**
 * Serializes exam grading result.
 * Passed: includes explanations.
 * Failed: isCorrect only, NO explanations, NO correct answers.
 */
function serializeExamResult(evalResult) {
  if (!evalResult) return null
  const passed = Boolean(evalResult.passed)

  const questionResults = Array.isArray(evalResult.questions)
    ? evalResult.questions.map((q) => {
        const item = {
          questionId: q.questionId,
          isCorrect: Boolean(q.isCorrect),
        }
        if (passed && q.explanation !== undefined) {
          item.explanation = q.explanation
        }
        return item
      })
    : []

  const resultObj = {
    score: evalResult.score,
    passed,
    minimumPassingPercentage:
      evalResult.minimumPassingPercentage || progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    attemptNumber: evalResult.attemptNumber,
    correctCount: evalResult.correctCount,
    totalCount: evalResult.totalCount,
    nextStage: evalResult.nextStage,
    questionResults,
  }

  Object.defineProperty(resultObj, 'questions', {
    value: Array.isArray(evalResult.questions)
      ? evalResult.questions.map((q) => ({
          questionId: q.questionId,
          selectedIndex: q.selectedIndex,
          isCorrect: q.isCorrect,
          ...(passed && q.explanation !== undefined ? { explanation: q.explanation } : {}),
        }))
      : questionResults,
    enumerable: false,
    configurable: true,
  })

  return resultObj
}

module.exports = {
  deriveStagesSummary,
  serializeTaskResponse,
  serializeCertificateSummary,
  serializeProgression,
  serializeExamDelivery,
  serializeExamResult,
}
