/** Lasya V4 Prompt 4 — Ecosystem Automation + Collaboration Workflow + Intelligent Operations */

const WORKFLOW_STATUSES = [
  'DRAFT',
  'READY',
  'WAITING_APPROVAL',
  'APPROVED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
]

const WORKFLOW_TRIGGERS = [
  'NEW_OPPORTUNITY',
  'DEADLINE_APPROACHING',
  'APPLICATION_UPDATED',
  'INTERVIEW_SCHEDULED',
  'PARTNERSHIP_EXPIRING',
  'NEW_COMPANY_ACTIVITY',
  'NEW_RESEARCH_ACTIVITY',
  'PROJECT_MILESTONE',
  'EVENT_CREATED',
  'SKILL_GAP_DETECTED',
  'PLACEMENT_UPDATE',
  'MANUAL',
  'AI_PLANNER',
]

const APPROVAL_POLICIES = [
  'NO_APPROVAL',
  'USER_CONFIRMATION',
  'ROLE_APPROVAL',
  'ADMIN_APPROVAL',
  'MULTI_STEP_APPROVAL',
]

const ACTION_TYPES = [
  'CREATE_TASK',
  'SEND_NOTIFICATION',
  'PREPARE_EMAIL',
  'REQUEST_APPROVAL',
  'GENERATE_REPORT',
  'CREATE_REVIEW_TASK',
  'NOOP',
]

const WORKFLOW_TEMPLATES = {
  PLACEMENT_REMINDER: {
    id: 'PLACEMENT_REMINDER',
    name: 'Placement deadline reminder',
    trigger: 'DEADLINE_APPROACHING',
    approvalPolicy: 'NO_APPROVAL',
    actions: ['SEND_NOTIFICATION'],
  },
  INTERVIEW_REMINDER: {
    id: 'INTERVIEW_REMINDER',
    name: 'Interview reminder',
    trigger: 'INTERVIEW_SCHEDULED',
    approvalPolicy: 'NO_APPROVAL',
    actions: ['SEND_NOTIFICATION'],
  },
  OPPORTUNITY_DEADLINE: {
    id: 'OPPORTUNITY_DEADLINE',
    name: 'Opportunity deadline alert',
    trigger: 'DEADLINE_APPROACHING',
    approvalPolicy: 'USER_CONFIRMATION',
    actions: ['SEND_NOTIFICATION'],
  },
  PARTNERSHIP_REVIEW: {
    id: 'PARTNERSHIP_REVIEW',
    name: 'Partnership review task',
    trigger: 'PARTNERSHIP_EXPIRING',
    approvalPolicy: 'ROLE_APPROVAL',
    actions: ['CREATE_REVIEW_TASK', 'SEND_NOTIFICATION'],
  },
  PARTNERSHIP_EXPIRY: {
    id: 'PARTNERSHIP_EXPIRY',
    name: 'Partnership expiry review',
    trigger: 'PARTNERSHIP_EXPIRING',
    approvalPolicy: 'ROLE_APPROVAL',
    actions: ['CREATE_REVIEW_TASK', 'REQUEST_APPROVAL'],
  },
  EVENT_REMINDER: {
    id: 'EVENT_REMINDER',
    name: 'Event reminder',
    trigger: 'EVENT_CREATED',
    approvalPolicy: 'NO_APPROVAL',
    actions: ['SEND_NOTIFICATION'],
  },
  SKILL_GAP_REVIEW: {
    id: 'SKILL_GAP_REVIEW',
    name: 'Skill gap review',
    trigger: 'SKILL_GAP_DETECTED',
    approvalPolicy: 'USER_CONFIRMATION',
    actions: ['CREATE_REVIEW_TASK', 'SEND_NOTIFICATION'],
  },
  PROGRAM_ALIGNMENT_REVIEW: {
    id: 'PROGRAM_ALIGNMENT_REVIEW',
    name: 'Program alignment review',
    trigger: 'SKILL_GAP_DETECTED',
    approvalPolicy: 'ROLE_APPROVAL',
    actions: ['CREATE_REVIEW_TASK', 'GENERATE_REPORT'],
  },
  COMPANY_ENGAGEMENT_REVIEW: {
    id: 'COMPANY_ENGAGEMENT_REVIEW',
    name: 'Company engagement review',
    trigger: 'NEW_COMPANY_ACTIVITY',
    approvalPolicy: 'USER_CONFIRMATION',
    actions: ['CREATE_REVIEW_TASK'],
  },
  PROJECT_MILESTONE: {
    id: 'PROJECT_MILESTONE',
    name: 'Project milestone notification',
    trigger: 'PROJECT_MILESTONE',
    approvalPolicy: 'NO_APPROVAL',
    actions: ['SEND_NOTIFICATION'],
  },
}

const OPERATIONS_AI_INTENTS = [
  'DAILY_BRIEF',
  'PENDING_ACTIONS',
  'WHAT_CHANGED',
  'WORKFLOW_PLAN',
  'FAILED_WORKFLOWS',
]

const APPROVAL_EXPIRY_HOURS = 72

module.exports = {
  WORKFLOW_STATUSES,
  WORKFLOW_TRIGGERS,
  APPROVAL_POLICIES,
  ACTION_TYPES,
  WORKFLOW_TEMPLATES,
  OPERATIONS_AI_INTENTS,
  APPROVAL_EXPIRY_HOURS,
}
