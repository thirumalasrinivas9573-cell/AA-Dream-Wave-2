/**
 * Lasya V6 Prompt 1 — Career Goal Execution Engine
 * Composes Goal, Task, Roadmap + V5 Career OS — no duplicate task/goal systems.
 */
const crypto = require('crypto')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const ExecutionPlan = require('../models/ExecutionPlan')
const DailyPlanSnapshot = require('../models/DailyPlanSnapshot')
const UserProfile = require('../models/UserProfile')
const {
  MILESTONE_TYPES,
  RISK_LEVELS,
  BLOCKER_TYPES,
  INJECTION_PATTERNS,
} = require('../constants/goalExecution')

const careerCopilot = require('./careerCopilotService')
const careerOS = require('./careerOperatingSystemService')
const adaptiveLearning = require('./adaptiveLearningService')
const projectIntelligence = require('./projectIntelligenceService')
const opportunityIntelligence = require('./opportunityIntelligenceService')
const applicationIntelligence = require('./applicationIntelligenceService')
const careerReadiness = require('./careerReadinessService')
const calculateProgress = require('../utils/calculateProgress')

function sanitizeText(text = '') {
  let str = String(text || '').slice(0, 2000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str || '[filtered untrusted input]'
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function mapPriority(p) {
  const m = { High: 'HIGH', Medium: 'MEDIUM', Low: 'LOW', URGENT: 'URGENT' }
  return m[p] || p || 'MEDIUM'
}

function estimateFromTask(task) {
  if (task.estimatedTime) return task.estimatedTime
  const typeMap = { learn: '1 hour', quiz: '30 min', practice: '2 hours', revise: '1 hour' }
  return typeMap[task.type] || 'ESTIMATE UNKNOWN'
}

async function assertGoalAccess(userId, goalId) {
  const goal = await Goal.findOne({ _id: goalId, userId }).lean()
  if (!goal) {
    const err = new Error('Goal not found')
    err.statusCode = 404
    throw err
  }
  return goal
}

async function assertTaskAccess(userId, taskId) {
  const task = await Task.findOne({ _id: taskId, userId })
  if (!task) {
    const err = new Error('Task not found')
    err.statusCode = 404
    throw err
  }
  return task
}

async function assertPlanAccess(userId, planId) {
  const plan = await ExecutionPlan.findOne({ _id: planId, userId })
  if (!plan) {
    const err = new Error('Execution plan not found')
    err.statusCode = 404
    throw err
  }
  return plan
}

async function getPrimaryCareerGoal(userId) {
  const careerGoal = await Goal.findOne({ userId, category: 'Career', completed: false })
    .sort({ updatedAt: -1 })
    .lean()
  if (careerGoal) return careerGoal
  const anyGoal = await Goal.findOne({ userId, completed: false }).sort({ updatedAt: -1 }).lean()
  return anyGoal
}

async function buildStrategy(userId, goal) {
  const [ctx, gapAnalysis] = await Promise.all([
    careerCopilot.loadCareerContext(userId),
    careerCopilot.getCareerGapAnalysis(userId),
  ])

  const targetRole = ctx.targetRole || goal.title
  const gaps = (gapAnalysis.gaps || []).slice(0, 5)
  const projectCount = (ctx.intel.talentProfile?.projects || []).length
  const applied = ctx.intel.pipeline?.totals?.applied || 0
  const strategy = []
  let order = 1

  for (const gap of gaps.slice(0, 2)) {
    strategy.push({
      action: `Strengthen ${gap.skill}`,
      why: `${gap.skill} is a skill gap for ${targetRole}`,
      relatedGoal: goal.title,
      evidence: `Gap analysis: ${gaps.length} gap(s) identified`,
      expectedBenefit: 'Improves alignment with target role requirements',
      order: order++,
    })
  }

  if (!projectCount) {
    strategy.push({
      action: 'Build relevant portfolio projects',
      why: 'Project evidence strengthens career readiness',
      relatedGoal: goal.title,
      evidence: 'No projects in current talent profile',
      expectedBenefit: 'Demonstrates skills to recruiters',
      order: order++,
    })
  }

  if (gaps.length) {
    strategy.push({
      action: `Learn ${gaps[0]?.skill} fundamentals`,
      why: 'Learning closes identified skill gaps',
      relatedGoal: goal.title,
      evidence: 'Learning recommended from skill gaps',
      expectedBenefit: 'Foundation for projects and applications',
      order: order++,
    })
  }

  strategy.push({
    action: 'Improve portfolio presentation',
    why: 'Portfolio connects projects to career goal',
    relatedGoal: goal.title,
      evidence: projectCount > 0 ? 'Portfolio items exist' : 'Portfolio needs evidence',
    expectedBenefit: 'Stronger application materials',
    order: order++,
  })

  strategy.push({
    action: 'Practice mock interviews',
    why: 'Interview practice identifies weak areas before real interviews',
    relatedGoal: targetRole,
      evidence: ctx.intel.readiness?.state || 'Interview readiness from career context',
    expectedBenefit: 'Confidence for target role interviews',
    order: order++,
  })

  const closingSoon = ctx.intel.opportunities?.closingSoon?.[0]
  if (closingSoon) {
    strategy.push({
      action: `Prepare for: ${closingSoon.title || 'upcoming opportunity'}`,
      why: 'Opportunity deadline approaching',
      relatedGoal: goal.title,
      evidence: 'Career context closing-soon opportunities',
      expectedBenefit: 'Avoid missing application window',
      order: order++,
    })
  } else {
    strategy.push({
      action: 'Explore suitable opportunities',
      why: 'Applications connect skills to real outcomes',
      relatedGoal: goal.title,
      evidence: (ctx.intel.opportunities?.recommended?.length || 0) > 0 ? 'Opportunities available' : 'Explore when ready',
      expectedBenefit: 'Career progression toward target outcome',
      order: order++,
    })
  }

  if (applied > 0) {
    strategy.unshift({
      action: 'Complete active application preparation',
      why: 'Application in progress requires documents and review',
      relatedGoal: goal.title,
      evidence: 'Active application workspace',
      expectedBenefit: 'Submission readiness',
      order: 0,
    })
  }

  strategy.sort((a, b) => a.order - b.order)
  return { strategy, ctx, gapAnalysis, targetRole }
}

function buildMilestones(strategy, gapAnalysis, roadmap) {
  const milestones = []
  let order = 1
  const roadmapMilestones = roadmap?.data?.milestones || []

  for (const rm of roadmapMilestones.slice(0, 3)) {
    milestones.push({
      key: `roadmap-${order}`,
      type: 'LEARNING_MILESTONE',
      title: rm.title || rm.name || `Roadmap step ${order}`,
      status: rm.completed ? 'COMPLETED' : 'PENDING',
      dependsOn: order > 1 ? [`roadmap-${order - 1}`] : [],
      order: order++,
      linkedSkill: rm.skill || '',
      evidence: rm.description || '',
    })
  }

  for (const gap of (gapAnalysis.gaps || []).slice(0, 3)) {
    milestones.push({
      key: `skill-${gap.skill?.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'SKILL_MILESTONE',
      title: `Demonstrate ${gap.skill}`,
      status: 'PENDING',
      dependsOn: milestones.length ? [milestones[milestones.length - 1].key] : [],
      order: order++,
      linkedSkill: gap.skill,
      evidence: 'Skill gap from career analysis',
    })
  }

  milestones.push({
    key: 'project-portfolio',
    type: 'PROJECT_MILESTONE',
    title: 'Complete career-relevant project',
    status: 'PENDING',
    dependsOn: milestones.filter((m) => m.type === 'SKILL_MILESTONE').slice(0, 1).map((m) => m.key),
    order: order++,
    evidence: 'Project demonstrates skill evidence',
  })

  milestones.push({
    key: 'portfolio-update',
    type: 'PORTFOLIO_MILESTONE',
    title: 'Update portfolio with project evidence',
    status: 'PENDING',
    dependsOn: ['project-portfolio'],
    order: order++,
  })

  milestones.push({
    key: 'application-prep',
    type: 'APPLICATION_MILESTONE',
    title: 'Prepare and review application materials',
    status: 'PENDING',
    dependsOn: ['portfolio-update'],
    order: order++,
  })

  milestones.push({
    key: 'interview-prep',
    type: 'INTERVIEW_MILESTONE',
    title: 'Complete interview preparation',
    status: 'PENDING',
    dependsOn: ['application-prep'],
    order: order++,
  })

  if (!milestones.length) {
    for (const s of strategy.slice(0, 4)) {
      milestones.push({
        key: `strategy-${s.order}`,
        type: 'LEARNING_MILESTONE',
        title: s.action,
        status: 'PENDING',
        dependsOn: s.order > 1 ? [`strategy-${s.order - 1}`] : [],
        order: s.order,
        evidence: s.evidence,
      })
    }
  }

  return milestones
}

async function detectBlockers(userId, goal, milestones, slices) {
  const blockers = []
  const tasks = await Task.find({ userId, goalId: goal._id, completed: false, failed: { $ne: true } }).lean()
  const now = new Date()

  for (const m of milestones.filter((x) => x.status !== 'COMPLETED')) {
    for (const dep of m.dependsOn || []) {
      const depM = milestones.find((x) => x.key === dep)
      if (depM && depM.status !== 'COMPLETED') {
        blockers.push({
          type: 'MISSING_PREREQUISITE',
          blocker: `Complete "${depM.title}" before "${m.title}"`,
          whyItMatters: 'Milestone dependencies ensure proper foundation',
          recommendedAction: `Focus on: ${depM.title}`,
        })
        break
      }
    }
  }

  for (const gap of (slices?.gapAnalysis?.gaps || []).slice(0, 2)) {
    blockers.push({
      type: 'SKILL_GAP',
      blocker: `Missing evidence for ${gap.skill}`,
      whyItMatters: 'Skill gaps block opportunity alignment',
      recommendedAction: `Study and practice ${gap.skill}`,
    })
  }

  const overdue = tasks.filter((t) => t.snoozedUntil && new Date(t.snoozedUntil) < now)
  for (const t of overdue.slice(0, 2)) {
    blockers.push({
      type: 'OVERDUE_TASK',
      blocker: `Overdue: ${t.title}`,
      whyItMatters: 'Delayed tasks may affect milestone progress',
      recommendedAction: 'Reschedule or complete this task',
    })
  }

  const closingSoon = slices?.oppDash?.closingSoon?.[0]
  if (closingSoon?.deadline) {
    blockers.push({
      type: 'APPLICATION_DEADLINE',
      blocker: `Deadline approaching: ${closingSoon.title}`,
      whyItMatters: 'Application window may close soon',
      recommendedAction: 'Review application workspace and checklist',
    })
  }

  const upcomingInterview = (slices?.interviewHistory || []).find((s) => s.status === 'IN_PROGRESS')
  if (upcomingInterview) {
    blockers.push({
      type: 'INTERVIEW_PREP_GAP',
      blocker: 'Interview practice session in progress',
      whyItMatters: 'Complete practice for feedback on weak areas',
      recommendedAction: 'Continue mock interview session',
    })
  }

  const seen = new Set()
  return blockers.filter((b) => {
    const k = b.blocker
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 6)
}

function computeRisk(goal, milestones, tasks, blockers) {
  const completedM = milestones.filter((m) => m.status === 'COMPLETED').length
  const totalM = milestones.length || 1
  const overdueCount = tasks.filter((t) => !t.completed && t.snoozedUntil && new Date(t.snoozedUntil) < new Date()).length
  const urgentBlockers = blockers.filter((b) => b.type === 'APPLICATION_DEADLINE').length

  if (urgentBlockers > 0 || overdueCount >= 3) return 'HIGH'
  if (completedM / totalM < 0.3 && blockers.length >= 3) return 'MEDIUM'
  if (completedM / totalM >= 0.5) return 'LOW'
  return 'UNKNOWN'
}

async function generateProposedTasks(userId, goal, plan, milestones) {
  const existing = await Task.find({ userId, goalId: goal._id, executionPlanId: plan._id }).lean()
  if (existing.length) return existing

  const pendingMilestones = milestones.filter((m) => m.status !== 'COMPLETED').slice(0, 5)
  const keyToId = new Map()
  const created = []

  for (const m of pendingMilestones) {
    const doc = await Task.create({
      userId,
      goalId: goal._id,
      executionPlanId: plan._id,
      milestoneKey: m.key,
      title: m.title,
      description: m.evidence || `Supports milestone: ${m.title}`,
      type: m.type.includes('LEARNING') || m.type.includes('SKILL') ? 'learn' : m.type.includes('PROJECT') ? 'practice' : 'revise',
      priority: m.order <= 2 ? 'High' : 'Medium',
      category: goal.category,
      proposed: true,
      dependsOn: (m.dependsOn || []).map((k) => keyToId.get(k)).filter(Boolean),
      estimatedTime: m.type.includes('PROJECT') ? '2 hours' : '1 hour',
    })
    keyToId.set(m.key, doc._id)
    created.push(doc)
  }

  return created
}

async function getOrCreateExecutionPlan(userId, { goalId, regenerate = false } = {}) {
  const goal = goalId
    ? await assertGoalAccess(userId, goalId)
    : await getPrimaryCareerGoal(userId)

  if (!goal) {
    return { goal: null, plan: null, emptyMessage: 'Create a career goal to start execution planning.' }
  }

  let activePlan = await ExecutionPlan.findOne({ userId, goalId: goal._id, status: 'ACTIVE' }).lean()
  if (activePlan && !regenerate) {
    return { goal, plan: activePlan }
  }

  const roadmap = await Roadmap.findOne({ userId, goalId: goal._id }).lean()
  const { strategy, ctx, gapAnalysis, targetRole } = await buildStrategy(userId, goal)
  const milestones = buildMilestones(strategy, gapAnalysis, roadmap)

  if (activePlan && regenerate) {
    await ExecutionPlan.updateOne({ _id: activePlan._id }, { status: 'ARCHIVED' })
  }

  const prev = activePlan || await ExecutionPlan.findOne({ userId, goalId: goal._id }).sort({ version: -1 }).lean()
  const version = (prev?.version || 0) + 1

  const slices = {
    gapAnalysis,
    oppDash: { closingSoon: ctx.intel.opportunities?.closingSoon || [] },
    interviewHistory: [],
  }
  const tasks = await Task.find({ userId, goalId: goal._id }).lean()
  const blockers = await detectBlockers(userId, goal, milestones, slices)
  const riskLevel = computeRisk(goal, milestones, tasks, blockers)

  const plan = await ExecutionPlan.create({
    userId,
    goalId: goal._id,
    version,
    status: 'PROPOSED',
    targetRole,
    targetOutcome: goal.title,
    strategy,
    milestones,
    previousVersionId: prev?._id,
    changeReason: regenerate ? 'Plan regenerated from updated career state' : 'Initial execution plan generated',
    riskLevel,
    planHash: crypto.createHash('sha256').update(JSON.stringify({ strategy, milestones })).digest('hex').slice(0, 16),
  })

  await generateProposedTasks(userId, goal, plan, milestones)
  return { goal, plan }
}

async function acceptPlan(userId, planId) {
  const plan = await assertPlanAccess(userId, planId)
  await ExecutionPlan.updateMany({ userId, goalId: plan.goalId, status: 'ACTIVE' }, { status: 'ARCHIVED' })
  plan.status = 'ACTIVE'
  await plan.save()
  await Task.updateMany({ userId, executionPlanId: plan._id, proposed: true }, { proposed: false })
  return plan
}

async function buildDailyItems(userId, goal, plan, blockers) {
  const tasks = await Task.find({
    userId,
    goalId: goal._id,
    completed: false,
    failed: { $ne: true },
    $or: [{ snoozedUntil: null }, { snoozedUntil: { $lte: new Date() } }],
  }).sort({ priority: 1, createdAt: 1 }).limit(20).lean()

  const priorityOrder = { URGENT: 0, HIGH: 1, High: 1, MEDIUM: 2, Medium: 2, LOW: 3, Low: 3 }
  const sorted = [...tasks].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))

  const items = sorted.slice(0, 8).map((t, i) => {
    const milestone = plan?.milestones?.find((m) => m.key === t.milestoneKey)
    return {
      taskId: t._id,
      title: t.title,
      type: t.type || 'task',
      priority: mapPriority(t.priority),
      why: milestone ? `Supports milestone: ${milestone.title}` : `Progress toward ${goal.title}`,
      whyNow: blockers[0]?.type === 'APPLICATION_DEADLINE' && i === 0
        ? 'Deadline approaching'
        : i < 3 ? 'High career relevance' : 'Continues execution momentum',
      supports: goal.title,
      estimatedEffort: estimateFromTask(t),
      order: i + 1,
      proposed: t.proposed,
      completed: t.completed,
      goalId: goal._id,
      milestoneKey: t.milestoneKey,
    }
  })

  const careerActions = tasks.length >= 3
    ? { actions: [] }
    : await careerOS.getNextActions(userId).catch(() => ({ actions: [] }))
  for (const a of (careerActions.actions || []).slice(0, 2)) {
    if (!items.some((it) => it.title === a.action)) {
      items.push({
        title: a.action,
        type: a.type,
        priority: a.priority,
        why: a.why,
        whyNow: 'Career operating system priority',
        supports: goal.title,
        estimatedEffort: 'ESTIMATE UNKNOWN',
        order: items.length + 1,
        proposed: true,
        completed: false,
        goalId: goal._id,
      })
    }
  }

  return items.slice(0, 10)
}

async function getDailyPlan(userId, { regenerate = false } = {}) {
  const goal = await getPrimaryCareerGoal(userId)
  if (!goal) {
    const h = new Date().getHours()
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    return {
      empty: true,
      message: 'Create your first career goal to receive a daily plan.',
      greeting,
    }
  }

  const dateKey = todayKey()
  if (!regenerate) {
    const cached = await DailyPlanSnapshot.findOne({ userId, planDate: dateKey }).lean()
    if (cached) {
      return {
        planDate: dateKey,
        goal: { id: goal._id, title: goal.title },
        topPriority: cached.topPriority,
        items: cached.items,
        blockers: cached.blockers,
        focusBlocks: cached.focusBlocks,
        fromCache: true,
      }
    }
  }

  let plan = await ExecutionPlan.findOne({ userId, goalId: goal._id, status: 'ACTIVE' }).lean()
  if (!plan) {
    plan = (await getOrCreateExecutionPlan(userId, { goalId: goal._id })).plan
  }

  const slices = {
    gapAnalysis: await careerCopilot.getCareerGapAnalysis(userId),
  }
  const blockers = await detectBlockers(userId, goal, plan?.milestones || [], slices)
  const items = await buildDailyItems(userId, goal, plan, blockers)
  const topPriority = items[0] || null

  const highPriority = items.filter((i) => i.priority === 'URGENT' || i.priority === 'HIGH')
  const optional = items.filter((i) => i.priority === 'LOW' || i.priority === 'MEDIUM').slice(3)

  const profile = await UserProfile.findOne({ userId }).lean()
  const focusBlocks = []
  if (profile?.studyHours || profile?.availability) {
    let hour = 9
    for (const item of highPriority.slice(0, 3)) {
      focusBlocks.push({
        start: `${String(hour).padStart(2, '0')}:00`,
        end: `${String(hour + 1).padStart(2, '0')}:00`,
        label: item.title,
        taskId: item.taskId,
      })
      hour += 1
    }
  }

  const prev = await DailyPlanSnapshot.findOne({ userId, planDate: dateKey }).lean()
  const snapshot = await DailyPlanSnapshot.findOneAndUpdate(
    { userId, planDate: dateKey },
    {
      userId,
      goalId: goal._id,
      executionPlanId: plan?._id,
      planDate: dateKey,
      topPriority,
      items,
      blockers,
      focusBlocks,
      version: (prev?.version || 0) + 1,
      previousSnapshotId: prev?._id,
      changeReason: regenerate ? 'Daily plan recalculated' : undefined,
    },
    { upsert: true, new: true },
  ).lean()

  return {
    planDate: dateKey,
    goal: { id: goal._id, title: goal.title, targetRole: plan?.targetRole || profile?.targetRole },
    targetRole: plan?.targetRole || profile?.targetRole || 'Not set',
    topPriority,
    highPriority,
    optional,
    items,
    blockers,
    focusBlocks,
    focusModeHref: '/workspace/focus',
    disclaimer: 'Daily plan from authorized goals and tasks. You control all completions.',
  }
}

async function getWeeklyPlan(userId) {
  const weekly = await careerCopilot.getWeeklyCareerPlan(userId)
  const goal = await getPrimaryCareerGoal(userId)
  const plan = goal
    ? await ExecutionPlan.findOne({ userId, goalId: goal._id, status: 'ACTIVE' }).lean()
    : null

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const tasks = goal
    ? await Task.find({ userId, goalId: goal._id, completed: false }).limit(14).lean()
    : []

  const schedule = days.map((day, i) => ({
    day,
    tasks: tasks.filter((_, idx) => idx % 7 === i).slice(0, 2).map((t) => ({
      taskId: t._id,
      title: t.title,
      priority: mapPriority(t.priority),
    })),
  }))

  return {
    generatedAt: new Date().toISOString(),
    careerGoal: goal?.title || weekly.careerGoal,
    currentMilestone: plan?.milestones?.find((m) => m.status === 'IN_PROGRESS') || plan?.milestones?.find((m) => m.status === 'PENDING'),
    weeklyObjectives: [
      ...(weekly.priorities?.high || []).slice(0, 2).map((p) => p.what),
      ...(plan?.milestones?.filter((m) => m.status !== 'COMPLETED').slice(0, 1).map((m) => m.title) || []),
    ].filter(Boolean),
    schedule,
    priorities: weekly.priorities,
    disclaimer: weekly.disclaimer,
  }
}

async function getProgress(userId, goalId) {
  const goal = await assertGoalAccess(userId, goalId)
  const plan = await ExecutionPlan.findOne({ userId, goalId, status: 'ACTIVE' }).lean()
  const tasks = await Task.find({ userId, goalId }).lean()
  const completedTasks = tasks.filter((t) => t.completed).length
  const totalTasks = tasks.length
  const completedMilestones = (plan?.milestones || []).filter((m) => m.status === 'COMPLETED').length
  const totalMilestones = (plan?.milestones || []).length

  const progress = await calculateProgress(goalId, userId)

  return {
    goalId,
    goalTitle: goal.title,
    progressPercent: progress,
    explanation: `You completed ${completedTasks} of ${totalTasks || 'no'} tasks and ${completedMilestones} of ${totalMilestones || 'no'} milestones.`,
    milestones: { completed: completedMilestones, total: totalMilestones },
    tasks: { completed: completedTasks, total: totalTasks },
    disclaimer: 'Progress calculated from actual task completion only.',
  }
}

async function completeTask(userId, taskId) {
  const task = await assertTaskAccess(userId, taskId)
  task.completed = true
  task.completedAt = new Date()
  task.proposed = false
  await task.save()

  if (task.goalId) {
    await Goal.findOneAndUpdate(
      { _id: task.goalId, userId },
      { progress: await calculateProgress(task.goalId, userId), completed: false },
    )

    const plan = await ExecutionPlan.findOne({ userId, goalId: task.goalId, status: 'ACTIVE' })
    if (plan && task.milestoneKey) {
      const ms = plan.milestones.find((m) => m.key === task.milestoneKey)
      if (ms) {
        const relatedTasks = await Task.find({ userId, goalId: task.goalId, milestoneKey: task.milestoneKey }).lean()
        if (relatedTasks.every((t) => t.completed)) {
          ms.status = 'COMPLETED'
          plan.markModified('milestones')
          await plan.save()
        } else {
          ms.status = 'IN_PROGRESS'
          plan.markModified('milestones')
          await plan.save()
        }
      }
    }
  }

  await DailyPlanSnapshot.deleteOne({ userId, planDate: todayKey() })

  return {
    task,
    evidence: task.milestoneKey
      ? { action: task.title, skill: task.milestoneKey, goal: task.goalId }
      : null,
    message: 'Task marked complete. Progress updated from actual completion.',
  }
}

async function skipTask(userId, taskId, { reason } = {}) {
  const task = await assertTaskAccess(userId, taskId)
  task.snoozedUntil = new Date(Date.now() + 86400000)
  await task.save()
  await DailyPlanSnapshot.deleteOne({ userId, planDate: todayKey() })
  return {
    task,
    options: ['reschedule', 'split', 'reduce scope', 'defer'],
    message: reason ? sanitizeText(reason) : 'Task snoozed for 24 hours. No assumption about ability.',
  }
}

async function markTaskFailed(userId, taskId) {
  const task = await assertTaskAccess(userId, taskId)
  task.failed = true
  await task.save()
  return {
    task,
    support: [
      { option: 'smaller task', action: 'Request task breakdown' },
      { option: 'different resource', action: 'Explore learning resources' },
      { option: 'different schedule', action: 'Snooze or reschedule' },
    ],
  }
}

async function splitTask(userId, taskId) {
  const task = await assertTaskAccess(userId, taskId)
  const steps = [
    { title: `Research scope for: ${task.title}`, type: 'learn', estimatedTime: '30 min' },
    { title: `Draft first version: ${task.title}`, type: 'practice', estimatedTime: '1 hour' },
    { title: `Review and refine: ${task.title}`, type: 'revise', estimatedTime: '30 min' },
  ]

  const created = []
  let prevId = null
  for (const step of steps) {
    const doc = await Task.create({
      userId,
      goalId: task.goalId,
      executionPlanId: task.executionPlanId,
      milestoneKey: task.milestoneKey,
      title: step.title,
      type: step.type,
      estimatedTime: step.estimatedTime,
      priority: task.priority,
      category: task.category,
      proposed: true,
      dependsOn: prevId ? [prevId] : task.dependsOn || [],
    })
    prevId = doc._id
    created.push(doc)
  }

  task.failed = true
  await task.save()
  await DailyPlanSnapshot.deleteOne({ userId, planDate: todayKey() })

  return { originalTask: task, subtasks: created, message: 'Proposed smaller steps — accept by completing or editing.' }
}

async function proposeReschedule(userId, taskId) {
  const task = await assertTaskAccess(userId, taskId)
  const blockers = await detectBlockers(userId, { _id: task.goalId }, [], {})
  const options = []

  if (blockers.some((b) => b.type === 'APPLICATION_DEADLINE')) {
    options.push({ action: 'reschedule', reason: 'Lower priority vs approaching deadline', suggested: 'Defer 2 days' })
  } else {
    options.push({ action: 'reschedule', reason: 'Task not completed today', suggested: 'Move to tomorrow' })
  }
  options.push({ action: 'split', reason: 'Task may be too large', suggested: 'Break into smaller steps' })
  options.push({ action: 'reduce scope', reason: 'Partial progress still valuable', suggested: 'Complete minimum viable portion' })

  return { task, options, disclaimer: 'Proposals only — user confirms changes.' }
}

async function getRecoveryPlan(userId) {
  const goal = await getPrimaryCareerGoal(userId)
  if (!goal) return { empty: true, message: 'Set a career goal first.' }

  const overdue = await Task.find({
    userId,
    goalId: goal._id,
    completed: false,
    snoozedUntil: { $lt: new Date() },
  }).lean()

  const highValue = await Task.find({
    userId,
    goalId: goal._id,
    completed: false,
    priority: { $in: ['High', 'URGENT'] },
  }).limit(2).lean()

  return {
    overdueCount: overdue.length,
    originalPace: `${Math.min(overdue.length + 2, 5)} tasks/day`,
    recoveryPace: `${Math.min(2, highValue.length || 2)} high-value tasks/day`,
    focusTasks: highValue.map((t) => ({ taskId: t._id, title: t.title, why: 'Highest career impact' })),
    options: ['catch up', 'reduce scope', 'reschedule', 'reprioritize'],
    disclaimer: 'Recovery plan is advisory — not a judgment.',
  }
}

async function getPlanChangeExplanation(userId) {
  const goal = await getPrimaryCareerGoal(userId)
  if (!goal) return { changes: [], message: 'No active goal.' }

  const snapshots = await DailyPlanSnapshot.find({ userId }).sort({ createdAt: -1 }).limit(2).lean()
  if (snapshots.length < 2) {
    return { changes: [], message: 'No prior plan to compare.' }
  }

  const [current, previous] = snapshots
  const changes = []
  if (current.changeReason) {
    changes.push({ reason: current.changeReason, at: current.updatedAt })
  }
  if (current.topPriority?.title !== previous.topPriority?.title) {
    changes.push({
      reason: `Top priority changed from "${previous.topPriority?.title || 'none'}" to "${current.topPriority?.title || 'none'}"`,
      at: current.updatedAt,
    })
  }

  const interview = await careerReadiness.listInterviewHistory(userId, { limit: 1 }).catch(() => [])
  if (interview?.[0]?.status === 'IN_PROGRESS') {
    changes.push({
      reason: 'Plan may prioritize interview preparation due to active session',
      at: new Date(),
      category: 'FACT',
    })
  }

  return { changes, disclaimer: 'Explanations based on actual recorded events only.' }
}

async function executionCopilot(userId, { question } = {}) {
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  const daily = await getDailyPlan(userId)
  const recovery = await getRecoveryPlan(userId)
  const facts = []
  const recommendations = []

  if (daily.goal) {
    facts.push({ text: `Active goal: ${daily.goal.title}`, source: 'goal' })
  }

  let answer = ''

  if (/today|what should i do/i.test(q)) {
    answer = daily.items?.length
      ? `Today: ${daily.items.slice(0, 3).map((i) => i.title).join('; ')}.`
      : 'Create a career goal and accept an execution plan to get daily tasks.'
    recommendations.push(...(daily.items || []).slice(0, 3).map((i) => ({
      text: i.title,
      why: i.why,
      category: 'RECOMMENDATION',
    })))
  } else if (/finish first|priority/i.test(q)) {
    answer = daily.topPriority
      ? `Finish first: ${daily.topPriority.title}. ${daily.topPriority.why}`
      : 'No priority task identified — set a career goal.'
  } else if (/why.*important|why is this/i.test(q)) {
    const item = daily.topPriority
    answer = item ? `${item.title} supports ${item.supports}. ${item.why}. ${item.whyNow}` : 'Select a task to see its rationale.'
  } else if (/behind|overdue/i.test(q)) {
    answer = recovery.overdueCount
      ? `You have ${recovery.overdueCount} overdue task(s). Options: ${recovery.options.join(', ')}.`
      : 'No overdue tasks detected.'
    recommendations.push(...(recovery.focusTasks || []).map((t) => ({
      text: t.title,
      why: t.why,
      category: 'RECOMMENDATION',
    })))
  } else if (/still reach|can i reach/i.test(q)) {
    const goal = await getPrimaryCareerGoal(userId)
    const plan = goal ? await ExecutionPlan.findOne({ userId, goalId: goal._id, status: 'ACTIVE' }).lean() : null
    answer = plan
      ? `Risk level: ${plan.riskLevel}. Focus on ${plan.milestones?.find((m) => m.status !== 'COMPLETED')?.title || 'next milestone'}. Outcomes are not guaranteed.`
      : 'Set a goal and generate a plan to assess progress.'
  } else if (/plan change|what changed/i.test(q)) {
    const explained = await getPlanChangeExplanation(userId)
    answer = explained.changes.length
      ? explained.changes.map((c) => c.reason).join(' ')
      : explained.message
  } else {
    const cc = await careerOS.commandCenterCopilot(userId, { question: q })
    answer = cc.answer
    facts.push(...(cc.facts || []))
    recommendations.push(...(cc.recommendations || []))
  }

  return {
    question: q,
    answer,
    facts,
    recommendations,
    actions: (daily.items || []).slice(0, 3).map((i) => ({
      action: i.title,
      why: i.why,
      href: i.taskId ? `/tasks` : undefined,
      dismissible: true,
    })),
    disclaimer: 'Copilot provides advisory guidance. Facts and recommendations are separated.',
  }
}

async function getExecutionDashboard(userId) {
  const goal = await getPrimaryCareerGoal(userId)
  if (!goal) {
    return {
      empty: true,
      message: 'Create your first career goal to unlock the execution engine.',
    }
  }

  const activePlan = await ExecutionPlan.findOne({ userId, goalId: goal._id, status: 'ACTIVE' }).lean()
    || await ExecutionPlan.findOne({ userId, goalId: goal._id }).sort({ version: -1 }).lean()

  const [daily, weekly, progress, recovery, blockersExplanation] = await Promise.all([
    getDailyPlan(userId),
    getWeeklyPlan(userId),
    getProgress(userId, goal._id),
    getRecoveryPlan(userId),
    getPlanChangeExplanation(userId),
  ])

  const slices = {
    gapAnalysis: await careerCopilot.getCareerGapAnalysis(userId),
    oppDash: null,
    interviewHistory: [],
  }
  const blockers = await detectBlockers(userId, goal, activePlan?.milestones || [], slices)

  return {
    generatedAt: new Date().toISOString(),
    goal: { id: goal._id, title: goal.title, deadline: goal.deadline, progress: progress.progressPercent },
    targetRole: activePlan?.targetRole,
    strategy: activePlan?.strategy || [],
    milestones: activePlan?.milestones || [],
    currentMilestone: activePlan?.milestones?.find((m) => m.status === 'IN_PROGRESS') || activePlan?.milestones?.find((m) => m.status === 'PENDING'),
    executionPlan: activePlan ? { id: activePlan._id, version: activePlan.version, status: activePlan.status, riskLevel: activePlan.riskLevel } : null,
    daily,
    weekly,
    progress,
    blockers,
    recovery: recovery.overdueCount > 0 ? recovery : null,
    planChanges: blockersExplanation,
    risk: {
      level: activePlan?.riskLevel || 'UNKNOWN',
      explanation: blockers[0] ? blockers[0].blocker : 'Insufficient data for risk assessment',
      recommendedAction: blockers[0]?.recommendedAction,
    },
    disclaimer: 'Execution engine uses authorized goals and tasks. You control all submissions and changes.',
  }
}

async function replan(userId, { reason } = {}) {
  const goal = await getPrimaryCareerGoal(userId)
  if (!goal) {
    const err = new Error('No active goal to replan')
    err.statusCode = 400
    throw err
  }

  const { plan } = await getOrCreateExecutionPlan(userId, { goalId: goal._id, regenerate: true })
  if (reason) plan.changeReason = sanitizeText(reason)
  await plan.save()
  await DailyPlanSnapshot.deleteOne({ userId, planDate: todayKey() })

  return {
    plan,
    message: 'New proposed plan generated. Accept to activate.',
    previousVersions: await ExecutionPlan.countDocuments({ userId, goalId: goal._id, status: 'ARCHIVED' }),
  }
}

module.exports = {
  sanitizeText,
  assertGoalAccess,
  assertTaskAccess,
  assertPlanAccess,
  getPrimaryCareerGoal,
  buildStrategy,
  buildMilestones,
  getOrCreateExecutionPlan,
  acceptPlan,
  getDailyPlan,
  getWeeklyPlan,
  getProgress,
  detectBlockers,
  completeTask,
  skipTask,
  markTaskFailed,
  splitTask,
  proposeReschedule,
  getRecoveryPlan,
  getPlanChangeExplanation,
  executionCopilot,
  getExecutionDashboard,
  replan,
}
