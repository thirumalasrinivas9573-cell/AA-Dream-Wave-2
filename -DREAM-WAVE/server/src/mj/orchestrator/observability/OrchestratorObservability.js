/**
 * Orchestrator Observability
 * @module mj/orchestrator/observability/OrchestratorObservability
 */

const { MJLogger } = require('../../logger')

class OrchestratorObservability {
  constructor() {
    this._logger = MJLogger.child('Orchestrator:Observability')
    this._timeline = []
    this._selections = []
    this._errors = []
  }

  recordTaskCreated(data) {
    this._timeline.push({ event: 'task_created', timestamp: Date.now(), ...data })
  }

  recordAgentSelection(data) {
    this._selections.push({ timestamp: Date.now(), ...data })
    this._timeline.push({ event: 'agent_selected', timestamp: Date.now(), ...data })
  }

  recordExecution(data) {
    this._timeline.push({ event: 'execution', timestamp: Date.now(), ...data })
  }

  recordError(error, context = {}) {
    this._errors.push({ timestamp: Date.now(), message: error.message || String(error), ...context })
  }

  getTimeline(limit = 50) {
    return this._timeline.slice(-limit)
  }

  getExecutionGraph(runId) {
    return this._timeline.filter(e => e.runId === runId)
  }

  getQueueStats(engine) {
    return {
      queueSize: engine?.getQueueSize?.() ?? 0,
      activeCount: engine?.getActiveCount?.() ?? 0,
    }
  }

  getSummary() {
    return {
      timelineEvents: this._timeline.length,
      agentSelections: this._selections.length,
      errors: this._errors.length,
      recentErrors: this._errors.slice(-5),
    }
  }
}

let _instance = null

function getOrchestratorObservability() {
  if (!_instance) _instance = new OrchestratorObservability()
  return _instance
}

module.exports = { OrchestratorObservability, getOrchestratorObservability }
