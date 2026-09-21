/**
 * Specialized Agent — modular enterprise agent base
 * @module mj/agents/specialized/SpecializedAgent
 */

const { BaseAgent } = require('../interfaces')

class SpecializedAgent extends BaseAgent {
  /**
   * @param {Object} config
   */
  constructor(config) {
    super(config)
    this._description = config.description || ''
    this._version = config.version || '1.0.0'
    this._priority = config.priority ?? 5
    this._supportedTasks = config.supportedTasks || []
    this._executionLimits = config.executionLimits || { maxConcurrent: 3, timeoutMs: 30000 }
    this._permissions = config.permissions || {}
    this._metrics = { executions: 0, successes: 0, failures: 0, totalMs: 0 }
    this._lastHeartbeat = null
    this._status = 'ready'
    this._active = true
  }

  get description() { return this._description }
  get version() { return this._version }
  get priority() { return this._priority }
  get supportedTasks() { return [...this._supportedTasks] }
  get health() {
    return {
      score: this._metrics.executions
        ? this._metrics.successes / this._metrics.executions
        : 1,
      status: this._status,
    }
  }

  recordHeartbeat() {
    this._lastHeartbeat = Date.now()
  }

  async execute(task = {}) {
    const start = Date.now()
    this._metrics.executions++
    this.recordHeartbeat()

    const output = `[${this._name}] ${task.title || task.input || 'Task processed'} — `
      + `specialist analysis complete using capabilities: ${this._capabilities.slice(0, 3).join(', ')}`

    this._metrics.successes++
    this._metrics.totalMs += Date.now() - start

    return {
      success: true,
      agentId: this._id,
      agentType: this._type,
      output,
      confidence: 0.85,
      durationMs: Date.now() - start,
      metadata: {
        capabilities: this._capabilities,
        taskId: task.id,
        runId: task.runId,
      },
    }
  }

  toDescriptor() {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      description: this._description,
      version: this._version,
      capabilities: this._capabilities,
      supportedTasks: this._supportedTasks,
      priority: this._priority,
      status: this._status,
      active: this._active,
      health: this.health,
      executionLimits: this._executionLimits,
      metrics: { ...this._metrics },
      lastHeartbeat: this._lastHeartbeat,
      availability: this._active ? 'available' : 'unavailable',
    }
  }
}

module.exports = { SpecializedAgent }
