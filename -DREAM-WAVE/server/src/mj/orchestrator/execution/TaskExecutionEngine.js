/**
 * Task Execution Engine — queue, retry, parallel/sequential, timeout
 * @module mj/orchestrator/execution/TaskExecutionEngine
 */

const { EXECUTION_STATES, DEFAULT_RETRY_POLICY, ORCHESTRATOR_EVENTS } = require('../constants')
const { getEventBus } = require('../../events')
const { MJLogger } = require('../../logger')

class TaskExecutionEngine {
  constructor(options = {}) {
    this._logger = MJLogger.child('Orchestrator:Execution')
    this._eventBus = getEventBus()
    this._queue = []
    this._active = new Map()
    this._history = []
    this._retryPolicy = { ...DEFAULT_RETRY_POLICY, ...options.retryPolicy }
    this._maxConcurrency = options.maxConcurrency ?? 5
    this._paused = false
  }

  enqueue(task, options = {}) {
    const entry = {
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      task,
      state: EXECUTION_STATES.QUEUED,
      priority: task.priority ?? options.priority ?? 5,
      retries: 0,
      maxRetries: options.maxRetries ?? this._retryPolicy.maxRetries,
      timeoutMs: options.timeoutMs ?? this._retryPolicy.timeoutMs,
      enqueuedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      agentId: task.agentId || task.agentType || null,
      dependencies: task.dependencies || [],
      runId: options.runId || null,
    }

    this._queue.push(entry)
    this._queue.sort((a, b) => b.priority - a.priority)
    this._eventBus.emitEvent(ORCHESTRATOR_EVENTS.TASK_CREATED, { taskId: entry.id, runId: entry.runId })
    return entry
  }

  getQueueSize() {
    return this._queue.length
  }

  getActiveCount() {
    return this._active.size
  }

  pause() {
    this._paused = true
    return { paused: true }
  }

  resume() {
    this._paused = false
    return { paused: false }
  }

  cancel(taskId) {
    const idx = this._queue.findIndex(t => t.id === taskId)
    if (idx >= 0) {
      this._queue[idx].state = EXECUTION_STATES.CANCELLED
      const removed = this._queue.splice(idx, 1)[0]
      return { cancelled: true, task: removed }
    }
    const active = this._active.get(taskId)
    if (active) {
      active.state = EXECUTION_STATES.CANCELLED
      this._active.delete(taskId)
      return { cancelled: true, task: active }
    }
    return { cancelled: false }
  }

  _resolveDependencies(completedIds) {
    return this._queue.filter(entry => {
      if (entry.state !== EXECUTION_STATES.QUEUED) return false
      return entry.dependencies.every(dep => completedIds.includes(dep))
    })
  }

  /**
   * Execute tasks via executor function.
   * @param {Function} executor - async (taskEntry, agent) => result
   * @param {Object} context - { registry, bus, runId, mode: 'parallel'|'sequential' }
   */
  async executeAll(executor, context = {}) {
    if (this._paused) return { success: false, reason: 'paused' }

    const results = []
    const completedIds = []
    const mode = context.mode || 'sequential'
    const runId = context.runId

    this._eventBus.emitEvent(ORCHESTRATOR_EVENTS.EXECUTION_STARTED, { runId, mode })

    while (this._queue.length > 0 || this._active.size > 0) {
      const ready = this._resolveDependencies(completedIds)
      if (ready.length === 0 && this._active.size === 0) break

      const batch = mode === 'parallel'
        ? ready.slice(0, this._maxConcurrency)
        : ready.slice(0, 1)

      for (const entry of batch) {
        const idx = this._queue.indexOf(entry)
        if (idx >= 0) this._queue.splice(idx, 1)
        entry.state = EXECUTION_STATES.RUNNING
        entry.startedAt = Date.now()
        this._active.set(entry.id, entry)
      }

      const batchPromises = batch.map(entry => this._executeOne(entry, executor, context))
      const batchResults = await Promise.all(batchPromises)

      for (const result of batchResults) {
        results.push(result)
        if (result.state === EXECUTION_STATES.COMPLETED) {
          completedIds.push(result.taskId)
        }
        this._active.delete(result.taskId)
        this._history.push(result)
      }
    }

    const success = results.every(r => r.state === EXECUTION_STATES.COMPLETED)
    this._eventBus.emitEvent(
      success ? ORCHESTRATOR_EVENTS.EXECUTION_COMPLETED : ORCHESTRATOR_EVENTS.EXECUTION_FAILED,
      { runId, resultCount: results.length }
    )

    return { success, results, runId }
  }

  async _executeOne(entry, executor, context) {
    const start = Date.now()
    let agent = null

    if (context.registry && entry.agentId) {
      agent = context.registry.get(entry.agentId) || context.registry.getById?.(entry.agentId)
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timed out')), entry.timeoutMs)
      )

      entry.state = EXECUTION_STATES.RUNNING
      const result = await Promise.race([
        executor(entry, agent, context),
        timeoutPromise,
      ])

      entry.state = EXECUTION_STATES.COMPLETED
      entry.completedAt = Date.now()
      entry.result = result

      return {
        taskId: entry.id,
        state: EXECUTION_STATES.COMPLETED,
        result,
        durationMs: Date.now() - start,
        agentId: entry.agentId,
        runId: entry.runId,
      }
    } catch (err) {
      if (entry.retries < entry.maxRetries) {
        entry.retries++
        entry.state = EXECUTION_STATES.RETRYING
        this._queue.unshift(entry)
        return {
          taskId: entry.id,
          state: EXECUTION_STATES.RETRYING,
          retry: entry.retries,
          error: err.message,
          runId: entry.runId,
        }
      }

      entry.state = err.message === 'Task timed out' ? EXECUTION_STATES.TIMED_OUT : EXECUTION_STATES.FAILED
      entry.error = err.message
      entry.completedAt = Date.now()

      return {
        taskId: entry.id,
        state: entry.state,
        error: err.message,
        durationMs: Date.now() - start,
        agentId: entry.agentId,
        runId: entry.runId,
      }
    }
  }

  getHistory(limit = 50) {
    return this._history.slice(-limit)
  }

  clear() {
    this._queue = []
    this._active.clear()
  }
}

module.exports = { TaskExecutionEngine }
