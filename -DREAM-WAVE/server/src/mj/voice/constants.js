/**
 * MJ Voice Platform Constants (Sprint 5)
 * @module mj/voice/constants
 */

const VOICE_STATES = {
  SLEEPING: 'sleeping',
  WAKE_DETECTION: 'wake_detection',
  LISTENING: 'listening',
  UNDERSTANDING: 'understanding',
  THINKING: 'thinking',
  PLANNING: 'planning',
  WORKING: 'working',
  SPEAKING: 'speaking',
  WAITING: 'waiting',
  OFFLINE: 'offline',
  MUTED: 'muted',
  ERROR: 'error',
}

const VOICE_EVENTS = {
  VOICE_STARTED: 'mj:voice:started',
  VOICE_STOPPED: 'mj:voice:stopped',
  WAKE_DETECTED: 'mj:voice:wake_detected',
  MICROPHONE_GRANTED: 'mj:voice:microphone_granted',
  MICROPHONE_DENIED: 'mj:voice:microphone_denied',
  TRANSCRIPTION_STARTED: 'mj:voice:transcription_started',
  TRANSCRIPTION_COMPLETED: 'mj:voice:transcription_completed',
  SPEECH_STARTED: 'mj:voice:speech_started',
  SPEECH_COMPLETED: 'mj:voice:speech_completed',
  VOICE_ERROR: 'mj:voice:error',
  VOICE_STATE_CHANGED: 'mj:voice:state_changed',
}

const STT_PROVIDERS = {
  OPENAI: 'openai',
  GOOGLE: 'google',
  AZURE: 'azure',
  DEEPGRAM: 'deepgram',
  WHISPER_LOCAL: 'whisper_local',
  BROWSER: 'browser',
}

const TTS_PROVIDERS = {
  ELEVENLABS: 'elevenlabs',
  OPENAI: 'openai',
  AZURE: 'azure',
  GOOGLE: 'google',
  LOCAL: 'local',
}

const VOICE_PIPELINE_STAGES = {
  RECEIVE: 'receive',
  WAKE_DETECT: 'wake_detect',
  LISTEN: 'listen',
  RECOGNIZE: 'recognize',
  BRAIN: 'brain',
  MEMORY: 'memory',
  PLANNER: 'planner',
  AGENT: 'agent',
  RESPONSE: 'response',
  SYNTHESIZE: 'synthesize',
  DELIVER: 'deliver',
}

const DEFAULT_WAKE_WORD = 'MJ'

const DEFAULT_PERSONALITY = {
  tone: 'professional',
  traits: ['calm', 'intelligent', 'friendly', 'respectful', 'confident'],
  greetingStyle: 'warm',
}

const VOICE_MODES = {
  PUSH_TO_TALK: 'push_to_talk',
  CONTINUOUS: 'continuous',
  WAKE_WORD: 'wake_word',
}

module.exports = {
  VOICE_STATES,
  VOICE_EVENTS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
  VOICE_PIPELINE_STAGES,
  DEFAULT_WAKE_WORD,
  DEFAULT_PERSONALITY,
  VOICE_MODES,
}
