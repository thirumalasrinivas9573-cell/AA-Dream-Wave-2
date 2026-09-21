/**
 * MJ Execution Strategy
 * Determines how tasks should be executed.
 * @module mj/brain/ExecutionStrategy
 */

const { EXECUTION_TYPES } = require('../ai/constants')
const { AGENT_TYPES } = require('../constants')
const { MJLogger } = require('../logger')

const INTENT_TO_AGENTS = {
  coding: [AGENT_TYPES.DEVELOPER, AGENT_TYPES.BACKEND, AGENT_TYPES.FRONTEND],
  research: [AGENT_TYPES.RESEARCH, AGENT_TYPES.TEACHER],
  learning: [AGENT_TYPES.TEACHER, AGENT_TYPES.DOCUMENTATION],
  business: [AGENT_TYPES.BUSINESS, AGENT_TYPES.MARKETING],
  finance: [AGENT_TYPES.FINANCE, AGENT_TYPES.BUSINESS],
  marketing: [AGENT_TYPES.MARKETING, AGENT_TYPES.DESIGNER],
  automation: [AGENT_TYPES.AUTOMATION, AGENT_TYPES.DEVELOPER],
  planning: [AGENT_TYPES.BUSINESS, AGENT_TYPES.DEVELOPER],
  deployment: [AGENT_TYPES.DEPLOYMENT, AGENT_TYPES.BACKEND],
  reports: [AGENT_TYPES.RESEARCH, AGENT_TYPES.DOCUMENTATION],
  resume: [AGENT_TYPES.TEACHER, AGENT_TYPES.BUSINESS],
  creative: [AGENT_TYPES.DESIGNER, AGENT_TYPES.VIDEO],
  productivity: [AGENT_TYPES.AUTOMATION, AGENT_TYPES.BUSINESS],
}

class ExecutionStrategy {
  constructor() {
    this._logger = MJLogger.child('ExecutionStrategy')
  }

  /**
   * Build execution strategy from decomposition and goals.
   * @param {Object} params
   * @returns {Object}
   */
  build(params = {}) {
    const { goal, intent, tasks, executionGraph, constraints } = params

    const recommendedAgents = INTENT_TO_AGENTS[intent?.intent] || [AGENT_TYPES.DEVELOPER]
    const executionType = goal?.executionType || EXECUTION_TYPES.SEQUENTIAL

    const strategy = {
      executionType,
      recommendedAgents: recommendedAgents.map(type => ({ type, reason: `Matched intent: ${intent?.intent}` })),
      taskCount: tasks?.length || 0,
      parallelAllowed: (executionGraph?.parallel?.length || 0) > 0,
      estimatedTimeMinutes: this._estimateTime(goal, tasks),
      priority: tasks?.[0]?.priority || 5,
      constraints: constraints?.blockers || [],
    }

    this._logger.planner('Execution strategy built', { type: executionType, agents: strategy.recommendedAgents.length })
    return strategy
  }

  _estimateTime(goal, tasks) {
    const base = { low: 5, medium: 15, high: 45, critical: 120 }
    const complexity = goal?.estimatedComplexity || 'medium'
    const taskMultiplier = Math.max(1, (tasks?.length || 1) * 0.5)
    return Math.round((base[complexity] || 15) * taskMultiplier)
  }
}

module.exports = { ExecutionStrategy }
