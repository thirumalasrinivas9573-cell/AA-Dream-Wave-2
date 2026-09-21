/**
 * Specialist Agent Registry (Thirumala V4 Prompt 2).
 *
 * Extends V3 toolRegistry + orchestrator — does NOT invent arbitrary agents.
 * The model may only select agents from this registry.
 */
const toolRegistry = require('./toolRegistry')

/** @typedef {'HIGH'|'MEDIUM'|'LOW'} Confidence */

/**
 * Common agent contract shape.
 * @typedef {object} SpecialistAgent
 * @property {string} name
 * @property {string} description
 * @property {string} domain
 * @property {string[]} capabilities
 * @property {string[]} cannot
 * @property {string[]} allowedTools
 * @property {string[]} roles
 * @property {string[]} contextKeys
 * @property {string[]} agentTypes — maps to V3 agentType routing
 */

/** @type {Map<string, SpecialistAgent & { handler: Function }>} */
const registry = new Map()

function registerSpecialist(agent) {
  if (!agent?.name || typeof agent.handler !== 'function') {
    throw new Error('Invalid specialist agent')
  }
  if (registry.has(agent.name)) {
    throw new Error(`Duplicate specialist: ${agent.name}`)
  }
  // Validate tools exist in tool registry (allow empty for org stubs)
  for (const tool of agent.allowedTools || []) {
    if (!toolRegistry.getTool(tool)) {
      throw new Error(`Specialist ${agent.name} references unknown tool: ${tool}`)
    }
  }
  registry.set(agent.name, {
    name: agent.name,
    description: agent.description || '',
    domain: agent.domain || 'general',
    capabilities: agent.capabilities || [],
    cannot: agent.cannot || [],
    allowedTools: agent.allowedTools || [],
    roles: agent.roles || ['student'],
    contextKeys: agent.contextKeys || [],
    agentTypes: agent.agentTypes || [agent.domain],
    inputSchema: agent.inputSchema || { message: 'string' },
    outputSchema: agent.outputSchema || {
      status: 'string',
      summary: 'string',
      facts: 'array',
      inferences: 'array',
      recommendations: 'array',
      warnings: 'array',
      suggestedActions: 'array',
      confidence: 'string',
      dataReferences: 'array',
    },
    handler: agent.handler,
  })
}

function listSpecialists({ role } = {}) {
  return [...registry.values()]
    .filter((a) => !role || a.roles.includes(role) || role === 'admin')
    .map((a) => ({
      name: a.name,
      description: a.description,
      domain: a.domain,
      capabilities: a.capabilities,
      cannot: a.cannot,
      allowedTools: a.allowedTools,
      roles: a.roles,
      contextKeys: a.contextKeys,
    }))
}

function getSpecialist(name) {
  return registry.get(name) || null
}

function assertToolAllowed(agent, toolName) {
  if (!agent.allowedTools.includes(toolName)) {
    const err = new Error(`Tool “${toolName}” is not allowed for ${agent.name}.`)
    err.statusCode = 403
    err.code = 'TOOL_NOT_ALLOWED'
    throw err
  }
}

async function callAllowedTool(agent, toolName, args, ctx) {
  assertToolAllowed(agent, toolName)
  return toolRegistry.executeTool(toolName, args || {}, ctx)
}

function emptyResult(overrides = {}) {
  return {
    status: 'ok',
    summary: '',
    facts: [],
    inferences: [],
    recommendations: [],
    warnings: [],
    suggestedActions: [],
    confidence: 'MEDIUM',
    dataReferences: [],
    ...overrides,
  }
}

function sanitizeExternal(text = '') {
  return String(text || '')
    .slice(0, 1500)
    .replace(/\b(ignore (all )?(previous|prior) instructions?)\b/gi, '[filtered]')
    .replace(/\b(system prompt|jailbreak|developer mode)\b/gi, '[filtered]')
}

// ─── Specialist handlers (read-first; tools only) ────────────────────────────

registerSpecialist({
  name: 'ProjectAgent',
  description: 'Analyzes portfolio projects, milestones, blockers, and project–learning alignment.',
  domain: 'project',
  agentTypes: ['project', 'student'],
  roles: ['student'],
  capabilities: [
    'read_project_status',
    'analyze_blockers',
    'suggest_next_project_action',
    'project_learning_alignment',
    'project_career_alignment',
  ],
  cannot: ['delete_projects', 'change_ownership', 'access_other_users'],
  allowedTools: ['getProjects', 'getTasks', 'getRelevantMemories', 'proposeTaskBreakdown', 'getGoals'],
  contextKeys: ['projects', 'tasks', 'goals', 'memory'],
  handler: async ({ message, ctx, context }) => {
    const out = emptyResult({ confidence: 'HIGH' })
    const projects = await callAllowedTool(registry.get('ProjectAgent'), 'getProjects', {}, ctx)
    const tasks = await callAllowedTool(registry.get('ProjectAgent'), 'getTasks', { openOnly: true, limit: 10 }, ctx)
    const list = projects.result?.projects || []
    const openTasks = tasks.result?.tasks || []
    out.dataReferences.push({ type: 'projects', count: list.length })
    if (!list.length) {
      out.summary = 'No active portfolio projects found.'
      out.facts.push('No active portfolio projects are recorded for this user.')
      out.warnings.push('Project analysis limited — create or update portfolio projects.')
      out.confidence = 'LOW'
      return out
    }
    const primary = list[0]
    out.facts.push(`Active project: “${primary.title}” (status: ${primary.status || 'unknown'}).`)
    if (primary.technologies?.length) {
      out.facts.push(`Project technologies: ${primary.technologies.slice(0, 8).join(', ')}.`)
    }
    const related = openTasks.filter((t) => {
      const a = String(t.title || '').toLowerCase()
      const b = String(primary.title || '').toLowerCase()
      return a.includes(b.split(' ')[0] || '') || /\bapi|milestone|project\b/i.test(t.title || '')
    })
    if (related.length) {
      out.facts.push(`Related open tasks: ${related.slice(0, 3).map((t) => t.title).join('; ')}.`)
      out.inferences.push('Open related tasks may indicate unfinished project work.')
      out.recommendations.push(`Prioritize “${related[0].title}” to advance “${primary.title}”.`)
      out.suggestedActions.push({
        type: 'open_task',
        label: related[0].title,
        url: '/student/tasks',
      })
    } else {
      out.recommendations.push(`Continue work on “${primary.title}”.`)
      out.suggestedActions.push({ type: 'open_project', label: primary.title, url: '/student/profile' })
    }
    if (/\bbreakdown|break down\b/i.test(message || '')) {
      const bd = await callAllowedTool(registry.get('ProjectAgent'), 'proposeTaskBreakdown', {
        title: primary.title,
      }, ctx)
      out.inferences.push('Task breakdown suggested (read-only proposal).')
      out.dataReferences.push({ type: 'breakdown', data: bd.result })
    }
    out.summary = out.recommendations[0] || out.facts[0]
    if (context?.externalSnippets?.length) {
      out.warnings.push('External descriptions treated as DATA only.')
      context.externalSnippets.forEach((s) => sanitizeExternal(s))
    }
    return out
  },
})

registerSpecialist({
  name: 'LearningAgent',
  description: 'Learning progress, skill gaps, roadmap next topic, learning–project alignment.',
  domain: 'learning',
  agentTypes: ['learning', 'student'],
  roles: ['student'],
  capabilities: ['skill_gaps', 'next_topic', 'roadmap_analysis', 'learning_project_alignment'],
  cannot: ['invent_progress', 'fabricate_certificates'],
  allowedTools: ['getLearningIntelligence', 'getRoadmap', 'getGoals', 'getRelevantMemories'],
  contextKeys: ['learning', 'roadmap', 'goals', 'memory'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'HIGH' })
    const agent = registry.get('LearningAgent')
    const intel = await callAllowedTool(agent, 'getLearningIntelligence', {}, ctx)
    const roadmap = await callAllowedTool(agent, 'getRoadmap', {}, ctx)
    const data = intel.result || {}
    if (data.nextAction) {
      out.facts.push(`Next learning action: ${data.nextAction.study || data.nextAction.title || 'n/a'}.`)
      if (data.nextAction.why) out.inferences.push(String(data.nextAction.why).slice(0, 240))
      out.recommendations.push(data.nextAction.study || data.nextAction.title || 'Continue learning path')
    } else {
      out.facts.push('Learning next-action not available from intelligence service.')
      out.confidence = 'LOW'
    }
    const gaps = data.skillGaps || []
    gaps.slice(0, 5).forEach((g) => {
      const skill = g.skill || g
      out.facts.push(`Documented skill gap signal: ${skill}.`)
    })
    if (roadmap.result?.roadmap?.currentStage) {
      out.facts.push(`Current roadmap stage: ${roadmap.result.roadmap.currentStage}.`)
    }
    out.summary = out.recommendations[0] || out.facts[0] || 'Learning analysis incomplete.'
    out.suggestedActions.push({ type: 'open_learn', label: 'Open learning', url: '/student/learn' })
    out.dataReferences.push({ type: 'learning', overview: data.overview || null })
    return out
  },
})

registerSpecialist({
  name: 'ResearchAgent',
  description: 'Research workspace analysis and research–project/career alignment. No fabricated sources.',
  domain: 'research',
  agentTypes: ['research', 'student'],
  roles: ['student'],
  capabilities: ['research_status', 'research_planning_signals', 'research_project_links'],
  cannot: ['fabricate_sources', 'invent_citations'],
  allowedTools: ['getResearch', 'getRelevantMemories', 'getProjects'],
  contextKeys: ['research', 'projects', 'memory'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'MEDIUM' })
    const agent = registry.get('ResearchAgent')
    const research = await callAllowedTool(agent, 'getResearch', {}, ctx)
    const projects = research.result?.projects || []
    if (!projects.length) {
      out.facts.push('No research projects found for this user.')
      out.summary = 'Research workspace empty.'
      out.confidence = 'LOW'
      out.warnings.push('Do not invent sources or findings.')
      return out
    }
    const p = projects[0]
    out.facts.push(`Research project: “${p.title}” (${p.status}, ${p.sources || 0} sources).`)
    if (p.question) out.facts.push(`Research question: ${p.question}`)
    out.recommendations.push(`Continue research on “${p.title}” with verified sources only.`)
    out.suggestedActions.push({ type: 'open_research', label: p.title, url: `/student/research/${p.id}` })
    out.summary = out.recommendations[0]
    out.warnings.push('AI must not fabricate citations or source content.')
    return out
  },
})

registerSpecialist({
  name: 'DailyLifeAgent',
  description: 'Daily prioritization, deadlines, focus planning. Read-first; no silent calendar writes.',
  domain: 'daily_life',
  agentTypes: ['daily_life', 'student'],
  roles: ['student'],
  capabilities: ['next_action', 'daily_plan', 'deadline_awareness', 'focus_planning'],
  cannot: ['silently_modify_tasks', 'silently_modify_calendar'],
  allowedTools: ['getDailyLife', 'getTasks', 'getNotifications', 'getRelevantMemories', 'proposeTaskBreakdown'],
  contextKeys: ['daily', 'tasks', 'notifications', 'memory'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'HIGH' })
    const agent = registry.get('DailyLifeAgent')
    const daily = await callAllowedTool(agent, 'getDailyLife', {}, ctx)
    const tasks = await callAllowedTool(agent, 'getTasks', { openOnly: true, limit: 10 }, ctx)
    const d = daily.result || {}
    if (d.nextAction) {
      out.facts.push(`Daily Life next action: ${d.nextAction.title || d.nextAction}.`)
      if (d.nextAction.why) out.inferences.push(String(d.nextAction.why).slice(0, 240))
      out.recommendations.push(d.nextAction.title || 'Follow Daily Life next action')
    }
    ;(d.critical || []).slice(0, 3).forEach((item) => {
      out.facts.push(`Critical item: ${item.title || item}.`)
    })
    const open = tasks.result?.tasks || []
    const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
    overdue.slice(0, 3).forEach((t) => out.facts.push(`Overdue task: ${t.title}.`))
    if (overdue.length) out.recommendations.push(`Clear overdue: “${overdue[0].title}”.`)
    out.summary = out.recommendations[0] || out.facts[0] || 'No daily priorities available.'
    out.suggestedActions.push({ type: 'open_daily', label: 'Daily Life', url: '/student/daily-life' })
    out.warnings.push('Task/calendar changes require confirmation.')
    return out
  },
})

registerSpecialist({
  name: 'CareerAgent',
  description: 'Career goals, skill requirements, project evidence, preparation gaps.',
  domain: 'career',
  agentTypes: ['opportunity', 'student', 'career'],
  roles: ['student'],
  capabilities: ['career_goal_analysis', 'skill_requirements', 'project_evidence', 'preparation_gaps'],
  cannot: ['submit_applications', 'invent_offers'],
  allowedTools: ['getApplications', 'getOpportunities', 'getProjects', 'getLearningIntelligence', 'getGoals', 'getRelevantMemories'],
  contextKeys: ['career', 'opportunities', 'projects', 'learning', 'goals', 'memory'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'MEDIUM' })
    const agent = registry.get('CareerAgent')
    const [apps, opps, projects, learning, goals] = await Promise.all([
      callAllowedTool(agent, 'getApplications', {}, ctx),
      callAllowedTool(agent, 'getOpportunities', { limit: 5 }, ctx),
      callAllowedTool(agent, 'getProjects', {}, ctx),
      callAllowedTool(agent, 'getLearningIntelligence', {}, ctx),
      callAllowedTool(agent, 'getGoals', { limit: 5 }, ctx),
    ])
    const goalList = goals.result?.goals || []
    if (goalList[0]) out.facts.push(`Active goal: “${goalList[0].title}”.`)
    const proj = (projects.result?.projects || [])[0]
    if (proj) out.facts.push(`Portfolio evidence: “${proj.title}”.`)
    const flatOpps = [
      ...(opps.result?.jobs || []),
      ...(opps.result?.internships || []),
      ...(opps.result?.opportunities || []),
      ...(opps.result?.items || []),
    ]
    if (flatOpps[0]?.title || flatOpps[0]?.name) {
      out.facts.push(`Opportunity signal: “${flatOpps[0].title || flatOpps[0].name}”.`)
    } else {
      out.facts.push('Opportunity list loaded (may be empty).')
    }
    const appCount = apps.result?.count ?? (apps.result?.applications || []).length
    out.facts.push(`Applications on record: ${appCount || 0}.`)
    const gaps = learning.result?.skillGaps || []
    if (gaps[0]) {
      out.inferences.push(`Learning gap may affect career prep: ${gaps[0].skill || gaps[0]}.`)
    }
    if (proj && goalList[0]) {
      out.recommendations.push(`Use project “${proj.title}” as evidence toward “${goalList[0].title}”.`)
    } else {
      out.recommendations.push('Strengthen portfolio evidence aligned to career goals.')
    }
    out.summary = out.recommendations[0]
    out.suggestedActions.push({ type: 'open_career', label: 'Career Hub', url: '/student/career' })
    out.warnings.push('Applications are never submitted automatically.')
    return out
  },
})

registerSpecialist({
  name: 'OpportunityAgent',
  description: 'Opportunity discovery, eligibility signals, application status. No auto-apply.',
  domain: 'opportunity',
  agentTypes: ['opportunity', 'student'],
  roles: ['student'],
  capabilities: ['opportunity_discovery', 'application_status', 'matching_signals'],
  cannot: ['submit_applications', 'modify_other_users'],
  allowedTools: ['getOpportunities', 'getApplications', 'getProjects', 'getRelevantMemories'],
  contextKeys: ['opportunities', 'applications', 'projects', 'memory'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'MEDIUM' })
    const agent = registry.get('OpportunityAgent')
    const [opps, apps] = await Promise.all([
      callAllowedTool(agent, 'getOpportunities', { limit: 5 }, ctx),
      callAllowedTool(agent, 'getApplications', {}, ctx),
    ])
    const items = [
      ...(opps.result?.jobs || []),
      ...(opps.result?.internships || []),
      ...(opps.result?.opportunities || []),
      ...(opps.result?.items || []),
    ]
    if (items.length) {
      items.slice(0, 3).forEach((o) => out.facts.push(`Opportunity: “${o.title || o.name}”.`))
      out.recommendations.push(`Review “${items[0].title || items[0].name}” against your skills and projects.`)
    } else {
      out.facts.push('No open opportunities returned for this query window.')
      out.confidence = 'LOW'
    }
    out.facts.push(`Applications: ${apps.result?.count ?? (apps.result?.applications || []).length ?? 0}.`)
    out.summary = out.recommendations[0] || out.facts[0]
    out.suggestedActions.push({ type: 'open_jobs', label: 'Jobs', url: '/student/career/jobs' })
    out.warnings.push('Never auto-submit applications.')
    // Treat any job description fields as data
    items.slice(0, 2).forEach((o) => {
      if (o.description) sanitizeExternal(o.description)
    })
    return out
  },
})

registerSpecialist({
  name: 'EventAgent',
  description: 'Event discovery, deadlines, preparation signals. No auto-registration.',
  domain: 'event',
  agentTypes: ['event', 'student'],
  roles: ['student'],
  capabilities: ['event_discovery', 'event_deadlines', 'event_prep'],
  cannot: ['auto_register', 'modify_events'],
  allowedTools: ['getEvents', 'getNotifications', 'getTasks', 'getRelevantMemories'],
  contextKeys: ['events', 'notifications', 'tasks'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'MEDIUM' })
    const agent = registry.get('EventAgent')
    const events = await callAllowedTool(agent, 'getEvents', { limit: 5 }, ctx)
    const list = events.result?.events || events.result?.items || []
    if (!list.length) {
      out.facts.push('No published events found in current window.')
      out.summary = 'No upcoming events available.'
      out.confidence = 'LOW'
      return out
    }
    const e = list[0]
    out.facts.push(`Event: “${e.title}”${e.startAt ? ` starting ${e.startAt}` : ''}.`)
    out.recommendations.push(`Prepare for “${e.title}” using related skills, project work, and tasks.`)
    out.suggestedActions.push({ type: 'open_events', label: e.title, url: '/student/dashboard' })
    out.summary = out.recommendations[0]
    out.warnings.push('Event registration is never automatic.')
    if (e.description) sanitizeExternal(e.description)
    return out
  },
})

registerSpecialist({
  name: 'InstitutionAgent',
  description: 'Institution-scoped routing only. Uses existing institution APIs.',
  domain: 'institution',
  agentTypes: ['institution'],
  roles: ['institution', 'admin'],
  capabilities: ['institution_overview_routing'],
  cannot: ['access_other_institutions', 'access_student_private_memory'],
  allowedTools: ['getInstitutionOverview'],
  contextKeys: ['institution'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'HIGH' })
    const agent = registry.get('InstitutionAgent')
    const overview = await callAllowedTool(agent, 'getInstitutionOverview', {}, ctx)
    out.facts.push('Institution agent access verified for authorized role.')
    out.recommendations.push('Use institution command center for programs, placement, and analytics.')
    out.dataReferences.push({ type: 'institution', data: overview.result })
    out.summary = out.recommendations[0]
    out.warnings.push('Student private memory/research is excluded.')
    return out
  },
})

registerSpecialist({
  name: 'CompanyAgent',
  description: 'Company-scoped routing only. Uses existing company APIs.',
  domain: 'company',
  agentTypes: ['company'],
  roles: ['company', 'admin'],
  capabilities: ['company_overview_routing'],
  cannot: ['access_other_companies', 'access_candidate_private_memory'],
  allowedTools: ['getCompanyOverview'],
  contextKeys: ['company'],
  handler: async ({ ctx }) => {
    const out = emptyResult({ confidence: 'HIGH' })
    const agent = registry.get('CompanyAgent')
    const overview = await callAllowedTool(agent, 'getCompanyOverview', {}, ctx)
    out.facts.push('Company agent access verified for authorized role.')
    out.recommendations.push('Use company recruitment tools for jobs, internships, and candidates.')
    out.dataReferences.push({ type: 'company', data: overview.result })
    out.summary = out.recommendations[0]
    out.warnings.push('Candidate private memory is excluded.')
    return out
  },
})

module.exports = {
  registerSpecialist,
  listSpecialists,
  getSpecialist,
  callAllowedTool,
  assertToolAllowed,
  emptyResult,
  sanitizeExternal,
  registry,
}
