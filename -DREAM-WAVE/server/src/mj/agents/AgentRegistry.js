/**
 * MJ Agent Registry — dynamic enterprise registration
 * @module mj/agents/AgentRegistry
 */

const { SpecializedAgent } = require('./specialized/SpecializedAgent')
const { AGENT_DEFINITIONS } = require('./definitions/AgentTypes')
const { MJLogger } = require('../logger')
const { ValidationError } = require('../errors')
const { MJ_VERSION } = require('../constants')

class AgentRegistry {
  constructor() {
    this._logger = MJLogger.child('AgentRegistry')
    this._agents = new Map()
    this._byId = new Map()
    this._registerDefaultAgents()
  }

  _registerDefaultAgents() {
    for (const [type, definition] of Object.entries(AGENT_DEFINITIONS)) {
      const agent = new SpecializedAgent({
        id: `agent_${type}`,
        type,
        name: definition.name,
        description: definition.description,
        capabilities: definition.capabilities,
        supportedTasks: definition.supportedTasks,
        priority: definition.priority,
        version: MJ_VERSION,
      })
      this._agents.set(type, agent)
      this._byId.set(agent.id, agent)
    }
    this._logger.info(`Registered ${this._agents.size} default agents`)
  }

  register(agent) {
    if (!agent || !agent.type) {
      throw new ValidationError('Agent must have a valid type')
    }
    this._agents.set(agent.type, agent)
    if (agent.id) this._byId.set(agent.id, agent)
    this._logger.info(`Agent registered: ${agent.type}`)
    return agent.toDescriptor()
  }

  unregister(agentType) {
    const agent = this._agents.get(agentType)
    if (agent) {
      this._byId.delete(agent.id)
      this._agents.delete(agentType)
      this._logger.info(`Agent unregistered: ${agentType}`)
      return true
    }
    return false
  }

  get(agentType) {
    return this._agents.get(agentType) || null
  }

  getById(agentId) {
    return this._byId.get(agentId) || null
  }

  getByCapability(capability) {
    return this.getAllInstances().filter(a =>
      a.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))
    )
  }

  getAll() {
    return [...this._agents.values()].map(a => a.toDescriptor())
  }

  getAllInstances() {
    return [...this._agents.values()]
  }

  getActive() {
    return this.getAll().filter(a => a.active)
  }

  activate(agentType) {
    const agent = this._agents.get(agentType)
    if (agent?.activate) agent.activate()
  }

  deactivate(agentType) {
    const agent = this._agents.get(agentType)
    if (agent?.deactivate) agent.deactivate()
  }

  discover(query = {}) {
    const { capability, taskType } = query
    if (capability) return this.getByCapability(capability).map(a => a.toDescriptor())
    if (taskType) {
      return this.getAllInstances()
        .filter(a => a.supportedTasks?.includes(taskType))
        .map(a => a.toDescriptor())
    }
    return this.getAll()
  }
}

module.exports = { AgentRegistry }
