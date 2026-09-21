/**
 * MJ Voice Pipeline
 * Voice → STT → Brain → Memory → Planner → Agent → Response → TTS → Frontend
 * @module mj/voice/pipeline/VoicePipeline
 */

const { VOICE_PIPELINE_STAGES, VOICE_STATES, VOICE_EVENTS } = require('../constants')
const { MJLogger } = require('../../logger')
const { VoiceError } = require('../../errors')

class VoicePipeline {
  /**
   * @param {Object} deps
   * @param {import('../VoiceEngine').VoiceEngine} deps.voiceEngine
   */
  constructor(deps = {}) {
    this._voiceEngine = deps.voiceEngine
    this._processCommand = deps.processCommand || null
    this._logger = MJLogger.child('Voice:Pipeline')
  }

  setProcessCommand(fn) {
    this._processCommand = fn
  }

  /**
   * Execute full voice pipeline.
   * @param {Object} params - { userId, sessionId, transcript, audio, metadata }
   */
  async execute(params = {}) {
    const start = Date.now()
    const trace = { stages: [] }
    const engine = this._voiceEngine

    if (!engine) throw new VoiceError('VoiceEngine not initialized')

    const { userId, sessionId, transcript, audio, metadata = {} } = params
    engine.security.validateUserId(userId)
    engine.security.checkRateLimit(userId, 'pipeline')

    const settings = engine.settings.get(userId)
    const voiceSession = engine.sessions.get(sessionId) ||
      engine.sessions.create(userId, { sessionId })

    trace.stages.push(VOICE_PIPELINE_STAGES.RECEIVE)

    // Wake word detection (if applicable)
    if (settings.mode === 'wake_word' || metadata.checkWakeWord) {
      trace.stages.push(VOICE_PIPELINE_STAGES.WAKE_DETECT)
      const wakeResult = engine.wakeWord.detect({ transcript, confidence: metadata.confidence })
      if (!wakeResult.detected && !transcript) {
        return { success: false, reason: 'no_wake_word', trace }
      }
    }

    if (engine.stateMachine.currentState !== VOICE_STATES.LISTENING) {
      engine.stateMachine.transition(VOICE_STATES.LISTENING, { userId, sessionId: voiceSession.sessionId })
    }
    engine.emit(VOICE_EVENTS.VOICE_STARTED, { userId, sessionId: voiceSession.sessionId })
    trace.stages.push(VOICE_PIPELINE_STAGES.LISTEN)

    trace.stages.push(VOICE_PIPELINE_STAGES.RECOGNIZE)
    engine.stateMachine.transition(VOICE_STATES.UNDERSTANDING)
    engine.emit(VOICE_EVENTS.TRANSCRIPTION_STARTED, { sessionId: voiceSession.sessionId })

    const sttStart = Date.now()
    let transcription

    if (transcript) {
      transcription = { text: transcript, confidence: metadata.confidence ?? 1, isFinal: true, provider: 'direct' }
    } else {
      const sttProvider = engine.getSTTProvider(settings.sttProvider)
      if (!sttProvider) throw new VoiceError(`STT provider not found: ${settings.sttProvider}`)
      transcription = await sttProvider.transcribe({
        audio,
        language: settings.language,
        format: metadata.format || 'webm',
      })
    }

    const sttMs = Date.now() - sttStart
    engine.observability.recordTranscription(sttMs)
    engine.sessions.recordTranscription(voiceSession.sessionId, {
      text: transcription.text,
      confidence: transcription.confidence,
      latencyMs: sttMs,
      provider: transcription.provider || settings.sttProvider,
    })
    engine.emit(VOICE_EVENTS.TRANSCRIPTION_COMPLETED, {
      sessionId: voiceSession.sessionId,
      text: transcription.text,
      confidence: transcription.confidence,
    })

    if (!transcription.text?.trim()) {
      engine.stateMachine.transition(VOICE_STATES.LISTENING)
      return { success: false, reason: 'empty_transcription', trace }
    }

    // AI Brain + Memory + Planner (via central MJ pipeline)
    trace.stages.push(VOICE_PIPELINE_STAGES.BRAIN)
    engine.stateMachine.transition(VOICE_STATES.THINKING)

    if (!this._processCommand) {
      throw new VoiceError('processCommand handler not wired')
    }

    const pipelineResult = await this._processCommand(transcription.text, {
      userId,
      sessionId: voiceSession.sessionId,
      metadata: { ...metadata, source: 'voice', voiceSessionId: voiceSession.sessionId },
      context: { sessionId: voiceSession.sessionId, userId, source: 'voice' },
    })

    trace.stages.push(VOICE_PIPELINE_STAGES.MEMORY)
    trace.stages.push(VOICE_PIPELINE_STAGES.PLANNER)
    trace.stages.push(VOICE_PIPELINE_STAGES.AGENT)
    trace.stages.push(VOICE_PIPELINE_STAGES.RESPONSE)

    engine.stateMachine.transition(VOICE_STATES.PLANNING)
    engine.stateMachine.transition(VOICE_STATES.WORKING)

    const responseText = pipelineResult.response?.content
      || pipelineResult.context?.reasoningResult?.response
      || pipelineResult.response?.structured?.content
      || 'I processed your request.'

    // Speech synthesis
    trace.stages.push(VOICE_PIPELINE_STAGES.SYNTHESIZE)
    engine.stateMachine.transition(VOICE_STATES.SPEAKING)
    engine.emit(VOICE_EVENTS.SPEECH_STARTED, { sessionId: voiceSession.sessionId })

    let speechResult = null
    if (settings.autoSpeak) {
      const ttsStart = Date.now()
      speechResult = await engine.synthesize(responseText, userId)
      const ttsMs = Date.now() - ttsStart
      engine.observability.recordSynthesis(ttsMs)
      engine.sessions.recordSpeech(voiceSession.sessionId, {
        text: responseText,
        durationMs: speechResult.durationMs || ttsMs,
        provider: speechResult.provider,
      })
    }

    engine.emit(VOICE_EVENTS.SPEECH_COMPLETED, { sessionId: voiceSession.sessionId })
    trace.stages.push(VOICE_PIPELINE_STAGES.DELIVER)

    engine.stateMachine.transition(VOICE_STATES.WAITING)
    engine.emit(VOICE_EVENTS.VOICE_STOPPED, { sessionId: voiceSession.sessionId })

    const pipelineMs = Date.now() - start
    engine.observability.recordPipeline(pipelineMs)

    if (settings.continuousListening || settings.mode === 'continuous') {
      engine.stateMachine.transition(VOICE_STATES.LISTENING)
    } else {
      engine.stateMachine.transition(VOICE_STATES.SLEEPING)
    }

    return {
      success: pipelineResult.success !== false,
      transcription,
      response: pipelineResult.response,
      speech: speechResult,
      pipelineResult,
      trace,
      pipelineMs,
      sessionId: voiceSession.sessionId,
    }
  }
}

module.exports = { VoicePipeline, VOICE_PIPELINE_STAGES }
