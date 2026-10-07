const MINIMUM_PASSING_PERCENTAGE = Number(process.env.EXAM_PASS_PERCENT) || 80
const EXAM_QUESTION_COUNT = Number(process.env.EXAM_QUESTION_COUNT) || 10
const EXAM_TIME_LIMIT_MINUTES = Number(process.env.EXAM_TIME_LIMIT_MIN) || 20
const MIN_FOCUS_MINUTES_RATIO = Number(process.env.MIN_FOCUS_MINUTES_RATIO) || 0.5
const RETAKE_MIN_NEW_FOCUS_MINUTES = Number(process.env.RETAKE_MIN_NEW_FOCUS_MINUTES) || 10
const ENGAGEMENT_MIN_FOCUS_MINUTES = Number(process.env.ENGAGEMENT_MIN_FOCUS_MINUTES) || 5
const MIN_REQUIRED_FOCUS_MINUTES = Number(process.env.MIN_REQUIRED_FOCUS_MINUTES) || 10
const MAX_COUNTED_SESSION_MINUTES = Number(process.env.MAX_COUNTED_SESSION_MINUTES) || 120
const MIN_COUNTED_SESSION_SECONDS = Number(process.env.MIN_COUNTED_SESSION_SECONDS) || 60
const CERTIFICATE_ISSUER = process.env.CERTIFICATE_ISSUER || 'Dream Wave AI'
const ALLOW_FALLBACK_EXAM = process.env.ALLOW_FALLBACK_EXAM === 'true' && process.env.NODE_ENV !== 'production'

const STAGES = ['learning', 'exam', 'certification', 'completed']

const STAGE_STATUSES = [
  'learning_active',
  'learning_completed',
  'exam_locked',
  'exam_active',
  'exam_failed',
  'exam_passed',
  'certification_locked',
  'certification_completed',
  'task_completed',
]

/**
 * SECURITY NOTE:
 * These fields represent internal workflow state and server-managed metrics.
 * validateTaskInput in taskController must strip these fields in a later step
 * to prevent client mass-assignment / bypass attacks.
 */
const PROTECTED_TASK_FIELDS = [
  'workflowEnabled',
  'workflowEnabledAt',
  'learningSnapshot',
  'progressionStage',
  'stageStatus',
  'learningVerifiedAt',
  'examId',
  'examAttemptsCount',
  'certificateId',
  'resumeLinkedAt',
  'certificationLastError',
  'actualMinutes',
]

function shouldAutoEnableWorkflow(taskInput = {}) {
  const auto = process.env.AUTO_ENABLE_WORKFLOW === 'true'
  if (!auto) return false
  return Boolean(taskInput.roadmapId || taskInput.goalId)
}

module.exports = {
  MINIMUM_PASSING_PERCENTAGE,
  EXAM_QUESTION_COUNT,
  EXAM_TIME_LIMIT_MINUTES,
  MIN_FOCUS_MINUTES_RATIO,
  RETAKE_MIN_NEW_FOCUS_MINUTES,
  ENGAGEMENT_MIN_FOCUS_MINUTES,
  MIN_REQUIRED_FOCUS_MINUTES,
  MAX_COUNTED_SESSION_MINUTES,
  get MIN_COUNTED_SESSION_SECONDS() {
    return Number(process.env.MIN_COUNTED_SESSION_SECONDS) || 60
  },
  CERTIFICATE_ISSUER,
  get ALLOW_FALLBACK_EXAM() {
    return process.env.ALLOW_FALLBACK_EXAM === 'true' && process.env.NODE_ENV !== 'production'
  },
  get AUTO_ENABLE_WORKFLOW() {
    return process.env.AUTO_ENABLE_WORKFLOW === 'true'
  },
  shouldAutoEnableWorkflow,
  STAGES,
  STAGE_STATUSES,
  PROTECTED_TASK_FIELDS,
}
