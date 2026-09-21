/**
 * MJ Agent Selector — capability-aware agent selection
 * @module mj/agents/AgentSelector
 */

const { MJLogger } = require('../logger')
const { MJ_EVENTS } = require('../constants')
const { getEventBus } = require('../events')

class AgentSelector {
  /**
   * @param {import('./AgentRegistry').AgentRegistry} registry
   * @param {import('../orchestrator/matching/CapabilityMatcher').CapabilityMatcher} [matcher]
   */
  constructor(registry, matcher = null) {
    this._registry = registry
    this._matcher = matcher
    this._logger = MJLogger.child('AgentSelector')
    this._eventBus = getEventBus()
  }

  setMatcher(matcher) {
    this._matcher = matcher
  }

  /**
   * Select best agent for plan/task.
   * @param {Object} plan
   * @param {Object} [context]
   * @returns {Object|null}
   */
  select(plan, context = {}) {
    const recommended = context.reasoning?.recommendedAgents || context.recommendedAgents || []
    if (recommended.length) {
      const agent = this._registry.get(recommended[0].type)
      if (agent) {
        const descriptor = { ...agent.toDescriptor(), reason: recommended[0].reason, instance: agent }
        this._emitSelected(descriptor, plan)
        return descriptor
      }
    }

    const taskCaps = (plan?.tasks || []).flatMap(t =>
      t.capabilities || [t.agentType].filter(Boolean)
    )

    if (this._matcher && taskCaps.length) {
      const best = this._matcher.selectBest(taskCaps, { intent: context.intent })
      if (best) {
        const descriptor = { ...best.toDescriptor(), instance: best }
        this._emitSelected(descriptor, plan)
        return descriptor
      }
    }

    const agents = this._registry.getActive()
    const selected = agents[0] ? { ...agents[0], instance: this._registry.get(agents[0].type) } : null
    if (selected) this._emitSelected(selected, plan)
    return selected
  }

  selectMultiple(plan, count = 3, context = {}) {
    const taskCaps = (plan?.tasks || []).flatMap(t =>
      t.capabilities || [t.agentType].filter(Boolean)
    )
    if (this._matcher) {
      return this._matcher.selectMultiple(taskCaps, count, { intent: context.intent })
        .map(a => ({ ...a.toDescriptor(), instance: a }))
    }
    return this._registry.getActive().slice(0, count)
  }

  _emitSelected(selected, plan) {
    this._eventBus.emitEvent(MJ_EVENTS.AGENT_SELECTED, {
      agentType: selected.type,
      agentId: selected.id,
      planId: plan?.id,
    })
    this._logger.debug('Agent selected', { agentType: selected.type, agentId: selected.id })
  }
}

module.exports = { AgentSelector }
