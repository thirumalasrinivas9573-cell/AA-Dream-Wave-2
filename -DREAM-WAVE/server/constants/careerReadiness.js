/**
 * Lasya V5 Prompt 7 — Career Simulator + Interview Intelligence + Job Readiness
 */

const INTERVIEW_MODES = [
  'TECHNICAL',
  'BEHAVIORAL',
  'HR',
  'PROJECT',
  'SYSTEM_DESIGN',
  'ROLE_SPECIFIC',
  'MIXED',
  'CODING',
]

const SESSION_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']

const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

const GAP_LEVELS = ['STRONG', 'PARTIAL', 'MISSING', 'UNKNOWN']

const READINESS_DIMENSIONS = [
  'SKILL_READINESS',
  'PROJECT_READINESS',
  'PORTFOLIO_READINESS',
  'LEARNING_READINESS',
  'INTERVIEW_READINESS',
  'COMMUNICATION_PRACTICE',
  'APPLICATION_READINESS',
]

const QUESTION_SOURCES = ['GENERATED', 'USER_CREATED', 'VERIFIED_SOURCE', 'INTERNAL_BANK']

const EVAL_DIMENSIONS = [
  'TECHNICAL_ACCURACY',
  'RELEVANCE',
  'COMPLETENESS',
  'CLARITY',
  'STRUCTURE',
  'EVIDENCE',
]

const APPLICATION_READINESS = ['READY', 'NEEDS_IMPROVEMENT', 'INSUFFICIENT_DATA']

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /expose\s+private/i,
  /impersonate/i,
  /submit\s+application/i,
  /guarantee\s+(job|hire|selection)/i,
]

const BEHAVIORAL_QUESTIONS = [
  'Tell me about a challenging project and how you handled it.',
  'Describe a time you learned a new skill quickly under pressure.',
  'How do you handle conflicting priorities on a team?',
  'Tell me about a mistake you made and what you learned.',
]

const TECHNICAL_TOPICS = {
  'software engineer': ['Data structures', 'APIs', 'Debugging', 'System basics'],
  'ai engineer': ['Python', 'ML fundamentals', 'APIs', 'Model deployment', 'Data pipelines'],
  'data scientist': ['Statistics', 'Python', 'SQL', 'Model evaluation'],
  default: ['Problem solving', 'Core programming', 'Communication of technical ideas'],
}

module.exports = {
  INTERVIEW_MODES,
  SESSION_STATUSES,
  DIFFICULTY_LEVELS,
  GAP_LEVELS,
  READINESS_DIMENSIONS,
  QUESTION_SOURCES,
  EVAL_DIMENSIONS,
  APPLICATION_READINESS,
  INJECTION_PATTERNS,
  BEHAVIORAL_QUESTIONS,
  TECHNICAL_TOPICS,
}
