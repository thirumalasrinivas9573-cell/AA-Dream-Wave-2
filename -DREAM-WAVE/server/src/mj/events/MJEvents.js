/**
 * MJ Event Definitions
 * Re-exports event constants and provides event payload schemas.
 * @module mj/events/MJEvents
 */

const { MJ_EVENTS } = require('../constants')

/**
 * @typedef {Object} MJEventPayload
 * @property {string} type - Event type identifier
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} [source] - Component that emitted the event
 * @property {Object} [data] - Event-specific payload
 * @property {string} [correlationId] - Request/trace correlation ID
 */

/**
 * Creates a standardized MJ event payload.
 * @param {string} type
 * @param {Object} [data]
 * @param {Object} [meta]
 * @returns {MJEventPayload}
 */
function createEventPayload(type, data = {}, meta = {}) {
  return {
    type,
    timestamp: Date.now(),
    source: meta.source || 'mj',
    correlationId: meta.correlationId || null,
    data,
  }
}

module.exports = {
  MJ_EVENTS,
  createEventPayload,
}
