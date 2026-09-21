/**
 * MJ AI Constants
 * @module mj/ai/constants
 */

const AI_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  LOCAL: 'local',
  CUSTOM: 'custom',
}

const INTENT_TYPES = {
  CODING: 'coding',
  RESEARCH: 'research',
  LEARNING: 'learning',
  BUSINESS: 'business',
  FINANCE: 'finance',
  MARKETING: 'marketing',
  AUTOMATION: 'automation',
  PLANNING: 'planning',
  CONVERSATION: 'conversation',
  DEPLOYMENT: 'deployment',
  REPORTS: 'reports',
  RESUME: 'resume',
  CREATIVE: 'creative',
  PRODUCTIVITY: 'productivity',
  GENERAL: 'general',
  UNKNOWN: 'unknown',
}

const REASONING_STAGES = {
  UNDERSTAND: 'understand',
  RESEARCH: 'research',
  EVALUATE: 'evaluate',
  COMPARE: 'compare',
  PLAN: 'plan',
  VERIFY: 'verify',
  RESPOND: 'respond',
}

const REASONING_PIPELINE_STAGES = {
  RECEIVE_REQUEST: 'receive_request',
  INTENT_DETECTION: 'intent_detection',
  GOAL_IDENTIFICATION: 'goal_identification',
  CONTEXT_ANALYSIS: 'context_analysis',
  MEMORY_LOOKUP: 'memory_lookup',
  CONSTRAINT_ANALYSIS: 'constraint_analysis',
  TASK_DECOMPOSITION: 'task_decomposition',
  AGENT_PLANNING: 'agent_planning',
  PRIORITY_CALCULATION: 'priority_calculation',
  EXECUTION_STRATEGY: 'execution_strategy',
  RESPONSE_GENERATION: 'response_generation',
  RETURN_STRUCTURED: 'return_structured',
}

const PROMPT_TYPES = {
  SYSTEM: 'system',
  DEVELOPER: 'developer',
  AGENT: 'agent',
  LEARNING: 'learning',
  RESEARCH: 'research',
  PLANNING: 'planning',
  REPORT: 'report',
  RESUME: 'resume',
}

const MODEL_CAPABILITIES = {
  CHAT_COMPLETION: 'chat_completion',
  STRUCTURED_JSON: 'structured_json',
  EMBEDDINGS: 'embeddings',
  FUNCTION_CALLING: 'function_calling',
  STREAMING: 'streaming',
  IMAGE_UNDERSTANDING: 'image_understanding',
  VIDEO_GENERATION: 'video_generation',
  SPEECH_RECOGNITION: 'speech_recognition',
  SPEECH_SYNTHESIS: 'speech_synthesis',
}

const EXECUTION_TYPES = {
  IMMEDIATE: 'immediate',
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  BACKGROUND: 'background',
  SCHEDULED: 'scheduled',
}

const COMPLEXITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

module.exports = {
  AI_PROVIDERS,
  INTENT_TYPES,
  REASONING_STAGES,
  REASONING_PIPELINE_STAGES,
  PROMPT_TYPES,
  MODEL_CAPABILITIES,
  EXECUTION_TYPES,
  COMPLEXITY_LEVELS,
  RISK_LEVELS,
}
