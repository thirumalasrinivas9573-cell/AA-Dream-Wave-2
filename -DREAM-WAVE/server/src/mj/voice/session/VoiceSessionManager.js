/**
 * Voice Session Manager — tracks voice interaction sessions
 * @module mj/voice/session/VoiceSessionManager
 */

const { MJLogger } = require('../../logger')

class VoiceSessionManager {
  constructor() {
    this._logger = MJLogger.child('Voice:Session')
    this._sessions = new Map()
    this._activeSessionId = null
  }

  create(userId, options = {}) {
    const sessionId = options.sessionId || `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const session = {
      sessionId,
      userId,
      startedAt: Date.now(),
      endedAt: null,
      speakingDurationMs: 0,
      listeningDurationMs: 0,
      recognitionConfidence: [],
      latencyMs: [],
      provider: { stt: null, tts: null },
      errors: [],
      history: [],
      status: 'active',
    }
    this._sessions.set(sessionId, session)
    this._activeSessionId = sessionId
    this._logger.info('Voice session created', { sessionId, userId })
    return session
  }

  get(sessionId) {
    return this._sessions.get(sessionId || this._activeSessionId) || null
  }

  getActive() {
    return this._activeSessionId ? this._sessions.get(this._activeSessionId) : null
  }

  recordTranscription(sessionId, data = {}) {
    const session = this.get(sessionId)
    if (!session) return null
    if (data.confidence != null) session.recognitionConfidence.push(data.confidence)
    if (data.latencyMs != null) session.latencyMs.push(data.latencyMs)
    session.history.push({ type: 'transcription', timestamp: Date.now(), ...data })
    return session
  }

  recordSpeech(sessionId, data = {}) {
    const session = this.get(sessionId)
    if (!session) return null
    if (data.durationMs) session.speakingDurationMs += data.durationMs
    session.history.push({ type: 'speech', timestamp: Date.now(), ...data })
    return session
  }

  recordListening(sessionId, durationMs) {
    const session = this.get(sessionId)
    if (!session) return null
    session.listeningDurationMs += durationMs
    return session
  }

  recordError(sessionId, error) {
    const session = this.get(sessionId)
    if (!session) return null
    session.errors.push({ message: error.message || String(error), timestamp: Date.now() })
    return session
  }

  setProviders(sessionId, providers = {}) {
    const session = this.get(sessionId)
    if (!session) return null
    session.provider = { ...session.provider, ...providers }
    return session
  }

  end(sessionId) {
    const id = sessionId || this._activeSessionId
    const session = this._sessions.get(id)
    if (!session) return null
    session.endedAt = Date.now()
    session.status = 'ended'
    if (this._activeSessionId === id) this._activeSessionId = null
    return session
  }

  getStats(sessionId) {
    const session = this.get(sessionId)
    if (!session) return null
    const confidences = session.recognitionConfidence
    const latencies = session.latencyMs
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      durationMs: (session.endedAt || Date.now()) - session.startedAt,
      speakingDurationMs: session.speakingDurationMs,
      listeningDurationMs: session.listeningDurationMs,
      avgConfidence: confidences.length
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null,
      avgLatencyMs: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null,
      errorCount: session.errors.length,
      eventCount: session.history.length,
      provider: session.provider,
    }
  }

  clear() {
    this._sessions.clear()
    this._activeSessionId = null
  }
}

module.exports = { VoiceSessionManager }
