/**
 * Result Aggregator — validate and merge agent outputs
 * @module mj/orchestrator/aggregation/ResultAggregator
 */

const { EXECUTION_STATES, ORCHESTRATOR_EVENTS } = require('../constants')
const { getEventBus } = require('../../events')
const { MJLogger } = require('../../logger')

class ResultAggregator {
  constructor() {
    this._logger = MJLogger.child('Orchestrator:Aggregator')
    this._eventBus = getEventBus()
  }

  validate(results = []) {
    return results.map(r => ({
      taskId: r.taskId,
      valid: r.state === EXECUTION_STATES.COMPLETED && r.result != null,
      state: r.state,
      error: r.error || null,
    }))
  }

  merge(results = [], options = {}) {
    const successful = results.filter(r => r.state === EXECUTION_STATES.COMPLETED && r.result)
    const failed = results.filter(r =>
      r.state === EXECUTION_STATES.FAILED || r.state === EXECUTION_STATES.TIMED_OUT
    )

    const merged = {
      success: failed.length === 0 && successful.length > 0,
      totalTasks: results.length,
      completed: successful.length,
      failed: failed.length,
      outputs: successful.map(r => ({
        taskId: r.taskId,
        agentId: r.agentId,
        output: r.result?.output || r.result?.message || r.result,
        confidence: r.result?.confidence ?? 0.8,
      })),
      errors: failed.map(r => ({ taskId: r.taskId, error: r.error })),
      summary: this._buildSummary(successful, options),
    }

    this._eventBus.emitEvent(ORCHESTRATOR_EVENTS.RESULT_MERGED, {
      completed: merged.completed,
      failed: merged.failed,
    })

    return merged
  }

  _buildSummary(successful, options = {}) {
    if (!successful.length) return 'No agent outputs to merge.'
    const parts = successful.map(r => {
      const out = r.result?.output || r.result?.message || ''
      return typeof out === 'string' ? out.slice(0, 200) : JSON.stringify(out).slice(0, 200)
    })
    return parts.join('\n---\n').slice(0, options.maxLength || 4000)
  }

  buildFinalResponse(merged, reasoningResult = null) {
    if (reasoningResult?.response) {
      return {
        content: reasoningResult.response,
        source: 'reasoning_with_agents',
        agentContributions: merged.outputs.length,
      }
    }

    return {
      content: merged.summary || 'Task completed by specialist agents.',
      source: 'agent_orchestrator',
      agentContributions: merged.outputs.length,
      structured: merged,
    }
  }
}

module.exports = { ResultAggregator }
