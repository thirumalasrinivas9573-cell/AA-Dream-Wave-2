/** Institution Incubation & Startup Ecosystem — LASYA V2 Prompt 7 */

const INCUBATION_STAGES = [
  'idea_evaluation',
  'pre_incubation',
  'incubation',
  'mentorship',
  'prototype_development',
  'product_validation',
  'investor_readiness',
  'graduation',
]

const STARTUP_CATEGORIES = [
  'technology',
  'healthcare',
  'fintech',
  'edtech',
  'agritech',
  'social_impact',
  'manufacturing',
  'consumer',
  'research_spinoff',
  'other',
]

const STARTUP_STAGES = ['idea', 'mvp', 'early_traction', 'growth', 'scale', 'graduated']
const STARTUP_STATUSES = ['draft', 'active', 'on_hold', 'graduated', 'archived']

const MENTOR_TYPES = ['faculty', 'industry', 'alumni', 'investor', 'entrepreneur', 'research_expert']
const MENTOR_STATUSES = ['active', 'inactive']

const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show']
const SESSION_TYPES = ['intro', 'progress_review', 'milestone_review', 'investor_prep', 'general']

const FUNDING_TYPES = [
  'seed_funding',
  'grant',
  'angel_investment',
  'venture_capital',
  'government_scheme',
  'institutional_funding',
  'research_grant',
]

const FUNDING_STATUSES = ['proposed', 'applied', 'approved', 'disbursed', 'rejected', 'closed']

const INVESTOR_TYPES = ['angel', 'venture_capital', 'investment_firm', 'angel_network', 'government', 'institutional']
const INVESTOR_STATUSES = ['active', 'inactive']

const INNOVATION_EVENT_TYPES = [
  'hackathon',
  'innovation_challenge',
  'startup_competition',
  'demo_day',
  'pitch_event',
  'workshop',
  'seminar',
  'research_conference',
]

const EVENT_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled']

const COLLABORATION_TYPES = ['discussion', 'file', 'task', 'timeline']
const TASK_STATUSES = ['open', 'in_progress', 'done', 'cancelled']

const INCUBATION_ACTIONS = ['advance', 'hold', 'graduate', 'archive']

const VALID_INCUBATION_TRANSITIONS = {
  idea_evaluation: ['pre_incubation'],
  pre_incubation: ['incubation', 'idea_evaluation'],
  incubation: ['mentorship', 'prototype_development'],
  mentorship: ['prototype_development', 'product_validation'],
  prototype_development: ['product_validation'],
  product_validation: ['investor_readiness'],
  investor_readiness: ['graduation'],
  graduation: [],
}

function assertIncubationTransition(from, to) {
  const allowed = VALID_INCUBATION_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    const err = new Error(`Invalid incubation transition from ${from} to ${to}`)
    err.statusCode = 400
    throw err
  }
}

function normalizeStartupName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

module.exports = {
  INCUBATION_STAGES,
  STARTUP_CATEGORIES,
  STARTUP_STAGES,
  STARTUP_STATUSES,
  MENTOR_TYPES,
  MENTOR_STATUSES,
  SESSION_STATUSES,
  SESSION_TYPES,
  FUNDING_TYPES,
  FUNDING_STATUSES,
  INVESTOR_TYPES,
  INVESTOR_STATUSES,
  INNOVATION_EVENT_TYPES,
  EVENT_STATUSES,
  COLLABORATION_TYPES,
  TASK_STATUSES,
  INCUBATION_ACTIONS,
  VALID_INCUBATION_TRANSITIONS,
  assertIncubationTransition,
  normalizeStartupName,
}
