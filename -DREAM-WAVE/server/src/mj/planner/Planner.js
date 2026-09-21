/**
 * MJ Planner
 * Supports task decomposition, priority, dependency/execution graphs,
 * retry/fallback strategies, and future multi-agent planning.
 * Architecture only — no business logic.
 * @module mj/planner/Planner
 */

const {
  TaskDecomposer,
  PriorityCalculator,
  DependencyGraph,
  ExecutionGraph,
  RetryStrategy,
  FallbackStrategy,
} = require('./components')
const { MJLogger } = require('../logger')
const { MJ_EVENTS } = require('../constants')
const { getEventBus } = require('../events')

class Planner {
  constructor() {
    this._logger = MJLogger.child('Planner')
    this._eventBus = getEventBus()
    this._decomposer = new TaskDecomposer()
    this._priorityCalculator = new PriorityCalculator()
    this._retryStrategy = new RetryStrategy()
    this._fallbackStrategy = new FallbackStrategy()
  }

  /**
   * Create an execution plan from a command (stub).
   * @param {Object} command
   * @param {Object} [context]
   * @returns {Promise<Object>}
   */
  async createPlan(command, context = {}) {
    this._logger.planner('Creating plan (stub)', { commandId: command?.id })

    const tasks = await this._decomposer.decompose(command)
    const prioritizedTasks = await this._priorityCalculator.calculate(tasks)

    const dependencyGraph = new DependencyGraph()
    const executionGraph = new ExecutionGraph()

    for (const task of prioritizedTasks) {
      dependencyGraph.addNode(task.id, task)
      executionGraph.addStage({ taskId: task.id, status: 'pending' })
    }

    const plan = {
      id: `plan_${Date.now()}`,
      commandId: command?.id,
      tasks: prioritizedTasks,
      dependencyGraph: dependencyGraph.toJSON(),
      executionGraph: executionGraph.toJSON(),
      executionOrder: dependencyGraph.getExecutionOrder(),
      priority: 0,
      retryStrategy: {
        maxRetries: this._retryStrategy.maxRetries,
        backoffMs: this._retryStrategy.backoffMs,
      },
      fallbackStrategy: this._fallbackStrategy.getFallback(),
      multiAgentReady: true,
      context,
      createdAt: Date.now(),
    }

    this._eventBus.emitEvent(MJ_EVENTS.PLAN_CREATED, { planId: plan.id, commandId: command?.id })
    return plan
  }

  /** @returns {RetryStrategy} */
  getRetryStrategy() {
    return this._retryStrategy
  }

  /** @returns {FallbackStrategy} */
  getFallbackStrategy() {
    return this._fallbackStrategy
  }
}

module.exports = { Planner }
