/** Institution Research, Innovation & Startup Ecosystem — LASYA V2 Prompt 7 */

const RESEARCH_CATEGORIES = [
  'fundamental',
  'applied',
  'interdisciplinary',
  'industry_collaboration',
  'social_impact',
  'technology_transfer',
]

const RESEARCH_DOMAINS = [
  'computer_science',
  'engineering',
  'life_sciences',
  'physical_sciences',
  'humanities',
  'business',
  'healthcare',
  'agriculture',
  'environment',
  'other',
]

const RESEARCH_PROJECT_STATUSES = [
  'proposed',
  'approved',
  'active',
  'on_hold',
  'completed',
  'archived',
]

const RESEARCH_MEMBER_TYPES = ['faculty', 'student', 'external', 'industry_expert']
const RESEARCH_MEMBER_ROLES = [
  'principal_investigator',
  'co_investigator',
  'faculty_mentor',
  'student_researcher',
  'research_assistant',
  'industry_advisor',
  'collaborator',
]

const PUBLICATION_TYPES = ['journal', 'conference', 'patent', 'book_chapter', 'technical_report', 'thesis']
const OUTCOME_TYPES = ['publication', 'patent', 'prototype', 'dataset', 'software', 'policy_brief', 'startup_spinoff']

const RESEARCH_OPPORTUNITY_TYPES = [
  'research_assistant',
  'innovation_challenge',
  'sponsored_project',
  'thesis_opportunity',
  'open_research_problem',
  'collaborative_program',
]

const RESEARCH_OPPORTUNITY_STATUSES = ['draft', 'published', 'closed', 'archived']

const OPPORTUNITY_APPLICATION_STATUSES = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn']

const IDEA_TYPES = [
  'startup_idea',
  'research_concept',
  'product_innovation',
  'social_impact',
  'technology_proposal',
]

const IDEA_REVIEW_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'incubating', 'archived']

const RESEARCH_AUDIT_ACTIONS = [
  'project_created',
  'project_updated',
  'project_status_changed',
  'member_added',
  'member_removed',
  'publication_added',
  'opportunity_published',
  'application_received',
  'application_reviewed',
  'idea_submitted',
  'idea_reviewed',
]

const VALID_PROJECT_TRANSITIONS = {
  proposed: ['approved', 'archived'],
  approved: ['active', 'archived'],
  active: ['on_hold', 'completed', 'archived'],
  on_hold: ['active', 'archived'],
  completed: ['archived'],
  archived: [],
}

function assertProjectTransition(from, to) {
  const allowed = VALID_PROJECT_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    const err = new Error(`Invalid project transition from ${from} to ${to}`)
    err.statusCode = 400
    throw err
  }
}

const INNOVATION_REPORT_TYPES = [
  'research_project',
  'publication',
  'startup_progress',
  'incubation',
  'mentor_activity',
  'funding',
  'innovation_ideas',
  'event_participation',
  'collaboration',
]

const INNOVATION_AUDIT_ACTIONS = [
  'research_project_created',
  'research_project_updated',
  'idea_submitted',
  'mentor_assigned',
  'funding_approved',
  'startup_registered',
  'incubation_stage_updated',
  'event_created',
  'report_generated',
  'report_exported',
  'permission_modified',
]

module.exports = {
  RESEARCH_CATEGORIES,
  RESEARCH_DOMAINS,
  RESEARCH_PROJECT_STATUSES,
  RESEARCH_MEMBER_TYPES,
  RESEARCH_MEMBER_ROLES,
  PUBLICATION_TYPES,
  OUTCOME_TYPES,
  RESEARCH_OPPORTUNITY_TYPES,
  RESEARCH_OPPORTUNITY_STATUSES,
  OPPORTUNITY_APPLICATION_STATUSES,
  IDEA_TYPES,
  IDEA_REVIEW_STATUSES,
  RESEARCH_AUDIT_ACTIONS,
  INNOVATION_REPORT_TYPES,
  INNOVATION_AUDIT_ACTIONS,
  VALID_PROJECT_TRANSITIONS,
  assertProjectTransition,
}
