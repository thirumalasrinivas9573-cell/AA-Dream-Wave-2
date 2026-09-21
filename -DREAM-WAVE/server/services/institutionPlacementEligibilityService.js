const { STAGE_TO_ELIGIBILITY_STATUS } = require('../constants/institutionPlacements')

function normalizeList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return [String(value)]
}

/**
 * Evaluate student eligibility against opportunity rules.
 * Returns status + human-readable reasons (never fabricates data).
 */
function evaluateEligibility(student, rules = {}, application = null) {
  if (application) {
    const display = STAGE_TO_ELIGIBILITY_STATUS[application.stage] || 'application_submitted'
    return {
      status: display,
      eligible: !['rejected', 'withdrawn'].includes(application.stage),
      reasons: [`Application status: ${application.stage.replace(/_/g, ' ')}`],
      conditions: [],
    }
  }

  const reasons = []
  const conditions = []
  let failed = 0
  let conditional = 0

  const departments = normalizeList(rules.departments)
  if (departments.length && !departments.includes(student.department)) {
    failed++
    reasons.push(`Department must be one of: ${departments.join(', ')}`)
  }

  const programs = normalizeList(rules.programs)
  if (programs.length && !programs.includes(student.course)) {
    failed++
    reasons.push(`Program must be one of: ${programs.join(', ')}`)
  }

  const batches = normalizeList(rules.batches)
  if (batches.length && !batches.includes(student.batch)) {
    failed++
    reasons.push(`Batch must be one of: ${batches.join(', ')}`)
  }

  const semesters = normalizeList(rules.semesters)
  if (semesters.length && !semesters.includes(student.semester)) {
    failed++
    reasons.push(`Semester must be one of: ${semesters.join(', ')}`)
  }

  if (rules.minCgpa != null && (student.cgpa ?? 0) < rules.minCgpa) {
    failed++
    reasons.push(`Minimum CGPA ${rules.minCgpa} required (current: ${student.cgpa ?? 0})`)
  } else if (rules.minCgpa != null && (student.cgpa ?? 0) < rules.minCgpa + 0.5) {
    conditional++
    conditions.push(`CGPA near threshold (${student.cgpa ?? 0} vs ${rules.minCgpa} required)`)
  }

  if (rules.maxBacklogs != null && (student.backlogs ?? 0) > rules.maxBacklogs) {
    failed++
    reasons.push(`Maximum ${rules.maxBacklogs} backlogs allowed (current: ${student.backlogs ?? 0})`)
  }

  if (rules.graduationYear && student.admissionYear && student.expectedGraduation) {
    const grad = String(student.expectedGraduation || rules.graduationYear)
    if (!grad.includes(rules.graduationYear)) {
      conditional++
      conditions.push(`Graduation year preference: ${rules.graduationYear}`)
    }
  }

  const requiredSkills = normalizeList(rules.requiredSkills)
  if (requiredSkills.length) {
    const pool = [
      ...(student.sharedSkills || []),
      ...(student.verifiedSkills || []),
      ...(student.programmingLanguages || []),
    ].map((s) => s.toLowerCase())
    const missing = requiredSkills.filter(
      (skill) => !pool.some((s) => s.includes(skill.toLowerCase())),
    )
    if (missing.length === requiredSkills.length) {
      failed++
      reasons.push(`Required skills missing: ${requiredSkills.join(', ')}`)
    } else if (missing.length) {
      conditional++
      conditions.push(`Partial skills match — missing: ${missing.join(', ')}`)
    } else {
      reasons.push('All required skills matched')
    }
  }

  const requiredCerts = normalizeList(rules.requiredCertifications)
  if (requiredCerts.length) {
    const certTitles = (student.certifications || [])
      .filter((c) => c.visibility !== 'private')
      .map((c) => (c.title || '').toLowerCase())
    const missingCerts = requiredCerts.filter(
      (c) => !certTitles.some((t) => t.includes(c.toLowerCase())),
    )
    if (missingCerts.length) {
      conditional++
      conditions.push(`Certificates pending: ${missingCerts.join(', ')}`)
    }
  }

  if (['inactive', 'suspended', 'graduated'].includes(student.status)) {
    failed++
    reasons.push(`Academic status "${student.status}" is not eligible`)
  }

  if (failed > 0) {
    return { status: 'not_eligible', eligible: false, reasons, conditions }
  }
  if (conditional > 0) {
    return { status: 'conditionally_eligible', eligible: true, reasons, conditions }
  }
  return {
    status: 'eligible',
    eligible: true,
    reasons: reasons.length ? reasons : ['Meets all eligibility criteria'],
    conditions,
  }
}

module.exports = {
  evaluateEligibility,
}
