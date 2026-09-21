/**
 * MJ Configuration Manager
 * Prepares future config — does NOT connect to external services.
 * @module mj/config/MJConfig
 */

const schemas = require('./schemas')
const { MJLogger } = require('../logger')

class MJConfig {
  constructor() {
    this._logger = MJLogger.child('Config')
    this._config = this._buildDefaults()
    this._loaded = false
  }

  _buildDefaults() {
    return {
      ai: schemas.aiConfig(),
      openai: schemas.openaiConfig(),
      gemini: schemas.geminiConfig(),
      googleVeo: schemas.googleVeoConfig(),
      elevenLabs: schemas.elevenLabsConfig(),
      localAutomation: schemas.localAutomationConfig(),
      voice: schemas.voiceConfig(),
      memory: schemas.memoryConfig(),
      agents: schemas.agentsConfig(),
      database: schemas.databaseConfig(),
      security: schemas.securityConfig(),
    }
  }

  /**
   * Load configuration (stub — future: env, file, remote).
   * @param {Object} [overrides]
   */
  load(overrides = {}) {
    const envAI = this._loadFromEnv()
    this._config = { ...this._buildDefaults(), ...envAI, ...overrides }
    this._loaded = true
    this._logger.info('Configuration loaded', {
      aiPrimary: this._config.ai?.primaryProvider,
      openaiEnabled: this._config.ai?.openai?.enabled,
      geminiEnabled: this._config.ai?.gemini?.enabled,
    })
    return this._config
  }

  _loadFromEnv() {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.MJ_OPENAI_API_KEY || null
    const geminiKey = process.env.GEMINI_API_KEY || process.env.MJ_GEMINI_API_KEY || null
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY || process.env.MJ_ELEVENLABS_API_KEY || null
    const voiceEnabled = process.env.MJ_VOICE_ENABLED === 'true'

    return {
      ai: {
        primaryProvider: process.env.MJ_AI_PROVIDER || 'openai',
        fallbackProvider: process.env.MJ_AI_FALLBACK || 'gemini',
        maxRetries: parseInt(process.env.MJ_AI_MAX_RETRIES || '2', 10),
        openai: {
          provider: 'openai',
          apiKey: openaiKey,
          model: process.env.MJ_OPENAI_MODEL || 'gpt-4o-mini',
          embeddingModel: process.env.MJ_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
          maxTokens: parseInt(process.env.MJ_OPENAI_MAX_TOKENS || '4096', 10),
          temperature: parseFloat(process.env.MJ_OPENAI_TEMPERATURE || '0.7'),
          enabled: !!openaiKey,
        },
        gemini: {
          provider: 'gemini',
          apiKey: geminiKey,
          model: process.env.MJ_GEMINI_MODEL || 'gemini-1.5-flash',
          enabled: !!geminiKey,
        },
        claude: {
          provider: 'claude',
          apiKey: process.env.MJ_CLAUDE_API_KEY || null,
          model: process.env.MJ_CLAUDE_MODEL || 'claude-3-5-sonnet',
          enabled: !!process.env.MJ_CLAUDE_API_KEY,
        },
        local: {
          provider: 'local',
          endpoint: process.env.MJ_LOCAL_LLM_ENDPOINT || null,
          model: process.env.MJ_LOCAL_LLM_MODEL || null,
          enabled: !!process.env.MJ_LOCAL_LLM_ENDPOINT,
        },
      },
      openai: {
        provider: 'openai',
        apiKey: openaiKey,
        model: process.env.MJ_OPENAI_MODEL || 'gpt-4o-mini',
        enabled: !!openaiKey,
      },
      gemini: {
        provider: 'gemini',
        apiKey: geminiKey,
        model: process.env.MJ_GEMINI_MODEL || 'gemini-1.5-flash',
        enabled: !!geminiKey,
      },
      elevenLabs: {
        provider: 'elevenlabs',
        apiKey: elevenLabsKey,
        voiceId: process.env.MJ_ELEVENLABS_VOICE_ID || null,
        enabled: !!elevenLabsKey,
      },
      voice: {
        enabled: voiceEnabled,
        sttProvider: process.env.MJ_VOICE_STT_PROVIDER || 'browser',
        ttsProvider: process.env.MJ_VOICE_TTS_PROVIDER || (elevenLabsKey ? 'elevenlabs' : 'local'),
        wakeWord: process.env.MJ_VOICE_WAKE_WORD || 'MJ',
        wakeWords: (process.env.MJ_VOICE_WAKE_WORDS || process.env.MJ_VOICE_WAKE_WORD || 'MJ').split(',').map(s => s.trim()),
        language: process.env.MJ_VOICE_LANGUAGE || 'en',
        accent: process.env.MJ_VOICE_ACCENT || 'en-US',
        voiceProfile: process.env.MJ_VOICE_PROFILE || 'professional',
        speechSpeed: parseFloat(process.env.MJ_VOICE_SPEED || '1.0'),
        speechVolume: parseFloat(process.env.MJ_VOICE_VOLUME || '1.0'),
        autoSpeak: process.env.MJ_VOICE_AUTO_SPEAK !== 'false',
        pushToTalk: process.env.MJ_VOICE_PUSH_TO_TALK !== 'false',
        continuousListening: process.env.MJ_VOICE_CONTINUOUS === 'true',
        alwaysListening: process.env.MJ_VOICE_ALWAYS_LISTENING === 'true',
        sensitivity: parseFloat(process.env.MJ_VOICE_SENSITIVITY || '0.7'),
        mode: process.env.MJ_VOICE_MODE || 'push_to_talk',
        google: {
          apiKey: process.env.MJ_GOOGLE_SPEECH_API_KEY || null,
          enabled: !!process.env.MJ_GOOGLE_SPEECH_API_KEY,
        },
        azure: {
          apiKey: process.env.MJ_AZURE_SPEECH_KEY || null,
          region: process.env.MJ_AZURE_SPEECH_REGION || null,
          enabled: !!process.env.MJ_AZURE_SPEECH_KEY,
        },
        deepgram: {
          apiKey: process.env.MJ_DEEPGRAM_API_KEY || null,
          enabled: !!process.env.MJ_DEEPGRAM_API_KEY,
        },
        whisperLocal: {
          endpoint: process.env.MJ_WHISPER_LOCAL_ENDPOINT || null,
          enabled: !!process.env.MJ_WHISPER_LOCAL_ENDPOINT,
        },
      },
    }
  }

  /** @param {string} section */
  get(section) {
    return this._config[section] || null
  }

  /** @returns {Object} */
  getAll() {
    return { ...this._config }
  }

  /** @returns {boolean} */
  isLoaded() {
    return this._loaded
  }

  /**
   * Update a config section (runtime override).
   * @param {string} section
   * @param {Object} values
   */
  update(section, values) {
    if (!this._config[section]) {
      this._logger.warning(`Unknown config section: ${section}`)
      return false
    }
    this._config[section] = { ...this._config[section], ...values }
    return true
  }
}

let _instance = null

function getConfig() {
  if (!_instance) _instance = new MJConfig()
  return _instance
}

module.exports = { MJConfig, getConfig }
