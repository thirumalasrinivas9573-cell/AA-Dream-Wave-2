/** Institution intelligence thresholds and AI intents — transparent, configurable rules */

const SUPPORT_THRESHOLDS = {
  attendancePercent: 75,
  cgpa: 6.0,
  backlogs: 1,
  performanceTrend: 6.0,
}

const AI_INTENTS = [
  'INSTITUTION_OVERVIEW',
  'STUDENT_PROGRESS',
  'PROGRAM_ANALYSIS',
  'COURSE_ANALYSIS',
  'FACULTY_ACTIVITY',
  'ADMISSION_ANALYSIS',
  'PLACEMENT_ANALYSIS',
  'RESEARCH_OVERVIEW',
  'INCUBATION_OVERVIEW',
  'ACADEMIC_SUPPORT',
  'OPPORTUNITY_ANALYSIS',
]

const SUPPORT_SIGNAL_LABELS = {
  attendance: 'Attendance requires review',
  performance: 'May require academic support',
  backlogs: 'Progress needs attention',
  profile: 'Progress needs attention',
  declining_performance: 'May require academic support',
  inactive: 'Progress needs attention',
}

module.exports = {
  SUPPORT_THRESHOLDS,
  AI_INTENTS,
  SUPPORT_SIGNAL_LABELS,
}
