const { OPPORTUNITY_QUALITY_LEVELS, DEADLINE_STATES, PUBLISH_READINESS } = require('../constants/industryOpportunity')

function classifyDeadline(deadline) {
  if (!deadline) return { state: 'UNKNOWN', daysRemaining: null }
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return { state: 'UNKNOWN', daysRemaining: null }
  const days = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { state: 'CLOSED', daysRemaining: days }
  if (days <= 3) return { state: 'URGENT', daysRemaining: days }
  if (days <= 14) return { state: 'APPROACHING', daysRemaining: days }
  return { state: 'SAFE', daysRemaining: days }
}

function validateOpportunityQuality(opportunity = {}) {
  const missing = []
  const checks = {
    title: !!String(opportunity.title || '').trim(),
    organization: !!(opportunity.organizer || opportunity.organization || opportunity.companyName),
    description: !!String(opportunity.description || '').trim(),
    requirements: !!((opportunity.requiredSkills || []).length || opportunity.eligibilityRules),
    deadline: !!(opportunity.deadline || opportunity.registrationDeadline),
    status: !!opportunity.status,
    applicationMethod: !!(opportunity.applicationUrl || opportunity.registrationOpen != null || opportunity.isJob || opportunity.isInternship),
  }

  let score = 0
  const weights = { title: 20, organization: 15, description: 20, requirements: 15, deadline: 10, status: 10, applicationMethod: 10 }
  for (const [key, ok] of Object.entries(checks)) {
    if (ok) score += weights[key] || 0
    else missing.push(key)
  }

  let level = 'INCOMPLETE'
  if (score >= 90) level = 'COMPLETE'
  else if (score >= 70) level = 'GOOD'
  else if (score >= 45) level = 'PARTIAL'

  const deadline = classifyDeadline(opportunity.deadline || opportunity.registrationDeadline)

  return {
    level,
    score,
    missing,
    checks,
    deadline,
    publishReadiness: level === 'COMPLETE' && deadline.state !== 'CLOSED' ? 'READY' : level === 'PARTIAL' ? 'NEEDS_REVIEW' : 'INCOMPLETE',
    disclaimer: 'Quality assessment uses available fields only. Missing fields are not invented.',
  }
}

function filterActiveOpportunities(items = []) {
  return items.filter((item) => {
    const status = String(item.status || '').toUpperCase()
    if (['CLOSED', 'CANCELLED', 'FILLED', 'ARCHIVED'].includes(status)) return false
    const deadline = classifyDeadline(item.deadline || item.registrationDeadline)
    return deadline.state !== 'CLOSED'
  })
}

module.exports = {
  validateOpportunityQuality,
  classifyDeadline,
  filterActiveOpportunities,
  OPPORTUNITY_QUALITY_LEVELS,
  DEADLINE_STATES,
  PUBLISH_READINESS,
}
