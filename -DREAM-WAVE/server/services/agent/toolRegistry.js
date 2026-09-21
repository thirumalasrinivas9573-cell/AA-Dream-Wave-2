/**
 * Dream Wave Agent Tool Registry (Thirumala V3 Prompt 9).
 *
 * ONLY registered tools can execute.
 * Handlers call existing services — no Mongo bypass, no shell, no arbitrary HTTP.
 * Authorization is enforced inside each handler using authenticated auth context.
 */
const mongoose = require('mongoose')
const Goal = require('../../models/Goal')
const Task = require('../../models/Task')
const Roadmap = require('../../models/Roadmap')
const Application = require('../../models/Application')
const Job = require('../../models/Job')
const Internship = require('../../models/Internship')
const PortalEvent = require('../../models/PortalEvent')
const StudentProfile = require('../../models/StudentProfile')

const RISK = {
  LOW_RISK: 'LOW_RISK',
  MEDIUM_RISK: 'MEDIUM_RISK',
  HIGH_RISK: 'HIGH_RISK',
  CRITICAL: 'CRITICAL',
}

function deny(code, message, statusCode = 403) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  throw err
}

function requireAuth(ctx) {
  if (!ctx?.userId) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
}

function requireRoles(ctx, roles = []) {
  requireAuth(ctx)
  if (!roles.includes(ctx.role)) {
    deny('ROLE_FORBIDDEN', `Role “${ctx.role}” cannot use this tool.`, 403)
  }
}

function assertObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) {
    deny('VALIDATION_ERROR', `Invalid ${label}.`, 400)
  }
  return value
}

function sanitizeTask(task) {
  if (!task) return null
  return {
    id: String(task._id),
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || null,
    goalId: task.goalId ? String(task.goalId) : null,
    type: task.type || null,
  }
}

function sanitizeGoal(goal) {
  if (!goal) return null
  return {
    id: String(goal._id),
    title: goal.title,
    status: goal.status,
    progress: goal.progress || 0,
    priority: goal.priority,
    deadline: goal.deadline || null,
  }
}

/** @type {Map<string, object>} */
const registry = new Map()

function registerTool(tool) {
  if (!tool?.name || typeof tool.handler !== 'function') {
    throw new Error('Invalid tool definition')
  }
  if (registry.has(tool.name)) {
    throw new Error(`Duplicate tool: ${tool.name}`)
  }
  registry.set(tool.name, {
    name: tool.name,
    description: tool.description || '',
    agentTypes: tool.agentTypes || ['student', 'general'],
    roles: tool.roles || ['student'],
    riskLevel: tool.riskLevel || RISK.LOW_RISK,
    sideEffect: Boolean(tool.sideEffect),
    external: Boolean(tool.external),
    destructive: Boolean(tool.destructive),
    requiresConfirmation: tool.requiresConfirmation ?? (tool.riskLevel !== RISK.LOW_RISK),
    retryable: tool.retryable ?? (tool.riskLevel === RISK.LOW_RISK && !tool.sideEffect),
    inputSchema: tool.inputSchema || {},
    outputKeys: tool.outputKeys || [],
    handler: tool.handler,
  })
}

function listTools({ role, agentType } = {}) {
  return [...registry.values()]
    .filter((t) => (!role || t.roles.includes(role)) && (!agentType || t.agentTypes.includes(agentType) || t.agentTypes.includes('general')))
    .map((t) => ({
      name: t.name,
      description: t.description,
      riskLevel: t.riskLevel,
      requiresConfirmation: t.requiresConfirmation,
      roles: t.roles,
      agentTypes: t.agentTypes,
      sideEffect: t.sideEffect,
      destructive: t.destructive,
      external: t.external,
    }))
}

function getTool(name) {
  return registry.get(name) || null
}

function rejectUnknownTool(name) {
  deny('UNKNOWN_TOOL', `Tool “${name}” is not registered.`, 400)
}

async function executeTool(name, rawArgs, ctx) {
  const tool = getTool(name)
  if (!tool) rejectUnknownTool(name)

  requireRoles(ctx, tool.roles)

  // Hard blocks — never allow these through the agent
  if (rawArgs && typeof rawArgs === 'object') {
    if (rawArgs.__shell || rawArgs.command || rawArgs.eval || rawArgs.script) {
      deny('COMMAND_INJECTION_BLOCKED', 'Shell/script execution is not allowed.', 400)
    }
    if (rawArgs.url && tool.name !== 'getOpportunities' && tool.external !== true) {
      // ignore arbitrary URLs in args for non-external tools
      delete rawArgs.url
    }
    delete rawArgs.userId
    delete rawArgs.ownerId
    delete rawArgs.studentId
    delete rawArgs.institutionId
    delete rawArgs.companyId
    delete rawArgs.organizationId
    delete rawArgs.role
    delete rawArgs.permissions
  }

  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {}
  const result = await tool.handler(args, ctx)
  return {
    tool: tool.name,
    riskLevel: tool.riskLevel,
    requiresConfirmation: tool.requiresConfirmation,
    result,
  }
}

// ─── Read tools (student) ────────────────────────────────────────────────────

registerTool({
  name: 'getGoals',
  description: 'List the authenticated student’s goals.',
  agentTypes: ['student', 'daily_life', 'learning', 'project', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const limit = Math.min(30, Math.max(1, Number(args.limit) || 10))
    const goals = await Goal.find({ userId: ctx.userId, status: { $ne: 'archived' } })
      .sort('-updatedAt').limit(limit).lean()
    return { count: goals.length, goals: goals.map(sanitizeGoal) }
  },
})

registerTool({
  name: 'getTasks',
  description: 'List the authenticated student’s tasks.',
  agentTypes: ['student', 'daily_life', 'project', 'learning', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const limit = Math.min(50, Math.max(1, Number(args.limit) || 20))
    const filter = { userId: ctx.userId, status: { $ne: 'archived' } }
    if (args.openOnly) filter.completed = { $ne: true }
    const tasks = await Task.find(filter).sort('-updatedAt').limit(limit).lean()
    return { count: tasks.length, tasks: tasks.map(sanitizeTask) }
  },
})

registerTool({
  name: 'getRoadmap',
  description: 'Get roadmap for a goal owned by the student.',
  agentTypes: ['student', 'learning', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const filter = { userId: ctx.userId, status: { $ne: 'archived' } }
    if (args.goalId) {
      assertObjectId(args.goalId, 'goalId')
      filter.goalId = args.goalId
    }
    const roadmap = await Roadmap.findOne(filter).sort('-updatedAt').lean()
    if (!roadmap) return { roadmap: null }
    const stage = (roadmap.learningStages || []).find((s) => s.status !== 'completed')
    return {
      roadmap: {
        id: String(roadmap._id),
        goalId: String(roadmap.goalId),
        status: roadmap.status,
        currentStage: stage?.title || null,
        stageCount: roadmap.learningStages?.length || 0,
      },
    }
  },
})

registerTool({
  name: 'getDailyLife',
  description: 'Get Daily Life next-action and priorities for the student.',
  agentTypes: ['student', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    const personalDailyIntelligenceService = require('../personalDailyIntelligenceService')
    const intel = await personalDailyIntelligenceService.getDailyLifeIntelligence(ctx.userId)
    return {
      nextAction: intel.nextAction,
      critical: intel.plan.buckets.Critical.slice(0, 5),
      important: intel.plan.buckets.Important.slice(0, 5),
      empty: intel.empty,
    }
  },
})

registerTool({
  name: 'getLearningIntelligence',
  description: 'Get learning next-action and skill gaps.',
  agentTypes: ['student', 'learning', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const learningIntelligenceService = require('../learningIntelligenceService')
    const goalId = args.goalId || null
    if (goalId) assertObjectId(goalId, 'goalId')
    const intel = await learningIntelligenceService.getLearningIntelligence(ctx.userId, { goalId })
    return {
      nextAction: intel.nextAction,
      skillGaps: intel.skillGaps.gaps.slice(0, 5),
      overview: intel.overview,
    }
  },
})

registerTool({
  name: 'getProjects',
  description: 'List portfolio projects from the student profile.',
  agentTypes: ['student', 'project', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    const profile = await StudentProfile.findOne({ userId: ctx.userId }).select('projects').lean()
    const projects = (profile?.projects || [])
      .filter((p) => p.status !== 'archived')
      .slice(0, 10)
      .map((p) => ({
        id: String(p._id),
        title: p.title,
        status: p.status,
        technologies: (p.technologies || []).slice(0, 8),
      }))
    return { count: projects.length, projects }
  },
})

registerTool({
  name: 'getResearch',
  description: 'List private research projects for the student.',
  agentTypes: ['student', 'research', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    try {
      const researchService = require('../researchService')
      if (!researchService.isEnabled?.()) return { projects: [], note: 'Research module unavailable.' }
      const projects = await researchService.listProjects(ctx.userId, { limit: 5 })
      return {
        projects: projects.map((p) => ({
          id: p.id,
          title: p.title,
          question: p.question,
          status: p.status,
          sources: p.counts?.sources || 0,
        })),
      }
    } catch {
      return { projects: [], note: 'Research unavailable.' }
    }
  },
})

registerTool({
  name: 'getNotifications',
  description: 'List recent notifications for the authenticated user.',
  agentTypes: ['student', 'daily_life', 'event', 'opportunity', 'general'],
  roles: ['student', 'institution', 'company', 'admin'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const notificationService = require('../notificationService')
    const data = await notificationService.listForUser(ctx.userId, {
      limit: Math.min(20, Number(args.limit) || 10),
    })
    return {
      unread: data.unread || 0,
      items: (data.items || []).slice(0, 10).map((n) => ({
        id: String(n._id),
        title: n.title,
        body: n.body,
        priority: n.priority,
        read: n.read,
        link: n.link || null,
      })),
    }
  },
})

registerTool({
  name: 'getApplications',
  description: 'List the student’s career applications.',
  agentTypes: ['student', 'opportunity', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    const apps = await Application.find({ studentId: ctx.userId }).sort('-updatedAt').limit(15).lean()
    return {
      count: apps.length,
      applications: apps.map((a) => ({
        id: String(a._id),
        status: a.status,
        targetType: a.targetType,
        updatedAt: a.updatedAt,
      })),
    }
  },
})

registerTool({
  name: 'getOpportunities',
  description: 'List public jobs/internships (discovery). Does not submit applications.',
  agentTypes: ['student', 'opportunity', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 5))
    const [jobs, internships] = await Promise.all([
      Job.find({ status: 'open' }).sort('-createdAt').limit(limit).select('title status companyId').lean().catch(() => []),
      Internship.find({ status: 'open' }).sort('-createdAt').limit(limit).select('title status companyId').lean().catch(() => []),
    ])
    return {
      jobs: jobs.map((j) => ({ id: String(j._id), title: j.title, type: 'job', status: j.status })),
      internships: internships.map((i) => ({
        id: String(i._id),
        title: i.title,
        type: 'internship',
        status: i.status,
      })),
      note: 'Read-only discovery. Application submission is never automatic.',
      scopedUser: String(ctx.userId),
    }
  },
})

registerTool({
  name: 'getEvents',
  description: 'List public portal events.',
  agentTypes: ['student', 'event', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args) => {
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 5))
    const events = await PortalEvent.find({})
      .sort('-startAt -createdAt')
      .limit(limit)
      .select('title startAt endAt status ownerType')
      .lean()
      .catch(() => [])
    return {
      events: events.map((e) => ({
        id: String(e._id),
        title: e.title,
        startAt: e.startAt || null,
        status: e.status || null,
      })),
      note: 'Registration is never automatic.',
    }
  },
})

// ─── Write tools (confirm required) ──────────────────────────────────────────

registerTool({
  name: 'createTask',
  description: 'Create a task for the authenticated student after confirmation.',
  agentTypes: ['student', 'daily_life', 'project', 'learning', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    const title = String(args.title || '').trim().slice(0, 160)
    if (!title) deny('VALIDATION_ERROR', 'Task title is required.', 400)
    const priority = ['Low', 'Medium', 'High'].includes(args.priority) ? args.priority : 'Medium'
    const type = ['learn', 'quiz', 'practice', 'revise'].includes(args.type) ? args.type : 'learn'
    let goalId
    if (args.goalId) {
      assertObjectId(args.goalId, 'goalId')
      const goal = await Goal.findOne({ _id: args.goalId, userId: ctx.userId }).select('_id').lean()
      if (!goal) deny('NOT_FOUND', 'Goal not found.', 404)
      goalId = goal._id
    }
    let dueDate
    if (args.dueDate) {
      dueDate = new Date(args.dueDate)
      if (Number.isNaN(dueDate.getTime())) deny('VALIDATION_ERROR', 'Invalid dueDate.', 400)
    }

    // Idempotency: same user + title + same day within hour
    if (args.idempotencyKey) {
      const existing = await Task.findOne({
        userId: ctx.userId,
        title,
        source: 'ai',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      }).lean()
      if (existing) {
        return { created: false, duplicate: true, task: sanitizeTask(existing) }
      }
    }

    const task = await Task.create({
      userId: ctx.userId, // server-controlled
      title,
      priority,
      type,
      source: 'ai',
      status: 'todo',
      goalId,
      dueDate,
    })

    const verified = await Task.findOne({ _id: task._id, userId: ctx.userId }).lean()
    if (!verified || verified.title !== title) {
      deny('VERIFY_FAILED', 'Created task could not be verified.', 500)
    }
    return { created: true, duplicate: false, task: sanitizeTask(verified), verified: true }
  },
})

registerTool({
  name: 'completeTask',
  description: 'Mark an owned task completed after confirmation.',
  agentTypes: ['student', 'daily_life', 'project', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    assertObjectId(args.taskId, 'taskId')
    const task = await Task.findOne({ _id: args.taskId, userId: ctx.userId })
    if (!task) deny('NOT_FOUND', 'Task not found.', 404)
    task.status = 'completed'
    task.completed = true
    task.completedAt = new Date()
    task.progress = 100
    await task.save()
    const verified = await Task.findOne({ _id: task._id, userId: ctx.userId }).lean()
    if (!verified?.completed && verified?.status !== 'completed') {
      deny('VERIFY_FAILED', 'Task completion could not be verified.', 500)
    }
    return { verified: true, task: sanitizeTask(verified) }
  },
})

registerTool({
  name: 'createGoal',
  description: 'Create a goal for the authenticated student after confirmation.',
  agentTypes: ['student', 'learning', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    const title = String(args.title || '').trim().slice(0, 160)
    if (!title) deny('VALIDATION_ERROR', 'Goal title is required.', 400)
    const goal = await Goal.create({
      userId: ctx.userId,
      title,
      description: String(args.description || '').trim().slice(0, 4000),
      category: args.category || 'Personal',
      status: 'active',
      requiredSkills: Array.isArray(args.requiredSkills)
        ? args.requiredSkills.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
        : [],
    })
    const verified = await Goal.findOne({ _id: goal._id, userId: ctx.userId }).lean()
    if (!verified) deny('VERIFY_FAILED', 'Created goal could not be verified.', 500)
    return { created: true, verified: true, goal: sanitizeGoal(verified) }
  },
})

registerTool({
  name: 'deleteTask',
  description: 'Delete an owned task — CRITICAL, always requires confirmation.',
  agentTypes: ['student', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.CRITICAL,
  sideEffect: true,
  destructive: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    assertObjectId(args.taskId, 'taskId')
    const task = await Task.findOne({ _id: args.taskId, userId: ctx.userId })
    if (!task) deny('NOT_FOUND', 'Task not found.', 404)
    // Soft-archive preferred over hard delete
    task.status = 'archived'
    await task.save()
    const verified = await Task.findOne({ _id: task._id, userId: ctx.userId }).lean()
    if (verified?.status !== 'archived') deny('VERIFY_FAILED', 'Archive could not be verified.', 500)
    return { archived: true, verified: true, task: sanitizeTask(verified) }
  },
})

registerTool({
  name: 'proposeTaskBreakdown',
  description: 'Suggest breakdown steps for a complex task (no writes).',
  agentTypes: ['student', 'project', 'daily_life', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const personalDailyIntelligenceService = require('../personalDailyIntelligenceService')
    return personalDailyIntelligenceService.suggestTaskBreakdown(args.title || '')
  },
})

// ─── Memory tools (Prompt 10) — ownership always from auth ctx ───────────────

registerTool({
  name: 'getRelevantMemories',
  description: 'Retrieve ranked long-term memories relevant to a message (owner-scoped).',
  agentTypes: ['student', 'daily_life', 'learning', 'project', 'research', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const memoryService = require('../memoryService')
    const memories = await memoryService.getRelevantMemories(ctx.userId, {
      message: String(args.message || args.query || '').slice(0, 500),
      intent: String(args.intent || '').slice(0, 40),
      limit: Math.min(10, Number(args.limit) || 6),
      agentDomain: args.agentDomain || ctx.agentType || ctx.domain || null,
    })
    return { count: memories.length, memories }
  },
})

registerTool({
  name: 'listMemories',
  description: 'List the authenticated student’s stored memories.',
  agentTypes: ['student', 'general'],
  roles: ['student'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (args, ctx) => {
    const memoryService = require('../memoryService')
    return memoryService.listMemories(ctx.userId, {
      status: args.status || 'ACTIVE',
      type: args.type,
      source: args.source,
      q: args.q,
      limit: Math.min(40, Number(args.limit) || 20),
    })
  },
})

registerTool({
  name: 'createMemory',
  description: 'Propose or create long-term memory. AI-derived content requires user confirmation — never silent permanent writes.',
  agentTypes: ['student', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    const memoryService = require('../memoryService')
    return memoryService.createMemory(ctx.userId, {
      content: args.content,
      type: args.type || 'IMPORTANT_CONTEXT',
      source: 'USER_EXPLICIT',
      confidence: 'EXPLICIT',
      entityType: args.entityType,
      entityId: args.entityId,
      expiresAt: args.expiresAt,
      conflictGroup: args.conflictGroup,
      confirm: true,
      force: true,
    })
  },
})

registerTool({
  name: 'updateMemory',
  description: 'Update an owned memory after confirmation.',
  agentTypes: ['student', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    assertObjectId(args.memoryId, 'memoryId')
    const memoryService = require('../memoryService')
    const memory = await memoryService.updateMemory(ctx.userId, args.memoryId, {
      content: args.content,
      type: args.type,
      expiresAt: args.expiresAt,
      status: args.status,
    })
    return { updated: true, memory }
  },
})

registerTool({
  name: 'archiveMemory',
  description: 'Archive an owned memory after confirmation.',
  agentTypes: ['student', 'general'],
  roles: ['student'],
  riskLevel: RISK.MEDIUM_RISK,
  sideEffect: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    assertObjectId(args.memoryId, 'memoryId')
    const memoryService = require('../memoryService')
    const memory = await memoryService.archiveMemory(ctx.userId, args.memoryId)
    return { archived: true, memory }
  },
})

registerTool({
  name: 'deleteMemory',
  description: 'Delete an owned memory — requires confirmation. Never bulk-wipe silently.',
  agentTypes: ['student', 'general'],
  roles: ['student'],
  riskLevel: RISK.CRITICAL,
  sideEffect: true,
  destructive: true,
  requiresConfirmation: true,
  retryable: false,
  handler: async (args, ctx) => {
    assertObjectId(args.memoryId, 'memoryId')
    const memoryService = require('../memoryService')
    return memoryService.deleteMemory(ctx.userId, args.memoryId, { confirm: true })
  },
})

// Institution / company read-only stubs with role gates
registerTool({
  name: 'getInstitutionOverview',
  description: 'Basic institution-scoped overview for authorized institution users.',
  agentTypes: ['institution', 'general'],
  roles: ['institution', 'admin'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    requireRoles(ctx, ['institution', 'admin'])
    return {
      note: 'Institution analytics remain on existing institution APIs. Agent provides routing only.',
      allowed: true,
      role: ctx.role,
      urls: {
        commandCenter: '/institution',
        students: '/institution/students',
      },
    }
  },
})

registerTool({
  name: 'getCompanyOverview',
  description: 'Basic company-scoped overview for authorized company users.',
  agentTypes: ['company', 'general'],
  roles: ['company', 'admin'],
  riskLevel: RISK.LOW_RISK,
  requiresConfirmation: false,
  handler: async (_args, ctx) => {
    requireRoles(ctx, ['company', 'admin'])
    return {
      note: 'Company recruitment tools remain on existing company APIs. Agent provides routing only.',
      allowed: true,
      role: ctx.role,
      urls: {
        dashboard: '/company',
        recruitment: '/company/recruitment',
      },
    }
  },
})

// Explicitly blocked pseudo-tools — registered as reject-only for tests/docs
registerTool({
  name: 'runShellCommand',
  description: 'BLOCKED — shell execution is never allowed.',
  agentTypes: ['general'],
  roles: ['student', 'institution', 'company', 'admin', 'faculty'],
  riskLevel: RISK.CRITICAL,
  destructive: true,
  requiresConfirmation: true,
  handler: async () => {
    deny('COMMAND_INJECTION_BLOCKED', 'Shell command execution is permanently blocked.', 400)
  },
})

registerTool({
  name: 'httpRequest',
  description: 'BLOCKED — arbitrary HTTP is never allowed.',
  agentTypes: ['general'],
  roles: ['student', 'institution', 'company', 'admin', 'faculty'],
  riskLevel: RISK.CRITICAL,
  external: true,
  requiresConfirmation: true,
  handler: async () => {
    deny('HTTP_BLOCKED', 'Arbitrary HTTP requests are permanently blocked.', 400)
  },
})

module.exports = {
  RISK,
  registerTool,
  listTools,
  getTool,
  executeTool,
  rejectUnknownTool,
  registry,
}
