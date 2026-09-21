/**
 * Health Monitor — agent and orchestrator health
 * @module mj/orchestrator/health/HealthMonitor
 */

const { MJLogger } = require('../../logger')

class HealthMonitor {
  constructor(registry) {
    this._registry = registry
    this._logger = MJLogger.child('Orchestrator:Health')
    this._orchestratorHealth = { status: 'healthy', lastCheck: null }
  }

  checkAgent(agent) {
    const now = Date.now()
    const descriptor = agent.toDescriptor?.() || agent
    const heartbeat = agent._lastHeartbeat || agent.lastHeartbeat
    const stale = heartbeat && (now - heartbeat) > 120000
    const isActive = descriptor.active ?? agent._active ?? false

    return {
      agentId: descriptor.id || agent.id,
      type: descriptor.type || agent.type,
      status: isActive ? (stale ? 'stale' : 'healthy') : 'inactive',
      heartbeat: heartbeat || null,
      health: descriptor.health || agent.health || { score: isActive ? 1 : 0 },
      queueSize: agent.pendingTasks ?? 0,
    }
  }

  checkAll() {
    const agents = this._registry.getAllInstances?.() || []
    const agentHealth = agents.map(a => this.checkAgent(a))
    const unhealthy = agentHealth.filter(a => a.status === 'stale' || a.status === 'inactive')

    this._orchestratorHealth = {
      status: unhealthy.length > agents.length / 2 ? 'degraded' : 'healthy',
      lastCheck: Date.now(),
      totalAgents: agents.length,
      healthyAgents: agentHealth.filter(a => a.status === 'healthy').length,
      inactiveAgents: agentHealth.filter(a => a.status === 'inactive').length,
    }

    return {
      orchestrator: this._orchestratorHealth,
      agents: agentHealth,
    }
  }

  recordHeartbeat(agentId) {
    const agent = this._registry.getById?.(agentId) || this._registry.get(agentId)
    if (agent) {
      agent._lastHeartbeat = Date.now()
      if (agent.recordHeartbeat) agent.recordHeartbeat()
    }
  }

  getStatus() {
    return this._orchestratorHealth
  }
}

module.exports = { HealthMonitor }
