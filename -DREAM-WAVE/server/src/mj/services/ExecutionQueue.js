/**
 * MJ Execution Queue
 * Async task queue for pipeline execution (architecture stub).
 * @module mj/services/ExecutionQueue
 */

const { MJLogger } = require('../logger')
const { MJ_EVENTS } = require('../constants')
const { getEventBus } = require('../events')

class ExecutionQueue {
  constructor() {
    this._logger = MJLogger.child('ExecutionQueue')
    this._eventBus = getEventBus()
    this._queue = []
    this._processing = false
  }

  /** @param {Object} task */
  enqueue(task) {
    this._queue.push({ ...task, enqueuedAt: Date.now() })
    this._logger.debug('Task enqueued (stub)', { taskId: task.id })
  }

  /** @returns {Object|null} */
  dequeue() {
    return this._queue.shift() || null
  }

  /** @returns {number} */
  size() {
    return this._queue.length
  }

  /**
   * Process queued tasks (stub).
   * @param {Object} [plan]
   * @returns {Promise<Array>}
   */
  async process(plan = {}) {
    this._processing = true
    const results = []

    this._eventBus.emitEvent(MJ_EVENTS.TASK_STARTED, { planId: plan.id })

    while (this._queue.length > 0) {
      const task = this.dequeue()
      results.push({ taskId: task.id, status: 'completed_stub' })
    }

    this._eventBus.emitEvent(MJ_EVENTS.TASK_COMPLETED, {
      planId: plan.id,
      resultCount: results.length,
    })

    this._processing = false
    return results
  }

  clear() {
    this._queue = []
  }
}

module.exports = { ExecutionQueue }
