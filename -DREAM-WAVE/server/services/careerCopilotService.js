const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const Task = require('../models/Task')
const UserProfile = require('../models/UserProfile')
const InstitutionStudent = require('../models/InstitutionStudent')
const { getCareerData } = require('../data/careerDataset')
const { EVIDENCE_LEVELS } = require('./recruitmentIntelligenceService')
const {
  getStudentCareerIntelligence,
  getSkillGapIntelligence,
  getPlacementReadiness,
  buildSkillEvidenceGraph,
} = require('./talentIntelligenceService')
const { buildOpportunityContext } = require('./opportunityContextService')
const { getStudentFeed } = require('./opportunityMatchingService')
const { compareMarketplaceOpportunities } = require('./industryOpportunityMarketplaceService')
const { getApplicationReadiness } = require('./talentMarketplaceService')
const { generateStudentTalentInsight } = require('./talentIntelligenceAiService')
const {
  CAREER_STATES,
  ROADMAP_PHASES,
  READINESS_LEVELS,
  RECOMMENDATION_TYPES,
  ROADMAP_STEP_STATUS,
  PRIORITY_LEVELS,
} = require('../constants/careerCopilot')

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function deriveCareerState({ userProfile, careerGoal, readiness, pipeline, evidenceCount }) {
  const interviews = pipeline?.totals?.interviews || 0
  const applied = pipeline?.totals?.applied || 0
  const target = careerGoal || userProfile?.targetRole || ''

  if (!target && evidenceCount === 0) return 'EXPLORING'
  if (!target) return 'EXPLORING'
  if (readiness?.state === 'READY' && evidenceCount >= 2) return 'PLACEMENT_READY'
  if (interviews > 0) return 'INTERVIEWING'
  if (applied > 0) return 'APPLYING'
  if (evidenceCount >= 2) return 'PREPARING'
  if (evidenceCount >= 1 || target) return 'BUILDING'
  return 'INSUFFICIENT_DATA'
}

function deriveReadinessLevel(readiness, evidenceCount, projects, applied) {
  if (readiness?.state === 'INSUFFICIENT_DATA' && evidenceCount === 0) return 'INSUFFICIENT_DATA'
  if (applied >= 1 && evidenceCount >= 2) return 'APPLICATION_READY'
  if (projects >= 1 && evidenceCount >= 2) return 'PROJECT_READY'
  if (evidenceCount >= 1) return 'FOUNDATION_READY'
  return 'INSUFFICIENT_DATA'
}

function mapEvidenceLevel(level) {
  const map = {
    [EVIDENCE_LEVELS.VERIFIED]: 'VERIFIED',
    [EVIDENCE_LEVELS.PROJECT]: 'PROJECT_EVIDENCED',
    [EVIDENCE_LEVELS.CERTIFIED]: 'VERIFIED',
    [EVIDENCE_LEVELS.LEARNING]: 'CURRENTLY_LEARNING',
    [EVIDENCE_LEVELS.DECLARED]: 'DECLARED',
    [EVIDENCE_LEVELS.INFERRED]: 'INFERRED',
  }
  return map[level] || 'UNKNOWN'
}

async function loadCareerContext(userId) {
  const [intel, userProfile, careerGoals, student] = await Promise.all([
    getStudentCareerIntelligence(userId),
    UserProfile.findOne({ userId }).lean(),
    Goal.find({ userId, category: 'Career', completed: false }).sort({ updatedAt: -1 }).limit(3).lean(),
    InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' }).lean(),
  ])

  const evidenceGraph = student ? buildSkillEvidenceGraph(student) : []
  const careerGoal =
    careerGoals[0]?.title ||
    intel.talentProfile?.careerGoal ||
    userProfile?.targetRole ||
    ''

  const careerState = deriveCareerState({
    userProfile,
    careerGoal,
    readiness: intel.readiness,
    pipeline: intel.pipeline,
    evidenceCount: evidenceGraph.length,
  })

  return {
    intel,
    userProfile,
    careerGoals,
    student,
    evidenceGraph,
    careerGoal,
    careerState,
    targetRole: userProfile?.targetRole || careerGoal,
    currentRole: userProfile?.currentRole || '',
    interests: [
      ...(userProfile?.interests || []),
      ...(intel.talentProfile?.interests || []),
    ],
  }
}

async function getCareerGapAnalysis(userId, { targetRole } = {}) {
  const ctx = await loadCareerContext(userId)
  const role = targetRole || ctx.targetRole
  const careerData = getCareerData(role)

  const gaps = await getSkillGapIntelligence(userId, { targetRole: role })
  const requiredSkills = careerData?.important_skills || gaps.requiredSkills || []

  const supplyMap = new Map(ctx.evidenceGraph.map((e) => [String(e.skill).toLowerCase(), e]))
  const strengths = []
  const gapList = []
  const unknown = []

  for (const skill of requiredSkills) {
    const key = String(skill).toLowerCase()
    const entry = [...supplyMap.entries()].find(([k]) => k.includes(key) || key.includes(k))
    if (entry) {
      strengths.push({ skill: entry[1].skill, evidenceLevel: mapEvidenceLevel(entry[1].evidenceLevel) })
    } else {
      gapList.push({ skill, status: 'GAP' })
    }
  }

  for (const g of gaps.criticalGaps || []) {
    if (!gapList.some((x) => x.skill.toLowerCase() === String(g).toLowerCase())) {
      gapList.push({ skill: g, status: 'GAP' })
    }
  }

  if (!requiredSkills.length && !gapList.length) {
    unknown.push('Target role requirements not fully specified')
  }

  const nextSteps = []
  if (gapList.length) {
    nextSteps.push({
      type: 'LEARN',
      what: `Build evidence for ${gapList.slice(0, 3).map((g) => g.skill).join(', ')}`,
      why: 'Identified gaps between target career and current profile',
      nextStep: 'Complete learning modules or build a project demonstrating these skills',
      priority: 'HIGH',
    })
  }
  if (!(ctx.intel.talentProfile?.projects || []).length) {
    nextSteps.push({
      type: 'BUILD',
      what: 'Add portfolio project evidence',
      why: 'Projects strengthen opportunity alignment',
      nextStep: 'Document your strongest project with skills and outcomes',
      priority: 'HIGH',
    })
  }

  return {
    targetCareer: role || 'INSUFFICIENT_DATA',
    hasValidGoal: !!role,
    strengths,
    gaps: gapList,
    unknown,
    nextSteps,
    disclaimer: 'Gap analysis uses authorized profile evidence only. Does not guarantee outcomes.',
  }
}

function buildRoadmapSteps(ctx, gapAnalysis) {
  const role = ctx.targetRole || 'your target role'
  const careerData = getCareerData(role)
  const skills = careerData?.important_skills || gapAnalysis.gaps.slice(0, 5).map((g) => g.skill)

  const steps = [
    { phase: 'FOUNDATION', title: 'Career goal clarity', order: 1, dependencies: [] },
    { phase: 'SKILL_BUILDING', title: skills[0] ? `Core skill: ${skills[0]}` : 'Core domain skills', order: 2, dependencies: ['Career goal clarity'] },
    { phase: 'SKILL_BUILDING', title: skills[1] ? `Core skill: ${skills[1]}` : 'Supporting skills', order: 3, dependencies: [skills[0] || 'Core domain skills'] },
    { phase: 'PROJECT_BUILDING', title: 'Build demonstrable project', order: 4, dependencies: ['Core domain skills'] },
    { phase: 'PORTFOLIO', title: 'Document portfolio evidence', order: 5, dependencies: ['Build demonstrable project'] },
    { phase: 'EXPERIENCE', title: 'Gain practical experience', order: 6, dependencies: ['Document portfolio evidence'] },
    { phase: 'APPLICATION', title: 'Apply to matched opportunities', order: 7, dependencies: ['Document portfolio evidence'] },
    { phase: 'INTERVIEW', title: 'Interview preparation', order: 8, dependencies: ['Apply to matched opportunities'] },
    { phase: 'CAREER_ENTRY', title: 'Career entry milestone', order: 9, dependencies: ['Interview preparation'] },
  ]

  const projectCount = (ctx.intel.talentProfile?.projects || []).length
  const applied = ctx.intel.pipeline?.totals?.applied || 0

  return steps.map((step) => {
    let status = 'NOT_STARTED'
    if (step.phase === 'FOUNDATION' && ctx.targetRole) status = 'COMPLETED'
    if (step.phase === 'SKILL_BUILDING' && ctx.evidenceGraph.length >= 1) status = 'IN_PROGRESS'
    if (step.phase === 'PROJECT_BUILDING' && projectCount >= 1) status = projectCount >= 2 ? 'COMPLETED' : 'IN_PROGRESS'
    if (step.phase === 'PORTFOLIO' && projectCount >= 1) status = 'IN_PROGRESS'
    if (step.phase === 'APPLICATION' && applied >= 1) status = 'IN_PROGRESS'
    if (step.phase === 'INTERVIEW' && (ctx.intel.pipeline?.totals?.interviews || 0) >= 1) status = 'IN_PROGRESS'

    let priority = 'MEDIUM'
    if (gapAnalysis.gaps.some((g) => step.title.toLowerCase().includes(String(g.skill).toLowerCase()))) {
      priority = 'HIGH'
    }
    if (status === 'NOT_STARTED' && step.order <= 4) priority = 'HIGH'

    return {
      ...step,
      status,
      priority,
      reason: status === 'COMPLETED' ? 'Evidence found in profile' : `Supports ${role}`,
    }
  })
}

async function getPersonalizedRoadmapView(userId) {
  const ctx = await loadCareerContext(userId)
  const gapAnalysis = await getCareerGapAnalysis(userId)

  const careerGoal = ctx.careerGoals[0]
  let persistedRoadmap = null
  if (careerGoal) {
    persistedRoadmap = await Roadmap.findOne({ userId, goalId: careerGoal._id }).lean()
  }

  const steps = buildRoadmapSteps(ctx, gapAnalysis)
  const currentPhase =
    steps.find((s) => s.status === 'IN_PROGRESS')?.phase ||
    steps.find((s) => s.status === 'NOT_STARTED')?.phase ||
    'FOUNDATION'

  const staleReasons = []
  if (ctx.userProfile?.targetRole && careerGoal && normalizeRole(careerGoal.title) !== normalizeRole(ctx.userProfile.targetRole)) {
    staleReasons.push('Career goal differs from profile target role')
  }
  if (gapAnalysis.gaps.length >= 3 && currentPhase === 'APPLICATION') {
    staleReasons.push('Skill gaps remain while in application phase')
  }

  return {
    careerGoal: ctx.targetRole || 'INSUFFICIENT_DATA',
    currentPhase,
    phases: ROADMAP_PHASES,
    steps,
    persistedRoadmap: persistedRoadmap
      ? { goalId: careerGoal._id.toString(), updatedAt: persistedRoadmap.updatedAt, hasRichData: !!persistedRoadmap.data }
      : null,
    stale: staleReasons.length > 0,
    staleReasons,
    version: persistedRoadmap?.updatedAt?.toISOString() || new Date().toISOString(),
    disclaimer: 'Roadmap adapts to profile evidence. Does not assume available study time.',
  }
}

function buildRecommendations(ctx, gapAnalysis) {
  const recs = []

  for (const l of ctx.intel.recommendations?.learning || []) {
    recs.push({
      type: 'LEARN',
      what: l.what || l.skill,
      why: l.why,
      nextStep: l.action || 'Review learning modules',
      priority: 'HIGH',
      href: l.href || '/learn',
    })
  }
  for (const p of ctx.intel.recommendations?.projects || []) {
    recs.push({
      type: 'BUILD',
      what: p.what,
      why: p.why,
      nextStep: p.action || 'Create or link a project',
      priority: 'HIGH',
      href: p.href || '/community/projects',
    })
  }
  for (const o of ctx.intel.opportunities?.recommended?.slice(0, 3) || []) {
    recs.push({
      type: 'APPLY',
      what: o.title,
      why: (o.why || []).join('; ') || 'Strong profile alignment',
      nextStep: o.nextStep || 'Review match analysis before applying',
      priority: o.matchCategory === 'STRONG_MATCH' ? 'HIGH' : 'MEDIUM',
      href: o.href,
    })
  }
  for (const step of gapAnalysis.nextSteps || []) {
    recs.push({ ...step, href: step.href || null })
  }

  return recs.slice(0, 12)
}

async function getWeeklyCareerPlan(userId) {
  const ctx = await loadCareerContext(userId)
  const gapAnalysis = await getCareerGapAnalysis(userId)
  const roadmap = await getPersonalizedRoadmapView(userId)
  const recs = buildRecommendations(ctx, gapAnalysis)

  const high = recs.filter((r) => r.priority === 'HIGH').slice(0, 2)
  const medium = recs.filter((r) => r.priority === 'MEDIUM').slice(0, 2)
  const optional = recs.filter((r) => r.priority === 'LOW').slice(0, 1)

  const closingSoon = ctx.intel.opportunities?.closingSoon?.slice(0, 2) || []
  if (closingSoon.length) {
    high.unshift({
      type: 'APPLY',
      what: `Review deadline: ${closingSoon[0].title}`,
      why: 'Opportunity closing soon',
      nextStep: 'Check eligibility and prepare application',
      priority: 'HIGH',
      href: closingSoon[0].href,
    })
  }

  const inProgressStep = roadmap.steps.find((s) => s.status === 'IN_PROGRESS')
  if (inProgressStep) {
    medium.unshift({
      type: 'PREPARE',
      what: inProgressStep.title,
      why: `Current roadmap phase: ${inProgressStep.phase.replace(/_/g, ' ')}`,
      nextStep: 'Continue this roadmap step',
      priority: 'MEDIUM',
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    careerGoal: ctx.targetRole,
    currentPhase: roadmap.currentPhase,
    priorities: {
      high: high.slice(0, 3),
      medium: medium.slice(0, 2),
      optional: optional.slice(0, 1),
    },
    disclaimer: 'Weekly plan based on goals, gaps, and deadlines. User confirms persistent tasks.',
  }
}

async function getDailyCareerFocus(userId) {
  const weekly = await getWeeklyCareerPlan(userId)
  const top = weekly.priorities.high[0]
  const second = weekly.priorities.medium[0]
  const optional = weekly.priorities.optional[0]

  return {
    generatedAt: new Date().toISOString(),
    topPriority: top
      ? { what: top.what, why: top.why, nextStep: top.nextStep }
      : { what: 'Review your career goal', why: 'No high-priority items identified', nextStep: 'Set or confirm a target role' },
    second: second ? { what: second.what, why: second.why } : null,
    optional: optional ? { what: optional.what } : null,
    disclaimer: 'Concise daily focus — not an exhaustive task list.',
  }
}

async function getStudentSuccessIntelligence(userId) {
  const ctx = await loadCareerContext(userId)
  const signals = []

  if (!ctx.targetRole) {
    signals.push({
      type: 'INCOMPLETE_PROFILE',
      message: 'MAY BENEFIT FROM SUPPORT: Set a career goal to unlock personalized guidance',
      severity: 'MEDIUM',
    })
  }
  if (!(ctx.intel.talentProfile?.projects || []).length) {
    signals.push({
      type: 'NO_PROJECT_EVIDENCE',
      message: 'MAY BENEFIT FROM SUPPORT: Add project evidence to strengthen opportunity alignment',
      severity: 'MEDIUM',
    })
  }
  const closing = ctx.intel.opportunities?.closingSoon?.length || 0
  if (closing) {
    signals.push({
      type: 'UPCOMING_DEADLINE',
      message: `MAY BENEFIT FROM SUPPORT: ${closing} opportunity deadline(s) approaching`,
      severity: 'HIGH',
    })
  }
  const gapCount = (ctx.intel.skillGaps?.criticalGaps || []).length
  if (gapCount >= 2) {
    signals.push({
      type: 'SKILL_GAP',
      message: `MAY BENEFIT FROM SUPPORT: ${gapCount} skill gap(s) for relevant opportunities`,
      severity: 'MEDIUM',
    })
  }

  const roadmap = await getPersonalizedRoadmapView(userId)
  const blocked = roadmap.steps.filter((s) => s.status === 'NOT_STARTED' && s.priority === 'HIGH')
  if (blocked.length) {
    signals.push({
      type: 'UNFINISHED_ROADMAP_STEP',
      message: `MAY BENEFIT FROM SUPPORT: ${blocked[0].title} not yet started`,
      severity: 'LOW',
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    careerState: ctx.careerState,
    signals,
    supportAreas: [
      ctx.targetRole ? null : 'Career goal clarity',
      !(ctx.intel.talentProfile?.projects || []).length ? 'Project building' : null,
      gapCount ? 'Skill development' : null,
      ctx.intel.readiness?.state === 'NEEDS_ATTENTION' ? 'Profile completion' : null,
    ].filter(Boolean),
    disclaimer: 'Neutral support signals based on authorized data. Not a diagnosis.',
  }
}

async function getCareerHub(userId) {
  const ctx = await loadCareerContext(userId)
  const [gapAnalysis, roadmap, weeklyPlan, dailyFocus, success] = await Promise.all([
    getCareerGapAnalysis(userId),
    getPersonalizedRoadmapView(userId),
    getWeeklyCareerPlan(userId),
    getDailyCareerFocus(userId),
    getStudentSuccessIntelligence(userId),
  ])

  const readinessLevel = deriveReadinessLevel(
    ctx.intel.readiness,
    ctx.evidenceGraph.length,
    (ctx.intel.talentProfile?.projects || []).length,
    ctx.intel.pipeline?.totals?.applied || 0,
  )

  const portfolioProjects = (ctx.intel.talentProfile?.projects || []).map((p) => ({
    title: p.title,
    skills: p.skills || p.technologies || [],
    relevance: ctx.targetRole ? 'Relevant to career goal' : 'INSUFFICIENT_DATA',
  }))

  return {
    generatedAt: new Date().toISOString(),
    careerProfile: {
      currentRole: ctx.currentRole,
      targetRole: ctx.targetRole || 'INSUFFICIENT_DATA',
      careerGoal: ctx.careerGoal,
      interests: ctx.interests.slice(0, 8),
      careerState: ctx.careerState,
      hasInstitutionLink: ctx.intel.talentProfile?.hasInstitutionLink ?? false,
    },
    currentState: {
      state: ctx.careerState,
      phase: roadmap.currentPhase,
      readiness: ctx.intel.readiness,
      readinessLevel,
    },
    gapAnalysis,
    roadmap,
    weeklyPlan,
    dailyFocus,
    studentSuccess: success,
    opportunities: {
      strongMatches: ctx.intel.opportunities?.recommended?.filter((o) => o.matchCategory === 'STRONG_MATCH').length || 0,
      recommended: (ctx.intel.opportunities?.recommended || []).slice(0, 4),
      closingSoon: (ctx.intel.opportunities?.closingSoon || []).slice(0, 3),
    },
    portfolio: portfolioProjects.slice(0, 5),
    recommendations: buildRecommendations(ctx, gapAnalysis).slice(0, 8),
    progress: {
      goals: ctx.careerGoals.map((g) => ({ id: g._id.toString(), title: g.title, progress: g.progress })),
      applications: ctx.intel.pipeline?.totals?.applied || 0,
      interviews: ctx.intel.pipeline?.totals?.interviews || 0,
      skillEvidence: ctx.evidenceGraph.length,
    },
    memoryBoundary: 'Only user-approved profile and goal data used. Private memory not exposed.',
    disclaimer: 'Career intelligence uses authorized data. Does not guarantee employment or salary.',
  }
}

async function getCopilotInsight(userId, intent, body = {}) {
  const safeBody = { ...body }
  delete safeBody.role
  delete safeBody.hiringProbability
  delete safeBody.admin

  const ctx = await loadCareerContext(userId)
  const hub = await getCareerHub(userId)

  const intentMap = {
    WHAT_TO_LEARN_NEXT: 'LEARNING_PREP',
    WHAT_PROJECT_TO_BUILD: 'PROJECT_EVIDENCE',
    WHICH_INTERNSHIP_FITS: 'OPPORTUNITY_MATCH',
    WHY_NOT_MATCHING: 'SKILL_GAPS',
    WHAT_TO_DO_THIS_WEEK: 'IMPROVE_PLACEMENT',
    IMPROVE_PROFILE: 'IMPROVE_PLACEMENT',
    PRIORITIZE_SKILLS: 'SKILL_GAPS',
    DAILY_FOCUS: 'CAREER_READINESS',
    APPLICATION_PREP: 'APPLICATION_STATUS',
    INTERVIEW_PREP: 'CAREER_READINESS',
  }

  const mapped = intentMap[intent] || 'CAREER_READINESS'
  const ai = await generateStudentTalentInsight(userId, mapped, {
    source: safeBody.source,
    sourceId: safeBody.sourceId,
  })

  if (intent === 'DAILY_FOCUS') {
    return {
      intent,
      observation: hub.dailyFocus.topPriority.what,
      why: hub.dailyFocus.topPriority.why,
      nextStep: hub.dailyFocus.topPriority.nextStep,
      source: 'Career Copilot',
      limitation: ai.insight?.limitation,
    }
  }

  if (intent === 'EXPLORE_CAREERS') {
    const { CAREER_DATASET } = require('../data/careerDataset')
    const roles = Object.keys(CAREER_DATASET || {}).slice(0, 6)
    return {
      intent,
      observation: ctx.interests.length ? `Based on interests: ${ctx.interests.slice(0, 3).join(', ')}` : 'Explore roles that match your skills',
      possibleRoles: roles,
      nextStep: 'Set a target role to generate a personalized roadmap',
      source: 'Career dataset + profile interests',
    }
  }

  return { intent, ...ai.insight, source: 'Career Copilot + Talent Intelligence' }
}

async function compareCareerPaths(userId, paths = []) {
  const ctx = await loadCareerContext(userId)
  const comparisons = paths.slice(0, 3).map((path) => {
    const data = getCareerData(path)
    const skills = data?.important_skills || []
    const matched = skills.filter((s) =>
      ctx.evidenceGraph.some((e) => String(e.skill).toLowerCase().includes(String(s).toLowerCase())),
    )
    return {
      path,
      requiredSkills: skills,
      matchedSkills: matched,
      gapCount: skills.length - matched.length,
      focus: data?.career_focus || 'INSUFFICIENT_DATA',
      alignment: skills.length ? Math.round((matched.length / skills.length) * 100) : 0,
    }
  })

  return {
    comparisons,
    disclaimer: 'Comparison based on profile evidence. Neither path is universally superior.',
    currentProfile: { targetRole: ctx.targetRole, evidenceCount: ctx.evidenceGraph.length },
  }
}

async function getExplorationMode(userId) {
  const ctx = await loadCareerContext(userId)
  const { CAREER_DATASET } = require('../data/careerDataset')
  const roles = Object.keys(CAREER_DATASET).slice(0, 8)

  return {
    mode: 'EXPLORATION',
    interests: ctx.interests,
    possibleRoles: roles.map((role) => ({
      role,
      skills: CAREER_DATASET[role].important_skills?.slice(0, 4) || [],
      focus: CAREER_DATASET[role].career_focus,
    })),
    experiments: [
      { type: 'LEARN', what: 'Try a short learning module in an area of interest', href: '/learn' },
      { type: 'BUILD', what: 'Build a mini project to test interest', href: '/community/projects' },
      { type: 'RESEARCH', what: 'Explore research opportunities', href: '/research/opportunities' },
      { type: 'NETWORK', what: 'Attend a career event or hackathon', href: '/events' },
    ],
    disclaimer: 'Exploration mode — no career choice is forced.',
  }
}

async function suggestRoadmapTasks(userId, { stepTitle } = {}) {
  const roadmap = await getPersonalizedRoadmapView(userId)
  const step = stepTitle
    ? roadmap.steps.find((s) => s.title === stepTitle)
    : roadmap.steps.find((s) => s.status === 'IN_PROGRESS' || s.status === 'NOT_STARTED')

  if (!step) return { suggestions: [], requiresConfirmation: true }

  const suggestions = []
  if (step.phase === 'PROJECT_BUILDING') {
    suggestions.push(
      { title: 'Choose project scope', priority: 'High', estimatedTime: '30 min' },
      { title: 'Define success criteria', priority: 'High', estimatedTime: '20 min' },
      { title: 'Document skills demonstrated', priority: 'Medium', estimatedTime: '45 min' },
    )
  } else if (step.phase === 'SKILL_BUILDING') {
    suggestions.push(
      { title: `Study core concepts for ${step.title}`, priority: 'High', estimatedTime: '2 hours' },
      { title: 'Complete practice exercises', priority: 'Medium', estimatedTime: '1 hour' },
    )
  } else {
    suggestions.push(
      { title: step.title, priority: step.priority === 'HIGH' ? 'High' : 'Medium', estimatedTime: '1 hour' },
      { title: 'Review progress against career goal', priority: 'Low', estimatedTime: '15 min' },
    )
  }

  const existingTasks = await Task.find({ userId, completed: false }).limit(5).lean()

  return {
    step: step.title,
    suggestions,
    existingOpenTasks: existingTasks.map((t) => t.title),
    requiresConfirmation: true,
    disclaimer: 'Tasks are suggestions only. User must approve before persistent creation.',
  }
}

async function prepareApplication(userId, source, sourceId) {
  const [readiness, match] = await Promise.all([
    getApplicationReadiness(userId, source, sourceId),
    getSkillGapIntelligence(userId, { source, sourceId }),
  ])
  return {
    readiness: readiness.state,
    safeToApply: readiness.safeToApply,
    gaps: match.criticalGaps || [],
    checklist: readiness.explanation,
    disclaimer: 'Preparation only — does not auto-submit applications.',
  }
}

async function prepareInterview(userId, { targetRole } = {}) {
  const ctx = await loadCareerContext(userId)
  const role = targetRole || ctx.targetRole || 'target role'
  const careerData = getCareerData(role)
  const projects = (ctx.intel.talentProfile?.projects || []).map((p) => p.title)

  return {
    roleTopics: careerData?.important_skills?.slice(0, 5) || [],
    technicalAreas: careerData?.core_subjects || [],
    projectDiscussion: projects.slice(0, 3),
    behavioralPrep: ['Tell me about a challenging project', 'Describe a time you learned a new skill quickly'],
    practiceQuestions: [
      `Explain how your projects demonstrate skills for ${role}`,
      'Walk through your strongest technical achievement',
    ],
    disclaimer: 'Practice topics based on profile — not exact interview questions.',
  }
}

module.exports = {
  getCareerHub,
  getCareerGapAnalysis,
  getPersonalizedRoadmapView,
  getWeeklyCareerPlan,
  getDailyCareerFocus,
  getStudentSuccessIntelligence,
  getCopilotInsight,
  compareCareerPaths,
  getExplorationMode,
  suggestRoadmapTasks,
  prepareApplication,
  prepareInterview,
  loadCareerContext,
  deriveCareerState,
  buildRoadmapSteps,
}
