/**
 * Wake Word Engine — configurable wake-word detection (architecture)
 * @module mj/voice/wake/WakeWordEngine
 */

const { DEFAULT_WAKE_WORD, VOICE_EVENTS, VOICE_MODES } = require('../constants')
const { getEventBus } = require('../../events')
const { MJLogger } = require('../../logger')

class WakeWordEngine {
  constructor(config = {}) {
    this._logger = MJLogger.child('Voice:WakeWord')
    this._eventBus = getEventBus()
    this._config = {
      wakeWords: config.wakeWords || [config.wakeWord || DEFAULT_WAKE_WORD],
      sensitivity: config.sensitivity ?? 0.7,
      threshold: config.threshold ?? 0.5,
      alwaysListening: config.alwaysListening ?? false,
      mode: config.mode || VOICE_MODES.PUSH_TO_TALK,
    }
    this._active = false
  }

  configure(updates = {}) {
    this._config = { ...this._config, ...updates }
    if (updates.wakeWord) {
      this._config.wakeWords = [updates.wakeWord]
    }
    if (updates.wakeWords) {
      this._config.wakeWords = updates.wakeWords
    }
    return this._config
  }

  getConfig() {
    return { ...this._config }
  }

  /** Start wake-word detection loop (architecture stub) */
  start() {
    this._active = true
    this._logger.info('Wake word engine started', {
      wakeWords: this._config.wakeWords,
      mode: this._config.mode,
    })
    return { active: true, mode: this._config.mode }
  }

  stop() {
    this._active = false
    return { active: false }
  }

  /**
   * Detect wake word in transcript or audio metadata.
   * Architecture: real implementation uses on-device or cloud wake-word models.
   * @param {Object} input - { transcript, confidence }
   */
  detect(input = {}) {
    const transcript = (input.transcript || input.text || '').toLowerCase()
    const confidence = input.confidence ?? 0

    const matched = this._config.wakeWords.find(word =>
      transcript.includes(word.toLowerCase())
    )

    if (matched && confidence >= this._config.threshold) {
      this._eventBus.emitEvent(VOICE_EVENTS.WAKE_DETECTED, {
        wakeWord: matched,
        confidence,
        transcript,
      })
      this._logger.info('Wake word detected', { wakeWord: matched, confidence })
      return { detected: true, wakeWord: matched, confidence }
    }

    return { detected: false }
  }

  isActive() {
    return this._active
  }
}

module.exports = { WakeWordEngine }
