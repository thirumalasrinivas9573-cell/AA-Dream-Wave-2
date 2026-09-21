/**
 * AI Observability — latency, tokens, provider, retries, pipeline timing
 * @module mj/brain/observability/AIObservability
 */

const { MJLogger } = require('../../logger')

class AIObservability {
  constructor() {
    this._logger = MJLogger.child('AIObservability')
    this._metrics = {
      requests: 0,
      totalLatencyMs: 0,
      totalTokens: 0,
      errors: 0,
      retries: 0,
      providerUsage: {},
      pipelineTimings: [],
      agentSelections: [],
    }
  }

  startPipeline(requestId) {
    return { requestId, startedAt: Date.now(), stages: {} }
  }

  recordStage(trace, stageName) {
    if (!trace) return
    trace.stages[stageName] = { timestamp: Date.now() }
  }

  endPipeline(trace) {
    if (!trace) return null
    trace.totalMs = Date.now() - trace.startedAt
    this._metrics.pipelineTimings.push(trace)
    if (this._metrics.pipelineTimings.length > 100) {
      this._metrics.pipelineTimings.shift()
    }
    return trace
  }

  recordRequest(data = {}) {
    this._metrics.requests++
    this._metrics.totalLatencyMs += data.latencyMs || 0
    this._metrics.totalTokens += data.totalTokens || 0
    if (data.error) this._metrics.errors++
    if (data.retries) this._metrics.retries += data.retries

    const provider = data.provider || 'unknown'
    this._metrics.providerUsage[provider] = (this._metrics.providerUsage[provider] || 0) + 1
  }

  recordAgentSelection(agents) {
    this._metrics.agentSelections.push({ agents, timestamp: Date.now() })
  }

  getMetrics() {
    const avgLatency = this._metrics.requests
      ? Math.round(this._metrics.totalLatencyMs / this._metrics.requests)
      : 0

    return {
      ...this._metrics,
      avgLatencyMs: avgLatency,
      errorRate: this._metrics.requests
        ? (this._metrics.errors / this._metrics.requests * 100).toFixed(2) + '%'
        : '0%',
    }
  }

  getPipelineTimings(limit = 10) {
    return this._metrics.pipelineTimings.slice(-limit)
  }
}

let _instance = null

function getAIObservability() {
  if (!_instance) _instance = new AIObservability()
  return _instance
}

module.exports = { AIObservability, getAIObservability }
