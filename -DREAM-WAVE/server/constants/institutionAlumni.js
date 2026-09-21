/** Institution Alumni Network — LASYA V2 Prompt 8 */

const ALUMNI_STATUSES = ['active', 'inactive', 'archived']

const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected']

const PROFILE_VISIBILITY = ['public', 'institution', 'connections', 'private']

const CONTACT_PREFERENCES = ['email', 'phone', 'linkedin', 'platform_message', 'none']

const CONNECTION_TYPES = ['professional', 'mentorship', 'networking']

const CONNECTION_STATUSES = ['pending', 'accepted', 'declined', 'blocked']

const GROUP_TYPES = [
  'chapter',
  'interest',
  'department',
  'graduation_year',
  'regional_chapter',
  'international_chapter',
  'industry_group',
  'startup_founders',
  'women_in_technology',
  'research_community',
  'ai_data_science',
]

const GROUP_STATUSES = ['active', 'archived']

const MENTORSHIP_STATUSES = ['requested', 'matched', 'active', 'completed', 'cancelled', 'declined']

const MENTORSHIP_SESSION_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show']

const CAREER_CONTRIBUTION_TYPES = [
  'job_referral',
  'internship_referral',
  'freelance_opportunity',
  'contract_position',
  'research_collaboration',
  'startup_hiring',
  'career_guidance',
  'resume_review',
  'mock_interview',
  'industry_insight',
  'skill_session',
]

const CAREER_CONTRIBUTION_STATUSES = ['open', 'filled', 'closed']

const ALUMNI_INDUSTRIES = [
  'technology',
  'healthcare',
  'finance',
  'education',
  'manufacturing',
  'consulting',
  'research',
  'government',
  'nonprofit',
  'startup',
  'other',
]

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeAlumniName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function assertValidTransition(statuses, current, next) {
  if (!statuses.includes(next)) {
    const err = new Error(`Invalid status: ${next}`)
    err.statusCode = 400
    throw err
  }
  if (current === next) return
}

module.exports = {
  ALUMNI_STATUSES,
  VERIFICATION_STATUSES,
  PROFILE_VISIBILITY,
  CONTACT_PREFERENCES,
  CONNECTION_TYPES,
  CONNECTION_STATUSES,
  GROUP_TYPES,
  GROUP_STATUSES,
  MENTORSHIP_STATUSES,
  MENTORSHIP_SESSION_STATUSES,
  CAREER_CONTRIBUTION_TYPES,
  CAREER_CONTRIBUTION_STATUSES,
  ALUMNI_INDUSTRIES,
  normalizeEmail,
  normalizeAlumniName,
  assertValidTransition,
}
