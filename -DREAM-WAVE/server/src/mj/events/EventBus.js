/**
 * MJ Event Bus
 * Centralized pub/sub for scalable, decoupled MJ subsystem communication.
 * @module mj/events/EventBus
 */

const { EventEmitter } = require('events')
const { createEventPayload } = require('./MJEvents')
const { MJLogger } = require('../logger')

class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100)
    this._logger = MJLogger.child('EventBus')
  }

  /**
   * Emit a typed MJ event with standardized payload.
   * @param {string} eventType
   * @param {Object} [data]
   * @param {Object} [meta]
   */
  emitEvent(eventType, data = {}, meta = {}) {
    const payload = createEventPayload(eventType, data, meta)
    this._logger.debug(`Event emitted: ${eventType}`, { correlationId: payload.correlationId })
    this.emit(eventType, payload)
    this.emit('*', payload)
    return payload
  }

  /**
   * Subscribe to a specific MJ event.
   * @param {string} eventType
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  onEvent(eventType, handler) {
    this.on(eventType, handler)
    return () => this.off(eventType, handler)
  }

  /**
   * Subscribe to all MJ events (wildcard).
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  onAll(handler) {
    this.on('*', handler)
    return () => this.off('*', handler)
  }

  /**
   * Subscribe once to a specific MJ event.
   * @param {string} eventType
   * @param {Function} handler
   */
  onceEvent(eventType, handler) {
    this.once(eventType, handler)
  }

  /**
   * Remove all listeners for cleanup.
   */
  clearAll() {
    this.removeAllListeners()
  }
}

/** @type {EventBus|null} */
let _instance = null

function getEventBus() {
  if (!_instance) {
    _instance = new EventBus()
  }
  return _instance
}

module.exports = { EventBus, getEventBus }
