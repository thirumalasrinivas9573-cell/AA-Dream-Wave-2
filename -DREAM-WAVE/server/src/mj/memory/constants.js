/**
 * MJ Memory Constants (Sprint 4)
 * @module mj/memory/constants
 */

const MJ_COLLECTIONS = {
  MEMORY: 'mj_memory',
  CONVERSATIONS: 'mj_conversations',
  PROJECTS: 'mj_projects',
  PREFERENCES: 'mj_preferences',
  LEARNING: 'mj_learning',
  TASKS: 'mj_tasks',
  SESSIONS: 'mj_sessions',
}

const MEMORY_CATEGORIES = {
  WORKING: 'working',
  CONVERSATION: 'conversation',
  PROJECT: 'project',
  TASK: 'task',
  LEARNING: 'learning',
  PREFERENCE: 'preference',
  KNOWLEDGE: 'knowledge',
  SYSTEM: 'system',
}

const EXPIRATION_POLICIES = {
  NEVER: 'never',
  SESSION: 'session',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
}

const MEMORY_PIPELINE_STAGES = {
  RECEIVE: 'receive',
  SEARCH: 'search',
  RANK: 'rank',
  INJECT: 'inject',
  REASON: 'reason',
  GENERATE: 'generate',
  SUMMARIZE: 'summarize',
  STORE: 'store',
  UPDATE: 'update',
}

module.exports = {
  MJ_COLLECTIONS,
  MEMORY_CATEGORIES,
  EXPIRATION_POLICIES,
  MEMORY_PIPELINE_STAGES,
}
