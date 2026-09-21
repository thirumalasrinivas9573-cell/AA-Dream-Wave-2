/**
 * AI Provider Selector — config-driven, never hardcoded
 * @module mj/ai/ProviderSelector
 */

const { getConfig } = require('../config')

class ProviderSelector {
  /**
   * @param {import('./ProviderRegistry').ProviderRegistry} registry
   */
  constructor(registry) {
    this._registry = registry
  }

  /** @returns {Object} Active AI configuration */
  getAIConfig() {
    const config = getConfig()
    return config.get('ai') || {}
  }

  /** @returns {string} Primary provider name */
  getPrimary() {
    return this.getAIConfig().primaryProvider || 'openai'
  }

  /** @returns {string} Fallback provider name */
  getFallback() {
    return this.getAIConfig().fallbackProvider || 'gemini'
  }

  /** @returns {import('./interfaces/IAIProvider').IAIProvider|null} */
  selectPrimary() {
    return this._registry.get(this.getPrimary())
  }

  /** @returns {Array<string>} Ordered provider names */
  getProviderChain() {
    const ai = this.getAIConfig()
    const chain = [ai.primaryProvider || 'openai']
    if (ai.fallbackProvider) chain.push(ai.fallbackProvider)
    for (const name of this._registry.getAvailable()) {
      if (!chain.includes(name)) chain.push(name)
    }
    return chain
  }
}

module.exports = { ProviderSelector }
