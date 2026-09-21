/** Community network constants — canonical enums for posts, visibility, collaboration */

const POST_TYPES = [
  'GENERAL',
  'PROJECT',
  'RESEARCH',
  'LEARNING',
  'ACHIEVEMENT',
  'OPPORTUNITY',
  'EVENT',
  'QUESTION',
  'DISCUSSION',
]

const LEGACY_TAG_TO_POST_TYPE = {
  Achievement: 'ACHIEVEMENT',
  Books: 'LEARNING',
  Goals: 'GENERAL',
  Habits: 'GENERAL',
  General: 'GENERAL',
}

const VISIBILITY = ['private', 'followers', 'shared', 'public']

const REACTION_TYPES = ['like', 'insight', 'helpful']

const FOLLOW_TARGET_TYPES = ['user', 'institution', 'company']

const LINKED_ENTITY_TYPES = [
  'project',
  'research',
  'learning',
  'job',
  'internship',
  'campus_opportunity',
  'event',
]

const COLLABORATION_STATUSES = ['pending', 'accepted', 'declined', 'withdrawn']

const REPORT_REASONS = [
  'spam',
  'harassment',
  'misleading_content',
  'inappropriate_content',
  'impersonation',
  'other',
]

const FEED_MODES = ['for_you', 'following', 'projects', 'research', 'opportunities']

module.exports = {
  POST_TYPES,
  LEGACY_TAG_TO_POST_TYPE,
  VISIBILITY,
  REACTION_TYPES,
  FOLLOW_TARGET_TYPES,
  LINKED_ENTITY_TYPES,
  COLLABORATION_STATUSES,
  REPORT_REASONS,
  FEED_MODES,
}
