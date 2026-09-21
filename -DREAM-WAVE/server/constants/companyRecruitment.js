/** Company recruitment workspace — LASYA V2 Prompt 5 */

const { APPLICATION_STAGES } = require('./recruitment')

const LISTING_STATUSES = ['draft', 'published', 'closed', 'archived']

/** Legacy job/internship statuses mapped to canonical listing status */
const LISTING_STATUS_ALIASES = {
  open: 'published',
  paused: 'closed',
}

const JOB_ACTIONS = ['publish', 'close', 'archive', 'reopen']
const INTERNSHIP_ACTIONS = ['publish', 'close', 'archive', 'reopen']

const COMPANY_STATUSES = ['active', 'inactive', 'pending_verification']

const DEFAULT_PIPELINE_STAGES = APPLICATION_STAGES.filter(
  (s) => !['offer_declined', 'assessment_passed'].includes(s),
).map((key, order) => ({
  key,
  label: key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
  enabled: true,
  order,
}))

const RECRUITMENT_REPORT_TYPES = [
  'job_performance',
  'candidate_pipeline',
  'interview_summary',
  'offer_report',
  'hiring_report',
  'recruiter_activity',
  'recruitment_timeline',
  'source_effectiveness',
]

function normalizeListingStatus(status) {
  if (!status) return 'draft'
  const lower = String(status).toLowerCase().trim()
  return LISTING_STATUS_ALIASES[lower] || lower
}

function isActiveListingStatus(status) {
  const s = normalizeListingStatus(status)
  return s === 'published'
}

module.exports = {
  LISTING_STATUSES,
  LISTING_STATUS_ALIASES,
  JOB_ACTIONS,
  INTERNSHIP_ACTIONS,
  COMPANY_STATUSES,
  DEFAULT_PIPELINE_STAGES,
  RECRUITMENT_REPORT_TYPES,
  normalizeListingStatus,
  isActiveListingStatus,
}
