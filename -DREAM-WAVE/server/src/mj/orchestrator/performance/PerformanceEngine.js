/**
 * Performance Engine — execution metrics and utilization
 * @module mj/orchestrator/performance/PerformanceEngine
 */

class PerformanceEngine {
  constructor() {
    this._metrics = {
      executions: 0,
      totalExecutionMs: 0,
      totalQueueMs: 0,
      retries: 0,
      successes: 0,
      failures: 0,
      agentMetrics: {},
      throughput: [],
    }
  }

  recordExecution(data = {}) {
    this._metrics.executions++
    if (data.durationMs) this._metrics.totalExecutionMs += data.durationMs
    if (data.queueMs) this._metrics.totalQueueMs += data.queueMs
    if (data.success) this._metrics.successes++
    else this._metrics.failures++
    if (data.retries) this._metrics.retries += data.retries

    if (data.agentId) {
      if (!this._metrics.agentMetrics[data.agentId]) {
        this._metrics.agentMetrics[data.agentId] = {
          executions: 0,
          totalMs: 0,
          successes: 0,
          failures: 0,
        }
      }
      const am = this._metrics.agentMetrics[data.agentId]
      am.executions++
      am.totalMs += data.durationMs || 0
      if (data.success) am.successes++
      else am.failures++
    }

    this._metrics.throughput.push({ timestamp: Date.now(), success: data.success })
    if (this._metrics.throughput.length > 500) this._metrics.throughput.shift()
  }

  getMetrics() {
    const execs = this._metrics.executions || 1
    return {
      ...this._metrics,
      avgExecutionMs: Math.round(this._metrics.totalExecutionMs / execs),
      avgQueueMs: Math.round(this._metrics.totalQueueMs / execs),
      successRate: this._metrics.executions
        ? Math.round((this._metrics.successes / this._metrics.executions) * 100) : 0,
      failureRate: this._metrics.executions
        ? Math.round((this._metrics.failures / this._metrics.executions) * 100) : 0,
      agentUtilization: Object.entries(this._metrics.agentMetrics).map(([id, m]) => ({
        agentId: id,
        executions: m.executions,
        avgMs: m.executions ? Math.round(m.totalMs / m.executions) : 0,
        successRate: m.executions ? Math.round((m.successes / m.executions) * 100) : 0,
      })),
    }
  }

  reset() {
    this._metrics = {
      executions: 0,
      totalExecutionMs: 0,
      totalQueueMs: 0,
      retries: 0,
      successes: 0,
      failures: 0,
      agentMetrics: {},
      throughput: [],
    }
  }
}

module.exports = { PerformanceEngine }
