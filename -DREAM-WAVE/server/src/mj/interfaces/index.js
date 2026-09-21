/**
 * MJ Public Interfaces
 * Top-level contracts for external integration.
 * @module mj/interfaces
 */

/**
 * @interface IMJController
 * Single entry point contract for MJ.
 */
const IMJController = {
  start: 'function',
  stop: 'function',
  sleep: 'function',
  wake: 'function',
  processCommand: 'function',
  getState: 'function',
  getMemory: 'function',
  clearMemory: 'function',
  registerAgent: 'function',
  unregisterAgent: 'function',
  getActiveAgents: 'function',
}

/**
 * @interface IMJModule
 * Module export contract.
 */
const IMJModule = {
  controller: 'MJController',
  version: 'string',
  constants: 'object',
  events: 'object',
}

module.exports = { IMJController, IMJModule }
