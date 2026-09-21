/**
 * TTS Provider Stubs — architecture placeholders for future integrations
 * @module mj/voice/tts/providers/stubs
 */

const { ITTSProvider } = require('../../interfaces/ITTSProvider')
const { TTS_PROVIDERS } = require('../../constants')

function createTTSStub(name) {
  return class extends ITTSProvider {
    constructor(config = {}) {
      super()
      this._config = config
    }

    get name() { return name }

    isAvailable() {
      return !!this._config.apiKey || !!this._config.enabled || name === TTS_PROVIDERS.LOCAL
    }

    async synthesize(input = {}) {
      const text = input.text || ''
      return {
        audio: null,
        format: 'audio/mpeg',
        durationMs: Math.max(500, text.length * 50),
        text,
        provider: name,
        voiceProfile: input.voiceProfile || this._config.voiceId || 'default',
        stub: !this.isAvailable(),
        metadata: {
          pitch: input.pitch ?? 1,
          speed: input.speed ?? 1,
          emotion: input.emotion || 'neutral',
          volume: input.volume ?? 1,
        },
      }
    }

    async *streamSynthesize(input = {}) {
      const result = await this.synthesize(input)
      yield { chunk: result.audio, format: result.format, isFinal: false }
      yield { chunk: result.audio, format: result.format, isFinal: true, durationMs: result.durationMs }
    }

    getVoiceProfiles() {
      return [
        { id: 'default', name: 'MJ Default', gender: 'female', language: 'en' },
        { id: 'professional', name: 'MJ Professional', gender: 'female', language: 'en' },
      ]
    }
  }
}

const ElevenLabsTTSProvider = createTTSStub(TTS_PROVIDERS.ELEVENLABS)
const OpenAITTSProvider = createTTSStub(TTS_PROVIDERS.OPENAI)
const AzureTTSProvider = createTTSStub(TTS_PROVIDERS.AZURE)
const GoogleTTSProvider = createTTSStub(TTS_PROVIDERS.GOOGLE)
const LocalTTSProvider = createTTSStub(TTS_PROVIDERS.LOCAL)

module.exports = {
  ElevenLabsTTSProvider,
  OpenAITTSProvider,
  AzureTTSProvider,
  GoogleTTSProvider,
  LocalTTSProvider,
}
