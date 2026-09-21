/**
 * Lasya V6 Prompt 1 — Goal Execution Engine + Intelligent Daily Planner
 */

const MILESTONE_TYPES = [
  'SKILL_MILESTONE',
  'PROJECT_MILESTONE',
  'LEARNING_MILESTONE',
  'PORTFOLIO_MILESTONE',
  'APPLICATION_MILESTONE',
  'INTERVIEW_MILESTONE',
]

const PLAN_STATUSES = ['DRAFT', 'PROPOSED', 'ACTIVE', 'ARCHIVED']

const TASK_PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']

const BLOCKER_TYPES = [
  'MISSING_PREREQUISITE',
  'SKILL_GAP',
  'MISSING_DOCUMENT',
  'APPLICATION_DEADLINE',
  'PROJECT_DEPENDENCY',
  'INTERVIEW_PREP_GAP',
  'OVERDUE_TASK',
]

const INJECTION_PATTERNS = [
  /ignore\s+(your|all)\s+rules/i,
  /bypass\s+authorization/i,
  /auto\s*apply/i,
  /submit\s+application/i,
  /modify\s+(permissions|records)/i,
  /delete\s+all/i,
]

const EFFORT_ESTIMATES = ['15 min', '30 min', '1 hour', '2 hours', 'ESTIMATE UNKNOWN']

module.exports = {
  MILESTONE_TYPES,
  PLAN_STATUSES,
  TASK_PRIORITIES,
  RISK_LEVELS,
  BLOCKER_TYPES,
  INJECTION_PATTERNS,
  EFFORT_ESTIMATES,
}
