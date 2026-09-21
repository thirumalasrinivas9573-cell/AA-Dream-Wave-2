/**
 * Gemini Provider — MJ isolated AI layer
 * @module mj/ai/providers/GeminiProvider
 */

const axios = require('axios')
const { IAIProvider } = require('../interfaces/IAIProvider')
const { AI_PROVIDERS, MODEL_CAPABILITIES } = require('../constants')
const { MJLogger } = require('../../logger')

class GeminiProvider extends IAIProvider {
  constructor(config = {}) {
    super()
    this._logger = MJLogger.child('AI:Gemini')
    this._config = config
  }

  get name() { return AI_PROVIDERS.GEMINI }

  get capabilities() {
    return [
      MODEL_CAPABILITIES.CHAT_COMPLETION,
      MODEL_CAPABILITIES.STRUCTURED_JSON,
      MODEL_CAPABILITIES.STREAMING,
    ]
  }

  isAvailable() {
    return !!(this._config.apiKey && this._config.enabled !== false)
  }

  _model(override) {
    return override || this._config.model || 'gemini-1.5-flash'
  }

  _baseUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this._model()}:generateContent`
  }

  _toGeminiMessages(messages) {
    return messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  }

  async chatCompletion(messages, options = {}) {
    if (!this.isAvailable()) {
      return { content: null, error: 'Gemini provider not configured', provider: this.name }
    }

    const start = Date.now()
    const url = `${this._baseUrl()}?key=${this._config.apiKey}`

    const res = await axios.post(url, {
      contents: this._toGeminiMessages(messages.filter(m => m.role !== 'system')),
      systemInstruction: messages.find(m => m.role === 'system')
        ? { parts: [{ text: messages.find(m => m.role === 'system').content }] }
        : undefined,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    }, { timeout: 60000 })

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usage = res.data?.usageMetadata || {}

    return {
      content,
      provider: this.name,
      model: this._model(options.model),
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
      latencyMs: Date.now() - start,
    }
  }

  async structuredJSON(messages, schema, options = {}) {
    const jsonMessages = [
      ...messages,
      { role: 'user', content: 'Respond with valid JSON only. No markdown fences.' },
    ]
    const result = await this.chatCompletion(jsonMessages, { ...options, temperature: 0.2 })
    if (!result.content) return { ...result, data: null }

    let data = null
    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, '').trim()
      data = JSON.parse(cleaned)
    } catch {
      data = null
    }

    return { ...result, data, raw: result.content }
  }
}

module.exports = { GeminiProvider }
