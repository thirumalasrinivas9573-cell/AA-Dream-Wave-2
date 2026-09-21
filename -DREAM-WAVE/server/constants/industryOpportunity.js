/** Lasya V4 Prompt 8 — Industry Opportunity Intelligence + Campus-Industry Marketplace */

const OPPORTUNITY_QUALITY_LEVELS = ['COMPLETE', 'GOOD', 'PARTIAL', 'INCOMPLETE']

const DEADLINE_STATES = ['SAFE', 'APPROACHING', 'URGENT', 'CLOSED', 'UNKNOWN']

const MARKETPLACE_TYPE_TABS = [
  'all',
  'job',
  'internship',
  'research',
  'project',
  'training',
  'event',
  'hackathon',
  'scholarship',
  'program',
]

const TYPE_MAP = {
  job: ['job', 'full_time'],
  internship: ['internship', 'apprenticeship'],
  research: ['research', 'research_opportunity', 'fellowship'],
  project: ['project', 'industry_project', 'sponsored_project'],
  training: ['training', 'workshop', 'bootcamp'],
  event: ['event', 'campus_drive'],
  hackathon: ['hackathon'],
  scholarship: ['scholarship', 'graduate_program'],
  program: ['program', 'graduate_program'],
}

const MARKETPLACE_AI_INTENTS = [
  'WHY_THIS_MATTERS',
  'WHY_YOU_MATCH',
  'WHAT_IS_MISSING',
  'WHAT_TO_DO_NEXT',
  'OPPORTUNITY_COMPARISON',
  'INSTITUTION_RELEVANCE',
]

const PUBLISH_READINESS = ['READY', 'NEEDS_REVIEW', 'INCOMPLETE']

module.exports = {
  OPPORTUNITY_QUALITY_LEVELS,
  DEADLINE_STATES,
  MARKETPLACE_TYPE_TABS,
  TYPE_MAP,
  MARKETPLACE_AI_INTENTS,
  PUBLISH_READINESS,
}
