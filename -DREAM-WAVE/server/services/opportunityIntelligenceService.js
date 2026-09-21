/**
 * Lasya V5 Prompt 8 — Opportunity Intelligence 2.0
 * Composes opportunityMatching, talentMarketplace, careerReadiness, adaptiveLearning,
 * projectIntelligence, knowledgeDiscovery — no duplicate engines.
 */
const crypto = require('crypto')
const OpportunityMatchFeedback = require('../models/OpportunityMatchFeedback')
const EventSaved = require('../models/EventSaved')
const OpportunitySnapshot = require('../models/OpportunitySnapshot')
const UserProfile = require('../models/UserProfile')
const InterviewSession = require('../models/InterviewSession')
const {
  MATCH_STATES,
  READINESS_STATES,
  INJECTION_PATTERNS,
  WORKFLOW_STAGES,
} = require('../constants/opportunityIntelligence')
const { MATCH_LEVELS, MATCH_STATUS } = require('../constants/opportunityMatching')
const opportunityMatching = require('./opportunityMatchingService')
const talentMarketplace = require('./talentMarketplaceService')
const careerReadiness = require('./careerReadinessService')
const adaptiveLearning = require('./adaptiveLearningService')
const projectIntelligence = require('./projectIntelligenceService')
const studentRecruitment = require('./studentRecruitmentService')
const eventOpportunity = require('./eventOpportunityService')
const { classifyDeadline, validateOpportunityQuality } = require('./opportunityQualityService')
const { keywordOverlap } = require('./opportunityContextService')

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 8000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

function notProvided(v) {
  if (v === null || v === undefined || v === '') return 'UNKNOWN'
  return v
}

function mapMatchState(matchLevel, matchStatus, hasData = true) {
  if (!hasData) return 'INSUFFICIENT_DATA'
  if (matchStatus === MATCH_STATUS.NOT_ELIGIBLE || matchLevel === MATCH_LEVELS.NOT_ELIGIBLE) return 'LOW_MATCH'
  if (matchLevel === MATCH_LEVELS.STRONG_MATCH) return 'STRONG_MATCH'
  if (matchLevel === MATCH_LEVELS.GOOD_MATCH) return 'MATCH'
  if (matchLevel === MATCH_LEVELS.POTENTIAL_MATCH || matchLevel === MATCH_LEVELS.NEEDS_REVIEW) return 'PARTIAL_MATCH'
  return 'LOW_MATCH'
}

function inferSourceType(source) {
  if (['job', 'internship'].includes(source)) return 'VERIFIED'
  if (['campus_opportunity', 'research_opportunity'].includes(source)) return 'OFFICIAL'
  if (['innovation_event', 'alumni_event'].includes(source)) return 'PARTNER'
  return 'INTERNAL'
}

function mapOpportunityType(opp) {
  if (opp.isJob) return 'JOB'
  if (opp.isInternship) return 'INTERNSHIP'
  if (opp.isHackathon) return 'HACKATHON'
  if (opp.isResearch) return 'RESEARCH_OPPORTUNITY'
  if (opp.category === 'competition') return 'COMPETITION'
  if (opp.category === 'scholarship') return 'SCHOLARSHIP'
  if (opp.isEvent) return 'EVENT'
  return 'EVENT'
}

function enrichMetadata(opp) {
  const deadline = opp.registrationDeadline || opp.deadline
  const dl = classifyDeadline(deadline)
  const quality = validateOpportunityQuality(opp)
  let freshness = 'UNKNOWN'
  if (dl.state === 'CLOSED') freshness = 'CLOSED'
  else if (opp.registrationOpen === false) freshness = 'CLOSED'
  else if (dl.state === 'UNKNOWN') freshness = 'UNKNOWN'
  else freshness = 'ACTIVE'

  return {
    opportunityId: opp.id,
    source: opp.source,
    type: mapOpportunityType(opp),
    sourceType: inferSourceType(opp.source),
    title: notProvided(opp.title),
    organization: notProvided(opp.organizer),
    role: opp.kind || 'UNKNOWN',
    location: notProvided(opp.location),
    remote: opp.mode === 'online' || opp.mode === 'remote' ? true : opp.mode === 'NOT PROVIDED' ? null : false,
    description: notProvided(opp.description),
    requiredSkills: opp.requiredSkills?.length ? opp.requiredSkills : ['UNKNOWN'],
    preferredSkills: opp.preferredSkills || [],
    deadline: deadline ? new Date(deadline).toISOString() : 'UNKNOWN',
    daysRemaining: dl.daysRemaining,
    duration: notProvided(opp.duration),
    eligibility: opp.eligibilityRules || {},
    applicationUrl: notProvided(opp.applicationUrl || opp.href),
    freshness,
    quality: quality.level,
    href: opp.href,
    status: notProvided(opp.status),
  }
}

function buildWhyRecommended(item, context) {
  const reasons = []
  const match = item.match
  if (match?.reasons?.length) {
    reasons.push(match.reasons[0].label)
  }
  if (context?.careerGoal && item.title) {
    reasons.push(`Relevant to your career goal: ${context.careerGoal}`)
  }
  if (match?.explainableScore?.skillCoverage >= 40) {
    reasons.push(`Skill coverage: ${match.explainableScore.skillCoverage}% of required skills demonstrated`)
  }
  if (match?.daysUntilDeadline != null && match.daysUntilDeadline <= 7) {
    reasons.push(`Deadline in ${match.daysUntilDeadline} day(s)`)
  }
  return reasons.length ? reasons.join('. ') : 'Based on your profile and opportunity requirements'
}

async function categorizeSkills(userId, required = [], preferred = []) {
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId).catch(() => ({ strengths: [], gaps: [] }))
  const profile = await UserProfile.findOne({ userId }).lean()
  const declared = profile?.skills || []

  const categorize = (skill) => {
    const sk = String(skill).toLowerCase()
    const strong = gapAnalysis.strengths?.find((s) => String(s.skill).toLowerCase().includes(sk))
    if (strong) return { skill, category: 'DEMONSTRATED', evidence: strong.state || 'demonstrated' }
    const inProgress = gapAnalysis.gaps?.find((g) => String(g.skill).toLowerCase().includes(sk) && ['LEARNING', 'PRACTICING', 'EXPLORING'].includes(g.status))
    if (inProgress) return { skill, category: 'IN_PROGRESS', evidence: inProgress.status }
    const declaredMatch = declared.some((d) => String(d).toLowerCase().includes(sk))
    if (declaredMatch) return { skill, category: 'IN_PROGRESS', evidence: 'declared_not_demonstrated' }
    return { skill, category: 'MISSING', evidence: 'no_evidence' }
  }

  return {
    required: required.map((s) => ({ ...categorize(s), requirementType: 'REQUIRED' })),
    preferred: preferred.map((s) => ({ ...categorize(s), requirementType: 'PREFERRED' })),
  }
}

async function getRelevantProjects(userId, requiredSkills = []) {
  const portfolio = await projectIntelligence.getPortfolio(userId).catch(() => ({ projects: [] }))
  return (portfolio.projects || []).filter((p) =>
    (p.technology || p.skills || []).some((t) =>
      requiredSkills.some((r) => keywordOverlap(String(t), String(r))),
    ),
  ).map((p) => ({
    projectId: p.projectId,
    title: p.title,
    skills: p.skills,
    evidence: p.evidence,
    relevance: 'Matches opportunity skill requirements',
  }))
}

async function getInterviewReadinessSignal(userId) {
  const sessions = await InterviewSession.find({ userId, status: 'COMPLETED' }).sort({ completedAt: -1 }).limit(5).lean()
  if (!sessions.length) {
    return { state: 'INSUFFICIENT_DATA', explanation: 'No completed mock interview sessions' }
  }
  const scores = sessions.flatMap((s) =>
    (s.answers || []).flatMap((a) => Object.values(a.scores || {}).filter((v) => v != null)),
  )
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return {
    state: avg != null && avg >= 60 ? 'PRACTICED' : 'NEEDS_PRACTICE',
    sessionsCompleted: sessions.length,
    averageScore: avg,
    explanation: `Based on ${sessions.length} mock interview session(s) — practice signal only, not employer readiness`,
  }
}

async function buildMatchExplanation(userId, source, sourceId) {
  const detail = await talentMarketplace.getMatchDetail(userId, source, sourceId)
  const metadata = enrichMetadata(detail.opportunity)
  const skillCategories = await categorizeSkills(
    userId,
    detail.opportunity.requiredSkills || [],
    detail.opportunity.preferredSkills || [],
  )
  const projects = await getRelevantProjects(userId, detail.opportunity.requiredSkills || [])
  const matchState = mapMatchState(detail.match.matchLevel, detail.match.matchStatus, true)

  return {
    metadata,
    matchState,
    matchLevel: detail.match.matchLevel,
    matchStatus: detail.match.matchStatus,
    whyItMatches: detail.explanation?.whyMatch || detail.match.reasons?.map((r) => r.label) || [],
    whatIsMissing: detail.requirements?.missingRequirements || detail.match.missingRequirements || [],
    whatIsUnknown: (detail.opportunity.requiredSkills?.length ? [] : ['Required skills not specified']),
    whatToDoNext: detail.explanation?.nextStep || detail.match.nextAction,
    skillCategories,
    relevantProjects: projects,
    signals: detail.match.signals || [],
    explainableScore: detail.match.explainableScore,
    disclaimer: 'Match reflects preparation alignment — not a guarantee of selection.',
  }
}

async function getApplicationStrategy(userId, source, sourceId) {
  const [explanation, prep, readiness, learningGaps, interview] = await Promise.all([
    buildMatchExplanation(userId, source, sourceId),
    opportunityMatching.buildPreparationPlan(userId, source, sourceId),
    talentMarketplace.getApplicationReadiness(userId, source, sourceId),
    adaptiveLearning.getSkillGapAnalysis(userId),
    getInterviewReadinessSignal(userId),
  ])

  const strengths = explanation.skillCategories.required
    .filter((s) => s.category === 'DEMONSTRATED')
    .slice(0, 3)
    .map((s) => s.skill)
  const gaps = explanation.whatIsMissing.slice(0, 3)
  const actions = []
  for (const g of gaps) {
    const gapDetail = learningGaps.gaps?.find((x) => keywordOverlap(x.skill, g))
    actions.push({
      action: gapDetail?.learnNext || `Build evidence for ${g}`,
      type: 'LEARNING',
      reason: `Required skill gap: ${g}`,
    })
  }
  if (explanation.relevantProjects.length === 0 && gaps.length) {
    actions.push({ action: 'Build a project demonstrating required skills', type: 'PROJECT', reason: 'No relevant portfolio project found' })
  } else if (explanation.relevantProjects.length) {
    actions.push({ action: `Emphasize project: ${explanation.relevantProjects[0].title}`, type: 'PORTFOLIO', reason: 'Relevant project evidence exists' })
  }
  if (interview.state === 'NEEDS_PRACTICE' || interview.state === 'INSUFFICIENT_DATA') {
    actions.push({ action: 'Complete mock interview practice', type: 'INTERVIEW', reason: interview.explanation })
  }

  const projRec = gaps.length
    ? await projectIntelligence.getSkillToProjectRecommendations(userId, { limit: 1 }).catch(() => ({ recommendations: [] }))
    : { recommendations: [] }

  return {
    opportunity: explanation.metadata,
    matchState: explanation.matchState,
    topStrengths: strengths.length ? strengths : ['Review match explanation for strengths'],
    topGaps: gaps.length ? gaps : ['No critical gaps identified from available requirements'],
    topActions: actions.slice(0, 3),
    recommendedProject: projRec.recommendations?.[0] || null,
    recommendedLearning: learningGaps.gaps?.slice(0, 2).map((g) => ({ skill: g.skill, next: g.learnNext })) || [],
    interviewTopics: explanation.metadata.requiredSkills.filter((s) => s !== 'UNKNOWN').slice(0, 5),
    interviewReadiness: interview,
    readiness: readiness.state,
    checklist: prep.checklist,
    workflowStage: readiness.state === 'READY' ? 'PREPARE' : 'REVIEW',
    disclaimer: 'Strategy is advisory. Application requires explicit user action.',
  }
}

async function getApplicationChecklist(userId, source, sourceId) {
  const strategy = await getApplicationStrategy(userId, source, sourceId)
  const opp = strategy.opportunity
  const items = []

  if (opp.type === 'JOB' || opp.type === 'INTERNSHIP') {
    items.push({ item: 'Resume', status: 'REVIEW', required: true })
    items.push({ item: 'Cover letter (if required)', status: 'OPTIONAL', required: false })
  }
  items.push({ item: 'Portfolio / project evidence', status: strategy.recommendedProject ? 'READY' : 'NEEDS_WORK', required: true })
  items.push({ item: 'Required skills', status: strategy.topGaps.length ? 'GAPS_REMAIN' : 'MET', required: true })
  if (opp.deadline !== 'UNKNOWN') {
    items.push({ item: 'Deadline', status: opp.daysRemaining != null && opp.daysRemaining >= 0 ? `${opp.daysRemaining} days remaining` : 'CLOSED', required: true })
  }
  items.push({ item: 'Interview preparation', status: strategy.interviewReadiness.state, required: false })
  items.push({ item: 'Application form / registration', status: 'USER_ACTION_REQUIRED', required: true })

  return {
    checklist: items,
    workflow: WORKFLOW_STAGES,
    currentStage: strategy.workflowStage,
    disclaimer: 'Checklist based on available opportunity data. Does not auto-submit.',
  }
}

async function getResumeMatching(userId, source, sourceId) {
  const explanation = await buildMatchExplanation(userId, source, sourceId)
  const profile = await UserProfile.findOne({ userId }).lean()
  const resumeSkills = profile?.skills || []
  const required = explanation.metadata.requiredSkills.filter((s) => s !== 'UNKNOWN')

  const matched = required.filter((r) =>
    resumeSkills.some((s) => keywordOverlap(s, r)) ||
    explanation.skillCategories.required.some((sc) => sc.skill === r && sc.category === 'DEMONSTRATED'),
  )
  const missing = required.filter((r) => !matched.includes(r))
  const underrepresented = explanation.skillCategories.required
    .filter((sc) => sc.category === 'DEMONSTRATED' && !resumeSkills.some((s) => keywordOverlap(s, sc.skill)))
    .map((sc) => sc.skill)

  return {
    matchedSkills: matched,
    missingSkills: missing,
    underrepresentedSkills: underrepresented,
    suggestions: underrepresented.map((s) => `Consider highlighting ${s} — you have evidence but it may not appear on your resume`),
    disclaimer: 'Resume matching uses declared skills and demonstrated evidence. Does not invent experience.',
  }
}

async function suggestResumeCustomization(userId, source, sourceId) {
  const [resumeMatch, explanation] = await Promise.all([
    getResumeMatching(userId, source, sourceId),
    buildMatchExplanation(userId, source, sourceId),
  ])

  const emphasize = [
    ...resumeMatch.matchedSkills.slice(0, 3).map((s) => ({ type: 'SKILL', value: s, reason: 'Matches opportunity requirements' })),
    ...explanation.relevantProjects.slice(0, 2).map((p) => ({ type: 'PROJECT', value: p.title, reason: p.relevance })),
  ]

  return {
    emphasize,
    highlight: resumeMatch.underrepresentedSkills.map((s) => ({ skill: s, action: `Add ${s} to skills section with project evidence` })),
    avoid: ['Do not claim skills without evidence', 'Do not invent experience or certifications'],
    disclaimer: 'Suggestions use your authorized profile data only. Never fabricate claims.',
  }
}

async function generateCoverLetterDraft(userId, source, sourceId) {
  const [strategy, profile] = await Promise.all([
    getApplicationStrategy(userId, source, sourceId),
    UserProfile.findOne({ userId }).lean(),
  ])

  const opp = strategy.opportunity
  const name = profile?.fullName || 'Candidate'
  const strengths = strategy.topStrengths.join(', ')
  const project = strategy.recommendedProject?.title || explanationProject(strategy)

  const draft = `[AI-GENERATED DRAFT — review and edit before use]

Dear Hiring Team,

I am writing to express interest in the ${opp.title} position at ${opp.organization}.

Based on my profile, I demonstrate strengths in ${strengths || 'relevant skills for this role'}.${project ? ` My project "${project}" provides evidence aligned with this opportunity's requirements.` : ''}

I am actively preparing for this application by addressing skill gaps in ${strategy.topGaps.join(', ') || 'areas identified in my readiness review'}.

I understand this is a preparation draft based on my authorized profile data. I have not verified company-specific culture or interview processes.

Sincerely,
${name}`

  return {
    draft: sanitizeText(draft),
    contentType: 'AI_GENERATED_DRAFT',
    disclaimer: 'Draft based on your profile only. Do not submit without review. Never fabricate achievements.',
  }
}

function explanationProject(strategy) {
  return strategy.recommendedProject?.title || null
}

async function getSavedOpportunities(userId) {
  const [eventSaved, feedbackSaved] = await Promise.all([
    EventSaved.find({ userId }).sort({ savedAt: -1 }).lean(),
    OpportunityMatchFeedback.find({ userId, action: 'save' }).sort({ createdAt: -1 }).lean(),
  ])

  const seen = new Set()
  const items = []

  for (const s of eventSaved) {
    const key = `${s.source}:${s.sourceId}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      const { opportunity, match } = await opportunityMatching.getMatchExplanation(userId, s.source, String(s.sourceId))
      items.push({ ...enrichMetadata(opportunity), matchState: mapMatchState(match.matchLevel, match.matchStatus), savedAt: s.savedAt })
    } catch {
      items.push({ source: s.source, opportunityId: s.sourceId, title: 'UNKNOWN', savedAt: s.savedAt })
    }
  }

  for (const f of feedbackSaved) {
    const key = `${f.source}:${f.sourceId}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      const { opportunity, match } = await opportunityMatching.getMatchExplanation(userId, f.source, String(f.sourceId))
      items.push({ ...enrichMetadata(opportunity), matchState: mapMatchState(match.matchLevel, match.matchStatus), savedAt: f.createdAt })
    } catch { /* skip inaccessible */ }
  }

  return { saved: items, total: items.length }
}

async function saveOpportunity(userId, source, sourceId) {
  await opportunityMatching.recordFeedback(userId, { source, sourceId, action: 'save' })
  return { saved: true, source, sourceId }
}

async function getApplications(userId) {
  const [recruitment, events] = await Promise.all([
    studentRecruitment.listMyApplications(userId).catch(() => ({ items: [] })),
    eventOpportunity.getMyEvents(userId).catch(() => ({ registered: [], saved: [] })),
  ])

  const apps = (recruitment.items || []).map((a) => ({
    source: a.sourceType || 'recruitment',
    opportunityId: a.opportunityId || a.jobId || a.internshipId,
    title: a.title || 'UNKNOWN',
    status: a.stage || a.status || 'APPLIED',
    appliedAt: a.createdAt,
    type: 'JOB',
  }))

  for (const e of events.registered || []) {
    apps.push({
      source: e.source,
      opportunityId: e.id,
      title: e.title,
      status: 'APPLIED',
      appliedAt: e.registeredAt,
      type: 'EVENT',
    })
  }

  return { applications: apps, disclaimer: 'Application data from authorized records only.' }
}

async function recordSnapshot(userId, source, sourceId, opportunity) {
  const fields = {
    title: opportunity.title,
    requiredSkills: opportunity.requiredSkills || [],
    preferredSkills: opportunity.preferredSkills || [],
    deadline: opportunity.registrationDeadline || opportunity.deadline,
    status: opportunity.status,
    description: (opportunity.description || '').slice(0, 500),
  }
  const hash = crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex')

  const existing = await OpportunitySnapshot.findOne({ userId, source, sourceId })
  let changes = []

  if (existing && existing.snapshotHash !== hash) {
    if (JSON.stringify(existing.fields.requiredSkills) !== JSON.stringify(fields.requiredSkills)) {
      changes.push({ field: 'requiredSkills', what: 'Requirements changed', impact: 'Your match may have changed because requirements were updated' })
    }
    if (String(existing.fields.deadline) !== String(fields.deadline)) {
      changes.push({ field: 'deadline', what: 'Deadline changed', impact: 'Review updated deadline' })
    }
    if (existing.fields.status !== fields.status) {
      changes.push({ field: 'status', what: 'Status changed', impact: `Status is now ${fields.status}` })
    }
  }

  await OpportunitySnapshot.findOneAndUpdate(
    { userId, source, sourceId },
    { snapshotHash: hash, fields, lastSeenAt: new Date() },
    { upsert: true },
  )

  return changes
}

async function getOpportunityDetail(userId, source, sourceId) {
  const explanation = await buildMatchExplanation(userId, source, sourceId)
  const [strategy, checklist, readiness, changes] = await Promise.all([
    getApplicationStrategy(userId, source, sourceId),
    getApplicationChecklist(userId, source, sourceId),
    careerReadiness.getOpportunityReadiness(userId, source, sourceId).catch(() => null),
    (async () => {
      const { opportunity } = await opportunityMatching.getMatchExplanation(userId, source, sourceId)
      return recordSnapshot(userId, source, sourceId, opportunity)
    })(),
  ])

  return {
    opportunity: explanation.metadata,
    match: {
      state: explanation.matchState,
      whyItMatches: explanation.whyItMatches,
      whatIsMissing: explanation.whatIsMissing,
      whatIsUnknown: explanation.whatIsUnknown,
      skillCategories: explanation.skillCategories,
      explainableScore: explanation.explainableScore,
    },
    preparation: {
      projects: explanation.relevantProjects,
      learning: strategy.recommendedLearning,
      interview: strategy.interviewReadiness,
      portfolio: strategy.recommendedProject,
      readiness: readiness?.readiness || strategy.readiness,
    },
    application: {
      checklist: checklist.checklist,
      strategy: {
        topStrengths: strategy.topStrengths,
        topGaps: strategy.topGaps,
        topActions: strategy.topActions,
      },
      status: strategy.workflowStage,
      readinessState: mapReadinessState(strategy.readiness),
    },
    changes,
    disclaimer: explanation.disclaimer,
  }
}

function mapReadinessState(state) {
  if (state === 'READY') return 'READY_TO_CONSIDER'
  if (state === 'INCOMPLETE' || state === 'NOT_ELIGIBLE') return 'INSUFFICIENT_DATA'
  return 'NEEDS_IMPROVEMENT'
}

async function getSmartFeed(userId, filters = {}) {
  const context = await opportunityMatching.buildOpportunityContext(userId)
  const feed = await talentMarketplace.getPersonalizedFeed(userId, filters)

  const enrich = (items = []) =>
    items.map((item) => ({
      ...enrichMetadata(item),
      matchState: mapMatchState(item.match?.matchLevel, item.match?.matchStatus, context.hasInstitutionLink),
      whyRecommended: buildWhyRecommended(item, context),
      nextAction: item.match?.nextAction,
      applicationStatus: item.match?.applicationStatus,
    }))

  const saved = await getSavedOpportunities(userId)
  const applications = await getApplications(userId)

  return {
    hasInstitutionLink: feed.hasInstitutionLink,
    categories: {
      forYou: enrich(feed.strongMatches),
      deadlinesSoon: enrich(feed.closingSoon),
      skillMatches: enrich(feed.skillBuilding),
      new: enrich(feed.explore?.slice(0, 10)),
      saved: saved.saved,
      applied: applications.applications,
    },
    profileCompleteness: feed.profileCompleteness,
    totals: feed.totals,
    disclaimer: 'Recommendations based on profile evidence — not employment guarantees.',
  }
}

async function searchOpportunities(userId, { q, role, skill, company, location, category, eligibility } = {}) {
  const filters = {}
  if (q) filters.q = q
  if (role) filters.q = role
  if (skill) filters.q = skill
  if (company) filters.q = company
  if (location) filters.location = location
  if (category) filters.category = category
  if (eligibility) filters.eligibility = eligibility

  if (q && q.length > 10) {
    const nl = await opportunityMatching.parseNaturalLanguageQuery(userId, q)
    return { results: nl.feed, parsedFilters: nl.parsedFilters, detectedIntents: nl.detectedIntents }
  }

  const feed = await getSmartFeed(userId, filters)
  const all = [
    ...feed.categories.forYou,
    ...feed.categories.deadlinesSoon,
    ...feed.categories.skillMatches,
    ...feed.categories.new,
  ]
  const seen = new Set()
  const unique = all.filter((i) => {
    const k = `${i.source}:${i.opportunityId}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return { results: unique, filters, total: unique.length }
}

async function getDashboard(userId) {
  const [feed, gaps, applications, analytics, actionPlan] = await Promise.all([
    getSmartFeed(userId),
    adaptiveLearning.getSkillGapAnalysis(userId).catch(() => ({ gaps: [] })),
    getApplications(userId),
    talentMarketplace.getMatchingAnalytics(userId).catch(() => null),
    careerReadiness.getCareerActionPlan(userId).catch(() => ({ plan: [] })),
  ])

  const topGaps = [...new Set(gaps.gaps?.slice(0, 5).map((g) => g.skill) || [])]
  const upcomingDeadlines = feed.categories.deadlinesSoon.slice(0, 5)

  return {
    sections: {
      recommended: feed.categories.forYou.slice(0, 5),
      saved: feed.categories.saved.slice(0, 5),
      preparing: applications.applications.filter((a) => a.status === 'PREPARING').slice(0, 5),
      applied: feed.categories.applied.slice(0, 5),
    },
    skillGaps: topGaps,
    deadlines: upcomingDeadlines,
    analytics: analytics ? { matchDistribution: analytics.matchDistribution, topSkillGaps: analytics.topSkillGaps } : null,
    actionPlan: actionPlan.plan?.slice(0, 2),
    coachPrompt: 'What should I prepare for next?',
    hasInstitutionLink: feed.hasInstitutionLink,
    disclaimer: feed.disclaimer,
  }
}

async function multiAgentMatchAnalysis(userId, { source, sourceId, question } = {}) {
  const q = sanitizeText(question)
  const agents = []

  if (source && sourceId) {
    const explanation = await buildMatchExplanation(userId, source, sourceId)
    agents.push({ agentId: 'OPPORTUNITY_AGENT', output: `${explanation.metadata.title} — ${explanation.matchState}` })
    agents.push({ agentId: 'SKILL_AGENT', output: `${explanation.skillCategories.required.filter((s) => s.category === 'DEMONSTRATED').length} demonstrated skill(s)` })

    const projects = explanation.relevantProjects
    agents.push({ agentId: 'PROJECT_AGENT', output: `${projects.length} relevant project(s)` })
    agents.push({ agentId: 'PORTFOLIO_AGENT', output: projects.length ? projects.map((p) => p.title).join(', ') : 'No direct project match' })

    const interview = await getInterviewReadinessSignal(userId)
    agents.push({ agentId: 'INTERVIEW_AGENT', output: interview.explanation })

    const gaps = await adaptiveLearning.getSkillGapAnalysis(userId)
    agents.push({ agentId: 'LEARNING_AGENT', output: gaps.gaps?.slice(0, 2).map((g) => g.skill).join(', ') || 'No gaps' })

    const strategy = await getApplicationStrategy(userId, source, sourceId)

    return {
      question: q || 'Should I apply for this opportunity?',
      agents,
      matchSummary: {
        state: explanation.matchState,
        strengths: strategy.topStrengths,
        gaps: strategy.topGaps,
        unknown: explanation.whatIsUnknown,
        nextActions: strategy.topActions,
      },
      disclaimer: 'Match summary — not a guarantee of selection.',
    }
  }

  const dashboard = await getDashboard(userId)
  return {
    question: q || 'Which opportunity should I prepare for first?',
    agents: [
      { agentId: 'OPPORTUNITY_AGENT', output: `${dashboard.sections.recommended.length} recommended opportunity(ies)` },
      { agentId: 'CAREER_AGENT', output: `Top gaps: ${dashboard.skillGaps.join(', ') || 'none'}` },
    ],
    matchSummary: {
      recommended: dashboard.sections.recommended.slice(0, 3).map((o) => o.title),
      nextActions: dashboard.actionPlan,
    },
    disclaimer: 'Advisory analysis only.',
  }
}

async function compareSelected(userId, items = []) {
  return opportunityMatching.compareOpportunities(userId, items)
}

async function getMatchAnalytics(userId) {
  return talentMarketplace.getMatchingAnalytics(userId)
}

async function opportunityCoach(userId, { question } = {}) {
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  const dashboard = await getDashboard(userId)

  if (/which|first|prepare|should i apply/i.test(q)) {
    const top = dashboard.sections.recommended[0]
    return {
      answer: top
        ? `Consider preparing for "${top.title}" (${top.matchState}). Top gaps: ${dashboard.skillGaps.join(', ') || 'none identified'}. ${dashboard.disclaimer}`
        : 'Link your institution account and set a career goal to receive recommendations.',
      contentType: 'OPPORTUNITY_COACH',
    }
  }

  if (/deadline|urgent|soon/i.test(q)) {
    const dl = dashboard.deadlines.map((d) => `${d.title}: ${d.daysRemaining ?? 'UNKNOWN'} days`).join('\n')
    return { answer: dl || 'No upcoming deadlines in your feed.', contentType: 'OPPORTUNITY_COACH' }
  }

  return {
    answer: `Opportunity Coach: Ask about which opportunity to prepare for, deadlines, or match explanations. I use authorized data only.`,
    contentType: 'OPPORTUNITY_COACH',
  }
}

module.exports = {
  getDashboard,
  getSmartFeed,
  searchOpportunities,
  getOpportunityDetail,
  buildMatchExplanation,
  getApplicationStrategy,
  getApplicationChecklist,
  getResumeMatching,
  suggestResumeCustomization,
  generateCoverLetterDraft,
  getSavedOpportunities,
  saveOpportunity,
  getApplications,
  multiAgentMatchAnalysis,
  compareSelected,
  getMatchAnalytics,
  opportunityCoach,
  enrichMetadata,
  mapMatchState,
}
