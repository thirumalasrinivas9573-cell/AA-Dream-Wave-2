/**
 * Planner Sub-components (architecture stubs)
 * @module mj/planner
 */

const { MJLogger } = require('../logger')

class TaskDecomposer {
  constructor() {
    this._logger = MJLogger.child('TaskDecomposer')
  }

  /** @param {Object} command @returns {Promise<Array>} */
  async decompose(_command) {
    this._logger.planner('Task decomposition (stub)')
    return []
  }
}

class PriorityCalculator {
  constructor() {
    this._logger = MJLogger.child('PriorityCalculator')
  }

  /** @param {Array} tasks @returns {Promise<Array>} */
  async calculate(_tasks) {
    this._logger.planner('Priority calculation (stub)')
    return []
  }
}

class DependencyGraph {
  constructor() {
    this._nodes = new Map()
    this._edges = []
  }

  /** @param {string} taskId @param {Object} task */
  addNode(taskId, task) {
    this._nodes.set(taskId, task)
  }

  /** @param {string} from @param {string} to */
  addEdge(from, to) {
    this._edges.push({ from, to })
  }

  /** @returns {Object} */
  toJSON() {
    return {
      nodes: Object.fromEntries(this._nodes),
      edges: [...this._edges],
    }
  }

  /** @returns {string[]} Topological sort order (stub) */
  getExecutionOrder() {
    return [...this._nodes.keys()]
  }
}

class ExecutionGraph {
  constructor() {
    this._stages = []
  }

  /** @param {Object} stage */
  addStage(stage) {
    this._stages.push(stage)
  }

  /** @returns {Object} */
  toJSON() {
    return { stages: [...this._stages] }
  }
}

class RetryStrategy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3
    this.backoffMs = options.backoffMs ?? 1000
    this.multiplier = options.multiplier ?? 2
  }

  /** @param {number} attempt @returns {number} Delay in ms */
  getDelay(attempt) {
    return this.backoffMs * Math.pow(this.multiplier, attempt)
  }

  /** @param {number} attempt @returns {boolean} */
  shouldRetry(attempt) {
    return attempt < this.maxRetries
  }
}

class FallbackStrategy {
  constructor(options = {}) {
    this.fallbackAgent = options.fallbackAgent ?? null
    this.fallbackAction = options.fallbackAction ?? null
  }

  /** @returns {Object} */
  getFallback() {
    return {
      agent: this.fallbackAgent,
      action: this.fallbackAction,
    }
  }
}

module.exports = {
  TaskDecomposer,
  PriorityCalculator,
  DependencyGraph,
  ExecutionGraph,
  RetryStrategy,
  FallbackStrategy,
}
