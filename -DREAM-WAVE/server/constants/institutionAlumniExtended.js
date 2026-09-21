/** Institution Alumni Network — LASYA V2 Prompt 8 Phase 2 extensions */

const ALUMNI_EVENT_TYPES = [
  'alumni_meet',
  'annual_reunion',
  'networking_session',
  'career_talk',
  'technical_workshop',
  'webinar',
  'panel_discussion',
  'startup_meetup',
  'fundraising_event',
]

const ALUMNI_EVENT_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled']

const EVENT_REGISTRATION_STATUSES = ['registered', 'attended', 'no_show', 'cancelled']

const INSTITUTIONAL_CONTRIBUTION_TYPES = [
  'scholarship',
  'donation',
  'sponsorship',
  'research_funding',
  'startup_mentorship',
  'industry_partnership',
  'equipment_donation',
  'student_welfare',
]

const CONTRIBUTION_APPROVAL_STATUSES = ['proposed', 'pending', 'approved', 'disbursed', 'rejected']

const GROUP_POST_TYPES = [
  'question',
  'knowledge',
  'career_advice',
  'technical',
  'success_story',
  'announcement',
]

const GROUP_MEMBERSHIP_STATUSES = ['pending', 'approved', 'rejected']

const VOLUNTEER_ROLES = [
  'event_volunteer',
  'student_mentor',
  'guest_speaker',
  'career_coach',
  'judge',
  'panel_member',
]

const CONVERSATION_TYPES = ['direct', 'mentor', 'group', 'broadcast']

const CAREER_APPLICATION_STATUSES = ['submitted', 'reviewed', 'shortlisted', 'accepted', 'rejected']

const ALUMNI_AUDIT_ACTIONS = [
  'profile_created',
  'profile_updated',
  'profile_verified',
  'alumni_registered',
  'mentor_assigned',
  'event_created',
  'event_published',
  'event_registration',
  'referral_published',
  'donation_recorded',
  'contribution_created',
  'contribution_approved',
  'community_created',
  'group_created',
  'group_member_added',
  'group_post_created',
  'mentorship_matched',
  'career_application_submitted',
  'volunteer_registered',
  'message_sent',
  'connection_accepted',
  'report_generated',
  'report_exported',
  'permission_updated',
]

const ALUMNI_REPORT_TYPES = [
  'alumni_directory',
  'mentorship',
  'career_referral',
  'event_participation',
  'community_growth',
  'donation',
  'volunteer_activity',
  'alumni_engagement',
]

module.exports = {
  ALUMNI_EVENT_TYPES,
  ALUMNI_EVENT_STATUSES,
  EVENT_REGISTRATION_STATUSES,
  INSTITUTIONAL_CONTRIBUTION_TYPES,
  CONTRIBUTION_APPROVAL_STATUSES,
  GROUP_POST_TYPES,
  GROUP_MEMBERSHIP_STATUSES,
  VOLUNTEER_ROLES,
  CONVERSATION_TYPES,
  CAREER_APPLICATION_STATUSES,
  ALUMNI_AUDIT_ACTIONS,
  ALUMNI_REPORT_TYPES,
}
