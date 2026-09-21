/**
 * MJ Core Constants
 * Centralized constants for the MJ Personal AI Operating System.
 * @module mj/constants
 */

const MJ_VERSION = '0.6.0-alpha'
const MJ_MODULE_NAME = 'MJ'

const MJ_STATES = {
  IDLE: 'idle',
  SLEEPING: 'sleeping',
  LISTENING: 'listening',
  THINKING: 'thinking',
  PLANNING: 'planning',
  WORKING: 'working',
  EXECUTING: 'executing',
  LEARNING: 'learning',
  RESEARCHING: 'researching',
  SPEAKING: 'speaking',
  WAITING: 'waiting',
  RESPONDING: 'responding',
  COMPLETED: 'completed',
  ERROR: 'error',
}

const MJ_EVENTS = {
  MJ_STARTED: 'mj:started',
  MJ_STOPPED: 'mj:stopped',
  MJ_SLEEP: 'mj:sleep',
  MJ_WAKE: 'mj:wake',
  COMMAND_RECEIVED: 'mj:command:received',
  CONTEXT_ANALYZED: 'mj:context:analyzed',
  MEMORY_FOUND: 'mj:memory:found',
  PLAN_CREATED: 'mj:plan:created',
  AGENT_SELECTED: 'mj:agent:selected',
  TASK_STARTED: 'mj:task:started',
  TASK_COMPLETED: 'mj:task:completed',
  TASK_FAILED: 'mj:task:failed',
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
  NOTIFICATION_CREATED: 'mj:notification:created',
  ERROR_OCCURRED: 'mj:error:occurred',
  STATE_CHANGED: 'mj:state:changed',
  PIPELINE_STAGE: 'mj:pipeline:stage',
}

const MEMORY_TYPES = {
  WORKING: 'working',
  LONG_TERM: 'long_term',
  CONVERSATION: 'conversation',
  TASK: 'task',
  PROJECT: 'project',
  LEARNING: 'learning',
  PREFERENCE: 'preference',
  AGENT: 'agent',
  SYSTEM: 'system',
  KNOWLEDGE: 'knowledge',
}

const AGENT_TYPES = {
  DEVELOPER: 'developer',
  BACKEND: 'backend',
  FRONTEND: 'frontend',
  DESIGNER: 'designer',
  RESEARCH: 'research',
  TEACHER: 'teacher',
  MARKETING: 'marketing',
  BUSINESS: 'business',
  FINANCE: 'finance',
  LEGAL: 'legal',
  HEALTH: 'health',
  SECURITY: 'security',
  VIDEO: 'video',
  ANIMATION: 'animation',
  AUTOMATION: 'automation',
  DEPLOYMENT: 'deployment',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  THREEJS: 'threejs',
  LEARNING: 'learning',
  RESUME: 'resume',
  SEO: 'seo',
  TRANSLATION: 'translation',
  RD_REPORT: 'rd_report',
  CONTENT_WRITER: 'content_writer',
  PROMPT_ENGINEERING: 'prompt_engineering',
  DATA_ANALYSIS: 'data_analysis',
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  ROBOTICS: 'robotics',
}

const PIPELINE_STAGES = {
  USER_INPUT: 'user_input',
  CONTEXT_ANALYZER: 'context_analyzer',
  CONVERSATION_MANAGER: 'conversation_manager',
  PLANNER: 'planner',
  MEMORY_LOOKUP: 'memory_lookup',
  REASONING_ENGINE: 'reasoning_engine',
  AGENT_SELECTION: 'agent_selection',
  EXECUTION_QUEUE: 'execution_queue',
  RESPONSE_BUILDER: 'response_builder',
  FRONTEND: 'frontend',
}

const LOG_LEVELS = {
  INFO: 'info',
  DEBUG: 'debug',
  WARNING: 'warning',
  CRITICAL: 'critical',
  PERFORMANCE: 'performance',
  AI: 'ai',
  VOICE: 'voice',
  AUTOMATION: 'automation',
  RESEARCH: 'research',
  PLANNER: 'planner',
  ERROR: 'error',
}

const ERROR_TYPES = {
  RECOVERABLE: 'recoverable',
  FATAL: 'fatal',
  VALIDATION: 'validation',
  AI: 'ai',
  VOICE: 'voice',
  AUTOMATION: 'automation',
  DATABASE: 'database',
  NETWORK: 'network',
}

const PERMISSION_TYPES = {
  DEVICE: 'device',
  AUTOMATION: 'automation',
  MICROPHONE: 'microphone',
  CAMERA: 'camera',
  FILE_SYSTEM: 'file_system',
  NETWORK: 'network',
}

module.exports = {
  MJ_VERSION,
  MJ_MODULE_NAME,
  MJ_STATES,
  MJ_EVENTS,
  MEMORY_TYPES,
  AGENT_TYPES,
  PIPELINE_STAGES,
  LOG_LEVELS,
  ERROR_TYPES,
  PERMISSION_TYPES,
}
