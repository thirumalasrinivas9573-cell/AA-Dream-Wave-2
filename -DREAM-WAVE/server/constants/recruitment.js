/** Canonical recruitment pipeline — LASYA V2 Prompt 3 */

const APPLICATION_STAGES = [
  'applied',
  'screening',
  'under_review',
  'shortlisted',
  'assessment',
  'assessment_passed',
  'interview',
  'final_interview',
  'selected',
  'offer_released',
  'offer_accepted',
  'offer_declined',
  'hired',
  'rejected',
  'withdrawn',
]

/** Legacy institution/company stage aliases → canonical */
const STAGE_ALIASES = {
  screen: 'screening',
  'hr-round': 'final_interview',
  'offer-accepted': 'offer_accepted',
  'offer-declined': 'offer_declined',
  offer: 'offer_released',
}

const TERMINAL_STAGES = new Set(['hired', 'rejected', 'withdrawn', 'offer_declined'])

const VALID_STAGE_TRANSITIONS = {
  applied: ['screening', 'under_review', 'rejected', 'withdrawn'],
  screening: ['under_review', 'shortlisted', 'rejected', 'withdrawn'],
  under_review: ['shortlisted', 'rejected', 'withdrawn'],
  shortlisted: ['assessment', 'interview', 'rejected', 'withdrawn'],
  assessment: ['assessment_passed', 'rejected', 'withdrawn'],
  assessment_passed: ['interview', 'shortlisted', 'rejected', 'withdrawn'],
  interview: ['final_interview', 'selected', 'rejected', 'withdrawn'],
  final_interview: ['selected', 'rejected', 'withdrawn'],
  selected: ['offer_released', 'rejected', 'withdrawn'],
  offer_released: ['offer_accepted', 'offer_declined', 'withdrawn'],
  offer_accepted: ['hired', 'withdrawn'],
  offer_declined: [],
  hired: [],
  rejected: [],
  withdrawn: [],
}

const RECRUITER_TAGS = [
  'Strong Candidate',
  'Needs Review',
  'High Priority',
  'Referral',
  'Campus Candidate',
  'Internship Conversion',
  'Future Opportunity',
]

const REJECTION_REASONS = [
  'Eligibility mismatch',
  'Role requirements',
  'Assessment result',
  'Interview result',
  'Position filled',
  'Application incomplete',
  'Other',
]

const INTERVIEW_ROUNDS = [
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'Manager Round',
  'HR Round',
  'Final Round',
  'Custom Round',
]

const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled']

const INTERVIEW_RECOMMENDATIONS = [
  'Strong Hire',
  'Hire',
  'Further Review',
  'No Hire',
]

const ASSESSMENT_TYPES = [
  'Coding Test',
  'Aptitude',
  'Technical Test',
  'Case Study',
  'Assignment',
  'Portfolio Review',
]

const ASSESSMENT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']

const OFFER_STATUSES = ['draft', 'approved', 'released', 'accepted', 'declined', 'expired', 'withdrawn']

const OFFER_ACTIONS = ['approve', 'send', 'withdraw', 'accept', 'decline']

const INTERVIEW_TYPES = ['online', 'onsite', 'phone', 'technical', 'hr', 'managerial', 'final_round']

const EVALUATION_CRITERIA = [
  'technicalSkills',
  'communication',
  'problemSolving',
  'leadership',
  'teamwork',
  'domainKnowledge',
]

const ONBOARDING_STATUSES = [
  'offer_accepted',
  'documents_pending',
  'background_verification',
  'onboarding_started',
  'joining_confirmed',
  'joined_successfully',
]

const NOTE_TYPES = [
  'internal',
  'screening',
  'interview',
  'hiring_manager',
]

const ACTIVITY_TYPES = [
  'application_submitted',
  'recruiter_assigned',
  'stage_changed',
  'note_added',
  'tag_added',
  'assessment_scheduled',
  'assessment_completed',
  'interview_scheduled',
  'interview_completed',
  'interview_rescheduled',
  'interview_cancelled',
  'feedback_submitted',
  'shortlisted',
  'rejected',
  'withdrawn',
  'offer_released',
  'offer_accepted',
  'offer_declined',
  'hired',
]

const FUNNEL_STAGE_GROUPS = {
  applicants: ['applied', 'screening', 'under_review'],
  reviewed: ['under_review', 'screening'],
  shortlisted: ['shortlisted'],
  assessed: ['assessment', 'assessment_passed'],
  interviewed: ['interview', 'final_interview'],
  selected: ['selected'],
  offered: ['offer_released', 'offer_accepted', 'offer_declined'],
  hired: ['hired'],
}

function normalizeStage(stage) {
  if (!stage) return 'applied'
  const lower = String(stage).toLowerCase().trim()
  return STAGE_ALIASES[lower] || lower
}

function assertStageTransition(current, next) {
  const from = normalizeStage(current)
  const to = normalizeStage(next)
  if (from === to) return to
  const allowed = VALID_STAGE_TRANSITIONS[from]
  if (!allowed || !allowed.includes(to)) {
    const err = new Error(`Invalid stage transition: ${from} → ${to}`)
    err.statusCode = 400
    throw err
  }
  return to
}

function isTerminalStage(stage) {
  return TERMINAL_STAGES.has(normalizeStage(stage))
}

module.exports = {
  APPLICATION_STAGES,
  STAGE_ALIASES,
  VALID_STAGE_TRANSITIONS,
  RECRUITER_TAGS,
  REJECTION_REASONS,
  INTERVIEW_ROUNDS,
  INTERVIEW_STATUSES,
  INTERVIEW_RECOMMENDATIONS,
  INTERVIEW_TYPES,
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
  OFFER_STATUSES,
  OFFER_ACTIONS,
  EVALUATION_CRITERIA,
  ONBOARDING_STATUSES,
  NOTE_TYPES,
  ACTIVITY_TYPES,
  FUNNEL_STAGE_GROUPS,
  normalizeStage,
  assertStageTransition,
  isTerminalStage,
}
