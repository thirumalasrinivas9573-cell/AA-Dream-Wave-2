/**
 * @module mj/voice
 */
const { VoiceEngine, getVoiceEngine } = require('./VoiceEngine')
const {
  VOICE_STATES,
  VOICE_EVENTS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  VOICE_PIPELINE_STAGES,
  VOICE_MODES,
  DEFAULT_WAKE_WORD,
} = require('./constants')
const { VoicePipeline } = require('./pipeline/VoicePipeline')
const { VoiceStateMachine } = require('./state/VoiceStateMachine')
const { WakeWordEngine } = require('./wake/WakeWordEngine')
const { VoicePersonality } = require('./personality/VoicePersonality')
const { VoiceSessionManager } = require('./session/VoiceSessionManager')
const { VoiceSettingsStore } = require('./settings/VoiceSettingsStore')
const { VoiceSecurity } = require('./security/VoiceSecurity')
const { getVoiceObservability } = require('./observability/VoiceObservability')
const { STTProviderRegistry } = require('./stt/STTProviderRegistry')
const { TTSProviderRegistry } = require('./tts/TTSProviderRegistry')
const voiceInterfaces = require('./interfaces')

module.exports = {
  VoiceEngine,
  getVoiceEngine,
  VoicePipeline,
  VoiceStateMachine,
  WakeWordEngine,
  VoicePersonality,
  VoiceSessionManager,
  VoiceSettingsStore,
  VoiceSecurity,
  getVoiceObservability,
  STTProviderRegistry,
  TTSProviderRegistry,
  VOICE_STATES,
  VOICE_EVENTS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  VOICE_PIPELINE_STAGES,
  VOICE_MODES,
  DEFAULT_WAKE_WORD,
  ...voiceInterfaces,
}
