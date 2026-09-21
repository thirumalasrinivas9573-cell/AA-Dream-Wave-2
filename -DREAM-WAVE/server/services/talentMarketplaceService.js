const crypto = require('crypto')
const {
  collectSkillEvidence,
  matchRequiredSkills,
  buildEligibilityChecklist,
  EVIDENCE_LEVELS,
  CHECK_STATUS,
} = require('./recruitmentIntelligenceService')
const { buildOpportunityContext } = require('./opportunityContextService')
const {
  loadAllOpportunities,
  getMatchExplanation,
  getStudentFeed,
  matchOpportunity,
  buildPreparationPlan,
  loadApplicationState,
} = require('./opportunityMatchingService')
const { mapMatchCategory } = require('./talentIntelligenceService')
const { MATCH_LEVELS, MATCH_STATUS } = require('../opportunityMatching')
const { OPPORTUNITY_STATUS_LABELS, APPLICATION_READINESS_STATES } = require('../constants/talentMarketplace')
const { isProjectVisible, isCertificateVisible } = require('../utils/institutionStudentPrivacy')

const matchCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

function profileHash(context) {
  const payload = JSON.stringify({
    skills: context.skills?.slice(0, 30),
    projects: (context.projects || []).map((p) => p.title),
    careerGoal: context.careerGoal,
  })
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

function getCachedMatch(userId, source, sourceId, context) {
  const key = `${userId}:${source}:${sourceId}:${profileHash(context)}`
  const entry = matchCache.get(key)
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.data
  return null
}

function setCachedMatch(userId, source, sourceId, context, data) {
  const key = `${userId}:${source}:${sourceId}:${profileHash(context)}`
  matchCache.set(key, { at: Date.now(), data })
  if (matchCache.size > 500) {
    const oldest = matchCache.keys().next().value
    matchCache.delete(oldest)
  }
}

function invalidateUserMatchCache(userId) {
  for (const key of matchCache.keys()) {
    if (key.startsWith(`${userId}:`)) matchCache.delete(key)
  }
}

function resolveOpportunityStatus(opportunity) {
  const raw = opportunity.status || 'open'
  if (opportunity.registrationDeadline || opportunity.deadline) {
    const deadline = new Date(opportunity.registrationDeadline || opportunity.deadline)
    const days = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24))
    if (days >= 0 && days <= 7 && ['open', 'published', 'active'].includes(raw)) {
      return 'CLOSING_SOON'
    }
    if (days < 0) return 'CLOSED'
  }
  return OPPORTUNITY_STATUS_LABELS[raw] || raw.toUpperCase()
}

function analyzeProfileCompleteness(student, context) {
  const missing = []
  const optional = []
  let score = 0
  const weights = {
    skills: 15,
    verifiedSkills: 10,
    projects: 20,
    certifications: 10,
    careerGoal: 10,
    education: 15,
    cgpa: 10,
    portfolio: 10,
  }

  const hasSkills = (student.sharedSkills?.length || 0) + (student.verifiedSkills?.length || 0) > 0
  if (hasSkills) score += weights.skills
  else missing.push('Add skills to your profile')

  if ((student.verifiedSkills || []).length) score += weights.verifiedSkills
  else optional.push('Verified skills strengthen matches')

  const projects = (student.sharedProjects || []).filter(isProjectVisible)
  if (projects.length) score += weights.projects
  else missing.push('Add portfolio project evidence')

  const certs = (student.certifications || []).filter(isCertificateVisible)
  if (certs.length) score += weights.certifications
  else optional.push('Certifications add evidence')

  if (context.careerGoal) score += weights.careerGoal
  else optional.push('Set a career goal for better recommendations')

  if (student.department && student.course) score += weights.education
  else missing.push('Complete education details')

  if (student.cgpa != null) score += weights.cgpa
  else optional.push('CGPA helps eligibility checks')

  if (projects.some((p) => p.repositoryUrl || p.demoUrl)) score += weights.portfolio
  else optional.push('Link repository or demo URLs to projects')

  let level = 'INCOMPLETE'
  if (score >= 85) level = 'COMPLETE'
  else if (score >= 65) level = 'GOOD'
  else if (score >= 40) level = 'PARTIAL'

  return {
    level,
    score,
    missing,
    optional,
    explanation: {
      what: `Profile completeness: ${level.replace(/_/g, ' ')}`,
      why: missing.length
        ? `${missing.length} recommended field(s) would improve matching quality.`
        : 'Core profile fields are present for matching.',
      source: 'InstitutionStudent + authorized context',
    },
  }
}

function buildSkillEvidenceForMatch(student, requiredSkills = []) {
  const evidenceMap = collectSkillEvidence(student)
  const matched = []
  const missing = []
  const unknown = []

  for (const raw of requiredSkills) {
    const key = String(raw).trim().toLowerCase()
    let found = null
    for (const [skillKey, entry] of evidenceMap.entries()) {
      if (skillKey.includes(key) || key.includes(skillKey)) {
        found = entry
        break
      }
    }
    if (found) {
      matched.push({
        skill: raw,
        evidenceLevel: found.level,
        evidence: (found.sources || []).slice(0, 2).map((s) => ({
          type: s.type,
          title: s.title || null,
        })),
      })
    } else if (!raw) {
      unknown.push(raw)
    } else {
      missing.push({ skill: raw, status: 'MISSING' })
    }
  }

  return { matched, missing, unknown }
}

function categorizeRequirements(eligibility, skillMatch) {
  const matched = []
  const missing = []
  const unknown = []

  for (const check of eligibility.checks || []) {
    if (check.status === CHECK_STATUS.PASS) matched.push({ category: check.category, label: check.label, detail: check.detail })
    else if (check.status === CHECK_STATUS.UNKNOWN) unknown.push({ category: check.category, label: check.label, detail: check.detail })
    else missing.push({ category: check.category, label: check.label, detail: check.detail })
  }

  for (const check of skillMatch.checks || []) {
    if (check.status === CHECK_STATUS.PASS) {
      matched.push({ category: 'skill', label: check.skill, detail: check.label })
    } else if (check.status === CHECK_STATUS.UNKNOWN) {
      unknown.push({ category: 'skill', label: check.skill, detail: 'Insufficient data' })
    } else {
      missing.push({ category: 'skill', label: check.skill, detail: check.label })
    }
  }

  return { matchedRequirements: matched, missingRequirements: missing, unknownRequirements: unknown }
}

async function getMatchDetail(userId, source, sourceId) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    const err = new Error('Institution link required')
    err.statusCode = 403
    throw err
  }

  const cached = getCachedMatch(userId, source, sourceId, context)
  if (cached) return { ...cached, fromCache: true }

  const explanation = await getMatchExplanation(userId, source, sourceId)
  const { opportunity, match } = explanation
  const student = context.student
  const rules = opportunity.eligibilityRules || { requiredSkills: opportunity.requiredSkills || [] }
  const eligibility = buildEligibilityChecklist(student, rules)
  const skillMatch = matchRequiredSkills(opportunity.requiredSkills || [], student)
  const skillEvidence = buildSkillEvidenceForMatch(student, opportunity.requiredSkills || [])
  const requirements = categorizeRequirements(eligibility, skillMatch)

  const learningRelevant = context.skills?.length
    ? skillEvidence.missing
        .filter((m) => m.skill)
        .map((m) => ({ skill: m.skill, status: 'CURRENTLY_LEARNING', note: 'Check learning roadmap for progress' }))
    : []

  const projectRelevant = (context.projects || [])
    .filter((p) =>
      (p.technologies || []).some((t) =>
        (opportunity.requiredSkills || []).some((r) =>
          String(t).toLowerCase().includes(String(r).toLowerCase()),
        ),
      ),
    )
    .map((p) => ({ title: p.title, technologies: p.technologies }))

  const researchRelevant = (context.researchTopics || []).slice(0, 5)

  const result = {
    generatedAt: new Date().toISOString(),
    opportunity: {
      id: opportunity.id,
      source: opportunity.source,
      title: opportunity.title,
      organizer: opportunity.organizer,
      status: resolveOpportunityStatus(opportunity),
      requiredSkills: opportunity.requiredSkills || [],
      deadline: opportunity.deadline || opportunity.registrationDeadline,
      mode: opportunity.mode,
      location: opportunity.location,
    },
    match: {
      category: mapMatchCategory(match.matchLevel, match.eligibility?.result),
      matchLevel: match.matchLevel,
      matchStatus: match.matchStatus,
      reasons: match.reasons,
      nextStep: match.nextAction,
      actionable: match.actionable,
    },
    alignment: {
      explainableScore: match.explainableScore,
      disclaimer: 'Score reflects profile-to-requirement alignment, not hiring probability.',
    },
    requirements,
    skillEvidence,
    relevant: {
      projects: projectRelevant,
      learning: learningRelevant,
      research: researchRelevant,
    },
    explanation: {
      matched: skillEvidence.matched.map((m) => m.skill),
      missing: skillEvidence.missing.map((m) => m.skill),
      unknown: requirements.unknownRequirements.map((u) => u.label),
      nextStep: match.nextAction,
      source: 'Eligibility engine + skill evidence graph + opportunity matching',
    },
    fromCache: false,
  }

  setCachedMatch(userId, source, sourceId, context, result)
  return result
}

async function getApplicationReadiness(userId, source, sourceId) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    return { state: 'INCOMPLETE', note: 'Institution link required.' }
  }

  const detail = await getMatchDetail(userId, source, sourceId)
  const completeness = analyzeProfileCompleteness(context.student, context)
  const prep = await buildPreparationPlan(userId, source, sourceId)

  let state = 'NEEDS_IMPROVEMENT'
  if (detail.match.matchStatus === MATCH_STATUS.NOT_ELIGIBLE || detail.match.category === 'NOT_ELIGIBLE') {
    state = 'NOT_ELIGIBLE'
  } else if (
    completeness.level === 'COMPLETE' &&
    detail.requirements.missingRequirements.length === 0 &&
    detail.match.actionable
  ) {
    state = 'READY'
  } else if (completeness.level === 'INCOMPLETE') {
    state = 'INCOMPLETE'
  }

  return {
    state,
    safeToApply: state === 'READY' || (state === 'NEEDS_IMPROVEMENT' && detail.match.actionable),
    requiresUserConfirmation: true,
    profileCompleteness: completeness,
    match: detail.match,
    requirements: detail.requirements,
    preparation: prep.checklist,
    explanation: {
      what: `Application readiness: ${state.replace(/_/g, ' ')}`,
      why: detail.explanation.nextStep,
      gaps: detail.requirements.missingRequirements.slice(0, 5),
      source: 'Profile completeness + match detail + preparation plan',
    },
    disclaimer: 'Submission requires explicit user confirmation. AI does not auto-apply.',
  }
}

async function browseMarketplace(userId, filters = {}) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    return { hasInstitutionLink: false, items: [], filters: {} }
  }

  const { items } = await loadAllOpportunities(userId, filters)
  const applicationState = await loadApplicationState(userId, context.student)

  let matched = items.map((opp) => {
    const m = matchOpportunity(opp, context, applicationState)
    return {
      ...opp,
      status: resolveOpportunityStatus(opp),
      match: m,
      matchCategory: mapMatchCategory(m.matchLevel, m.eligibility?.result),
    }
  })

  if (filters.status && filters.status !== 'all') {
    matched = matched.filter((i) => i.status === filters.status)
  }
  if (filters.matchCategory) {
    matched = matched.filter((i) => i.matchCategory === filters.matchCategory)
  }
  if (filters.kind && filters.kind !== 'all') {
    matched = matched.filter((i) => i.kind === filters.kind || i.source === filters.kind)
  }

  matched.sort((a, b) => (b.match.explainableScore?.compositeRank || 0) - (a.match.explainableScore?.compositeRank || 0))

  const limit = Math.min(parseInt(filters.limit, 10) || 30, 50)
  return {
    hasInstitutionLink: true,
    generatedAt: new Date().toISOString(),
    items: matched.slice(0, limit),
    total: matched.length,
    filters: {
      kinds: ['job', 'internship', 'event', 'hackathon', 'research', 'campus_drive'],
      statuses: ['OPEN', 'CLOSING_SOON', 'CLOSED'],
      matchCategories: ['STRONG_MATCH', 'GOOD_MATCH', 'PARTIAL_MATCH', 'LOW_MATCH', 'NOT_ELIGIBLE'],
    },
  }
}

async function getPersonalizedFeed(userId, filters = {}) {
  const [feed, completeness] = await Promise.all([
    getStudentFeed(userId, filters),
    buildOpportunityContext(userId).then((ctx) =>
      ctx.hasInstitutionLink ? analyzeProfileCompleteness(ctx.student, ctx) : null,
    ),
  ])

  return {
    ...feed,
    profileCompleteness: completeness,
    sections: {
      strongMatches: feed.strongMatches || [],
      closingSoon: feed.closingSoon || [],
      recommended: feed.strongMatches || [],
      newOpportunities: (feed.explore || []).slice(0, 10),
      skillBuilding: feed.skillBuilding || [],
    },
  }
}

async function getMatchingAnalytics(userId) {
  const feed = await getStudentFeed(userId, { limit: 50 })
  const all = [
    ...(feed.strongMatches || []),
    ...(feed.closingSoon || []),
    ...(feed.skillBuilding || []),
    ...(feed.explore || []),
  ]

  const byCategory = {}
  for (const item of all) {
    const cat = mapMatchCategory(item.match?.matchLevel, item.match?.eligibility?.result)
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }

  const gapSkills = new Set()
  for (const item of all) {
    for (const g of item.match?.missingRequirements || []) gapSkills.add(g)
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: feed.totals,
    matchDistribution: byCategory,
    topSkillGaps: [...gapSkills].slice(0, 10),
    eligibilityFailures: all.filter((i) => i.match?.matchStatus === MATCH_STATUS.NOT_ELIGIBLE).length,
    disclaimer: 'Aggregate matching analytics. Not hiring probability.',
  }
}

module.exports = {
  analyzeProfileCompleteness,
  getMatchDetail,
  getApplicationReadiness,
  browseMarketplace,
  getPersonalizedFeed,
  getMatchingAnalytics,
  invalidateUserMatchCache,
  buildSkillEvidenceForMatch,
  categorizeRequirements,
  resolveOpportunityStatus,
}
