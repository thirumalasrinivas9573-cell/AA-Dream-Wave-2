/**
 * MJ Configuration Schemas (architecture only — no connections)
 * @module mj/config/schemas
 */

/** @returns {Object} OpenAI config schema */
function openaiConfig() {
  return {
    provider: 'openai',
    apiKey: null,
    model: null,
    maxTokens: null,
    temperature: null,
    enabled: false,
  }
}

/** @returns {Object} Gemini config schema */
function geminiConfig() {
  return {
    provider: 'gemini',
    apiKey: null,
    model: null,
    enabled: false,
  }
}

/** @returns {Object} Google Veo config schema */
function googleVeoConfig() {
  return {
    provider: 'google_veo',
    apiKey: null,
    projectId: null,
    enabled: false,
  }
}

/** @returns {Object} ElevenLabs config schema */
function elevenLabsConfig() {
  return {
    provider: 'elevenlabs',
    apiKey: null,
    voiceId: null,
    enabled: false,
  }
}

/** @returns {Object} Local automation config schema */
function localAutomationConfig() {
  return {
    enabled: false,
    sandboxMode: true,
    allowedPaths: [],
    allowedCommands: [],
  }
}

/** @returns {Object} Voice config schema */
function voiceConfig() {
  return {
    enabled: false,
    sttProvider: 'browser',
    ttsProvider: 'local',
    wakeWord: 'MJ',
    wakeWords: ['MJ'],
    language: 'en',
    accent: 'en-US',
    voiceProfile: 'professional',
    speechSpeed: 1.0,
    speechVolume: 1.0,
    pitch: 1.0,
    responseLength: 'balanced',
    autoSpeak: true,
    pushToTalk: true,
    continuousListening: false,
    alwaysListening: false,
    sensitivity: 0.7,
    threshold: 0.5,
    mode: 'push_to_talk',
    personality: {
      tone: 'professional',
      traits: ['calm', 'intelligent', 'friendly', 'respectful', 'confident'],
      greetingStyle: 'warm',
    },
    google: { apiKey: null, enabled: false },
    azure: { apiKey: null, region: null, enabled: false },
    deepgram: { apiKey: null, enabled: false },
    whisperLocal: { endpoint: null, enabled: false },
  }
}

/** @returns {Object} Memory config schema */
function memoryConfig() {
  return {
    workingMemoryLimit: 50,
    longTermPersistence: false,
    vectorStore: null,
    enabled: false,
  }
}

/** @returns {Object} Agents config schema */
function agentsConfig() {
  return {
    maxConcurrentAgents: 5,
    defaultAgent: null,
    enabledAgents: [],
  }
}

/** @returns {Object} Database config schema */
function databaseConfig() {
  return {
    provider: null,
    connectionString: null,
    enabled: false,
  }
}

/** @returns {Object} Security config schema */
function securityConfig() {
  return {
    encryptionEnabled: false,
    permissionEnforcement: true,
    auditLogging: true,
  }
}

/** @returns {Object} AI Brain config schema */
function aiConfig() {
  return {
    primaryProvider: 'openai',
    fallbackProvider: 'gemini',
    maxRetries: 2,
    openai: openaiConfig(),
    gemini: geminiConfig(),
    claude: { provider: 'claude', apiKey: null, model: null, enabled: false },
    local: { provider: 'local', endpoint: null, model: null, enabled: false },
    custom: { provider: 'custom', apiKey: null, endpoint: null, enabled: false },
  }
}

module.exports = {
  openaiConfig,
  geminiConfig,
  googleVeoConfig,
  elevenLabsConfig,
  localAutomationConfig,
  voiceConfig,
  memoryConfig,
  agentsConfig,
  databaseConfig,
  securityConfig,
  aiConfig,
}
