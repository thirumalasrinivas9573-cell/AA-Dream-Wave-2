/**
 * Agent Context Builder (V4 Prompt 2).
 * Supplies minimum required context keys per specialist — never a full dump.
 */
const memoryService = require('../memoryService')
const specialistAgentRegistry = require('./specialistAgentRegistry')

async function buildAgentContext(user, agentName, { message = '' } = {}) {
  if (!user?._id) {
    const err = new Error('Authenticated user required')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }

  const agent = specialistAgentRegistry.getSpecialist(agentName)
  if (!agent) {
    const err = new Error(`Unknown specialist: ${agentName}`)
    err.statusCode = 400
    err.code = 'UNKNOWN_AGENT'
    throw err
  }

  if (!agent.roles.includes(user.role) && user.role !== 'admin') {
    const err = new Error(`Role “${user.role}” cannot use ${agentName}.`)
    err.statusCode = 403
    err.code = 'ROLE_FORBIDDEN'
    throw err
  }

  const keys = new Set(agent.contextKeys || [])
  const ctx = {
    userId: user._id,
    role: user.role,
    agent: agentName,
    domain: agent.domain,
    message: String(message || '').slice(0, 2000),
    // External content always DATA
    externalSnippets: [],
    memory: [],
    policy: {
      sourcePriority: [
        'CURRENT_USER_INSTRUCTION',
        'CANONICAL_DATABASE',
        'VERIFIED_SYSTEM_STATE',
        'EXPLICIT_MEMORY',
        'AGENT_INFERENCE',
        'GENERAL_AI_KNOWLEDGE',
      ],
      readFirst: true,
      noChainOfThought: true,
    },
  }

  // Memory only when agent lists it — domain-scoped, owner-scoped, never full dump
  if (keys.has('memory') && user.role === 'student') {
    try {
      ctx.memory = await memoryService.getRelevantMemories(user._id, {
        message,
        intent: String(agent.domain || '').toUpperCase(),
        agentDomain: agent.domain,
        limit: 4,
        markUsed: true,
      })
    } catch {
      ctx.memory = []
    }
  }

  // Organization agents never receive personal memory
  if (user.role === 'institution' || user.role === 'company') {
    ctx.memory = []
    ctx.policy.personalMemoryExcluded = true
  }

  return {
    agent: {
      name: agent.name,
      domain: agent.domain,
      capabilities: agent.capabilities,
      allowedTools: agent.allowedTools,
    },
    context: ctx,
  }
}

module.exports = {
  buildAgentContext,
}
