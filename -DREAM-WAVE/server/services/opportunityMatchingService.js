const mongoose = require('mongoose')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const InstitutionResearchOpportunityApplication = require('../models/InstitutionResearchOpportunityApplication')
const OpportunityMatchFeedback = require('../models/OpportunityMatchFeedback')
const {
  MATCH_LEVELS,
  MATCH_STATUS,
  RANK_WEIGHTS,
} = require('../constants/opportunityMatching')
const {
  buildEligibilityChecklist,
  matchRequiredSkills,
  jobToEligibilityRules,
} = require('./recruitmentIntelligenceService')
const { buildOpportunityContext, keywordOverlap, normalizeText } = require('./opportunityContextService')
const studentRecruitmentService = require('./studentRecruitmentService')
const eventOpportunityService = require('./eventOpportunityService')

function err(message, code = 400) {
  const e = new Error(message)
  e.statusCode = code
  return e
}

function oid(value) {
  if (!value) return null
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
}

function notProvided(value) {
  if (value === null || value === undefined || value === '') return 'NOT PROVIDED'
  return value
}

function canonicalKey(source, id) {
  return `${source}:${id}`
}

function daysUntil(date) {
  if (!date) return null
  const ms = new Date(date).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function mapRecruitmentItem(item) {
  const kind =
    item.opportunityType === 'internship'
      ? 'internship'
      : item.opportunityType === 'full_time'
        ? 'job'
        : item.opportunityType === 'hackathon'
          ? 'hackathon'
          : 'career_event'
  return {
    id: item.id,
    source: item.sourceType,
    kind,
    category: kind,
    title: item.title,
    organizer: item.companyName || 'NOT PROVIDED',
    description: item.eligibilityText || '',
    requiredSkills: item.requiredSkills || [],
    eligibilityRules: item.eligibilityRules || {},
    deadline: item.deadline,
    registrationDeadline: item.deadline,
    location: item.location || 'NOT PROVIDED',
    mode: 'NOT PROVIDED',
    status: item.status,
    isEvent: false,
    isHackathon: item.opportunityType === 'hackathon',
    isJob: item.sourceType === 'job',
    isInternship: item.sourceType === 'internship',
    isResearch: false,
    registrationOpen: item.status === 'open' && (!item.deadline || new Date(item.deadline) >= new Date()),
    capacity: null,
    href:
      item.sourceType === 'job' || item.sourceType === 'internship'
        ? '/ai/career/jobs'
        : `/events/${item.sourceType}/${item.id}`,
  }
}

function mapEventItem(item) {
  return {
    id: item.id,
    source: item.source,
    kind: item.category || item.type || 'event',
    category: item.category || item.type || 'event',
    title: item.title,
    organizer: item.organizer || 'NOT PROVIDED',
    description: item.description || '',
    requiredSkills: item.requiredSkills || [],
    eligibilityRules: item.eligibilityRules || {},
    deadline: item.registrationDeadline || item.endDate,
    registrationDeadline: item.registrationDeadline,
    startDate: item.startDate,
    location: item.city || item.venue || 'NOT PROVIDED',
    mode: item.mode || 'NOT PROVIDED',
    status: item.status,
    isEvent: true,
    isHackathon: item.isHackathon || item.category === 'hackathon',
    isJob: false,
    isInternship: item.category === 'internship' || item.type === 'internship',
    isResearch: item.source === 'research_opportunity',
    registrationOpen: item.registrationOpen !== false,
    capacity: item.capacity,
    href: `/events/${item.source}/${item.id}`,
    hackathonDetails: item.hackathonDetails || null,
    isRegistered: item.isRegistered,
    registrationStatus: item.registrationStatus,
  }
}

async function loadAllOpportunities(userId, filters = {}) {
  const [recruitment, events] = await Promise.all([
    studentRecruitmentService.browseOpportunities(userId, { limit: 100, page: 1, ...filters }),
    eventOpportunityService.browseEvents(userId, { limit: 100, page: 1, ...filters }),
  ])

  const seen = new Set()
  const items = []

  for (const ev of events.items || []) {
    const key = canonicalKey(ev.source, ev.id)
    if (seen.has(key)) continue
    seen.add(key)
    items.push(mapEventItem(ev))
  }

  for (const rec of recruitment.items || []) {
    if (rec.sourceType === 'campus_opportunity') {
      const key = canonicalKey('campus_opportunity', rec.id)
      if (seen.has(key)) continue
    }
    const key = canonicalKey(rec.sourceType, rec.id)
    if (seen.has(key)) continue
    seen.add(key)
    items.push(mapRecruitmentItem(rec))
  }

  return {
    items,
    hasInstitutionLink: recruitment.hasInstitutionLink || events.hasInstitutionLink,
  }
}

async function loadApplicationState(userId, student) {
  const [recruitmentApps, researchApps] = await Promise.all([
    RecruitmentApplication.find({
      institutionStudentId: student._id,
      stage: { $nin: ['rejected', 'withdrawn'] },
    }).lean(),
    InstitutionResearchOpportunityApplication.find({
      applicantUserId: oid(userId),
      status: { $nin: ['rejected', 'withdrawn'] },
    }).lean(),
  ])

  const applied = new Map()
  for (const app of recruitmentApps) {
    if (app.campusOpportunityId) applied.set(canonicalKey('campus_opportunity', app.campusOpportunityId.toString()), app)
    if (app.jobId) applied.set(canonicalKey('job', app.jobId.toString()), app)
    if (app.internshipId) applied.set(canonicalKey('internship', app.internshipId.toString()), app)
  }
  for (const app of researchApps) {
    applied.set(canonicalKey('research_opportunity', app.opportunityId.toString()), app)
  }
  return applied
}

function computeSoftSignals(opportunity, context) {
  const signals = []
  const reasons = []
  const required = opportunity.requiredSkills || []

  const skillMatch = matchRequiredSkills(required, context.student)
  if (skillMatch.matchedCount > 0) {
    signals.push('SKILL_MATCH')
    reasons.push({
      type: 'SKILL_MATCH',
      label: `${skillMatch.matchedCount} required skill(s) matched with evidence`,
      detail: skillMatch.checks.filter((c) => c.status === 'pass').map((c) => c.skill).join(', '),
    })
  }

  const careerGoal = context.careerGoal
  if (careerGoal && (keywordOverlap(careerGoal, opportunity.title) || keywordOverlap(careerGoal, opportunity.description))) {
    signals.push('CAREER_MATCH')
    signals.push('GOAL_MATCH')
    reasons.push({
      type: 'CAREER_MATCH',
      label: `Relevant to your career goal: ${careerGoal}`,
      detail: opportunity.title,
    })
  }

  for (const project of context.projects || []) {
    const techs = (project.technologies || []).map(normalizeText)
    const overlap = required.some((r) => techs.some((t) => t.includes(normalizeText(r)) || normalizeText(r).includes(t)))
    if (overlap) {
      signals.push('PROJECT_MATCH')
      reasons.push({
        type: 'PROJECT_MATCH',
        label: `Project "${project.title}" relates to required skills`,
        detail: (project.technologies || []).slice(0, 5).join(', '),
      })
      break
    }
  }

  const roadmapSkills = (context.roadmaps || []).flatMap((r) => r.skills || [])
  const learningOverlap = required.some((r) =>
    roadmapSkills.some((s) => keywordOverlap(s, r) || normalizeText(s).includes(normalizeText(r))),
  )
  if (learningOverlap) {
    signals.push('LEARNING_MATCH')
    reasons.push({
      type: 'LEARNING_MATCH',
      label: 'Requires skills you are currently learning',
      detail: required.filter((r) => roadmapSkills.some((s) => keywordOverlap(s, r))).join(', '),
    })
  }

  for (const topic of context.researchTopics || []) {
    if (keywordOverlap(topic, opportunity.title) || required.some((r) => keywordOverlap(topic, r))) {
      signals.push('RESEARCH_MATCH')
      reasons.push({
        type: 'RESEARCH_MATCH',
        label: `Research interest "${topic}" aligns with this opportunity`,
        detail: topic,
      })
      break
    }
  }

  const days = daysUntil(opportunity.registrationDeadline || opportunity.deadline)
  if (days !== null && days >= 0 && days <= 7 && opportunity.registrationOpen) {
    signals.push('TIMING_MATCH')
    reasons.push({
      type: 'TIMING_MATCH',
      label: days === 0 ? 'Registration closes today' : `Registration closes in ${days} day(s)`,
      detail: new Date(opportunity.registrationDeadline || opportunity.deadline).toISOString(),
    })
  }

  return { signals: [...new Set(signals)], reasons, skillMatch }
}

function computeMatchLevel(eligibilityResult, skillMatch, softSignalCount, hardBlocked) {
  if (hardBlocked || eligibilityResult === 'NOT_ELIGIBLE') return MATCH_LEVELS.NOT_ELIGIBLE
  if (eligibilityResult === 'NEEDS_REVIEW') {
    return softSignalCount >= 2 ? MATCH_LEVELS.POTENTIAL_MATCH : MATCH_LEVELS.NEEDS_REVIEW
  }
  const coverage = skillMatch?.coveragePercent ?? 0
  if (coverage >= 60 && softSignalCount >= 1) return MATCH_LEVELS.STRONG_MATCH
  if (coverage >= 40 || softSignalCount >= 2) return MATCH_LEVELS.GOOD_MATCH
  if (coverage > 0 || softSignalCount >= 1) return MATCH_LEVELS.POTENTIAL_MATCH
  return MATCH_LEVELS.POTENTIAL_MATCH
}

function computeCompositeRank(eligibilityResult, skillCoverage, softCount, deadlineDays) {
  const eligibilityScore =
    eligibilityResult === 'ELIGIBLE' ? 100 : eligibilityResult === 'NEEDS_REVIEW' ? 50 : 0
  const softScore = Math.min(100, softCount * 25)
  let urgency = 0
  if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 14) {
    urgency = Math.max(0, 100 - deadlineDays * 7)
  }
  return (
    (eligibilityScore * RANK_WEIGHTS.eligibility +
      skillCoverage * RANK_WEIGHTS.skillCoverage +
      softScore * RANK_WEIGHTS.softSignals +
      urgency * RANK_WEIGHTS.deadlineUrgency) /
    100
  )
}

function matchOpportunity(opportunity, context, applicationState = new Map()) {
  const key = canonicalKey(opportunity.source, opportunity.id)
  const existingApp = applicationState.get(key)

  const hardBlocked = []
  let matchStatus = MATCH_STATUS.MATCHED

  if (existingApp || opportunity.isRegistered) {
    matchStatus = MATCH_STATUS.ALREADY_APPLIED
  } else if (!opportunity.registrationOpen) {
    matchStatus = MATCH_STATUS.REGISTRATION_CLOSED
    hardBlocked.push('Registration is closed or deadline has passed')
  }

  const rules = opportunity.eligibilityRules || {}
  const eligibility = context.student
    ? buildEligibilityChecklist(context.student, rules, existingApp || null)
    : { result: 'NEEDS_REVIEW', checks: [], skillMatch: { checks: [], matchedCount: 0, coveragePercent: 0 } }

  const hasHardFail = (eligibility.checks || []).some((c) => c.status === 'fail')
  const effectiveEligibility =
    eligibility.result === 'NEEDS_REVIEW' && !hasHardFail ? 'ELIGIBLE' : eligibility.result

  const { signals, reasons, skillMatch } = context.student
    ? computeSoftSignals(opportunity, context)
    : { signals: [], reasons: [], skillMatch: { coveragePercent: 0, matchedCount: 0, checks: [] } }

  if (eligibility.result === 'NOT_ELIGIBLE' && matchStatus === MATCH_STATUS.MATCHED) {
    matchStatus = MATCH_STATUS.NOT_ELIGIBLE
    hardBlocked.push('Hard eligibility requirements not met')
  } else if (eligibility.result === 'NEEDS_REVIEW' && hasHardFail && matchStatus === MATCH_STATUS.MATCHED) {
    matchStatus = MATCH_STATUS.NEEDS_REVIEW
  }

  const missingRequirements = (skillMatch.checks || [])
    .filter((c) => c.status !== 'pass')
    .map((c) => c.skill)
    .filter(Boolean)

  const matchLevel = computeMatchLevel(
    effectiveEligibility,
    skillMatch,
    signals.length,
    matchStatus === MATCH_STATUS.NOT_ELIGIBLE || matchStatus === MATCH_STATUS.REGISTRATION_CLOSED,
  )

  const deadlineDays = daysUntil(opportunity.registrationDeadline || opportunity.deadline)
  const compositeRank = computeCompositeRank(effectiveEligibility, skillMatch.coveragePercent || 0, signals.length, deadlineDays)

  let nextAction = 'View opportunity'
  if (matchStatus === MATCH_STATUS.ALREADY_APPLIED) {
    nextAction = `Application status: ${existingApp?.stage || opportunity.registrationStatus || 'Registered'}`
  } else if (matchStatus === MATCH_STATUS.REGISTRATION_CLOSED) {
    nextAction = 'Registration closed — explore other opportunities'
  } else if (matchStatus === MATCH_STATUS.NOT_ELIGIBLE) {
    nextAction = 'Review eligibility requirements'
  } else if (missingRequirements.length) {
    nextAction = `Prepare: ${missingRequirements.slice(0, 3).join(', ')}`
  } else if (matchStatus === MATCH_STATUS.MATCHED) {
    nextAction = opportunity.isEvent ? 'Register' : 'Apply'
  }

  return {
    opportunityId: opportunity.id,
    source: opportunity.source,
    matchLevel,
    matchStatus,
    hardBlocked,
    reasons,
    missingRequirements,
    deadline: notProvided(opportunity.registrationDeadline || opportunity.deadline),
    daysUntilDeadline: deadlineDays,
    nextAction,
    applicationStatus: existingApp
      ? { stage: existingApp.stage || existingApp.status, appliedAt: existingApp.createdAt }
      : opportunity.isRegistered
        ? { stage: opportunity.registrationStatus || 'registered' }
        : null,
    signals,
    eligibility: {
      result: eligibility.result,
      checks: (eligibility.checks || []).slice(0, 12),
    },
    explainableScore: {
      skillCoverage: skillMatch.coveragePercent || 0,
      eligibilityResult: eligibility.result,
      softSignalCount: signals.length,
      compositeRank: Math.round(compositeRank * 10) / 10,
      rankFormula: 'eligibility(40%) + skillCoverage(30%) + softSignals(20%) + deadlineUrgency(10%)',
    },
    actionable: matchStatus === MATCH_STATUS.MATCHED || matchStatus === MATCH_STATUS.NEEDS_REVIEW,
  }
}

async function getStudentFeed(userId, filters = {}) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    return {
      hasInstitutionLink: false,
      strongMatches: [],
      closingSoon: [],
      skillBuilding: [],
      explore: [],
      totals: { all: 0 },
    }
  }

  const { items } = await loadAllOpportunities(userId, filters)
  const applicationState = await loadApplicationState(userId, context.student)

  const matched = items.map((opp) => ({
    ...opp,
    match: matchOpportunity(opp, context, applicationState),
  }))

  matched.sort((a, b) => b.match.explainableScore.compositeRank - a.match.explainableScore.compositeRank)

  const strongMatches = matched.filter(
    (m) =>
      [MATCH_LEVELS.STRONG_MATCH, MATCH_LEVELS.GOOD_MATCH, MATCH_LEVELS.POTENTIAL_MATCH].includes(
        m.match.matchLevel,
      ) &&
      m.match.actionable &&
      m.match.matchStatus !== MATCH_STATUS.ALREADY_APPLIED &&
      m.match.reasons.length > 0,
  )

  const closingSoon = matched
    .filter(
      (m) =>
        m.match.daysUntilDeadline !== null &&
        m.match.daysUntilDeadline >= 0 &&
        m.match.daysUntilDeadline <= 14 &&
        m.match.actionable,
    )
    .sort((a, b) => a.match.daysUntilDeadline - b.match.daysUntilDeadline)
    .slice(0, 10)

  const skillBuilding = matched.filter(
    (m) =>
      m.match.missingRequirements.length > 0 &&
      m.match.matchLevel !== MATCH_LEVELS.NOT_ELIGIBLE &&
      m.match.matchStatus !== MATCH_STATUS.REGISTRATION_CLOSED,
  )

  const dismissed = await OpportunityMatchFeedback.find({
    userId: oid(userId),
    action: 'dismiss',
  })
    .select('source sourceId')
    .lean()
  const dismissedSet = new Set(dismissed.map((d) => canonicalKey(d.source, d.sourceId.toString())))

  const filteredStrong = strongMatches.filter((m) => !dismissedSet.has(canonicalKey(m.source, m.id)))

  return {
    hasInstitutionLink: true,
    contextSummary: {
      careerGoal: context.careerGoal || 'NOT PROVIDED',
      skillCount: context.skills.length,
      projectCount: context.projects.length,
      researchTopicCount: context.researchTopics.length,
    },
    strongMatches: filteredStrong.slice(0, 20),
    closingSoon: closingSoon.slice(0, 10),
    skillBuilding: skillBuilding.slice(0, 10),
    explore: matched.slice(0, 50),
    totals: {
      all: matched.length,
      strong: filteredStrong.length,
      closingSoon: closingSoon.length,
      skillBuilding: skillBuilding.length,
    },
  }
}

async function getMatchExplanation(userId, source, sourceId) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) throw err('Institution link required', 403)

  const { items } = await loadAllOpportunities(userId, { limit: 200 })
  const opportunity = items.find((i) => i.source === source && i.id === sourceId)
  if (!opportunity) throw err('Opportunity not found', 404)

  const applicationState = await loadApplicationState(userId, context.student)
  return {
    opportunity,
    match: matchOpportunity(opportunity, context, applicationState),
    contextUsed: {
      careerGoal: context.careerGoal || 'NOT PROVIDED',
      skillsSample: context.skills.slice(0, 10),
      projectsSample: context.projects.slice(0, 3).map((p) => p.title),
      researchTopics: context.researchTopics.slice(0, 5),
    },
  }
}

async function compareOpportunities(userId, items = []) {
  if (!Array.isArray(items) || items.length < 2 || items.length > 4) {
    throw err('Provide 2–4 opportunities to compare', 400)
  }
  const comparisons = []
  for (const item of items) {
    const explanation = await getMatchExplanation(userId, item.source, item.id)
    comparisons.push({
      id: item.id,
      source: item.source,
      title: explanation.opportunity.title,
      kind: explanation.opportunity.kind,
      organizer: explanation.opportunity.organizer,
      deadline: explanation.opportunity.deadline,
      mode: explanation.opportunity.mode,
      location: explanation.opportunity.location,
      requiredSkills: explanation.opportunity.requiredSkills,
      matchLevel: explanation.match.matchLevel,
      matchStatus: explanation.match.matchStatus,
      reasons: explanation.match.reasons,
      missingRequirements: explanation.match.missingRequirements,
      applicationStatus: explanation.match.applicationStatus,
    })
  }
  return { comparisons, disclaimer: 'Comparison uses available records only. Missing fields shown as NOT PROVIDED.' }
}

async function buildPreparationPlan(userId, source, sourceId) {
  const { opportunity, match, contextUsed } = await getMatchExplanation(userId, source, sourceId)
  const required = opportunity.requiredSkills || []
  const missing = match.missingRequirements || []
  const matched = required.filter((r) => !missing.includes(r))

  const relevantProjects = (await buildOpportunityContext(userId)).projects.filter((p) =>
    (p.technologies || []).some((t) => required.some((r) => keywordOverlap(t, r))),
  )

  const learningSuggestions = missing.map((skill) => ({
    skill,
    suggestion: `Study ${skill} fundamentals`,
    source: 'learning_roadmap',
  }))

  return {
    opportunity: { id: opportunity.id, source: opportunity.source, title: opportunity.title },
    checklist: {
      requiredSkills: required.length ? required : ['NOT PROVIDED'],
      matchedSkills: matched,
      missingSkills: missing,
      relevantProjects: relevantProjects.map((p) => p.title),
      learningSuggestions,
      documentationNeeded: opportunity.isJob || opportunity.isInternship ? ['Resume', 'Cover letter if required'] : [],
      registrationRequirements: opportunity.registrationOpen ? ['Complete registration before deadline'] : ['Registration closed'],
      deadline: notProvided(opportunity.registrationDeadline || opportunity.deadline),
    },
    nextAction: match.nextAction,
    contextUsed,
    disclaimer: 'Preparation guidance uses authorized profile evidence. Does not claim skill mastery.',
  }
}

async function recordFeedback(userId, { source, sourceId, action, metadata = {} }) {
  const blocked = ['userId', 'studentId', 'recommendationScore', 'eligibility', 'verifiedSkill']
  for (const key of Object.keys(metadata)) {
    if (blocked.includes(key)) throw err(`Cannot set ${key} via feedback`, 400)
  }
  await OpportunityMatchFeedback.create({
    userId: oid(userId),
    source,
    sourceId: oid(sourceId),
    action,
    metadata,
  })
  if (action === 'save' && ['campus_opportunity', 'innovation_event', 'alumni_event', 'research_opportunity'].includes(source)) {
    await eventOpportunityService.toggleSaved(userId, source, sourceId)
  }
  return { recorded: true, action }
}

async function parseNaturalLanguageQuery(userId, query = '') {
  const q = String(query).toLowerCase()
  const filters = {}
  const intents = []

  if (/hackathon/.test(q)) {
    filters.hackathon = 'true'
    intents.push('hackathon')
  }
  if (/internship/.test(q)) intents.push('internship')
  if (/job|full.?time|career/.test(q)) intents.push('job')
  if (/research/.test(q)) intents.push('research')
  if (/workshop/.test(q)) filters.category = 'workshop'
  if (/closing soon|deadline|urgent/.test(q)) filters.closingSoon = 'true'
  if (/react|python|ai|ml|node|cloud|docker|java/.test(q)) {
    const skillMatch = q.match(/react|python|ai\/ml|ai|ml|node\.?js|cloud|docker|java/g)
    if (skillMatch) filters.q = skillMatch[0]
  }
  const cleaned = q.replace(/find|show|which|for me|related to|help me|become|an? /g, ' ').trim()
  if (cleaned.length > 2 && !filters.q) filters.q = cleaned.split(/\s+/).slice(0, 4).join(' ')

  const feed = await getStudentFeed(userId, filters)
  return { query, parsedFilters: filters, detectedIntents: intents, feed }
}

module.exports = {
  loadAllOpportunities,
  matchOpportunity,
  getStudentFeed,
  getMatchExplanation,
  compareOpportunities,
  buildPreparationPlan,
  recordFeedback,
  parseNaturalLanguageQuery,
  buildOpportunityContext,
  loadApplicationState,
}
