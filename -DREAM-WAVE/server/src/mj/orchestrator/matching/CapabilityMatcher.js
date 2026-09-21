/**
 * Capability Matcher — match tasks to agent capabilities
 * @module mj/orchestrator/matching/CapabilityMatcher
 */

const { MJLogger } = require('../../logger')

class CapabilityMatcher {
  constructor(registry) {
    this._registry = registry
    this._logger = MJLogger.child('Orchestrator:Matcher')
  }

  /**
   * Score agents against required capabilities.
   * @param {string[]} requiredCapabilities
   * @param {Object} [options] - { intent, taskType, preferredAgent }
   */
  match(requiredCapabilities = [], options = {}) {
    const agents = this._registry.getAllInstances?.() || []
    const available = agents.filter(a => a.isAvailable?.() !== false)

    const scored = available.map(agent => {
      const caps = agent.capabilities || []
      let score = 0

      for (const req of requiredCapabilities) {
        if (caps.some(c => c.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(c.toLowerCase()))) {
          score += 1
        }
      }

      if (options.preferredAgent && agent.type === options.preferredAgent) score += 5
      if (options.intent && agent.supportedTasks?.includes(options.intent)) score += 2
      score += (agent.priority || 5) / 10
      score += (agent.health?.score ?? 1) * 0.5

      return { agent, score, matchedCapabilities: caps.filter(c =>
        requiredCapabilities.some(r => c.includes(r) || r.includes(c))
      ) }
    })

    scored.sort((a, b) => b.score - a.score)
    this._logger.debug('Capability match', {
      required: requiredCapabilities,
      topAgent: scored[0]?.agent?.type,
      candidates: scored.length,
    })

    return scored
  }

  selectBest(requiredCapabilities, options = {}) {
    const results = this.match(requiredCapabilities, options)
    return results[0]?.agent || null
  }

  selectMultiple(requiredCapabilities, count = 3, options = {}) {
    return this.match(requiredCapabilities, options).slice(0, count).map(r => r.agent)
  }
}

module.exports = { CapabilityMatcher }
