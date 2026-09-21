/** Institution + Company program operations — Lasya V3 Prompt 10 */

const PROGRAM_TYPES = [
  'INDUSTRY_WORKSHOP',
  'SKILL_PROGRAM',
  'MENTORSHIP',
  'INDUSTRY_PROJECT',
  'CAMPUS_HIRING',
  'INTERNSHIP_PROGRAM',
  'PRE_PLACEMENT',
  'GUEST_SESSION',
  'RESEARCH_PROGRAM',
  'COMPANY_CHALLENGE',
  'BOOTCAMP',
]

const PROGRAM_STATUSES = [
  'draft',
  'planned',
  'registration_open',
  'active',
  'paused',
  'completed',
  'cancelled',
]

const VALID_PROGRAM_TRANSITIONS = {
  draft: ['planned', 'cancelled'],
  planned: ['registration_open', 'cancelled'],
  registration_open: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
}

const PARTICIPANT_STATUSES = [
  'registered',
  'approved',
  'active',
  'completed',
  'dropped',
  'rejected',
]

const VALID_PARTICIPANT_TRANSITIONS = {
  registered: ['approved', 'rejected'],
  approved: ['active', 'dropped'],
  active: ['completed', 'dropped'],
  completed: [],
  dropped: [],
  rejected: [],
}

const PROGRAM_LINK_TYPES = [
  'drive',
  'job',
  'internship',
  'event',
  'innovation_event',
  'alumni_event',
  'research_opportunity',
  'research_project',
]

const PROGRAM_ACTIVITY_TYPES = [
  'program_created',
  'program_updated',
  'program_status_changed',
  'program_registration_opened',
  'program_completed',
  'program_cancelled',
  'participant_registered',
  'participant_approved',
  'participant_rejected',
  'participant_completed',
  'entity_linked',
  'entity_unlinked',
  'milestone_completed',
]

const PROGRAM_NOTIFICATION_TYPES = [
  'program_registration_received',
  'program_registration_approved',
  'program_registration_rejected',
  'program_starting',
  'program_milestone_due',
  'program_completed',
  'program_cancelled',
]

const DEFAULT_MILESTONES = [
  { key: 'orientation', title: 'Orientation', order: 1 },
  { key: 'training', title: 'Training', order: 2 },
  { key: 'assignment', title: 'Assignment', order: 3 },
  { key: 'project', title: 'Project', order: 4 },
  { key: 'assessment', title: 'Assessment', order: 5 },
  { key: 'completion', title: 'Completion', order: 6 },
]

module.exports = {
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  VALID_PROGRAM_TRANSITIONS,
  PARTICIPANT_STATUSES,
  VALID_PARTICIPANT_TRANSITIONS,
  PROGRAM_LINK_TYPES,
  PROGRAM_ACTIVITY_TYPES,
  PROGRAM_NOTIFICATION_TYPES,
  DEFAULT_MILESTONES,
}
