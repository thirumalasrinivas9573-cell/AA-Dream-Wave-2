/**
 * Lasya V5 Prompt 10 — Unified Career Operating System
 * Composes P1–P9 + V4 copilot/analytics + Thirumala KG/workflow/memory — no duplicate engines.
 */
const crypto = require('crypto')
const CareerStateSnapshot = require('../models/CareerStateSnapshot')
const CareerScenario = require('../models/CareerScenario')
const InterviewSession = require('../models/InterviewSession')
const ApplicationWorkspace = require('../models/ApplicationWorkspace')
const Goal = require('../models/Goal')
const {
  ACTION_TYPES,
  ACTION_PRIORITIES,
  FUNNEL_STAGES,
  READINESS_DIMENSIONS,
  CHANGE_EVENT_TYPES,
  INJECTION_PATTERNS,
} = require('../constants/careerOperatingSystem')

const careerCopilot = require('./careerCopilotService')
const careerReadiness = require('./careerReadinessService')
const adaptiveLearning = require('./adaptiveLearningService')
const projectIntelligence = require('./projectIntelligenceService')
const opportunityIntelligence = require('./opportunityIntelligenceService')
const applicationIntelligence = require('./applicationIntelligenceService')
const multiAgent = require('./multiAgentOrchestrationService')

function sanitizeText(text = '') {
  let str = String(text || '').slice(0, 2000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str || '[filtered untrusted input]'
}

function hashState(snapshot) {
  return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 16)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

async function loadCanonicalSlices(userId) {
  const [
    ctx,
    gapAnalysis,
    readinessDash,
    learningDash,
    projectDash,
    oppDash,
    appDash,
    interviewHistory,
    workspaces,
    timeline,
  ] = await Promise.all([
    careerCopilot.loadCareerContext(userId),
    careerCopilot.getCareerGapAnalysis(userId),
    careerReadiness.getReadinessDashboard(userId).catch(() => null),
    adaptiveLearning.getDashboard(userId).catch(() => null),
    projectIntelligence.getDashboard(userId).catch(() => null),
    opportunityIntelligence.getDashboard(userId).catch(() => null),
    applicationIntelligence.getDashboard(userId).catch(() => null),
    careerReadiness.listInterviewHistory(userId, { limit: 5 }).catch(() => []),
    applicationIntelligence.searchWorkspaces(userId, { limit: 5 }).catch(() => []),
    careerReadiness.getCareerProgressTimeline(userId).catch(() => ({ timeline: [] })),
  ])

  return {
    ctx,
    gapAnalysis,
    readinessDash,
    learningDash,
    projectDash,
    oppDash,
    appDash,
    interviewHistory: Array.isArray(interviewHistory) ? interviewHistory : interviewHistory?.history || [],
    workspaces: workspaces?.workspaces || workspaces || [],
    timeline: timeline?.timeline || [],
  }
}

function buildSnapshotPayload(slices) {
  const { ctx, gapAnalysis, projectDash, appDash, interviewHistory } = slices
  return {
    targetRole: ctx.targetRole || '',
    careerGoal: ctx.careerGoal || '',
    skillCount: (gapAnalysis.strengths || []).length,
    gapCount: (gapAnalysis.gaps || []).length,
    projectCount: projectDash?.summary?.total || projectDash?.projects?.length || 0,
    applicationCount: appDash?.summary?.active || appDash?.activeApplications?.length || appDash?.active?.length || 0,
    interviewCount: interviewHistory?.length || 0,
  }
}

async function captureSnapshot(userId, slices) {
  const snapshot = buildSnapshotPayload(slices)
  const stateHash = hashState(snapshot)
  const doc = await CareerStateSnapshot.create({ userId, stateHash, snapshot })
  return { doc, snapshot, stateHash }
}

async function getPreviousSnapshot(userId) {
  const docs = await CareerStateSnapshot.find({ userId }).sort({ createdAt: -1 }).limit(2).lean()
  return docs.length >= 2 ? docs[1] : docs[0] || null
}

function detectMeaningfulChanges(prev, current, slices) {
  if (!prev?.snapshot) return []
  const changes = []
  const p = prev.snapshot
  const c = current

  if (p.careerGoal !== c.careerGoal || p.targetRole !== c.targetRole) {
    changes.push({
      type: 'GOAL_CHANGED',
      fact: `Career focus updated to ${c.targetRole || c.careerGoal || 'new goal'}.`,
      impact: 'Learning, project, and opportunity priorities may shift.',
    })
  }
  if (c.skillCount > p.skillCount) {
    changes.push({
      type: 'SKILL_EVIDENCE',
      fact: `Skill evidence increased (${p.skillCount} → ${c.skillCount}).`,
      impact: 'Readiness for roles requiring demonstrated skills may improve.',
    })
  }
  if (c.projectCount > p.projectCount) {
    changes.push({
      type: 'PROJECT_COMPLETED',
      fact: 'A project milestone was recorded.',
      impact: 'Portfolio and skill evidence may have improved.',
    })
  }
  if (c.applicationCount > p.applicationCount) {
    changes.push({
      type: 'APPLICATION_STATUS',
      fact: 'Application activity increased.',
      impact: 'Review active applications and deadlines.',
    })
  }
  if (c.interviewCount > p.interviewCount) {
    changes.push({
      type: 'INTERVIEW_COMPLETED',
      fact: 'Interview practice session recorded.',
      impact: 'Review feedback to identify weak areas.',
    })
  }
  if (c.gapCount < p.gapCount) {
    changes.push({
      type: 'LEARNING_COMPLETED',
      fact: `Skill gaps reduced (${p.gapCount} → ${c.gapCount}).`,
      impact: 'Opportunity alignment may have improved.',
    })
  }

  const recentTimeline = (slices.timeline || []).slice(0, 3)
  for (const ev of recentTimeline) {
    if (changes.some((ch) => ch.fact.includes(ev.description))) continue
    if (['Project completed', 'Skill learned', 'Interview practiced'].includes(ev.event)) {
      changes.push({
        type: ev.event === 'Project completed' ? 'PROJECT_COMPLETED' : ev.event === 'Skill learned' ? 'SKILL_EVIDENCE' : 'INTERVIEW_COMPLETED',
        fact: `${ev.event}: ${ev.description}`,
        impact: 'Career readiness context updated.',
        at: ev.at,
      })
    }
  }

  return changes.slice(0, 8)
}

function buildNextActions(slices) {
  const actions = []
  const { ctx, gapAnalysis, readinessDash, learningDash, projectDash, oppDash, appDash, interviewHistory } = slices
  const gaps = gapAnalysis.gaps || []
  const topGap = gaps[0]?.skill

  if (!ctx.targetRole && !ctx.careerGoal) {
    actions.push({
      type: 'EXPLORE',
      action: 'Create your first career goal',
      why: 'A defined goal enables skill gap analysis and personalized recommendations.',
      expectedBenefit: 'Unlock learning, project, and opportunity matching.',
      relatedGoal: null,
      priority: 'HIGH',
      href: '/goals',
      order: 1,
    })
    return actions
  }

  if (topGap) {
    actions.push({
      type: 'LEARN',
      action: `Study ${topGap}`,
      why: `${topGap} is a skill gap for your target role${ctx.targetRole ? `: ${ctx.targetRole}` : ''}.`,
      expectedBenefit: 'Close a critical gap blocking opportunity alignment.',
      relatedGoal: ctx.targetRole || ctx.careerGoal,
      priority: 'HIGH',
      href: '/learning',
      order: 1,
      dependsOn: [],
    })
    actions.push({
      type: 'PRACTICE',
      action: `Practice ${topGap}`,
      why: `Practice reinforces ${topGap} after initial learning.`,
      expectedBenefit: 'Build demonstrable skill evidence.',
      relatedGoal: ctx.targetRole,
      priority: 'MEDIUM',
      href: '/learning',
      order: 2,
      dependsOn: [`Study ${topGap}`],
    })
  }

  const activeProject = projectDash?.active?.[0] || projectDash?.projects?.find((p) => p.status !== 'COMPLETED')
  if (activeProject) {
    actions.push({
      type: 'BUILD',
      action: `Continue project: ${activeProject.title || activeProject.name || 'Active project'}`,
      why: 'Active projects demonstrate skills for your portfolio.',
      expectedBenefit: 'Portfolio evidence for target opportunities.',
      relatedGoal: ctx.targetRole,
      priority: 'HIGH',
      href: '/projects',
      order: actions.length + 1,
    })
  } else if (gaps.length) {
    actions.push({
      type: 'BUILD',
      action: `Build a project demonstrating ${gaps.slice(0, 2).map((g) => g.skill).join(' and ')}`,
      why: 'Projects provide evidence for skill gaps.',
      expectedBenefit: 'Strengthen portfolio and readiness.',
      relatedGoal: ctx.targetRole,
      priority: 'MEDIUM',
      href: '/projects',
      order: actions.length + 1,
      dependsOn: topGap ? [`Study ${topGap}`] : [],
    })
  }

  const closingSoon = oppDash?.closingSoon?.[0] || oppDash?.summary?.closingSoon?.[0]
  if (closingSoon) {
    actions.push({
      type: 'REVIEW_DEADLINE',
      action: `Review deadline: ${closingSoon.title || closingSoon.name}`,
      why: 'An opportunity deadline is approaching.',
      expectedBenefit: 'Avoid missing a relevant application window.',
      relatedGoal: ctx.targetRole,
      priority: 'URGENT',
      href: `/opportunities/intelligence/${closingSoon.source || 'campus_opportunity'}/${closingSoon.sourceId || closingSoon._id}`,
      order: 0,
    })
  }

  const activeApp = appDash?.activeApplications?.[0] || appDash?.active?.[0] || appDash?.workspaces?.[0]
  if (activeApp) {
    actions.push({
      type: 'PREPARE_APPLICATION',
      action: `Prepare application: ${activeApp.title || activeApp.opportunityTitle || 'Active application'}`,
      why: 'You have an application in progress.',
      expectedBenefit: 'Improve submission readiness before deadline.',
      relatedGoal: ctx.targetRole,
      priority: 'HIGH',
      href: activeApp.workspaceId ? `/applications/workspace/${activeApp.workspaceId}` : '/applications/workspace',
      order: actions.length + 1,
    })
  }

  const upcomingInterview = interviewHistory?.find((s) => s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED')
  if (upcomingInterview) {
    actions.push({
      type: 'PRACTICE_INTERVIEW',
      action: `Continue interview practice: ${upcomingInterview.targetRole || 'mock interview'}`,
      why: 'An interview session is in progress.',
      expectedBenefit: 'Improve interview readiness for target role.',
      relatedGoal: upcomingInterview.targetRole || ctx.targetRole,
      priority: 'HIGH',
      href: '/ai/career/interview',
      order: actions.length + 1,
    })
  } else if (readinessDash?.topGaps?.length) {
    actions.push({
      type: 'PRACTICE_INTERVIEW',
      action: `Practice interview for ${ctx.targetRole || 'your target role'}`,
      why: 'Mock interviews identify weak areas before real interviews.',
      expectedBenefit: 'Targeted feedback on role-specific questions.',
      relatedGoal: ctx.targetRole,
      priority: 'MEDIUM',
      href: '/ai/career/interview',
      order: actions.length + 1,
    })
  }

  if (projectDash?.portfolio?.items?.length || projectDash?.projects?.length) {
    actions.push({
      type: 'UPDATE_PORTFOLIO',
      action: 'Review portfolio presentation',
      why: 'Portfolio updates improve application and opportunity alignment.',
      expectedBenefit: 'Stronger evidence for recruiters.',
      relatedGoal: ctx.targetRole,
      priority: 'LOW',
      href: '/projects',
      order: actions.length + 1,
    })
  }

  actions.sort((a, b) => {
    const pri = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    return (pri[a.priority] ?? 9) - (pri[b.priority] ?? 9) || a.order - b.order
  })

  return actions.slice(0, 10)
}

function buildWhatMatters(slices, actions) {
  const { ctx, gapAnalysis, oppDash, appDash, interviewHistory } = slices
  const items = []

  if (actions.find((a) => a.priority === 'URGENT')) {
    items.push({ label: 'Upcoming deadline', detail: actions.find((a) => a.priority === 'URGENT').action, kind: 'deadline' })
  }
  if ((gapAnalysis.gaps || []).length) {
    items.push({
      label: 'Skill gaps',
      detail: `${gapAnalysis.gaps.length} gap(s) for ${ctx.targetRole || 'your goal'}`,
      kind: 'skills',
    })
  }
  if ((appDash?.activeApplications?.length || appDash?.active?.length || appDash?.summary?.active || 0) > 0) {
    items.push({
      label: 'Active applications',
      detail: `${appDash.summary?.active || appDash.activeApplications?.length || appDash.active?.length} in progress`,
      kind: 'applications',
    })
  }
  if (interviewHistory?.length) {
    items.push({ label: 'Interview practice', detail: `${interviewHistory.length} recent session(s)`, kind: 'interviews' })
  }
  const matches = oppDash?.summary?.strongMatches || oppDash?.strongMatches || 0
  if (matches > 0) {
    items.push({ label: 'Strong opportunity matches', detail: `${matches} role(s) align well`, kind: 'opportunities' })
  }

  return items.slice(0, 6)
}

function buildCareerFunnel(slices) {
  const { ctx, gapAnalysis, learningDash, projectDash, oppDash, appDash, interviewHistory } = slices
  const hasGoal = !!(ctx.targetRole || ctx.careerGoal)
  const hasSkills = (gapAnalysis.strengths || []).length > 0
  const hasLearning = (learningDash?.activePlans?.length || learningDash?.summary?.active || 0) > 0
  const hasProject = (projectDash?.summary?.total || projectDash?.projects?.length || 0) > 0
  const hasPortfolio = (projectDash?.portfolio?.items?.length || 0) > 0
  const hasOpp = (oppDash?.summary?.total || oppDash?.feed?.length || 0) > 0
  const hasApp = (appDash?.summary?.total || appDash?.activeApplications?.length || appDash?.active?.length || 0) > 0
  const hasInterview = (interviewHistory?.length || 0) > 0

  const stageStatus = (done, partial) => (done ? 'complete' : partial ? 'in_progress' : 'pending')

  return FUNNEL_STAGES.map((stage) => {
    const map = {
      GOAL: { status: stageStatus(hasGoal, false), nextAction: hasGoal ? null : 'Set career goal' },
      SKILL: { status: stageStatus(hasSkills, hasGoal), nextAction: !hasSkills && hasGoal ? 'Demonstrate core skills' : null },
      LEARNING: { status: stageStatus(hasLearning, hasSkills), nextAction: !hasLearning && (gapAnalysis.gaps || []).length ? `Learn ${gapAnalysis.gaps[0]?.skill}` : null },
      PROJECT: { status: stageStatus(hasProject, hasLearning), nextAction: !hasProject ? 'Start a skill project' : null },
      PORTFOLIO: { status: stageStatus(hasPortfolio, hasProject), nextAction: !hasPortfolio && hasProject ? 'Add project to portfolio' : null },
      OPPORTUNITY: { status: stageStatus(hasOpp, hasPortfolio), nextAction: !hasOpp ? 'Explore opportunities' : null },
      APPLICATION: { status: stageStatus(hasApp, hasOpp), nextAction: !hasApp && hasOpp ? 'Prepare an application' : null },
      INTERVIEW: { status: stageStatus(hasInterview, hasApp), nextAction: !hasInterview && hasApp ? 'Practice mock interview' : null },
      OUTCOME: { status: 'pending', nextAction: null },
    }
    return { stage, ...map[stage] }
  })
}

async function getUnifiedReadiness(userId, slices) {
  const dims = await careerReadiness.computeReadinessDimensions(userId).catch(() => ({ dimensions: [] }))
  const dimensions = READINESS_DIMENSIONS.map((label) => {
    const found = (dims.dimensions || []).find((d) =>
      String(d.label || d.name || '').toUpperCase().includes(label.slice(0, 4)),
    )
    if (found?.insufficientData) {
      return { dimension: label, state: 'UNKNOWN', strong: [], gaps: ['Insufficient data'], nextActions: [`Add evidence for ${label.toLowerCase()}`] }
    }
    if (found) {
      return {
        dimension: label,
        state: found.state || (found.score != null ? 'ASSESSED' : 'UNKNOWN'),
        strong: found.strengths || [],
        gaps: found.gaps || [],
        nextActions: found.nextActions || [],
        explanation: found.explanation || '',
      }
    }
    return { dimension: label, state: 'UNKNOWN', strong: [], gaps: [], nextActions: [] }
  })

  return {
    dimensions,
    disclaimer: 'Readiness reflects authorized evidence only — not a guarantee of hiring outcomes.',
  }
}

async function getCareerState(userId) {
  const slices = await loadCanonicalSlices(userId)
  const snapshot = buildSnapshotPayload(slices)
  const nextActions = buildNextActions(slices)
  const readiness = await getUnifiedReadiness(userId, slices)

  return {
    generatedAt: new Date().toISOString(),
    currentGoal: slices.ctx.careerGoal || 'INSUFFICIENT_DATA',
    targetRole: slices.ctx.targetRole || 'INSUFFICIENT_DATA',
    careerState: slices.ctx.careerState,
    topSkills: (slices.gapAnalysis.strengths || []).slice(0, 8).map((s) => s.skill),
    skillGaps: (slices.gapAnalysis.gaps || []).slice(0, 8).map((g) => g.skill),
    activeLearning: (slices.learningDash?.activePlans || []).slice(0, 3),
    activeProjects: (slices.projectDash?.active || slices.projectDash?.projects || []).slice(0, 3),
    relevantOpportunities: (slices.oppDash?.feed || slices.oppDash?.topMatches || []).slice(0, 3),
    activeApplications: (slices.appDash?.activeApplications || slices.appDash?.active || slices.workspaces || []).slice(0, 3),
    interviewStatus: {
      recent: (slices.interviewHistory || []).slice(0, 3),
      upcoming: (slices.interviewHistory || []).filter((s) => s.status === 'IN_PROGRESS').length,
    },
    nextActions,
    readiness,
    snapshot,
  }
}

async function getWhatChanged(userId) {
  const slices = await loadCanonicalSlices(userId)
  const current = buildSnapshotPayload(slices)
  const prev = await getPreviousSnapshot(userId)
  await captureSnapshot(userId, slices)
  const changes = detectMeaningfulChanges(prev, current, slices)

  return {
    changes: changes.map((c) => ({
      ...c,
      category: 'FACT',
      disclaimer: 'Changes derived from authorized records only.',
    })),
    hasChanges: changes.length > 0,
    emptyMessage: changes.length ? null : 'No meaningful career changes detected since last visit.',
  }
}

async function getWhatMatters(userId) {
  const slices = await loadCanonicalSlices(userId)
  const actions = buildNextActions(slices)
  return { priorities: buildWhatMatters(slices, actions), generatedAt: new Date().toISOString() }
}

async function getNextActions(userId) {
  const slices = await loadCanonicalSlices(userId)
  const actions = buildNextActions(slices)
  return {
    actions: actions.map((a, i) => ({
      ...a,
      category: 'RECOMMENDATION',
      id: `action-${i + 1}`,
    })),
    primary: actions[0] || null,
    disclaimer: 'Recommendations are advisory — you remain in control of all submissions and changes.',
  }
}

async function getTodayView(userId) {
  const [dailyFocus, nextActions] = await Promise.all([
    careerCopilot.getDailyCareerFocus(userId),
    getNextActions(userId),
  ])

  const tasks = []
  if (dailyFocus?.topPriority?.what) {
    tasks.push({ kind: 'priority', label: dailyFocus.topPriority.what, why: dailyFocus.topPriority.why })
  }
  for (const a of nextActions.actions.slice(0, 4)) {
    if (!tasks.some((t) => t.label === a.action)) {
      tasks.push({ kind: a.type, label: a.action, why: a.why, href: a.href, priority: a.priority })
    }
  }

  return {
    greeting: greeting(),
    tasks: tasks.slice(0, 5),
    disclaimer: 'Only tasks from your actual career data are shown.',
  }
}

async function getCommandCenter(userId) {
  const slices = await loadCanonicalSlices(userId)
  const goalExecution = require('./goalExecutionService')
  const DailyPlanSnapshot = require('../models/DailyPlanSnapshot')
  const ExecutionPlan = require('../models/ExecutionPlan')
  const dateKey = new Date().toISOString().slice(0, 10)

  const [whatChanged, nextActions, today, funnel, weeklyPlan, executionGoal, cachedDaily] = await Promise.all([
    (async () => {
      const current = buildSnapshotPayload(slices)
      const prev = await getPreviousSnapshot(userId)
      await captureSnapshot(userId, slices)
      return detectMeaningfulChanges(prev, current, slices)
    })(),
    Promise.resolve(buildNextActions(slices)),
    careerCopilot.getDailyCareerFocus(userId),
    Promise.resolve(buildCareerFunnel(slices)),
    careerCopilot.getWeeklyCareerPlan(userId),
    goalExecution.getPrimaryCareerGoal(userId),
    DailyPlanSnapshot.findOne({ userId, planDate: dateKey }).lean(),
  ])

  const whatMatters = buildWhatMatters(slices, nextActions)
  const readiness = await getUnifiedReadiness(userId, slices).catch(() => ({ dimensions: [] }))
  const state = {
    generatedAt: new Date().toISOString(),
    currentGoal: slices.ctx.careerGoal || 'INSUFFICIENT_DATA',
    targetRole: slices.ctx.targetRole || 'INSUFFICIENT_DATA',
    careerState: slices.ctx.careerState,
    topSkills: (slices.gapAnalysis.strengths || []).slice(0, 8).map((s) => s.skill),
    skillGaps: (slices.gapAnalysis.gaps || []).slice(0, 8).map((g) => g.skill),
    activeLearning: (slices.learningDash?.activePlans || []).slice(0, 3),
    activeProjects: (slices.projectDash?.active || slices.projectDash?.projects || []).slice(0, 3),
    relevantOpportunities: (slices.oppDash?.feed || slices.oppDash?.topMatches || []).slice(0, 3),
    activeApplications: (slices.appDash?.activeApplications || slices.appDash?.active || slices.workspaces || []).slice(0, 3),
    interviewStatus: {
      recent: (slices.interviewHistory || []).slice(0, 3),
      upcoming: (slices.interviewHistory || []).filter((s) => s.status === 'IN_PROGRESS').length,
    },
    nextActions,
    readiness,
    snapshot: buildSnapshotPayload(slices),
  }

  let executionDaily = cachedDaily
    ? {
        topPriority: cachedDaily.topPriority,
        items: cachedDaily.items,
        planDate: dateKey,
      }
    : null
  let executionBlockers = cachedDaily?.blockers || []
  let currentMilestone = null

  if (executionGoal) {
    const plan = await ExecutionPlan.findOne({ userId, goalId: executionGoal._id, status: 'ACTIVE' }).lean()
    currentMilestone = plan?.milestones?.find((m) => m.status === 'IN_PROGRESS')
      || plan?.milestones?.find((m) => m.status === 'PENDING')
      || null
    if (!executionBlockers.length) {
      executionBlockers = await goalExecution.detectBlockers(
        userId,
        executionGoal,
        plan?.milestones || [],
        { gapAnalysis: slices.gapAnalysis },
      )
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    header: {
      greeting: greeting(),
      careerGoal: slices.ctx.careerGoal || 'Not set',
      targetRole: slices.ctx.targetRole || 'Not set',
      careerState: slices.ctx.careerState,
      nextBestAction: nextActions[0] || null,
    },
    currentState: state,
    whatChanged: {
      changes: whatChanged,
      hasChanges: whatChanged.length > 0,
    },
    whatMatters: { priorities: whatMatters },
    nextAction: {
      primary: nextActions[0] || null,
      actions: nextActions.slice(0, 6).map((a) => ({ ...a, category: 'RECOMMENDATION' })),
    },
    today: {
      topPriority: executionDaily?.topPriority || today?.topPriority || null,
      tasks: (executionDaily?.items || nextActions.slice(0, 5).map((a) => ({ label: a.action, why: a.why, href: a.href, priority: a.priority }))).slice(0, 5),
      executionPlan: executionDaily ? { planDate: executionDaily.planDate, highPriority: executionDaily.items?.filter((i) => i.priority === 'HIGH' || i.priority === 'URGENT') } : null,
    },
    execution: {
      todaysPlan: executionDaily,
      currentMilestone,
      blockers: executionBlockers,
      focusModeHref: '/workspace/focus',
    },
    careerSnapshot: {
      goal: slices.ctx.careerGoal,
      targetRole: slices.ctx.targetRole,
      skills: (slices.gapAnalysis.strengths || []).slice(0, 6),
      skillGaps: (slices.gapAnalysis.gaps || []).slice(0, 6),
      projects: (slices.projectDash?.projects || []).slice(0, 3),
      applications: slices.appDash?.summary || { active: slices.workspaces?.length || 0 },
      interviews: (slices.interviewHistory || []).slice(0, 2),
    },
    careerFunnel: funnel,
    careerProgress: {
      timeline: slices.timeline.slice(0, 10),
      weeklyPlan: weeklyPlan?.days || weeklyPlan?.plan || [],
    },
    activity: [],
    emptyStates: {
      noGoal: !slices.ctx.careerGoal && !slices.ctx.targetRole,
      noProjects: !(slices.projectDash?.projects?.length),
      noApplications: !(slices.appDash?.activeApplications?.length || slices.appDash?.active?.length || slices.workspaces?.length),
      noInterviews: !(slices.interviewHistory?.length),
    },
    disclaimer: 'Dream Wave analyzes authorized data to recommend next steps. You control all submissions and official records.',
  }
}

async function generateCareerReport(userId) {
  const [center, readiness, timeline] = await Promise.all([
    getCommandCenter(userId),
    getUnifiedReadiness(userId, await loadCanonicalSlices(userId)),
    careerReadiness.getCareerProgressTimeline(userId),
  ])

  return {
    generatedAt: new Date().toISOString(),
    sections: {
      currentGoal: center.header.careerGoal,
      currentState: center.currentState,
      progress: timeline,
      strengths: center.careerSnapshot.skills,
      gaps: center.careerSnapshot.skillGaps,
      projects: center.careerSnapshot.projects,
      opportunities: center.currentState.relevantOpportunities,
      applications: center.careerSnapshot.applications,
      interviews: center.careerSnapshot.interviews,
      recommendations: center.nextAction.actions,
      readiness,
    },
    sourceTraceability: {
      skills: 'Skill evidence from profile, projects, and learning records',
      applications: 'Application workspace and recruitment records',
      interviews: 'Interview session history',
    },
    disclaimer: 'Report generated from authorized records. Does not guarantee outcomes.',
  }
}

async function runScenario(userId, { targetRole, label } = {}) {
  const role = sanitizeText(targetRole)
  if (!role || role === '[filtered untrusted input]') {
    const err = new Error('Valid targetRole required for scenario')
    err.statusCode = 400
    throw err
  }

  const gapAnalysis = await careerCopilot.getCareerGapAnalysis(userId, { targetRole: role })
  const simulation = {
    targetRole: role,
    isSimulation: true,
    gaps: gapAnalysis.gaps,
    strengths: gapAnalysis.strengths,
    nextSteps: gapAnalysis.nextSteps,
    disclaimer: 'Simulation only — does not modify your canonical career profile until you confirm changes.',
  }

  const scenario = await CareerScenario.create({
    userId,
    label: label || `What if: ${role}`,
    targetRole: role,
    simulation,
  })

  return {
    scenarioId: scenario._id.toString(),
    simulation,
    isolation: 'Scenario data is stored separately from canonical profile.',
  }
}

async function assertScenarioAccess(userId, scenarioId) {
  const scenario = await CareerScenario.findById(scenarioId).lean()
  if (!scenario) {
    const err = new Error('Scenario not found')
    err.statusCode = 404
    throw err
  }
  if (String(scenario.userId) !== String(userId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }
  return scenario
}

function resolveCopilotAgents(question) {
  const q = question.toLowerCase()
  const agents = new Set()
  if (/learn|skill|study|practice/i.test(q)) agents.add('LEARNING_AGENT')
  if (/project|build|portfolio/i.test(q)) agents.add('PROJECT_AGENT')
  if (/opportunit|job|intern|match/i.test(q)) agents.add('OPPORTUNITY_AGENT')
  if (/application|apply|resume|cover/i.test(q)) agents.add('APPLICATION_AGENT')
  if (/interview|mock|prepare/i.test(q)) agents.add('INTERVIEW_AGENT')
  if (/research|report|source/i.test(q)) agents.add('RESEARCH_AGENT')
  if (/analytics|progress|activity/i.test(q)) agents.add('ANALYTICS_AGENT')
  if (agents.size === 0) agents.add('CAREER_AGENT')
  agents.add('CAREER_AGENT')
  return [...agents]
}

async function commandCenterCopilot(userId, { question, opportunitySource, opportunitySourceId } = {}) {
  const q = sanitizeText(question)
  if (!q || q === '[filtered untrusted input]') {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  const slices = await loadCanonicalSlices(userId)
  const agents = resolveCopilotAgents(q)
  const facts = []
  const recommendations = []
  const actions = buildNextActions(slices)

  if (slices.ctx.targetRole) {
    facts.push({ text: `Your target role is ${slices.ctx.targetRole}.`, source: 'profile' })
  }
  if ((slices.gapAnalysis.gaps || []).length) {
    facts.push({
      text: `Skill gaps include: ${slices.gapAnalysis.gaps.slice(0, 3).map((g) => g.skill).join(', ')}.`,
      source: 'gap analysis',
    })
  }

  let answer = ''

  if (/what should i do today|today/i.test(q)) {
    const today = await getTodayView(userId)
    answer = today.tasks.length
      ? `Today: ${today.tasks.map((t) => t.label).join('; ')}.`
      : 'Set a career goal to receive personalized daily tasks.'
    recommendations.push(...actions.slice(0, 3).map((a) => ({ text: a.action, why: a.why, category: 'RECOMMENDATION' })))
  } else if (/ready for|opportunity|match/i.test(q)) {
    if (opportunitySource && opportunitySourceId) {
      const prep = await careerCopilot.prepareApplication(userId, opportunitySource, opportunitySourceId)
      facts.push({ text: `Application readiness: ${prep.readiness || 'INSUFFICIENT_DATA'}.`, source: 'application intelligence' })
      answer = prep.safeToApply
        ? 'You have supporting evidence, but review the checklist before submitting.'
        : `Gaps remain: ${(prep.gaps || []).slice(0, 3).join(', ') || 'review checklist'}.`
    } else {
      answer = `Focus on closing gaps: ${(slices.gapAnalysis.gaps || []).slice(0, 3).map((g) => g.skill).join(', ') || 'set a target role first'}.`
    }
  } else if (/what skill|learn/i.test(q)) {
    const gap = slices.gapAnalysis.gaps?.[0]?.skill
    answer = gap ? `Prioritize learning ${gap} — it is a gap for ${slices.ctx.targetRole || 'your goal'}.` : 'Set a target role to identify skill priorities.'
    if (gap) recommendations.push({ text: `Study ${gap}`, why: 'Highest priority skill gap', category: 'RECOMMENDATION' })
  } else if (/what project|build/i.test(q)) {
    const gap = slices.gapAnalysis.gaps?.[0]?.skill
    answer = gap ? `Build a project demonstrating ${gap} and related tools.` : 'Complete skill assessment first to get project ideas.'
  } else if (/which application|prepare application/i.test(q)) {
    const app = slices.workspaces?.[0]
    answer = app
      ? `Focus on: ${app.opportunityTitle || app.title || 'your most recent workspace'}.`
      : 'Explore opportunities and start an application workspace when ready.'
  } else if (/interview|prepare/i.test(q)) {
    answer = `Practice mock interviews for ${slices.ctx.targetRole || 'your target role'}. Review feedback on weak topics after each session.`
    recommendations.push({ text: 'Start mock interview', why: 'Build role-specific confidence', category: 'RECOMMENDATION', href: '/ai/career/interview' })
  } else if (/what changed|changed/i.test(q)) {
    const changed = await getWhatChanged(userId)
    answer = changed.hasChanges
      ? changed.changes.map((c) => c.fact).join(' ')
      : changed.emptyMessage
  } else {
    const insight = await careerCopilot.getCopilotInsight(userId, 'DAILY_FOCUS', {})
    answer = insight.observation || insight.nextStep || 'Review your command center for prioritized next actions.'
  }

  return {
    question: q,
    agentsUsed: agents,
    facts,
    recommendations,
    actions: actions.slice(0, 4).map((a) => ({
      action: a.action,
      why: a.why,
      href: a.href,
      dismissible: true,
    })),
    answer,
    boundedContext: {
      goal: slices.ctx.careerGoal,
      targetRole: slices.ctx.targetRole,
      skillGaps: (slices.gapAnalysis.gaps || []).slice(0, 5).map((g) => g.skill),
    },
    disclaimer: 'Copilot provides advisory guidance. Facts and recommendations are separated.',
  }
}

async function multiAgentCareerQuery(userId, { question, intent } = {}) {
  const q = sanitizeText(question)
  const resolvedIntent = intent || multiAgent.resolveIntent(q)
  const agents = resolveCopilotAgents(q)

  const copilot = await commandCenterCopilot(userId, { question: q })

  return {
    intent: resolvedIntent,
    agentsUsed: agents,
    facts: copilot.facts,
    recommendations: copilot.recommendations,
    actions: copilot.actions,
    synthesis: copilot.answer,
    disclaimer: 'Multi-agent results are advisory. No autonomous submissions.',
  }
}

module.exports = {
  sanitizeText,
  getCareerState,
  getWhatChanged,
  getWhatMatters,
  getNextActions,
  getTodayView,
  getCommandCenter,
  generateCareerReport,
  runScenario,
  assertScenarioAccess,
  commandCenterCopilot,
  multiAgentCareerQuery,
  getUnifiedReadiness,
  buildCareerFunnel,
  ACTION_TYPES,
  ACTION_PRIORITIES,
  FUNNEL_STAGES,
}
