/**
 * AI Provider Registry
 * @module mj/ai/ProviderRegistry
 */

const { OpenAIProvider } = require('./providers/OpenAIProvider')
const { GeminiProvider } = require('./providers/GeminiProvider')
const { ClaudeProvider, LocalLLMProvider, CustomModelProvider } = require('./providers/stubs')
const { AI_PROVIDERS } = require('./constants')
const { MJLogger } = require('../logger')

class ProviderRegistry {
  constructor(config = {}) {
    this._logger = MJLogger.child('AI:Registry')
    this._providers = new Map()
    this._registerDefaults(config)
  }

  _registerDefaults(config) {
    const factories = {
      [AI_PROVIDERS.OPENAI]: () => new OpenAIProvider(config.openai || {}),
      [AI_PROVIDERS.GEMINI]: () => new GeminiProvider(config.gemini || {}),
      [AI_PROVIDERS.CLAUDE]: () => new ClaudeProvider(config.claude || {}),
      [AI_PROVIDERS.LOCAL]: () => new LocalLLMProvider(config.local || {}),
      [AI_PROVIDERS.CUSTOM]: () => new CustomModelProvider(config.custom || {}),
    }

    for (const [name, factory] of Object.entries(factories)) {
      this._providers.set(name, factory())
    }
  }

  /** @param {string} name @returns {import('./interfaces/IAIProvider').IAIProvider|null} */
  get(name) {
    return this._providers.get(name) || null
  }

  /** @returns {Array} Available provider names */
  getAvailable() {
    return [...this._providers.entries()]
      .filter(([, p]) => p.isAvailable())
      .map(([name]) => name)
  }

  /** @returns {Array} All registered provider names */
  getAll() {
    return [...this._providers.keys()]
  }

  register(name, provider) {
    this._providers.set(name, provider)
    this._logger.info(`Provider registered: ${name}`)
  }
}

module.exports = { ProviderRegistry }
