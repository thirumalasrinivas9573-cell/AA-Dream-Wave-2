/**
 * OpenAI Provider — MJ isolated AI layer
 * Does NOT use Dream Wave openaiService.
 * @module mj/ai/providers/OpenAIProvider
 */

const { IAIProvider } = require('../interfaces/IAIProvider')
const { AI_PROVIDERS, MODEL_CAPABILITIES } = require('../constants')
const { MJLogger } = require('../../logger')

let OpenAIClient = null
try {
  OpenAIClient = require('openai')
} catch {
  OpenAIClient = null
}

class OpenAIProvider extends IAIProvider {
  /**
   * @param {Object} config
   */
  constructor(config = {}) {
    super()
    this._logger = MJLogger.child('AI:OpenAI')
    this._config = config
    this._client = null

    if (OpenAIClient && config.apiKey && config.enabled !== false) {
      this._client = new OpenAIClient({ apiKey: config.apiKey })
    }
  }

  get name() { return AI_PROVIDERS.OPENAI }

  get capabilities() {
    return [
      MODEL_CAPABILITIES.CHAT_COMPLETION,
      MODEL_CAPABILITIES.STRUCTURED_JSON,
      MODEL_CAPABILITIES.EMBEDDINGS,
      MODEL_CAPABILITIES.FUNCTION_CALLING,
      MODEL_CAPABILITIES.STREAMING,
      MODEL_CAPABILITIES.IMAGE_UNDERSTANDING,
    ]
  }

  isAvailable() {
    return !!this._client
  }

  _model(override) {
    return override || this._config.model || 'gpt-4o-mini'
  }

  async chatCompletion(messages, options = {}) {
    if (!this._client) {
      return { content: null, error: 'OpenAI provider not configured', provider: this.name }
    }

    const start = Date.now()
    const res = await this._client.chat.completions.create({
      model: this._model(options.model),
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    })

    const usage = res.usage || {}
    return {
      content: res.choices[0]?.message?.content || '',
      provider: this.name,
      model: res.model,
      usage: {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      latencyMs: Date.now() - start,
    }
  }

  async structuredJSON(messages, schema, options = {}) {
    if (!this._client) {
      return { data: null, error: 'OpenAI provider not configured', provider: this.name }
    }

    const start = Date.now()
    const res = await this._client.chat.completions.create({
      model: this._model(options.model),
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      response_format: { type: 'json_object' },
    })

    const raw = res.choices[0]?.message?.content || '{}'
    let data = null
    try {
      data = JSON.parse(raw)
    } catch {
      data = null
    }

    const usage = res.usage || {}
    return {
      data,
      raw,
      provider: this.name,
      model: res.model,
      usage: {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      latencyMs: Date.now() - start,
    }
  }

  async embeddings(text) {
    if (!this._client) return { embeddings: null, error: 'OpenAI provider not configured' }

    const res = await this._client.embeddings.create({
      model: this._config.embeddingModel || 'text-embedding-3-small',
      input: text,
    })

    return {
      embeddings: res.data[0]?.embedding || [],
      provider: this.name,
      usage: { totalTokens: res.usage?.total_tokens || 0 },
    }
  }
}

module.exports = { OpenAIProvider }
