/**
 * Lasya V5 Prompt 5 — Adaptive Learning Intelligence + Study Coach + Skill Mastery
 */

const MASTERY_STATES = [
  'NOT_STARTED',
  'EXPLORING',
  'LEARNING',
  'PRACTICING',
  'ASSESSED',
  'DEMONSTRATED',
  'MASTERED',
]

const EVIDENCE_TYPES = [
  'RESOURCE_OPENED',
  'RESOURCE_COMPLETED',
  'PRACTICE',
  'QUIZ',
  'ASSESSMENT',
  'PROJECT',
  'CERTIFICATE',
  'MODULE_COMPLETED',
  'DEMONSTRATED_TASK',
]

/** Evidence → minimum mastery state (conservative; opening alone never masters) */
const EVIDENCE_TO_STATE = {
  RESOURCE_OPENED: 'EXPLORING',
  RESOURCE_COMPLETED: 'LEARNING',
  PRACTICE: 'PRACTICING',
  QUIZ: 'ASSESSED',
  ASSESSMENT: 'ASSESSED',
  PROJECT: 'DEMONSTRATED',
  CERTIFICATE: 'DEMONSTRATED',
  MODULE_COMPLETED: 'LEARNING',
  DEMONSTRATED_TASK: 'DEMONSTRATED',
}

/** States requiring multiple strong evidence for MASTERED */
const MASTERED_MIN_STRONG_EVIDENCE = 2
const STRONG_EVIDENCE_TYPES = ['QUIZ', 'ASSESSMENT', 'PROJECT', 'CERTIFICATE', 'DEMONSTRATED_TASK']

const TEACHING_MODES = [
  'EXPLAIN',
  'STEP_BY_STEP',
  'EXAMPLE',
  'PRACTICE',
  'QUIZ',
  'PROJECT',
  'REVISION',
  'SOCRATIC',
]

const LEARNING_FORMATS = ['VIDEO', 'READING', 'PRACTICE', 'PROJECT', 'QUIZ', 'MIXED']

const SESSION_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED']

const PLAN_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']

const RESOURCE_TYPES = ['BOOK', 'PDF', 'COURSE', 'VIDEO', 'ARTICLE', 'DOCUMENT', 'PROJECT', 'EXERCISE', 'QUIZ', 'TUTORIAL']

const QUIZ_TYPES = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'CODING', 'SCENARIO']

const LEARNING_EVENTS = [
  'RESOURCE_COMPLETED',
  'QUIZ_COMPLETED',
  'PRACTICE_COMPLETED',
  'PROJECT_COMPLETED',
  'GOAL_CHANGED',
  'NEW_TARGET_OPPORTUNITY',
  'PLAN_UPDATED',
  'SESSION_COMPLETED',
]

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /expose\s+private/i,
  /modify\s+(academic|grades|permissions)/i,
  /pretend\s+to\s+be/i,
]

/** Canonical skill prerequisites — only used when career dataset lacks detail */
const SKILL_PREREQUISITES = {
  'machine learning': ['python', 'statistics', 'linear algebra'],
  'deep learning': ['python', 'machine learning', 'linear algebra', 'probability'],
  'ai engineering': ['python', 'machine learning', 'data structures', 'algorithms'],
  'data structures': ['programming'],
  algorithms: ['programming', 'data structures'],
  'system design': ['programming', 'data structures'],
  sql: ['programming'],
  'rest apis': ['programming', 'http'],
  'node.js': ['javascript', 'programming'],
  react: ['javascript', 'html', 'css'],
}

const STATE_RANK = Object.fromEntries(MASTERY_STATES.map((s, i) => [s, i]))

module.exports = {
  MASTERY_STATES,
  EVIDENCE_TYPES,
  EVIDENCE_TO_STATE,
  MASTERED_MIN_STRONG_EVIDENCE,
  STRONG_EVIDENCE_TYPES,
  TEACHING_MODES,
  LEARNING_FORMATS,
  SESSION_STATUSES,
  PLAN_STATUSES,
  RESOURCE_TYPES,
  QUIZ_TYPES,
  LEARNING_EVENTS,
  INJECTION_PATTERNS,
  SKILL_PREREQUISITES,
  STATE_RANK,
}
