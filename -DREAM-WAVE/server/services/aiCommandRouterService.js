/**
 * Unified AI Command Router (V4 Prompt 8).
 * Classifies NL → routes to brain / decision / agents / memory / workflow.
 * Does NOT replace unifiedBrainService or agentOrchestrator — coordinates them.
 */
const mongoose = require('mongoose')
const IntelligenceDecision = require('../models/IntelligenceDecision')
const limits = require('../config/intelligenceLimits')

const COMMAND_CLASSES = [
  'INFORMATION',
  'ACTION',
  'PLANNING',
  'RESEARCH',
  'LEARNING',
  'CAREER',
  'APPLICATION',
  'MEMORY',
  'ANALYTICS',
  'PROJECT',
  'WORKFLOW',
]

const QUICK_COMMANDS = [
  { id: 'PLAN_MY_DAY', label: 'Plan my day', message: 'What should I do today?', class: 'PLANNING' },
  { id: 'ANALYZE_PROGRESS', label: 'Analyze progress', message: 'Analyze my progress this week', class: 'ANALYTICS' },
  { id: 'FIND_OPPORTUNITIES', label: 'Find opportunities', message: 'Show my best opportunities', class: 'CAREER' },
  { id: 'LEARN_NEXT', label: 'Learn next', message: 'What should I learn today?', class: 'LEARNING' },
  { id: 'BUILD_NEXT', label: 'Build next', message: 'What project should I build next?', class: 'PROJECT' },
  { id: 'PREPARE_APPLICATION', label: 'Prepare application', message: 'Help me prepare my application', class: 'APPLICATION' },
  { id: 'REVIEW_CAREER', label: 'Review career', message: 'Review my career readiness', class: 'CAREER' },
]

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  throw err
}

function requireUser(user) {
  if (!user?._id || !mongoose.isValidObjectId(user._id)) {
    deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  }
  return user
}

function classifyCommand(message = '') {
  const m = String(message || '').trim()
  if (!m) return { class: 'INFORMATION', agent: 'DecisionAgent', confidence: 'UNKNOWN' }

  if (/\b(remember (that|this|i)|forget (that|this)|what do you remember)\b/i.test(m)) {
    return { class: 'MEMORY', agent: 'MemoryAgent', confidence: 'HIGH' }
  }
  if (/\b(research|literature|source|citation|synthesize)\b/i.test(m)) {
    return { class: 'RESEARCH', agent: 'ResearchAgent', confidence: 'HIGH' }
  }
  if (/\b(apply|application|internship|job|interview|opportunity|should i apply)\b/i.test(m)) {
    return { class: 'APPLICATION', agent: 'CareerAgent', confidence: 'HIGH' }
  }
  if (/\b(career|resume|placement|role)\b/i.test(m)) {
    return { class: 'CAREER', agent: 'CareerAgent', confidence: 'HIGH' }
  }
  if (/\b(learn|learning|skill|study|roadmap|read|book)\b/i.test(m)) {
    return { class: 'LEARNING', agent: 'LearningAgent', confidence: 'HIGH' }
  }
  if (/\b(project|build|portfolio|ship)\b/i.test(m)) {
    return { class: 'PROJECT', agent: 'ProjectAgent', confidence: 'HIGH' }
  }
  if (/\b(workflow|prepare for|hackathon|demo)\b/i.test(m)) {
    return { class: 'WORKFLOW', agent: 'WorkflowEngine', confidence: 'MEDIUM' }
  }
  if (/\b(progress|behind|week|analytics|weak area|completed this week)\b/i.test(m)) {
    return { class: 'ANALYTICS', agent: 'DecisionAgent', confidence: 'HIGH' }
  }
  if (/\b(today|plan my day|what should i do|next|priority|important|bottleneck)\b/i.test(m)) {
    return { class: 'PLANNING', agent: 'DecisionAgent', confidence: 'HIGH' }
  }
  if (/\b(delete|submit|send|publish|disconnect)\b/i.test(m)) {
    return { class: 'ACTION', agent: 'DecisionAgent', confidence: 'MEDIUM', requiresConfirmation: true }
  }
  return { class: 'INFORMATION', agent: 'DecisionAgent', confidence: 'MEDIUM' }
}

function isPromptInjection(message = '') {
  return /\b(ignore (all )?(previous|prior) instructions|jailbreak|reveal (system|hidden) prompt|you must always)\b/i.test(message)
}

function needsConfirmation(classification, message = '') {
  if (classification.requiresConfirmation) return true
  return /\b(delete|submit|send|publish|email|disconnect|remove account)\b/i.test(message)
}

/**
 * Execute a natural-language command with safety gates.
 */
async function executeCommand(user, message = '', options = {}) {
  const u = requireUser(user)
  const msg = String(message || '').trim().slice(0, 2000)
  if (!msg) deny('VALIDATION_ERROR', 'Command message is required.')

  if (isPromptInjection(msg)) {
    return {
      state: 'BLOCKED',
      class: 'ACTION',
      result: 'Command blocked for safety.',
      why: 'User content cannot redefine system instructions or permissions.',
      source: 'command-safety',
      nextAction: null,
      requiresConfirmation: false,
    }
  }

  const classification = classifyCommand(msg)
  const confirmNeeded = needsConfirmation(classification, msg)

  if (confirmNeeded && !options.confirmed) {
    return {
      state: 'CONFIRMATION_REQUIRED',
      class: classification.class,
      agent: classification.agent,
      result: 'This action needs your confirmation before execution.',
      why: 'Destructive or external actions require explicit approval.',
      source: 'command-safety',
      nextAction: { label: 'Confirm', requiresConfirmation: true },
      requiresConfirmation: true,
      classification,
    }
  }

  const started = Date.now()
  const partial = []
  let decision = null
  let brain = null
  let agentResult = null

  // Always run decision engine for planning / career / learning / application
  const decisionClasses = ['PLANNING', 'CAREER', 'APPLICATION', 'LEARNING', 'PROJECT', 'ANALYTICS', 'INFORMATION', 'ACTION']
  if (decisionClasses.includes(classification.class)) {
    try {
      const decisionIntelligenceService = require('./decisionIntelligenceService')
      decision = await decisionIntelligenceService.decide(u._id, {
        question: msg,
        domain: classification.class === 'CAREER' || classification.class === 'APPLICATION'
          ? 'career'
          : classification.class === 'LEARNING'
            ? 'learning'
            : classification.class === 'PROJECT'
              ? 'project'
              : null,
        persist: true,
      })
    } catch (err) {
      partial.push({ step: 'decision', error: err.message })
    }
  }

  // Memory utterances
  if (classification.class === 'MEMORY') {
    try {
      const memoryService = require('./memoryService')
      const handled = await memoryService.handleMemoryUtterance(u._id, msg, {
        confirmRemember: options.confirmed === true,
        confirmForget: options.confirmed === true,
      })
      return {
        state: 'SUCCESS',
        class: 'MEMORY',
        agent: 'MemoryAgent',
        result: handled?.summary || handled?.prompt || handled?.memory?.content || 'Memory command processed.',
        why: 'Routed to personal memory service.',
        source: 'memory',
        nextAction: null,
        data: handled,
        requiresConfirmation: Boolean(handled?.pendingConfirmation),
        elapsedMs: Date.now() - started,
      }
    } catch (err) {
      partial.push({ step: 'memory', error: err.message })
    }
  }

  // Optional specialist / brain for richer answer (bounded timeout)
  if (options.includeAgents && ['CAREER', 'LEARNING', 'PROJECT', 'RESEARCH', 'WORKFLOW'].includes(classification.class)) {
    try {
      const specialistNetworkService = require('./agent/specialistNetworkService')
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Agent timeout')), limits.AGENT_TIMEOUT_MS))
      agentResult = await Promise.race([
        specialistNetworkService.runSpecialistNetwork(u, msg, {
          maxAgents: 3,
        }),
        timeout,
      ]).catch((err) => {
        partial.push({ step: 'agents', error: err.message })
        return null
      })
    } catch (err) {
      partial.push({ step: 'agents', error: err.message })
    }
  }

  if (options.includeBrain) {
    try {
      const unifiedBrainService = require('./unifiedBrainService')
      brain = await unifiedBrainService.ask(u, msg, { mode: 'READ_ONLY' })
    } catch (err) {
      partial.push({ step: 'brain', error: err.message })
    }
  }

  const primary = decision?.primary
  const resultText = primary
    ? `Primary action: ${primary.title}. ${decision.why}`
    : brain?.answer || 'Intelligence assembled from available systems.'

  const payload = {
    state: partial.length && !primary ? 'PARTIAL' : 'SUCCESS',
    class: classification.class,
    agent: classification.agent,
    classification,
    result: resultText,
    why: decision?.why || brain?.why || 'Deterministic decision from live system data.',
    source: 'ai-command-router',
    nextAction: primary
      ? { title: primary.title, url: primary.url, label: primary.label, requiresApproval: decision.requiresApproval }
      : null,
    decision,
    brain: brain ? { answer: brain.answer, intent: brain.intent, transparency: brain.transparency } : null,
    agents: agentResult || null,
    partialFailures: partial,
    requiresConfirmation: Boolean(decision?.requiresApproval),
    elapsedMs: Date.now() - started,
    policy: {
      noFabrication: true,
      currentRequestWins: true,
      externalActionsNeedApproval: true,
    },
  }

  try {
    await IntelligenceDecision.create({
      userId: u._id,
      kind: 'COMMAND',
      commandClass: classification.class,
      request: msg.slice(0, 500),
      primaryAction: primary?.title || '',
      why: payload.why.slice(0, 600),
      confidence: decision?.confidence || classification.confidence || 'UNKNOWN',
      requiresApproval: payload.requiresConfirmation,
      meta: { agent: classification.agent, partial: partial.length },
    })
  } catch { /* history optional */ }

  return payload
}

async function commandHistory(userId, { limit = 10 } = {}) {
  if (!mongoose.isValidObjectId(userId)) deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  return IntelligenceDecision.find({ userId, kind: 'COMMAND' })
    .sort('-createdAt')
    .limit(Math.min(limits.MAX_COMMAND_HISTORY, Math.max(1, Number(limit) || 10)))
    .select('request primaryAction why confidence createdAt commandClass status requiresApproval')
    .lean()
}

module.exports = {
  COMMAND_CLASSES,
  QUICK_COMMANDS,
  classifyCommand,
  executeCommand,
  commandHistory,
  isPromptInjection,
  needsConfirmation,
}
