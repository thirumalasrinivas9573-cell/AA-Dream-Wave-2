/**
 * Voice Settings Store — per-user voice preferences
 * @module mj/voice/settings/VoiceSettingsStore
 */

const { DEFAULT_WAKE_WORD, VOICE_MODES, STT_PROVIDERS, TTS_PROVIDERS } = require('../constants')
const { MJLogger } = require('../../logger')

const DEFAULT_SETTINGS = {
  wakeWord: DEFAULT_WAKE_WORD,
  wakeWords: [DEFAULT_WAKE_WORD],
  sttProvider: STT_PROVIDERS.BROWSER,
  ttsProvider: TTS_PROVIDERS.LOCAL,
  language: 'en',
  accent: 'en-US',
  voiceProfile: 'professional',
  speechSpeed: 1.0,
  speechVolume: 1.0,
  pitch: 1.0,
  responseLength: 'balanced',
  autoSpeak: true,
  pushToTalk: true,
  continuousListening: false,
  alwaysListening: false,
  sensitivity: 0.7,
  mode: VOICE_MODES.PUSH_TO_TALK,
}

class VoiceSettingsStore {
  constructor() {
    this._logger = MJLogger.child('Voice:Settings')
    this._store = new Map()
  }

  getDefaults() {
    return { ...DEFAULT_SETTINGS }
  }

  get(userId) {
    if (!userId) return { ...DEFAULT_SETTINGS }
    if (!this._store.has(userId)) {
      this._store.set(userId, { ...DEFAULT_SETTINGS, userId })
    }
    return { ...this._store.get(userId) }
  }

  update(userId, updates = {}) {
    if (!userId) throw new Error('userId required for voice settings')
    const current = this.get(userId)
    const merged = { ...current, ...updates, userId }
    if (updates.wakeWord && !updates.wakeWords) {
      merged.wakeWords = [updates.wakeWord]
    }
    this._store.set(userId, merged)
    this._logger.debug('Voice settings updated', { userId, keys: Object.keys(updates) })
    return { ...merged }
  }

  /** Future: persist to MJ preference memory */
  async persistToMemory(_memoryEngine, _userId) {
    return { persisted: false, stub: true }
  }
}

module.exports = { VoiceSettingsStore, DEFAULT_SETTINGS }
