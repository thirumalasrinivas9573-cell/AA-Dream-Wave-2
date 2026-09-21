/** Partnership enums shared across models and validation. */

const RELATIONSHIP_TYPES = [
  'Recruitment Partner',
  'Internship Partner',
  'Industry Partner',
  'Training Partner',
  'Research Partner',
  'Innovation Partner',
  'Technology Partner',
  'Placement Partner',
  'Academic Partner',
  'Mentorship Partner',
]

const PARTNERSHIP_STATUSES = [
  'invited',
  'pending',
  'active',
  'paused',
  'declined',
  'expired',
  'terminated',
]

const REQUEST_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'info_requested',
  'expired',
  'cancelled',
]

const INITIATOR_TYPES = ['institution', 'company']

const DOCUMENT_TYPES = [
  'MoU',
  'Agreement',
  'NDA',
  'Training Agreement',
  'Recruitment Agreement',
  'Internship Agreement',
  'Research Agreement',
]

const DOCUMENT_STATUSES = ['draft', 'active', 'expired', 'archived']

const EVENT_TYPES = [
  'Hackathon',
  'Workshop',
  'Seminar',
  'Webinar',
  'Guest Lecture',
  'Industry Visit',
  'Recruitment Drive',
  'Training Program',
  'Innovation Challenge',
  'Research Event',
]

const ACTIVITY_TYPES = [
  'partnership_request_sent',
  'partnership_request_accepted',
  'partnership_request_declined',
  'partnership_request_info_requested',
  'partnership_activated',
  'partnership_paused',
  'partnership_terminated',
  'partnership_scope_changed',
  'mou_uploaded',
  'document_added',
  'document_updated',
  'internship_shared',
  'job_shared',
  'campus_drive_created',
  'event_scheduled',
  'partnership_expiring',
]

/** Explicit data-sharing scopes — Lasya V3 Prompt 9 */
const SHARING_SCOPES = [
  'events',
  'opportunities',
  'recruitment',
  'placement',
  'projects',
  'skills',
  'programs',
  'research',
  'analytics',
  'community',
]

const DEFAULT_SCOPES_BY_RELATIONSHIP = {
  'Recruitment Partner': ['events', 'opportunities', 'recruitment', 'placement'],
  'Internship Partner': ['events', 'opportunities', 'recruitment', 'placement'],
  'Placement Partner': ['events', 'opportunities', 'recruitment', 'placement'],
  'Industry Partner': ['events', 'opportunities'],
  'Training Partner': ['events', 'programs', 'skills'],
  'Research Partner': ['research', 'events'],
  'Innovation Partner': ['events', 'projects', 'opportunities'],
  'Technology Partner': ['events', 'projects', 'skills'],
  'Academic Partner': ['programs', 'skills'],
  'Mentorship Partner': ['community', 'skills'],
}

const ENTITY_LINK_TYPES = ['job', 'internship', 'drive', 'event']

const NOTIFICATION_TYPES = [
  'partnership_request',
  'partnership_accepted',
  'partnership_declined',
  'partnership_info_requested',
  'partnership_scope_changed',
  'partnership_paused',
  'partnership_cancelled',
  'program_registration_received',
  'program_registration_approved',
  'program_registration_rejected',
  'program_starting',
  'program_milestone_due',
  'program_completed',
  'program_cancelled',
  'new_internship',
  'new_job',
  'campus_drive_invitation',
  'document_added',
  'partnership_expiring',
  'placement_opportunity_published',
  'placement_registration_reminder',
  'placement_interview_scheduled',
  'placement_interview_rescheduled',
  'placement_results_published',
  'placement_offer_released',
  'placement_offer_accepted',
  'recruitment_application_received',
  'recruitment_interview_scheduled',
  'recruitment_interview_rescheduled',
  'recruitment_interview_cancelled',
  'recruitment_candidate_shortlisted',
  'recruitment_offer_released',
  'recruitment_offer_accepted',
  'recruitment_joining_confirmed',
  'recruitment_bulk_announcement',
  'research_opportunity_published',
  'idea_submitted',
  'mentor_assigned',
  'mentorship_session_scheduled',
  'funding_opportunity_available',
  'event_registration_confirmed',
  'startup_approved',
  'incubation_status_updated',
  'alumni_connection_request',
  'alumni_mentorship_request',
  'alumni_mentorship_updated',
  'alumni_mentorship_session_scheduled',
  'alumni_profile_verified',
  'alumni_event_registration_confirmed',
  'alumni_event_invitation',
  'alumni_event_reminder',
  'alumni_donation_confirmed',
  'alumni_group_membership_updated',
  'alumni_message_received',
  'alumni_career_application_received',
  'alumni_career_application_updated',
  'alumni_community_announcement',
  'community_post_like',
  'community_post_comment',
  'community_new_follower',
  'community_collaboration_request',
  'community_collaboration_accepted',
  'community_collaboration_declined',
  'community_opportunity_shared',
  'event_team_invitation',
  'event_registration_confirmed',
  'event_updated',
  'event_cancelled',
  'event_submission_deadline',
  'application_status_changed',
  'learning_milestone_completed',
  'project_updated',
  'research_shared',
  'system_alert',
  'security_alert',
]

const ACTIVE_OR_PENDING_STATUSES = ['invited', 'pending', 'active', 'paused']

const VALID_STATUS_TRANSITIONS = {
  invited: ['pending', 'declined', 'expired'],
  pending: ['active', 'declined', 'expired'],
  active: ['paused', 'terminated', 'expired'],
  paused: ['active', 'terminated'],
  declined: [],
  expired: [],
  terminated: [],
}

module.exports = {
  RELATIONSHIP_TYPES,
  PARTNERSHIP_STATUSES,
  REQUEST_STATUSES,
  INITIATOR_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  EVENT_TYPES,
  ACTIVITY_TYPES,
  NOTIFICATION_TYPES,
  SHARING_SCOPES,
  DEFAULT_SCOPES_BY_RELATIONSHIP,
  ENTITY_LINK_TYPES,
  ACTIVE_OR_PENDING_STATUSES,
  VALID_STATUS_TRANSITIONS,
}
