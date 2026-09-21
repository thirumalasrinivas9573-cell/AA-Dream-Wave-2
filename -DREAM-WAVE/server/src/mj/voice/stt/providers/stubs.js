/**
 * STT Provider Stubs — architecture placeholders for future integrations
 * @module mj/voice/stt/providers/stubs
 */

const { ISTTProvider } = require('../../interfaces/ISTTProvider')
const { STT_PROVIDERS } = require('../../constants')

function createSTTStub(name) {
  return class extends ISTTProvider {
    constructor(config = {}) {
      super()
      this._config = config
    }

    get name() { return name }

    isAvailable() {
      return !!this._config.apiKey || !!this._config.enabled || name === STT_PROVIDERS.BROWSER
    }

    async transcribe(input = {}) {
      const text = input.text || input.transcript || ''
      return {
        text,
        confidence: input.confidence ?? 0.95,
        language: input.language || this._config.language || 'en',
        isFinal: true,
        provider: name,
        stub: !this.isAvailable(),
      }
    }

    async *streamTranscribe(input = {}) {
      const result = await this.transcribe(input)
      yield { ...result, isFinal: false }
      yield { ...result, isFinal: true }
    }
  }
}

const OpenAISTTProvider = createSTTStub(STT_PROVIDERS.OPENAI)
const GoogleSTTProvider = createSTTStub(STT_PROVIDERS.GOOGLE)
const AzureSTTProvider = createSTTStub(STT_PROVIDERS.AZURE)
const DeepgramSTTProvider = createSTTStub(STT_PROVIDERS.DEEPGRAM)
const WhisperLocalSTTProvider = createSTTStub(STT_PROVIDERS.WHISPER_LOCAL)
const BrowserSTTProvider = createSTTStub(STT_PROVIDERS.BROWSER)

module.exports = {
  OpenAISTTProvider,
  GoogleSTTProvider,
  AzureSTTProvider,
  DeepgramSTTProvider,
  WhisperLocalSTTProvider,
  BrowserSTTProvider,
}
