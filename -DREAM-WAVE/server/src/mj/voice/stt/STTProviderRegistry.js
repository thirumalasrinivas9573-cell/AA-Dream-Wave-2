/**
 * STT Provider Registry
 * @module mj/voice/stt/STTProviderRegistry
 */

const {
  OpenAISTTProvider,
  GoogleSTTProvider,
  AzureSTTProvider,
  DeepgramSTTProvider,
  WhisperLocalSTTProvider,
  BrowserSTTProvider,
} = require('./providers/stubs')
const { STT_PROVIDERS } = require('../constants')
const { MJLogger } = require('../../logger')

class STTProviderRegistry {
  constructor(config = {}) {
    this._logger = MJLogger.child('Voice:STT:Registry')
    this._providers = new Map()
    this._registerDefaults(config)
  }

  _registerDefaults(config) {
    const factories = {
      [STT_PROVIDERS.OPENAI]: () => new OpenAISTTProvider(config.openai || {}),
      [STT_PROVIDERS.GOOGLE]: () => new GoogleSTTProvider(config.google || {}),
      [STT_PROVIDERS.AZURE]: () => new AzureSTTProvider(config.azure || {}),
      [STT_PROVIDERS.DEEPGRAM]: () => new DeepgramSTTProvider(config.deepgram || {}),
      [STT_PROVIDERS.WHISPER_LOCAL]: () => new WhisperLocalSTTProvider(config.whisperLocal || {}),
      [STT_PROVIDERS.BROWSER]: () => new BrowserSTTProvider({ enabled: true }),
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
    this._logger.info(`STT provider registered: ${name}`)
  }
}

module.exports = { STTProviderRegistry }
