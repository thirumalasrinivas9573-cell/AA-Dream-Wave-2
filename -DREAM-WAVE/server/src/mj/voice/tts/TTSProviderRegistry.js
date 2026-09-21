/**
 * TTS Provider Registry
 * @module mj/voice/tts/TTSProviderRegistry
 */

const {
  ElevenLabsTTSProvider,
  OpenAITTSProvider,
  AzureTTSProvider,
  GoogleTTSProvider,
  LocalTTSProvider,
} = require('./providers/stubs')
const { TTS_PROVIDERS } = require('../constants')
const { MJLogger } = require('../../logger')

class TTSProviderRegistry {
  constructor(config = {}) {
    this._logger = MJLogger.child('Voice:TTS:Registry')
    this._providers = new Map()
    this._registerDefaults(config)
  }

  _registerDefaults(config) {
    const factories = {
      [TTS_PROVIDERS.ELEVENLABS]: () => new ElevenLabsTTSProvider(config.elevenLabs || {}),
      [TTS_PROVIDERS.OPENAI]: () => new OpenAITTSProvider(config.openai || {}),
      [TTS_PROVIDERS.AZURE]: () => new AzureTTSProvider(config.azure || {}),
      [TTS_PROVIDERS.GOOGLE]: () => new GoogleTTSProvider(config.google || {}),
      [TTS_PROVIDERS.LOCAL]: () => new LocalTTSProvider(config.local || {}),
    }

    for (const [name, factory] of Object.entries(factories)) {
      this._providers.set(name, factory())
    }
  }

  get(name) {
    return this._providers.get(name) || null
  }

  getAvailable() {
    return [...this._providers.entries()]
      .filter(([, p]) => p.isAvailable())
      .map(([name]) => name)
  }

  getAll() {
    return [...this._providers.keys()]
  }

  register(name, provider) {
    this._providers.set(name, provider)
    this._logger.info(`TTS provider registered: ${name}`)
  }
}

module.exports = { TTSProviderRegistry }
