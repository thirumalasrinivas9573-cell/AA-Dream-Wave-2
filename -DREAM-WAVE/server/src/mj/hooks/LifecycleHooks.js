/**
 * MJ Lifecycle Hooks
 * Extension points for MJ lifecycle events.
 * @module mj/hooks/LifecycleHooks
 */

const { MJLogger } = require('../logger')

class LifecycleHooks {
  constructor() {
    this._logger = MJLogger.child('LifecycleHooks')
    this._hooks = {
      onStart: [],
      onStop: [],
      onSleep: [],
      onWake: [],
      onCommand: [],
      onError: [],
      onPlanCreated: [],
      onAgentSelected: [],
    }
  }

  /**
   * Register a lifecycle hook.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unregister function
   */
  register(event, handler) {
    if (!this._hooks[event]) {
      this._logger.warning(`Unknown hook event: ${event}`)
      return () => {}
    }
    this._hooks[event].push(handler)
    return () => {
      this._hooks[event] = this._hooks[event].filter(h => h !== handler)
    }
  }

  /**
   * Run all handlers for a lifecycle event.
   * @param {string} event
   * @param {*} [payload]
   */
  run(event, payload) {
    const handlers = this._hooks[event] || []
    for (const handler of handlers) {
      try {
        handler(payload)
      } catch (error) {
        this._logger.error(`Hook error [${event}]: ${error.message}`)
      }
    }
  }
}

module.exports = { LifecycleHooks }
