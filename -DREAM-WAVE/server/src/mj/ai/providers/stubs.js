/**
 * Future Provider Stubs — Claude, Local LLM, Custom
 * @module mj/ai/providers
 */

const { IAIProvider } = require('../interfaces/IAIProvider')
const { AI_PROVIDERS, MODEL_CAPABILITIES } = require('../constants')

function createStubProvider(name, capabilities = []) {
  return class StubProvider extends IAIProvider {
    constructor(config = {}) {
      super()
      this._config = config
      this._providerName = name
      this._caps = capabilities
    }

    get name() { return this._providerName }
    get capabilities() { return this._caps }

    isAvailable() {
      return !!(this._config.enabled && this._config.apiKey)
    }

    async chatCompletion() {
      return { content: null, error: `${this.name} provider not yet implemented`, provider: this.name }
    }

    async structuredJSON() {
      return { data: null, error: `${this.name} provider not yet implemented`, provider: this.name }
    }
  }
}

const ClaudeProvider = createStubProvider(AI_PROVIDERS.CLAUDE, [
  MODEL_CAPABILITIES.CHAT_COMPLETION,
  MODEL_CAPABILITIES.STRUCTURED_JSON,
])

const LocalLLMProvider = createStubProvider(AI_PROVIDERS.LOCAL, [
  MODEL_CAPABILITIES.CHAT_COMPLETION,
])

const CustomModelProvider = createStubProvider(AI_PROVIDERS.CUSTOM, [
  MODEL_CAPABILITIES.CHAT_COMPLETION,
  MODEL_CAPABILITIES.STRUCTURED_JSON,
])

module.exports = { ClaudeProvider, LocalLLMProvider, CustomModelProvider }
