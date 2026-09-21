/**
 * MJ Type Definitions (runtime shape validators / factories)
 * @module mj/types
 */

/**
 * @typedef {Object} MJCommand
 * @property {string} id
 * @property {string} input - Raw user input
 * @property {string} [userId]
 * @property {Object} [metadata]
 * @property {number} timestamp
 */

/**
 * @typedef {Object} MJResponse
 * @property {string} id
 * @property {string} commandId
 * @property {string} content
 * @property {Object} [metadata]
 * @property {number} timestamp
 * @property {boolean} success
 */

/**
 * @typedef {Object} MJPlan
 * @property {string} id
 * @property {string} commandId
 * @property {MJTask[]} tasks
 * @property {Object} dependencyGraph
 * @property {Object} executionGraph
 * @property {number} priority
 * @property {Object} [retryStrategy]
 * @property {Object} [fallbackStrategy]
 */

/**
 * @typedef {Object} MJTask
 * @property {string} id
 * @property {string} description
 * @property {string} [agentType]
 * @property {number} priority
 * @property {string[]} dependencies
 * @property {string} status
 */

/**
 * @typedef {Object} MJAgentDescriptor
 * @property {string} id
 * @property {string} type
 * @property {string} name
 * @property {string[]} capabilities
 * @property {boolean} active
 */

/**
 * @typedef {Object} MJContext
 * @property {string} sessionId
 * @property {string} [userId]
 * @property {Object} [userPreferences]
 * @property {Object} [environment]
 * @property {Object} [conversationHistory]
 */

/**
 * @typedef {Object} MJMemoryEntry
 * @property {string} id
 * @property {string} type
 * @property {*} content
 * @property {number} timestamp
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} PipelineContext
 * @property {MJCommand} command
 * @property {MJContext} [context]
 * @property {MJPlan} [plan]
 * @property {MJMemoryEntry[]} [memories]
 * @property {MJAgentDescriptor} [selectedAgent]
 * @property {MJResponse} [response]
 * @property {string} correlationId
 * @property {string} currentStage
 */

function createCommand(input, options = {}) {
  return {
    id: options.id || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    input,
    userId: options.userId || null,
    metadata: options.metadata || {},
    timestamp: Date.now(),
  }
}

function createResponse(commandId, content, options = {}) {
  return {
    id: options.id || `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    commandId,
    content,
    metadata: options.metadata || {},
    timestamp: Date.now(),
    success: options.success !== false,
  }
}

function createPipelineContext(command, options = {}) {
  return {
    command,
    context: options.context || null,
    plan: null,
    memories: [],
    selectedAgent: null,
    response: null,
    correlationId: options.correlationId || `corr_${Date.now()}`,
    currentStage: null,
  }
}

module.exports = {
  createCommand,
  createResponse,
  createPipelineContext,
}
