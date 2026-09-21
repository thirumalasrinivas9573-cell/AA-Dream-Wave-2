/** Unified event & opportunity discovery — Lasya V3 Prompt 6 */

const EVENT_SOURCES = [
  'campus_opportunity',
  'innovation_event',
  'alumni_event',
  'research_opportunity',
]

/** Unified categories mapped from domain-specific types */
const UNIFIED_EVENT_CATEGORIES = [
  'event',
  'hackathon',
  'workshop',
  'conference',
  'webinar',
  'competition',
  'tech_meet',
  'career_event',
  'research_event',
  'college_event',
  'startup_event',
  'internship',
  'job',
  'other',
]

const CAMPUS_TYPE_TO_CATEGORY = {
  hackathon: 'hackathon',
  training: 'workshop',
  campus_drive: 'career_event',
  full_time: 'job',
  internship: 'internship',
  apprenticeship: 'career_event',
  graduate_program: 'career_event',
  fellowship: 'research_event',
  sponsored_project: 'research_event',
}

const INNOVATION_TYPE_TO_CATEGORY = {
  hackathon: 'hackathon',
  innovation_challenge: 'competition',
  startup_competition: 'competition',
  demo_day: 'startup_event',
  pitch_event: 'startup_event',
  workshop: 'workshop',
  seminar: 'conference',
  research_conference: 'research_event',
}

const ALUMNI_TYPE_TO_CATEGORY = {
  alumni_meet: 'college_event',
  annual_reunion: 'college_event',
  networking_session: 'tech_meet',
  career_talk: 'career_event',
  technical_workshop: 'workshop',
  webinar: 'webinar',
  panel_discussion: 'conference',
  startup_meetup: 'startup_event',
  fundraising_event: 'startup_event',
}

const RESEARCH_TYPE_TO_CATEGORY = {
  research_assistant: 'research_event',
  innovation_challenge: 'competition',
  sponsored_project: 'research_event',
  thesis_opportunity: 'research_event',
  open_research_problem: 'research_event',
  collaborative_program: 'research_event',
}

const REGISTRATION_OPEN_STATUSES = {
  campus_opportunity: ['open', 'published', 'registration_open', 'ongoing', 'upcoming'],
  innovation_event: ['published', 'ongoing'],
  alumni_event: ['published', 'ongoing'],
  research_opportunity: ['published'],
}

const TEAM_ROLES = ['captain', 'member']
const TEAM_INVITE_STATUSES = ['pending', 'accepted', 'declined']
const SUBMISSION_STATUSES = ['draft', 'submitted', 'under_review', 'accepted', 'rejected']
const RESULT_LABELS = ['winner', 'runner_up', 'finalist', 'participant']

const EVENT_AI_INTENTS = [
  'EVENT_RECOMMENDATIONS',
  'HACKATHON_MATCH',
  'EVENT_PREPARATION',
  'DEADLINE_INFO',
  'SKILL_GAP',
]

module.exports = {
  EVENT_SOURCES,
  UNIFIED_EVENT_CATEGORIES,
  CAMPUS_TYPE_TO_CATEGORY,
  INNOVATION_TYPE_TO_CATEGORY,
  ALUMNI_TYPE_TO_CATEGORY,
  RESEARCH_TYPE_TO_CATEGORY,
  REGISTRATION_OPEN_STATUSES,
  TEAM_ROLES,
  TEAM_INVITE_STATUSES,
  SUBMISSION_STATUSES,
  RESULT_LABELS,
  EVENT_AI_INTENTS,
}
