const { isCertificateVisible, isProjectVisible } = require('../utils/institutionStudentPrivacy')
const { evaluateEligibility } = require('./institutionPlacementEligibilityService')

const EVIDENCE_LEVELS = {
  VERIFIED: 'verified',
  CERTIFIED: 'certified',
  PROJECT: 'project',
  PRACTICED: 'practiced',
  DECLARED: 'declared',
  UNKNOWN: 'unknown',
}

const CHECK_STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  UNKNOWN: 'unknown',
  REVIEW: 'needs_review',
}

function normalizeSkill(value) {
  return String(value || '').trim().toLowerCase()
}

function jobToEligibilityRules(jobOrInternship) {
  if (!jobOrInternship) return {}
  return {
    requiredSkills: jobOrInternship.requiredSkills || [],
    departments: jobOrInternship.department ? [jobOrInternship.department] : [],
  }
}

function collectSkillEvidence(student) {
  const evidence = new Map()
  const add = (skill, level, source) => {
    const key = normalizeSkill(skill)
    if (!key) return
    const existing = evidence.get(key) || { skill, level: EVIDENCE_LEVELS.UNKNOWN, sources: [] }
    const rank = [
      EVIDENCE_LEVELS.UNKNOWN,
      EVIDENCE_LEVELS.DECLARED,
      EVIDENCE_LEVELS.PRACTICED,
      EVIDENCE_LEVELS.PROJECT,
      EVIDENCE_LEVELS.CERTIFIED,
      EVIDENCE_LEVELS.VERIFIED,
    ]
    if (rank.indexOf(level) > rank.indexOf(existing.level)) {
      existing.level = level
    }
    existing.sources.push(source)
    evidence.set(key, existing)
  }

  for (const skill of student.verifiedSkills || []) {
    add(skill, EVIDENCE_LEVELS.VERIFIED, { type: 'verified_skill' })
  }
  for (const cert of (student.certifications || []).filter(isCertificateVisible)) {
    for (const skill of cert.skillsCovered || []) {
      add(skill, EVIDENCE_LEVELS.CERTIFIED, { type: 'certificate', title: cert.title })
    }
    if (cert.title) add(cert.title, EVIDENCE_LEVELS.CERTIFIED, { type: 'certificate', title: cert.title })
  }
  for (const project of (student.sharedProjects || []).filter(isProjectVisible)) {
    for (const tech of project.technologies || []) {
      add(tech, EVIDENCE_LEVELS.PROJECT, { type: 'project', title: project.title })
    }
    if (project.title) add(project.title, EVIDENCE_LEVELS.PROJECT, { type: 'project', title: project.title })
  }
  for (const skill of student.sharedSkills || []) {
    add(skill, EVIDENCE_LEVELS.DECLARED, { type: 'shared_skill' })
  }
  for (const skill of student.programmingLanguages || []) {
    add(skill, EVIDENCE_LEVELS.PRACTICED, { type: 'programming_language' })
  }

  return evidence
}

function matchRequiredSkills(requiredSkills = [], student) {
  const evidence = collectSkillEvidence(student)
  const checks = []
  let matched = 0
  let unknown = 0

  for (const raw of requiredSkills) {
    const required = String(raw).trim()
    const key = normalizeSkill(required)
    let status = CHECK_STATUS.FAIL
    let evidenceLevel = EVIDENCE_LEVELS.UNKNOWN
    let evidenceSources = []

    for (const [skillKey, entry] of evidence.entries()) {
      if (skillKey.includes(key) || key.includes(skillKey)) {
        status = CHECK_STATUS.PASS
        evidenceLevel = entry.level
        evidenceSources = entry.sources
        break
      }
    }

    if (status === CHECK_STATUS.FAIL && !required) {
      status = CHECK_STATUS.UNKNOWN
      unknown++
    } else if (status === CHECK_STATUS.PASS) {
      matched++
    }

    checks.push({
      skill: required,
      status,
      evidenceLevel,
      evidenceSources,
      label:
        status === CHECK_STATUS.PASS
          ? `${required}: matched (${evidenceLevel})`
          : `${required}: not found in shared evidence`,
    })
  }

  return {
    requiredCount: requiredSkills.length,
    matchedCount: matched,
    missingCount: requiredSkills.length - matched,
    unknownCount: unknown,
    checks,
    coveragePercent: requiredSkills.length ? Math.round((matched / requiredSkills.length) * 100) : 100,
  }
}

function buildEligibilityChecklist(student, rules = {}, application = null) {
  const base = evaluateEligibility(student, rules, application)
  const checks = []

  const pushCheck = (category, label, status, detail = '') => {
    checks.push({ category, label, status, detail })
  }

  if (application) {
    pushCheck('application', 'Existing application', CHECK_STATUS.REVIEW, application.stage)
    return {
      ...base,
      result: base.eligible ? 'NEEDS_REVIEW' : 'NOT_ELIGIBLE',
      checks,
      skillMatch: null,
    }
  }

  if (rules.departments?.length) {
    pushCheck(
      'course',
      'Department',
      rules.departments.includes(student.department) ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
      student.department || 'Unknown',
    )
  } else {
    pushCheck('course', 'Department', CHECK_STATUS.UNKNOWN, 'No department restriction')
  }

  if (rules.programs?.length) {
    pushCheck(
      'course',
      'Program',
      rules.programs.includes(student.course) ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
      student.course || 'Unknown',
    )
  }

  if (rules.minCgpa != null) {
    const cgpa = student.cgpa ?? null
    if (cgpa == null) {
      pushCheck('academic', 'Minimum CGPA', CHECK_STATUS.UNKNOWN, 'CGPA not recorded')
    } else {
      pushCheck(
        'academic',
        'Minimum CGPA',
        cgpa >= rules.minCgpa ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
        `Current: ${cgpa}, Required: ${rules.minCgpa}`,
      )
    }
  }

  if (rules.maxBacklogs != null) {
    const backlogs = student.backlogs ?? null
    if (backlogs == null) {
      pushCheck('academic', 'Backlogs', CHECK_STATUS.UNKNOWN, 'Backlog count not recorded')
    } else {
      pushCheck(
        'academic',
        'Backlogs',
        backlogs <= rules.maxBacklogs ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
        `Current: ${backlogs}, Max: ${rules.maxBacklogs}`,
      )
    }
  }

  const skillMatch = matchRequiredSkills(rules.requiredSkills || [], student)
  for (const check of skillMatch.checks) {
    pushCheck(
      'skill',
      check.skill,
      check.status === CHECK_STATUS.PASS ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
      check.label,
    )
  }

  if (rules.requiredCertifications?.length) {
    for (const certName of rules.requiredCertifications) {
      const found = (student.certifications || [])
        .filter(isCertificateVisible)
        .some((c) => (c.title || '').toLowerCase().includes(String(certName).toLowerCase()))
      pushCheck('certification', certName, found ? CHECK_STATUS.PASS : CHECK_STATUS.UNKNOWN, found ? 'Found' : 'Not verified')
    }
  }

  if (rules.graduationYear && !student.expectedGraduation) {
    pushCheck('experience', 'Graduation year', CHECK_STATUS.UNKNOWN, 'Expected graduation not recorded')
  }

  const hasFail = checks.some((c) => c.status === CHECK_STATUS.FAIL)
  const hasUnknown = checks.some((c) => c.status === CHECK_STATUS.UNKNOWN)

  let result = 'ELIGIBLE'
  if (hasFail) result = 'NOT_ELIGIBLE'
  else if (hasUnknown || base.status === 'conditionally_eligible') result = 'NEEDS_REVIEW'

  return {
    ...base,
    result,
    checks,
    skillMatch,
    summary: base.reasons,
  }
}

function buildOpportunityRecommendation(opportunity, student) {
  const rules = opportunity.eligibilityRules || jobToEligibilityRules(opportunity)
  const eligibility = buildEligibilityChecklist(student, rules)
  const skillMatch = eligibility.skillMatch || matchRequiredSkills(opportunity.requiredSkills || rules.requiredSkills || [], student)
  const signals = []

  if (skillMatch.matchedCount > 0) {
    signals.push(`${skillMatch.matchedCount} required skill(s) matched with evidence`)
  }
  if (student.department && opportunity.department && student.department === opportunity.department) {
    signals.push('Department aligns with opportunity')
  }
  if ((student.sharedProjects || []).filter(isProjectVisible).length > 0) {
    signals.push('Portfolio project evidence available')
  }
  if (eligibility.result === 'NEEDS_REVIEW') {
    signals.push('Some eligibility criteria need manual review')
  }

  return {
    opportunityId: opportunity.id || opportunity._id?.toString(),
    recommendation:
      eligibility.result === 'ELIGIBLE'
        ? 'recommended'
        : eligibility.result === 'NEEDS_REVIEW'
          ? 'review'
          : 'not_recommended',
    eligibility,
    skillMatch,
    signals,
    explainableScore: {
      skillCoverage: skillMatch.coveragePercent,
      eligibilityResult: eligibility.result,
    },
  }
}

function buildSafeCandidateProfile(student, application = null) {
  const o = student.toObject ? student.toObject() : student
  const projects = (o.sharedProjects || [])
    .filter(isProjectVisible)
    .map((p) => ({
      title: p.title,
      role: p.role || '',
      technologies: p.technologies || [],
      description: p.description || '',
      repositoryUrl: p.repositoryUrl || '',
      demoUrl: p.demoUrl || '',
      status: p.status || '',
      verificationStatus: p.verificationStatus || '',
    }))

  return {
    name: o.fullName,
    department: o.department,
    course: o.course,
    batch: o.batch,
    semester: o.semester,
    cgpa: o.cgpa ?? null,
    attendance: o.attendance ?? null,
    skills: {
      shared: o.sharedSkills || [],
      verified: o.verifiedSkills || [],
      programmingLanguages: o.programmingLanguages || [],
    },
    projects,
    certifications: (o.certifications || [])
      .filter(isCertificateVisible)
      .map((c) => ({
        title: c.title,
        issuer: c.issuer || c.issuingOrganization || '',
        verificationStatus: c.verificationStatus || '',
        skillsCovered: c.skillsCovered || [],
      })),
    internships: o.internships || [],
    application: application
      ? {
          id: application._id?.toString(),
          stage: application.stage,
          roleTitle: application.roleTitle,
          appliedAt: application.createdAt,
        }
      : null,
  }
}

function buildRuleBasedCandidateSummary(student, application, opportunity = null) {
  const profile = buildSafeCandidateProfile(student, application)
  const rules = opportunity?.eligibilityRules || jobToEligibilityRules(opportunity)
  const eligibility = buildEligibilityChecklist(student, rules, application)
  const skillMatch = eligibility.skillMatch || { checks: [], matchedCount: 0, requiredCount: 0 }

  const strengths = []
  const gaps = []
  const interviewAreas = []

  if (skillMatch.matchedCount) {
    strengths.push(`${skillMatch.matchedCount} required skill(s) supported by evidence`)
  }
  if (profile.projects.length) {
    strengths.push(`${profile.projects.length} shared project(s) in portfolio`)
  }
  if (profile.certifications.length) {
    strengths.push(`${profile.certifications.length} visible certification(s)`)
  }
  if (profile.cgpa != null && profile.cgpa >= 7) {
    strengths.push(`CGPA ${profile.cgpa} on record`)
  }

  for (const check of skillMatch.checks) {
    if (check.status !== CHECK_STATUS.PASS) {
      gaps.push(check.skill)
      interviewAreas.push(`Assess ${check.skill} depth`)
    }
  }
  if (eligibility.result === 'NEEDS_REVIEW') {
    gaps.push('Some eligibility criteria unresolved')
  }

  return {
    mode: 'rule_based',
    disclaimer: 'Summary grounded in shared candidate records. Requires human review before hiring decisions.',
    candidateSummary: `${profile.name} applied for ${application?.roleTitle || 'this role'}. Evidence suggests ${strengths.length ? strengths.join('; ') : 'limited verified evidence on file'}.`,
    relevantSkills: profile.skills.verified.length ? profile.skills.verified : profile.skills.shared,
    projectEvidence: profile.projects.map((p) => p.title),
    experience: profile.internships,
    potentialStrengths: strengths,
    missingEvidence: gaps,
    interviewAreas: interviewAreas.length ? interviewAreas : ['Role fit', 'Technical depth', 'Communication'],
    eligibility,
  }
}

function buildRuleBasedJobAnalysis(job) {
  return {
    mode: 'rule_based',
    source: 'company_provided',
    extracted: {
      skills: job.requiredSkills || [],
      experience: job.experience || '',
      education: job.qualifications || '',
      responsibilities: job.responsibilities || '',
      eligibility: job.eligibility || '',
    },
    disclaimer: 'Structured fields from the company job record. Original description unchanged.',
  }
}

function buildInterviewQuestionSuggestions(job, student) {
  const skillMatch = matchRequiredSkills(job.requiredSkills || [], student)
  const questions = [
    `Describe your experience relevant to ${job.title}.`,
    'Walk through a project that best represents your skills for this role.',
  ]
  for (const check of skillMatch.checks.slice(0, 4)) {
    questions.push(`How have you applied ${check.skill} in academic or project work?`)
  }
  return {
    mode: 'rule_based',
    questions: [...new Set(questions)].slice(0, 8),
    disclaimer: 'Suggested questions based on job requirements and shared candidate evidence only.',
  }
}

module.exports = {
  EVIDENCE_LEVELS,
  CHECK_STATUS,
  jobToEligibilityRules,
  collectSkillEvidence,
  matchRequiredSkills,
  buildEligibilityChecklist,
  buildOpportunityRecommendation,
  buildSafeCandidateProfile,
  buildRuleBasedCandidateSummary,
  buildRuleBasedJobAnalysis,
  buildInterviewQuestionSuggestions,
}
