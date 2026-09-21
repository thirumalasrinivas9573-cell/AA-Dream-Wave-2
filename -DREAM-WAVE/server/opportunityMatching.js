/** Unified opportunity matching — Lasya V3 Prompt 7 */

const UNIFIED_OPPORTUNITY_KINDS = [
  'event',
  'hackathon',
  'workshop',
  'competition',
  'job',
  'internship',
  'research',
  'career_event',
  'other',
]

const MATCH_LEVELS = {
  STRONG_MATCH: 'STRONG_MATCH',
  GOOD_MATCH: 'GOOD_MATCH',
  POTENTIAL_MATCH: 'POTENTIAL_MATCH',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
}

const MATCH_STATUS = {
  MATCHED: 'MATCHED',
  NOT_MATCHED: 'NOT_MATCHED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  ALREADY_APPLIED: 'ALREADY_APPLIED',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  REGISTRATION_FULL: 'REGISTRATION_FULL',
}

const SIGNAL_TYPES = [
  'SKILL_MATCH',
  'GOAL_MATCH',
  'PROJECT_MATCH',
  'LEARNING_MATCH',
  'RESEARCH_MATCH',
  'ELIGIBILITY_MATCH',
  'LOCATION_MATCH',
  'TIMING_MATCH',
  'CAREER_MATCH',
]

const OPPORTUNITY_AI_INTENTS = [
  'OPPORTUNITY_DISCOVERY',
  'OPPORTUNITY_MATCH',
  'OPPORTUNITY_EXPLANATION',
  'OPPORTUNITY_ELIGIBILITY',
  'OPPORTUNITY_PREPARATION',
  'OPPORTUNITY_DEADLINE',
  'OPPORTUNITY_COMPARISON',
]

const FEEDBACK_ACTIONS = ['interested', 'not_interested', 'save', 'dismiss', 'applied', 'viewed']

/** Documented rank weights — composite rank is for sorting only, not shown as a percentage match */
const RANK_WEIGHTS = {
  eligibility: 40,
  skillCoverage: 30,
  softSignals: 20,
  deadlineUrgency: 10,
}

module.exports = {
  UNIFIED_OPPORTUNITY_KINDS,
  MATCH_LEVELS,
  MATCH_STATUS,
  SIGNAL_TYPES,
  OPPORTUNITY_AI_INTENTS,
  FEEDBACK_ACTIONS,
  RANK_WEIGHTS,
}
