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
    url: null,
    verificationUrl: null,
    skills: Array.isArray(cert.skills) ? cert.skills : [],
    skill: firstSkill,
    category: cert.category || 'course',
    verificationStatus: 'verified',
    documentUrl: null,
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
    learningVerifiedAt: state.learning?.learningVerifiedAt || null,
    requirements: Array.isArray(state.learning?.requirements)
      ? state.learning.requirements.map((r) => ({
          key: r.key,
          met: Boolean(r.met),
          detail: r.detail,
          actual: r.actual,
          required: r.required,
          total: r.total,
          completed: r.completed,
        }))
      : [],
  }

  const examSection = {
    state: state.exam?.state || 'locked',
    canUnlock: Boolean(state.exam?.canUnlock),
    unlocked: Boolean(state.exam?.unlocked || state.exam?.canUnlock),
    examId: state.exam?.examId || null,
    status: state.exam?.status || 'none',
    minimumPassingPercentage:
      state.exam?.minimumPassingPercentage ||
      state.exam?.passingPercentage ||
      progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    passingPercentage:
      state.exam?.passingPercentage ||
      state.exam?.minimumPassingPercentage ||
      progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    questionCount: state.exam?.questionCount || progressionConfig.EXAM_QUESTION_COUNT,
    timeLimitMinutes: state.exam?.timeLimitMinutes || progressionConfig.EXAM_TIME_LIMIT_MINUTES,
    attemptsCount: state.exam?.attemptsCount || 0,
    lastAttempt: state.exam?.lastAttempt
      ? {
          attemptNumber: state.exam.lastAttempt.attemptNumber,
          score: state.exam.lastAttempt.score,
          passed: state.exam.lastAttempt.passed,
          evaluatedAt: state.exam.lastAttempt.evaluatedAt,
        }
      : null,
    activeExam: state.exam?.activeExam || null,
  }

  const certSection = {
    state: state.certification?.state || 'locked',
    certificateId: state.certification?.certificateId || null,
    issuedAt: state.certification?.issuedAt || null,
    linkedToResume: Boolean(state.certification?.linkedToResume),
    certificate: state.certification?.certificate
      ? serializeCertificateSummary(state.certification.certificate)
      : null,
    recoverableError: state.certification?.recoverableError || null,
  }

  const stagesSummary =
    state.stagesSummary ||
    deriveStagesSummary({
      workflowEnabled: true,
      stageStatus: state.status,
      learningVerifiedAt: state.learning?.learningVerifiedAt,
      completed: state.taskCompleted,
      examAttemptsCount: state.exam?.attemptsCount,
      certificationLastError: state.certification?.recoverableError,
      certificateId: state.certification?.certificateId,
    })

  return {
    taskId: state.taskId,
    title: state.title,
    workflowEnabled: Boolean(state.workflowEnabled),
    stage: state.stage,
    status: state.status,
    stages: {
      learning: learningSection,
      exam: examSection,
      certification: certSection,
    },
    // Top-level aliases for convenient access
    learning: learningSection,
    exam: examSection,
    certification: certSection,
    stagesSummary,
    taskCompleted: Boolean(state.taskCompleted),
    completedAt: state.completedAt || null,
  }
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

  return {
    examId: examData.examId,
    taskId: examData.taskId,
    topic: examData.topic,
    difficulty: examData.difficulty,
    passingPercentage:
      examData.passingPercentage ||
      examData.minimumPassingPercentage ||
      progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    minimumPassingPercentage:
      examData.minimumPassingPercentage ||
      examData.passingPercentage ||
      progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    questionCount: examData.questionCount || progressionConfig.EXAM_QUESTION_COUNT,
    timeLimitMinutes: examData.timeLimitMinutes || progressionConfig.EXAM_TIME_LIMIT_MINUTES,
    startedAt: examData.startedAt,
    expiresAt: examData.expiresAt,
    serverNow: new Date().toISOString(),
    remainingSeconds,
    resumed: Boolean(examData.resumed),
    questions: Array.isArray(examData.questions)
      ? examData.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options,
        }))
      : [],
  }
}

/**
 * Serializes exam grading result.
 * Passed: includes explanations.
 * Failed: isCorrect only, NO explanations, NO correct answers.
 */
function serializeExamResult(evalResult) {
  if (!evalResult) return null
  const passed = Boolean(evalResult.passed)

  return {
    score: evalResult.score,
    passed,
    minimumPassingPercentage:
      evalResult.minimumPassingPercentage || progressionConfig.MINIMUM_PASSING_PERCENTAGE,
    attemptNumber: evalResult.attemptNumber,
    correctCount: evalResult.correctCount,
    totalCount: evalResult.totalCount,
    nextStage: evalResult.nextStage,
    questions: Array.isArray(evalResult.questions)
      ? evalResult.questions.map((q) => ({
          questionId: q.questionId,
          selectedIndex: q.selectedIndex,
          isCorrect: q.isCorrect,
          ...(passed && q.explanation !== undefined ? { explanation: q.explanation } : {}),
        }))
      : [],
  }
}

module.exports = {
  deriveStagesSummary,
  serializeTaskResponse,
  serializeCertificateSummary,
  serializeProgression,
  serializeExamDelivery,
  serializeExamResult,
}
