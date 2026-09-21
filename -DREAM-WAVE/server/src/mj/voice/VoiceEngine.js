/**
 * MJ Voice Intelligence Platform — Orchestrator
 * @module mj/voice/VoiceEngine
 */

const { getConfig } = require('../config')
const { getEventBus } = require('../events')
const { MJLogger } = require('../logger')
const { VoiceError } = require('../errors')
const { VOICE_STATES, VOICE_EVENTS, STT_PROVIDERS, TTS_PROVIDERS } = require('./constants')
const { VoiceStateMachine } = require('./state/VoiceStateMachine')
const { WakeWordEngine } = require('./wake/WakeWordEngine')
const { STTProviderRegistry } = require('./stt/STTProviderRegistry')
const { TTSProviderRegistry } = require('./tts/TTSProviderRegistry')
const { VoicePersonality } = require('./personality/VoicePersonality')
const { VoiceSessionManager } = require('./session/VoiceSessionManager')
const { VoiceSettingsStore } = require('./settings/VoiceSettingsStore')
const { VoiceSecurity } = require('./security/VoiceSecurity')
const { getVoiceObservability } = require('./observability/VoiceObservability')
const { VoicePipeline } = require('./pipeline/VoicePipeline')
const { INoiseFilter } = require('./interfaces/INoiseFilter')
const { ISilenceDetector } = require('./interfaces/ISilenceDetector')

class VoiceEngine {
  constructor() {
    this._logger = MJLogger.child('VoiceEngine')
    this._eventBus = getEventBus()
    this._initialized = false
    this._enabled = false
    this._processCommand = null

    this.stateMachine = new VoiceStateMachine()
    this.wakeWord = new WakeWordEngine()
    this.personality = new VoicePersonality()
    this.sessions = new VoiceSessionManager()
    this.settings = new VoiceSettingsStore()
    this.security = new VoiceSecurity()
    this.observability = getVoiceObservability()
    this.noiseFilter = new INoiseFilter()
    this.silenceDetector = new ISilenceDetector()

    this._sttRegistry = null
    this._ttsRegistry = null
    this._pipeline = new VoicePipeline({ voiceEngine: this })
  }

  initialize(config = {}) {
    if (this._initialized) return this

    const mjConfig = config.voice ? config : getConfig().getAll()
    const voiceConfig = mjConfig.voice || {}

    this._enabled = voiceConfig.enabled ?? false
    this._sttRegistry = new STTProviderRegistry({
      openai: mjConfig.openai || mjConfig.ai?.openai,
      google: voiceConfig.google,
      azure: voiceConfig.azure,
      deepgram: voiceConfig.deepgram,
      whisperLocal: voiceConfig.whisperLocal,
    })
    this._ttsRegistry = new TTSProviderRegistry({
      elevenLabs: mjConfig.elevenLabs,
      openai: mjConfig.openai || mjConfig.ai?.openai,
      azure: voiceConfig.azure,
      google: voiceConfig.google,
      local: { enabled: true },
    })

    this.wakeWord.configure({
      wakeWord: voiceConfig.wakeWord,
      wakeWords: voiceConfig.wakeWords,
      sensitivity: voiceConfig.sensitivity,
      alwaysListening: voiceConfig.alwaysListening,
      mode: voiceConfig.mode,
    })

    if (voiceConfig.personality) {
      this.personality.configure(voiceConfig.personality)
    }

    this._initialized = true
    this._logger.info('Voice Engine initialized', {
      enabled: this._enabled,
      sttProviders: this._sttRegistry.getAll(),
      ttsProviders: this._ttsRegistry.getAll(),
    })
    return this
  }

  /** Wire central MJ processCommand handler */
  setProcessCommand(fn) {
    this._processCommand = fn
    this._pipeline.setProcessCommand(fn)
  }

  setPermissionManager(pm) {
    this.security.setPermissionManager(pm)
  }

  emit(event, payload = {}) {
    this._eventBus.emitEvent(event, payload)
  }

  isEnabled() {
    return this._enabled
  }

  get pipeline() { return this._pipeline }

  getSTTProvider(name) {
    const provider = this._sttRegistry?.get(name)
    if (provider?.isAvailable()) return provider
    return this._sttRegistry?.get(STT_PROVIDERS.BROWSER)
  }

  getTTSProvider(name) {
    const provider = this._ttsRegistry?.get(name)
    if (provider?.isAvailable()) return provider
    return this._ttsRegistry?.get(TTS_PROVIDERS.LOCAL)
  }

  /** Wake voice subsystem */
  wake(userId, options = {}) {
    this.security.validateUserId(userId)
    const settings = this.settings.get(userId)
    this.wakeWord.configure({
      wakeWords: settings.wakeWords,
      mode: settings.mode,
      sensitivity: settings.sensitivity,
    })

    if (settings.mode === 'wake_word') {
      this.wakeWord.start()
      this.stateMachine.transition(VOICE_STATES.WAKE_DETECTION, { userId })
    } else {
      this.stateMachine.transition(VOICE_STATES.LISTENING, { userId })
    }

    const session = this.sessions.create(userId, options)
    this.observability.recordSession()
    this.emit(VOICE_EVENTS.VOICE_STARTED, { userId, sessionId: session.sessionId })

    const greeting = this.personality.getGreeting({ sessionCount: session.history.length })
    return {
      awake: true,
      state: this.stateMachine.currentState,
      sessionId: session.sessionId,
      greeting,
    }
  }

  /** Put voice to sleep */
  sleep(sessionId) {
    this.wakeWord.stop()
    this.sessions.end(sessionId)
    this.stateMachine.transition(VOICE_STATES.SLEEPING)
    this.emit(VOICE_EVENTS.VOICE_STOPPED, { sessionId })
    return { sleeping: true, state: VOICE_STATES.SLEEPING }
  }

  /** Start listening (push-to-talk or continuous) */
  listen(userId, options = {}) {
    this.security.validateUserId(userId)
    this.security.checkRateLimit(userId, 'listen')

    const mic = this.security.checkMicrophonePermission(userId)
    if (!mic.granted) {
      this.emit(VOICE_EVENTS.MICROPHONE_DENIED, { userId })
      throw new VoiceError('Microphone permission required')
    }
    this.emit(VOICE_EVENTS.MICROPHONE_GRANTED, { userId })

    const session = this.sessions.get(options.sessionId) || this.sessions.create(userId, options)
    this.stateMachine.transition(VOICE_STATES.LISTENING, { userId, sessionId: session.sessionId })
    return { listening: true, sessionId: session.sessionId, state: this.stateMachine.currentState }
  }

  /** Stop listening */
  stop(sessionId) {
    this.stateMachine.transition(VOICE_STATES.WAITING, { sessionId })
    return { stopped: true, state: this.stateMachine.currentState }
  }

  /** Process voice input through full pipeline */
  async processVoiceInput(params = {}) {
    if (!this._processCommand) {
      throw new VoiceError('Voice pipeline not wired to MJ processCommand')
    }
    return this._pipeline.execute(params)
  }

  /** Synthesize speech from text */
  async synthesize(text, userId) {
    this.security.validateUserId(userId)
    const settings = this.settings.get(userId)
    const provider = this.getTTSProvider(settings.ttsProvider)
    if (!provider) throw new VoiceError(`TTS provider not found: ${settings.ttsProvider}`)

    const formatted = this.personality.formatResponse(text)
    const hints = this.personality.getSpeechHints()

    return provider.synthesize({
      text: formatted,
      voiceProfile: settings.voiceProfile,
      pitch: settings.pitch,
      speed: settings.speechSpeed,
      volume: settings.speechVolume,
      emotion: hints.emotion,
      language: settings.language,
    })
  }

  /** Speak text directly (TTS only, no brain) */
  async speak(text, userId, options = {}) {
    this.security.validateUserId(userId)
    this.security.checkRateLimit(userId, 'speak')

    const session = this.sessions.get(options.sessionId) || this.sessions.getActive()
    this.stateMachine.transition(VOICE_STATES.SPEAKING)
    this.emit(VOICE_EVENTS.SPEECH_STARTED, { sessionId: session?.sessionId })

    const start = Date.now()
    const result = await this.synthesize(text, userId)
    const durationMs = Date.now() - start

    this.observability.recordSynthesis(durationMs)
    if (session) {
      this.sessions.recordSpeech(session.sessionId, { text, durationMs, provider: result.provider })
    }

    this.emit(VOICE_EVENTS.SPEECH_COMPLETED, { sessionId: session?.sessionId })
    this.stateMachine.transition(VOICE_STATES.WAITING)

    return { ...result, durationMs }
  }

  getSettings(userId) {
    return this.settings.get(userId)
  }

  updateSettings(userId, updates) {
    this.security.validateUserId(userId)
    const updated = this.settings.update(userId, updates)
    this.wakeWord.configure({
      wakeWords: updated.wakeWords,
      mode: updated.mode,
      sensitivity: updated.sensitivity,
      alwaysListening: updated.alwaysListening,
    })
    return updated
  }

  getStatus(userId) {
    const session = this.sessions.getActive()
    return {
      enabled: this._enabled,
      initialized: this._initialized,
      state: this.stateMachine.currentState,
      previousState: this.stateMachine.previousState,
      activeSession: session ? this.sessions.getStats(session.sessionId) : null,
      wakeWord: this.wakeWord.getConfig(),
      sttProviders: {
        registered: this._sttRegistry?.getAll() || [],
        available: this._sttRegistry?.getAvailable() || [],
      },
      ttsProviders: {
        registered: this._ttsRegistry?.getAll() || [],
        available: this._ttsRegistry?.getAvailable() || [],
      },
      metrics: this.observability.getMetrics(),
      settings: userId ? this.security.sanitizeProviderConfig(this.settings.get(userId)) : null,
    }
  }

  mute() {
    this.stateMachine.forceTransition(VOICE_STATES.MUTED)
    return { muted: true }
  }

  unmute() {
    this.stateMachine.forceTransition(VOICE_STATES.LISTENING)
    return { muted: false }
  }

  reset() {
    this.wakeWord.stop()
    this.sessions.clear()
    this.stateMachine.reset()
    return { reset: true, state: VOICE_STATES.SLEEPING }
  }
}

let _instance = null

function getVoiceEngine() {
  if (!_instance) _instance = new VoiceEngine()
  return _instance
}

module.exports = { VoiceEngine, getVoiceEngine }
