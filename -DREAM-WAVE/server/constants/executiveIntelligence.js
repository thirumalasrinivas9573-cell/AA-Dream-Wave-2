/**
 * Lasya V4 Prompt 10 — Ecosystem Analytics + Executive Intelligence + Decision Support
 * Central metric registry and decision-support constants.
 */
const { METRIC_DEFINITIONS, FUNNEL_DEFINITION, MIN_TREND_POINTS } = require('./businessIntelligence')
const { EXECUTIVE_REPORT_TYPES } = require('./institutionCommandCenter')

const METRIC_CATEGORIES = [
  'STUDENT',
  'PROGRAM',
  'INSTITUTION',
  'COMPANY',
  'OPPORTUNITY',
  'RECRUITMENT',
  'PLACEMENT',
  'PARTNERSHIP',
  'PROJECT',
  'RESEARCH',
  'EVENT',
  'SKILL',
  'CAREER',
]

const TREND_CLASSIFICATIONS = ['INCREASING', 'DECREASING', 'STABLE', 'VOLATILE', 'INSUFFICIENT_DATA']

const PARTNERSHIP_HEALTH_STATES = [
  'ACTIVE',
  'ACTIVE_LOW_ACTIVITY',
  'EXPIRING',
  'EXPIRED',
  'INSUFFICIENT_DATA',
]

const SKILL_GAP_CLASSIFICATIONS = ['ALIGNED', 'POTENTIAL_GAP', 'INSUFFICIENT_DATA']

const DECISION_SUPPORT_INTENTS = [
  'WHAT_NEEDS_ATTENTION',
  'PROGRAM_OPPORTUNITY_GAPS',
  'PARTNERSHIPS_NEED_REVIEW',
  'TOP_SKILLS',
  'PLACEMENT_BOTTLENECKS',
  'WHAT_CHANGED',
  'EXECUTIVE_OVERVIEW',
  'SKILL_DEMAND',
  'PARTNERSHIP_HEALTH',
  'DATA_QUALITY',
]

const INSIGHT_CONTRACT = ['title', 'whatChanged', 'whyItMatters', 'dataBasis', 'recommendedNextStep', 'limitation']

const EXTENDED_METRIC_REGISTRY = {
  ...METRIC_DEFINITIONS,
  activePrograms: {
    category: 'PROGRAM',
    source: 'InstitutionProgram',
    definition: 'Count of active program records for the institution.',
    scope: 'institution',
  },
  openOpportunities: {
    category: 'OPPORTUNITY',
    source: 'CampusOpportunity',
    definition: 'Published campus opportunities with status published.',
    scope: 'institution',
  },
  activePartnerships: {
    category: 'PARTNERSHIP',
    source: 'InstitutionCompanyPartnership',
    definition: 'Partnerships with status active.',
    scope: 'institution',
  },
  applicationsSubmitted: {
    category: 'PLACEMENT',
    source: 'RecruitmentApplication',
    definition: 'Unique application records within scope and period.',
    scope: 'institution',
  },
  interviewsScheduled: {
    category: 'RECRUITMENT',
    source: 'RecruitmentInterview',
    definition: 'Interview records within scope and period.',
    scope: 'institution',
  },
  skillDemandCount: {
    category: 'SKILL',
    source: 'CampusOpportunity.requiredSkills + RecruitmentJob.requiredSkills',
    definition: 'Frequency of skill mentions in opportunity requirements.',
    scope: 'institution',
  },
}

const REPORT_TYPES = EXECUTIVE_REPORT_TYPES

module.exports = {
  METRIC_CATEGORIES,
  TREND_CLASSIFICATIONS,
  PARTNERSHIP_HEALTH_STATES,
  SKILL_GAP_CLASSIFICATIONS,
  DECISION_SUPPORT_INTENTS,
  INSIGHT_CONTRACT,
  EXTENDED_METRIC_REGISTRY,
  REPORT_TYPES,
  FUNNEL_DEFINITION,
  MIN_TREND_POINTS,
}
