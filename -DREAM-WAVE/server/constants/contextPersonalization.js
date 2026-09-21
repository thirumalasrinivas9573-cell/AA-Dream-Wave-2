/**
 * Lasya V5 Prompt 2 — Context Intelligence + Agentic Personalization
 */

const CONTEXT_LAYERS = [
  'IDENTITY',
  'ROLE',
  'SESSION',
  'TASK',
  'CAREER',
  'LEARNING',
  'PROJECT',
  'OPPORTUNITY',
  'TEMPORARY',
  'MEMORY',
]

const CONTEXT_PRIORITIES = [
  'CURRENT_USER_INSTRUCTION',
  'SESSION',
  'TASK',
  'EXPLICIT_PREFERENCE',
  'AUTHORIZED_MEMORY',
  'CURRENT_GOAL',
  'RECENT_ACTIVITY',
  'GENERAL_PROFILE',
  'INFERRED',
]

const CONTEXT_EXPIRATION = {
  TEMPORARY: 60 * 60 * 1000,
  SESSION: 8 * 60 * 60 * 1000,
  SHORT_TERM: 7 * 24 * 60 * 60 * 1000,
  LONG_TERM: 90 * 24 * 60 * 60 * 1000,
  PERMANENT_ONLY_IF_EXPLICIT: null,
}

const CONTEXT_SOURCES = [
  'EXPLICIT_USER',
  'PROFILE',
  'MEMORY',
  'GOAL',
  'PROJECT',
  'LEARNING',
  'OPPORTUNITY',
  'ACTIVITY',
  'KNOWLEDGE_GRAPH',
  'SYSTEM_INFERENCE',
]

const FEEDBACK_TYPES = ['HELPFUL', 'NOT_HELPFUL', 'NOT_RELEVANT', 'DISMISS', 'SAVE']

const CONTEXT_BUDGET = {
  MAX_SIGNALS: 24,
  MAX_MEMORY_ITEMS: 6,
  MAX_OPPORTUNITIES: 5,
  MAX_RECOMMENDATIONS: 8,
  MAX_NEXT_ACTIONS: 3,
  MAX_EXPLANATION_BULLETS: 5,
}

const DASHBOARD_MODES = {
  student: {
    APPLYING: ['applications', 'deadlines', 'interviews', 'career_gaps', 'preparation'],
    LEARNING: ['learning', 'roadmap', 'tasks', 'projects'],
    EXPLORING: ['career', 'opportunities', 'learning', 'projects'],
    DEFAULT: ['career', 'opportunities', 'learning', 'tasks'],
  },
  institution: {
    DEFAULT: ['programs', 'students', 'industry', 'partnerships', 'analytics'],
    PLACEMENT: ['placements', 'opportunities', 'applications', 'interviews', 'funnel'],
  },
  company: {
    DEFAULT: ['recruitment', 'pipeline', 'talent', 'partnerships', 'analytics'],
  },
}

const RECOMMENDATION_CATEGORIES = [
  'career',
  'learning',
  'projects',
  'opportunities',
  'applications',
  'notifications',
]

const PROTECTED_INFERENCE_BLOCKLIST = [
  /race|ethnicity|religion|gender|sexual|political|health|disability/i,
]

module.exports = {
  CONTEXT_LAYERS,
  CONTEXT_PRIORITIES,
  CONTEXT_EXPIRATION,
  CONTEXT_SOURCES,
  FEEDBACK_TYPES,
  CONTEXT_BUDGET,
  DASHBOARD_MODES,
  RECOMMENDATION_CATEGORIES,
  PROTECTED_INFERENCE_BLOCKLIST,
}
