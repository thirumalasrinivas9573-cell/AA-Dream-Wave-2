/** Institution Placement & Campus Recruitment constants */

const OPPORTUNITY_TYPES = [
  'full_time',
  'internship',
  'apprenticeship',
  'graduate_program',
  'fellowship',
  'hackathon',
  'sponsored_project',
  'training',
  'campus_drive',
]

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'temporary']

const WORK_MODES = ['remote', 'hybrid', 'office', 'online', 'offline']

const OPPORTUNITY_STATUSES = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'open',
  'upcoming',
  'ongoing',
  'completed',
  'closed',
  'cancelled',
  'archived',
]

/** Valid drive lifecycle actions */
const DRIVE_ACTIONS = ['publish', 'cancel', 'close', 'archive', 'open_registration', 'close_registration', 'start', 'complete']

/** Drive status transitions via action */
const DRIVE_ACTION_TO_STATUS = {
  publish: 'published',
  open_registration: 'registration_open',
  close_registration: 'registration_closed',
  start: 'ongoing',
  complete: 'completed',
  close: 'closed',
  cancel: 'cancelled',
  archive: 'archived',
}

/** Default configurable recruitment workflow stages for campus drives */
const DEFAULT_DRIVE_WORKFLOW = [
  { key: 'registration_open', label: 'Registration Open', order: 1 },
  { key: 'registration_closed', label: 'Registration Closed', order: 2 },
  { key: 'eligibility_verification', label: 'Eligibility Verification', order: 3 },
  { key: 'resume_screening', label: 'Resume Screening', order: 4 },
  { key: 'online_assessment', label: 'Online Assessment', order: 5 },
  { key: 'technical_interview', label: 'Technical Interview', order: 6 },
  { key: 'hr_interview', label: 'HR Interview', order: 7 },
  { key: 'final_selection', label: 'Final Selection', order: 8 },
  { key: 'offer_released', label: 'Offer Released', order: 9 },
  { key: 'joining_confirmation', label: 'Joining Confirmation', order: 10 },
]

/** Student placement tracking statuses (historical) */
const PLACEMENT_TRACKING_STATUSES = [
  'not_applied',
  'applied',
  'shortlisted',
  'interview_scheduled',
  'selected',
  'offer_received',
  'offer_accepted',
  'joined',
  'declined',
]

const PLACEMENT_NOTIFICATION_TEMPLATES = [
  'opportunity_published',
  'registration_deadline_reminder',
  'interview_scheduled',
  'interview_rescheduled',
  'results_published',
  'offer_released',
  'offer_accepted',
]

const PLACEMENT_REPORT_TYPES = [
  'placement_summary',
  'company_hiring',
  'student_placement',
  'internship',
  'offer_acceptance',
  'campus_drive',
  'recruitment_timeline',
  'department_placement',
  'batch_placement',
]

const ELIGIBILITY_DISPLAY_STATUSES = [
  'eligible',
  'conditionally_eligible',
  'not_eligible',
  'application_submitted',
  'under_review',
  'shortlisted',
  'rejected',
  'offer_received',
  'joined',
]

const POOL_PRESETS = [
  { key: 'placement_ready', label: 'Placement Ready', filterConfig: { placementLifecycle: 'READY' } },
  { key: 'internship_eligible', label: 'Internship Eligible', filterConfig: { placementLifecycle: 'ELIGIBLE' } },
  { key: 'high_cgpa', label: 'High CGPA', filterConfig: { minCgpa: 8 } },
  { key: 'final_year', label: 'Final Year Students', filterConfig: { finalYear: true } },
  { key: 'ai_ml', label: 'AI/ML Students', filterConfig: { skill: 'AI' } },
  { key: 'software_dev', label: 'Software Development', filterConfig: { skill: 'React' } },
  { key: 'data_science', label: 'Data Science', filterConfig: { skill: 'Python' } },
  { key: 'cloud', label: 'Cloud Computing', filterConfig: { skill: 'AWS' } },
]

/** Map canonical application stage → institution eligibility display status */
const STAGE_TO_ELIGIBILITY_STATUS = {
  applied: 'application_submitted',
  screening: 'under_review',
  under_review: 'under_review',
  shortlisted: 'shortlisted',
  assessment: 'under_review',
  assessment_passed: 'under_review',
  interview: 'under_review',
  final_interview: 'under_review',
  selected: 'shortlisted',
  offer_released: 'offer_received',
  offer_accepted: 'offer_received',
  hired: 'joined',
  rejected: 'rejected',
  withdrawn: 'not_eligible',
  offer_declined: 'rejected',
}

/** Map ATS stage → placement tracking status */
const STAGE_TO_PLACEMENT_TRACKING = {
  applied: 'applied',
  screening: 'applied',
  under_review: 'applied',
  shortlisted: 'shortlisted',
  assessment: 'shortlisted',
  assessment_passed: 'shortlisted',
  interview: 'interview_scheduled',
  final_interview: 'interview_scheduled',
  selected: 'selected',
  offer_released: 'offer_received',
  offer_accepted: 'offer_accepted',
  offer_declined: 'declined',
  hired: 'joined',
  rejected: 'declined',
  withdrawn: 'declined',
}

module.exports = {
  OPPORTUNITY_TYPES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  OPPORTUNITY_STATUSES,
  DRIVE_ACTIONS,
  DRIVE_ACTION_TO_STATUS,
  DEFAULT_DRIVE_WORKFLOW,
  PLACEMENT_TRACKING_STATUSES,
  PLACEMENT_NOTIFICATION_TEMPLATES,
  PLACEMENT_REPORT_TYPES,
  ELIGIBILITY_DISPLAY_STATUSES,
  POOL_PRESETS,
  STAGE_TO_ELIGIBILITY_STATUS,
  STAGE_TO_PLACEMENT_TRACKING,
}
