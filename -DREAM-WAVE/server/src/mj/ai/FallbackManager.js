/**
 * AI Fallback Manager
 * Provider A fails → switch to Provider B → log → retry → graceful error
 * @module mj/ai/FallbackManager
 */

const { MJLogger } = require('../logger')
const { AIError } = require('../errors')

class FallbackManager {
  /**
   * @param {import('./ProviderRegistry').ProviderRegistry} registry
   * @param {Object} config
   */
  constructor(registry, config = {}) {
    this._registry = registry
    this._logger = MJLogger.child('AI:Fallback')
    this._primary = config.primaryProvider || 'openai'
    this._fallback = config.fallbackProvider || 'gemini'
    this._maxRetries = config.maxRetries ?? 2
    this._failures = []
  }

  /** @returns {string[]} Provider chain */
  _getChain() {
    const chain = [this._primary]
    if (this._fallback && this._fallback !== this._primary) chain.push(this._fallback)
    for (const name of this._registry.getAvailable()) {
      if (!chain.includes(name)) chain.push(name)
    }
    return chain
  }

  /**
   * Execute an AI operation with automatic fallback.
   * @param {string} operation - chatCompletion | structuredJSON
   * @param {Array} args
   * @returns {Promise<Object>}
   */
  async execute(operation, ...args) {
    const chain = this._getChain()
    let lastError = null

    for (const providerName of chain) {
      const provider = this._registry.get(providerName)
      if (!provider?.isAvailable()) continue

      for (let attempt = 0; attempt < this._maxRetries; attempt++) {
        try {
          const result = await provider[operation](...args)
          if (result.error && !result.content && !result.data) {
            throw new AIError(result.error, { code: 'AI_PROVIDER_ERROR' })
          }
          return { ...result, usedProvider: providerName, fallbackUsed: providerName !== this._primary }
        } catch (error) {
          lastError = error
          this._failures.push({
            provider: providerName,
            operation,
            attempt,
            message: error.message,
            timestamp: Date.now(),
          })
          this._logger.warning(`Provider ${providerName} failed (attempt ${attempt + 1})`, {
            operation,
            message: error.message,
          })
          if (attempt < this._maxRetries - 1) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
          }
        }
      }
    }

    return {
      content: null,
      data: null,
      error: lastError?.message || 'All AI providers failed',
      usedProvider: null,
      fallbackUsed: true,
      graceful: true,
    }
  }

  getFailureLog() {
    return [...this._failures]
  }

  clearFailures() {
    this._failures = []
  }
}

module.exports = { FallbackManager }
