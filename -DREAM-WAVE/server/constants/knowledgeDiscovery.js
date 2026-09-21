/**
 * Lasya V5 Prompt 3 — Intelligent Knowledge Discovery + Semantic Search
 */

const SEARCH_INTENTS = [
  'LOOKUP',
  'RESEARCH',
  'LEARNING',
  'CAREER',
  'OPPORTUNITY',
  'COMPANY',
  'INSTITUTION',
  'PROJECT',
  'DOCUMENT',
  'GENERAL_KNOWLEDGE',
]

const RESULT_TYPES = [
  'DOCUMENT',
  'BOOK',
  'COURSE',
  'PROJECT',
  'COMPANY',
  'INSTITUTION',
  'OPPORTUNITY',
  'EVENT',
  'RESEARCH',
  'SKILL',
  'PROGRAM',
  'NAVIGATION',
  'COMMUNITY',
  'PERSONAL_RESOURCE',
]

const SOURCE_AUTHORITY = {
  INSTITUTION_OFFICIAL: 100,
  COMPANY_OFFICIAL: 95,
  CANONICAL_RECORD: 90,
  APPROVED_DOCUMENT: 85,
  VERIFIED_RESEARCH: 80,
  USER_MATERIAL: 60,
  GENERAL_CONTENT: 40,
}

const SEARCH_LIMITS = {
  MAX_RESULTS: 30,
  MAX_RAG_CHUNKS: 8,
  MAX_QUERY_LENGTH: 500,
  MAX_RECENT: 20,
  MAX_SAVED: 10,
  SEMANTIC_MIN_SCORE: 0.72,
  CACHE_TTL_MS: 5 * 60 * 1000,
}

const QUERY_SYNONYMS = {
  ml: ['machine learning', 'ai', 'artificial intelligence'],
  ai: ['artificial intelligence', 'machine learning'],
  intern: ['internship', 'trainee'],
  internship: ['intern', 'trainee'],
  deploy: ['deployment', 'serving', 'production'],
  python: ['programming language python'],
}

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /expose\s+private/i,
  /modify\s+permissions/i,
]

const FACT_LABELS = ['SOURCE_FACT', 'SYNTHESIS', 'INFERENCE', 'RECOMMENDATION']

module.exports = {
  SEARCH_INTENTS,
  RESULT_TYPES,
  SOURCE_AUTHORITY,
  SEARCH_LIMITS,
  QUERY_SYNONYMS,
  INJECTION_PATTERNS,
  FACT_LABELS,
}
