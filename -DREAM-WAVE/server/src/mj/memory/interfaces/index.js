/**
 * Memory Type Interfaces (architecture only — no implementation)
 * @module mj/memory/interfaces
 */

const { IMemoryStore } = require('./IMemoryStore')
const { MEMORY_TYPES } = require('../../constants')

function createMemoryInterface(type, description) {
  return class extends IMemoryStore {
    get type() { return type }
    get description() { return description }

    async store(_id, _entry) { /* future implementation */ return null }
    async retrieve(_id) { /* future implementation */ return null }
    async search(_query) { /* future implementation */ return [] }
    async clear(_id) { /* future implementation */ return null }
    async count() { /* future implementation */ return 0 }
  }
}

const WorkingMemory = createMemoryInterface(MEMORY_TYPES.WORKING, 'Short-term active context memory')
const LongTermMemory = createMemoryInterface(MEMORY_TYPES.LONG_TERM, 'Persistent long-term knowledge store')
const ConversationMemory = createMemoryInterface(MEMORY_TYPES.CONVERSATION, 'Dialogue and chat history memory')
const TaskMemory = createMemoryInterface(MEMORY_TYPES.TASK, 'Task execution and outcome memory')
const ProjectMemory = createMemoryInterface(MEMORY_TYPES.PROJECT, 'Project-scoped context and artifacts')
const LearningMemory = createMemoryInterface(MEMORY_TYPES.LEARNING, 'User learning progress and insights')
const PreferenceMemory = createMemoryInterface(MEMORY_TYPES.PREFERENCE, 'User preferences and settings')
const AgentMemory = createMemoryInterface(MEMORY_TYPES.AGENT, 'Per-agent state and knowledge')
const SystemMemory = createMemoryInterface(MEMORY_TYPES.SYSTEM, 'System-level configuration and state')

module.exports = {
  IMemoryStore,
  WorkingMemory,
  LongTermMemory,
  ConversationMemory,
  TaskMemory,
  ProjectMemory,
  LearningMemory,
  PreferenceMemory,
  AgentMemory,
  SystemMemory,
}
