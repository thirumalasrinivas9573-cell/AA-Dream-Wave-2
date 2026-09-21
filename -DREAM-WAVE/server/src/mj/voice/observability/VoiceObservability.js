/**
 * Voice Observability — metrics and performance tracking
 * @module mj/voice/observability/VoiceObservability
 */

const { MJLogger } = require('../../logger')

class VoiceObservability {
  constructor() {
    this._logger = MJLogger.child('Voice:Observability')
    this._metrics = {
      sessions: 0,
      transcriptions: 0,
      syntheses: 0,
      errors: 0,
      totalSttMs: 0,
      totalTtsMs: 0,
      totalPipelineMs: 0,
      wakeDetections: 0,
    }
  }

  recordSession() { this._metrics.sessions++ }
  recordTranscription(durationMs) {
    this._metrics.transcriptions++
    this._metrics.totalSttMs += durationMs
  }
  recordSynthesis(durationMs) {
    this._metrics.syntheses++
    this._metrics.totalTtsMs += durationMs
  }
  recordPipeline(durationMs) {
    this._metrics.totalPipelineMs += durationMs
  }
  recordWakeDetection() { this._metrics.wakeDetections++ }
  recordError() { this._metrics.errors++ }

  getMetrics() {
    return {
      ...this._metrics,
      avgSttMs: this._metrics.transcriptions
        ? Math.round(this._metrics.totalSttMs / this._metrics.transcriptions) : 0,
      avgTtsMs: this._metrics.syntheses
        ? Math.round(this._metrics.totalTtsMs / this._metrics.syntheses) : 0,
    }
  }
}

let _instance = null

function getVoiceObservability() {
  if (!_instance) _instance = new VoiceObservability()
  return _instance
}

module.exports = { VoiceObservability, getVoiceObservability }
