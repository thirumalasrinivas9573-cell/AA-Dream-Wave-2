/**
 * MJ Voice Personality — configurable assistant persona
 * @module mj/voice/personality/VoicePersonality
 */

const { DEFAULT_PERSONALITY } = require('../constants')

const GREETING_TEMPLATES = {
  warm: ['Welcome back.', 'How can I help today?', 'Good to see you again.'],
  professional: ['Welcome back.', 'How may I assist you?', 'Ready when you are.'],
  brief: ['Hello.', 'How can I help?'],
}

class VoicePersonality {
  constructor(config = {}) {
    this._config = {
      ...DEFAULT_PERSONALITY,
      ...config,
      traits: config.traits || DEFAULT_PERSONALITY.traits,
    }
  }

  configure(updates = {}) {
    this._config = { ...this._config, ...updates }
    return this._config
  }

  getConfig() {
    return { ...this._config }
  }

  /** Generate a contextual greeting */
  getGreeting(context = {}) {
    const style = this._config.greetingStyle || 'warm'
    const templates = GREETING_TEMPLATES[style] || GREETING_TEMPLATES.warm
    const index = context.sessionCount ? context.sessionCount % templates.length : 0
    return templates[index]
  }

  /** Build TTS/speech style hints for providers */
  getSpeechHints() {
    return {
      tone: this._config.tone,
      traits: this._config.traits,
      emotion: 'calm',
      pace: 'moderate',
    }
  }

  /** Format response text with personality (minimal — no hardcoded fluff) */
  formatResponse(text) {
    if (!text || typeof text !== 'string') return text
    return text.trim()
  }
}

module.exports = { VoicePersonality, GREETING_TEMPLATES }
