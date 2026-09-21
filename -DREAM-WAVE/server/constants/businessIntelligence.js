/** Business intelligence — period presets, metric definitions, AI intents */

const PERIOD_PRESETS = ['today', '7d', '30d', '90d', 'custom', 'all']

const MIN_TREND_POINTS = 3

const FUNNEL_DEFINITION = {
  countType: 'unique_applications',
  description:
    'Each stage count includes applications that reached that stage or any later stage in the pipeline. Counts are unique application records, not duplicate status events.',
  stages: [
    { key: 'applications', label: 'Applications' },
    { key: 'screening', label: 'Screening / Review' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'interview', label: 'Interview' },
    { key: 'selected', label: 'Selected' },
    { key: 'offer', label: 'Offer' },
    { key: 'hired', label: 'Hired' },
  ],
}

const BI_INTENTS = [
  'INSTITUTION_OVERVIEW',
  'ADMISSION_TREND',
  'PLACEMENT_FUNNEL',
  'SKILL_GAP',
  'RECRUITMENT_ACTIVITY',
  'APPLICATION_TREND',
  'DATA_QUALITY',
  'STUDENT_CAREER',
]

const METRIC_DEFINITIONS = {
  totalStudents: {
    source: 'InstitutionStudent',
    definition: 'Count of institution student records matching active filters.',
  },
  activeStudents: {
    source: 'InstitutionStudent',
    definition: 'Students with status active.',
  },
  applicationsSubmitted: {
    source: 'RecruitmentApplication',
    definition: 'Unique application records linked to the scoped organization within the selected period.',
  },
  placementRate: {
    source: 'InstitutionStudent.placement.lifecycleStatus',
    definition: 'placedStudents / placementEligible × 100. Numerator: PLACED. Denominator: ELIGIBLE, READY, APPLYING, or PLACED.',
  },
  hiringConversionRate: {
    source: 'RecruitmentApplication',
    definition: 'hired applications / total applications × 100 within scope and period.',
  },
}

const INSIGHT_CONTRACT_FIELDS = ['observation', 'evidence', 'interpretation', 'limitation', 'nextAction']

module.exports = {
  PERIOD_PRESETS,
  MIN_TREND_POINTS,
  FUNNEL_DEFINITION,
  BI_INTENTS,
  METRIC_DEFINITIONS,
  INSIGHT_CONTRACT_FIELDS,
}
